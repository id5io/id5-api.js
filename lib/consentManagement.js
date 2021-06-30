import {
  logError,
  logWarn,
  logInfo,
  isPlainObject,
  isStr,
  isFn,
  isBoolean
} from './utils.js';
import CONSTANTS from './constants.json';

/* eslint-disable no-unused-vars */
import LocalStorage from './localStorage.js';
/* eslint-enable no-unused-vars */

export class ConsentData {
  /**
   * The GDPR consent string in case GDPR applies
   * @type {string}
   */
  consentString = '';

  /** @type {boolean} */
  gdprApplies = false;

  /**
   * The IAB TCF version number
   * @type {number}
   */
  apiVersion = 0;
}

export class ConsentManagement {
  /** @type {ConsentData} */
  consentData;

  /**
   * The ID5 privacy object stored in localStorage
   * @type {Object}
   */
  storedPrivacyData;

  /**
   * The interface to the browser local storage
   * @type {LocalStorage}
   */
  localStorage;

  /**
   * Used to avoid requesting consent too often when not required
   * @type {boolean}
   */
  _consentRequested = false;

  /**
   * @param {LocalStorage} localStorage the localStorage object to use
   */
  constructor(localStorage) {
    this.localStorage = localStorage;
    this.resetConsentData();
  }

  /**
   * Try to fetch consent from CMP. Main entry point to retrieve consent data.
   * @param {boolean} debugBypassConsent
   * @param {string} cmpApi - CMP Api to use
   * @param {object} [providedConsentData] - static consent data provided to ID5 API at init() time
   * @param {function(ConsentData)} finalCallback required; final callback
   */
  requestConsent(debugBypassConsent, cmpApi, providedConsentData, finalCallback) {
    if (debugBypassConsent) {
      logWarn('ID5 is operating in forced consent mode and will not retrieve any consent signals from the CMP');
      finalCallback(this.consentData);
    } else if (!this._consentRequested) {
      this._consentRequested = true;
      switch (cmpApi) {
        case 'static':
          this.parseStaticConsentData(providedConsentData, finalCallback);
          break;
        case 'iab':
          this.lookupIabConsent(finalCallback);
          break;
        default:
          logError(`Unknown consent API: ${cmpApi}`);
          this.resetConsentData();
          finalCallback(this.consentData);
          break;
      }
    } else {
      finalCallback(this.consentData);
    }
  }

  /**
   * This function reads the consent string from the config to obtain the consent
   * information of the user.
   * @param {Object} staticConsentData the data passed in the static configuration
   * @param {function(ConsentData)} finalCallback required; final callback
   */
  parseStaticConsentData(staticConsentData, finalCallback) {
    if (!isPlainObject(staticConsentData)) {
      logError('cmpApi: "static" did not specify consent data. Using defaults.');
      finalCallback(this.consentData);
      return;
    }

    // Try to detect the CMP version from the static object structure
    const cmpVersion = (staticConsentData.getConsentData) ? 1
      : (staticConsentData.getTCData) ? 2
        : 0;

    logInfo(`Using static consent data from config for TCF v${this.cmpVersion}`, staticConsentData);

    if (cmpVersion === 2) {
      // remove extra layer in static v2 data object
      this.storeTcfData(staticConsentData.getTCData, cmpVersion);
    } else if (cmpVersion === 1) {
      this.storeTcfData(staticConsentData, cmpVersion);
    } else {
      logError('cmpApi: "static" did not specify valid data. Using defaults.');
    }
    finalCallback(this.consentData);
  }

  /**
   * This function handles async interacting with an IAB compliant CMP
   * to obtain the consent information of the user.
   * @param {function(ConsentData)} finalCallback required; final callback
   */
  lookupIabConsent(finalCallback) {
    const self = this;

    const { cmpVersion, cmpFrame, cmpFunction } = ConsentManagement.findCMP();
    this.cmpVersion = cmpVersion;
    if (!cmpFrame || !isFn(cmpFunction)) {
      logError('CPM not found or not functional! Using defaults.');
      finalCallback(this.consentData);
      return;
    }

    // TCF V1 callbacks
    const cmpResponse = {};
    const consentDataCallback = (data) => {
      logInfo('cmpApi: consentDataCallback');
      cmpResponse.getConsentData = data;
      afterCallback();
    };
    const vendorConsentsCallback = (data) => {
      logInfo('cmpApi: vendorConsentsCallback');
      cmpResponse.getVendorConsents = data;
      afterCallback();
    };
    const afterCallback = () => {
      if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
        self.storeTcfData(cmpResponse, cmpVersion);
        finalCallback(self.consentData);
      }
    };

    // TCF V2 callback
    const v2CmpResponseCallback = (tcfData, success) => {
      logInfo('Received a response from CMP', tcfData);
      if (!success) {
        logError('CMP unable to register callback function. Please check CMP setup. Using defaults.');
        finalCallback(self.consentData);
        return;
      }
      if (tcfData.gdprApplies === false ||
        tcfData.eventStatus === 'tcloaded' ||
        tcfData.eventStatus === 'useractioncomplete'
      ) {
        self.storeTcfData(tcfData, cmpVersion);
        finalCallback(self.consentData);
      }
    };

    logInfo('cmpApi: calling getConsentData & getVendorConsents');
    if (cmpVersion === 1) {
      cmpFunction('getConsentData', null, consentDataCallback);
      cmpFunction('getVendorConsents', null, vendorConsentsCallback);
    } else if (cmpVersion === 2) {
      cmpFunction('addEventListener', cmpVersion, v2CmpResponseCallback);
    }
  }

  /**
   * This function checks the consent data provided by CMP to ensure it's in an expected state.
   * @param {object} consentObject required; object returned by CMP that contains user's consent choices
   * @param {number} cmpVersion the version reported by the CMP framework
   */
  storeTcfData(consentObject, cmpVersion) {
    let isValid, storeFn;
    if (cmpVersion === 1) {
      isValid = ConsentManagement.isValidV1ConsentObject;
      storeFn = this.storeV1Data;
    } else if (cmpVersion === 2) {
      isValid = ConsentManagement.isValidV2ConsentObject;
      storeFn = this.storeV2Data;
    } else {
      logError('Unrecognized version of CMP. Using defaults.');
      return;
    }

    if (isValid(consentObject)) {
      this.consentData = new ConsentData();
      storeFn.call(this, consentObject);
    } else {
      logError('CMP (TCF V1) returned unexpected value during lookup process. Using defaults.', consentObject);
    }
  }

  /**
   * V1 TCF object validity check
   * @param {Object} consentObject
   * @returns true if the object is to be considered valid for our purposes
   */
  static isValidV1ConsentObject(consentObject) {
    const gdprApplies = consentObject &&
      consentObject.getConsentData &&
      consentObject.getConsentData.gdprApplies;

    if (!isBoolean(gdprApplies)) {
      return false;
    }

    if (gdprApplies === false) {
      return true;
    }

    return isStr(consentObject.getConsentData.consentData) &&
      isPlainObject(consentObject.getVendorConsents) &&
      Object.keys(consentObject.getVendorConsents).length > 1;
  }

  /**
   * V2 TCF object validity check
   * @param {Object} consentObject
   * @returns true if the object is to be considered valid for our purposes
   */
  static isValidV2ConsentObject(consentObject) {
    const gdprApplies = consentObject &&
      consentObject.gdprApplies;
    const tcString = consentObject &&
      consentObject.tcString;

    if (!isBoolean(gdprApplies)) {
      return false;
    }

    if (gdprApplies === false) {
      return true;
    }

    return isStr(tcString);
  }

  storeV1Data(cmpConsentObject) {
    this.consentData.consentString = cmpConsentObject.getConsentData.consentData;
    this.consentData.vendorData = cmpConsentObject.getVendorConsents;
    this.consentData.gdprApplies = cmpConsentObject.getConsentData.gdprApplies;
    this.consentData.apiVersion = 1;
  }

  storeV2Data(cmpConsentObject) {
    this.consentData.consentString = cmpConsentObject.tcString;
    this.consentData.vendorData = cmpConsentObject;
    this.consentData.gdprApplies = cmpConsentObject.gdprApplies;
    this.consentData.apiVersion = 2;
  }

  /**
   * Simply resets the module's consentData.
   */
  resetConsentData() {
    this.consentData = undefined;
    this.storedPrivacyData = undefined;
    this._consentRequested = false;
  }

  /**
   * test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
   * @param {boolean} allowLocalStorageWithoutConsentApi
   * @param {boolean} debugBypassConsent
   * @returns {boolean|undefined} undefined in case no consent data and no stored privacy info is available
   */
  isLocalStorageAllowed(allowLocalStorageWithoutConsentApi, debugBypassConsent) {
    if (allowLocalStorageWithoutConsentApi === true || debugBypassConsent === true) {
      logWarn('Local storage access granted by configuration override, consent will not be checked');
      return true;
    } else if (!this.consentData) {
      // no cmp on page, so check if provisional access is allowed
      return this.isProvisionalLocalStorageAllowed();
    } else if (this.consentData.gdprApplies) {
      // gdpr applies
      if (!this.consentData.consentString || this.consentData.apiVersion === 0) {
        return false;
      } else if (this.consentData.apiVersion === 1 && this.consentData.vendorData &&
        this.consentData.vendorData.purposeConsents &&
        this.consentData.vendorData.purposeConsents['1'] === false) {
        return false;
      } else if (this.consentData.apiVersion === 2 && this.consentData.vendorData &&
        this.consentData.vendorData.purpose && this.consentData.vendorData.purpose.consents &&
        this.consentData.vendorData.purpose.consents['1'] === false) {
        return false;
      } else {
        return true;
      }
    } else {
      // we have consent data and it tells us gdpr doesn't apply
      return true;
    }
  }

  /**
   * if there is no CMP on page, consentData will be undefined, so we will check if we had stored
   * privacy data from a previous request to determine if we are allowed to access local storage.
   * if so, we use the previous authorization as a legal basis before calling our servers to confirm.
   * if we do not have any stored privacy data, we will need to call our servers to know if we
   * are in a jurisdiction that requires consent or not before accessing local storage.
   *
   * if there is no stored privacy data or jurisdiction wasn't set, will return undefined so the
   * caller can decide what to do with in that case
   *
   * @return {boolean|undefined}
   */
  isProvisionalLocalStorageAllowed() {
    if (!isPlainObject(this.storedPrivacyData)) {
      const privacyData = this.localStorage.getItemWithExpiration(CONSTANTS.STORAGE_CONFIG.PRIVACY);
      this.storedPrivacyData = privacyData && JSON.parse(privacyData);
    }

    if (this.storedPrivacyData && this.storedPrivacyData.id5_consent === true) {
      return true;
    } else if (!this.storedPrivacyData || typeof this.storedPrivacyData.jurisdiction === 'undefined') {
      return undefined;
    } else {
      const jurisdictionRequiresConsent = (typeof CONSTANTS.PRIVACY.JURISDICTIONS[this.storedPrivacyData.jurisdiction] !== 'undefined') ? CONSTANTS.PRIVACY.JURISDICTIONS[this.storedPrivacyData.jurisdiction] : false;
      return (jurisdictionRequiresConsent === false || this.storedPrivacyData.id5_consent === true);
    }
  }

  setStoredPrivacy(privacy) {
    try {
      if (isPlainObject(privacy)) {
        this.storedPrivacyData = privacy;
        this.localStorage.setItemWithExpiration(CONSTANTS.STORAGE_CONFIG.PRIVACY,
          JSON.stringify(privacy));
      } else {
        logInfo('Cannot store privacy if it is not an object: ', privacy);
      }
    } catch (e) {
      logError(e);
    }
  }

  /**
   * @typedef {Object} CMPDetails
   * @property {number} cmpVersion - Version of CMP Found, 0 if not found
   * @property {function} cmpFrame - The frame where the CPM function is declared
   * @property {function} cmpFunction - the CMP function to invoke
   *
   * This function tries to find the CMP in page.
   * @return {CMPDetails}
   */
  static findCMP() {
    let cmpVersion = 0;
    let f = window;
    let cmpFrame;
    let cmpFunction;
    while (!cmpFrame) {
      try {
        if (typeof f.__tcfapi === 'function' || typeof f.__cmp === 'function') {
          if (typeof f.__tcfapi === 'function') {
            cmpVersion = 2;
            cmpFunction = f.__tcfapi;
          } else {
            cmpVersion = 1;
            cmpFunction = f.__cmp;
          }
          cmpFrame = f;
          break;
        }
      } catch (e) { }

      // need separate try/catch blocks due to the exception errors
      // thrown when trying to check for a frame that doesn't exist
      // in 3rd party env
      try {
        if (f.frames['__tcfapiLocator']) {
          cmpVersion = 2;
          cmpFrame = f;
          break;
        }
      } catch (e) { }

      try {
        if (f.frames['__cmpLocator']) {
          cmpVersion = 1;
          cmpFrame = f;
          break;
        }
      } catch (e) { }

      if (f === window.top) break;
      f = f.parent;
    }
    return {
      cmpVersion,
      cmpFrame,
      cmpFunction
    };
  }
}
