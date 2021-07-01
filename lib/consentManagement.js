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

const USPAPI_VERSION = 1;

export class ConsentData {
  /**
   * The GDPR consent string in case GDPR applies
   * @type {string}
   */
  consentString = '';

  /** @type {boolean} */
  gdprApplies = false;

  /** @type {Object} */
  vendorData = {};

  /**
   * The IAB TCF version number
   * @type {number}
   */
  apiVersion = 0;

  /** @type {boolean} */
  hasCcpaString = false;

  /** @type {string} */
  ccpaString = '';

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

  /** @type {boolean} */
  tcfDetected = false;

  /** @type {boolean} */
  uspDetected = false;

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
      logWarn('cmpApi: ID5 is operating in forced consent mode and will not retrieve any consent signals from the CMP');
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
          logError(`cmpApi: Unknown consent API: ${cmpApi}`);
          this.resetConsentData();
          finalCallback(this.consentData);
          break;
      }
    } else {
      finalCallback(this.consentData);
    }
  }

  getOrCreateConsentData() {
    if (!this.consentData) {
      this.consentData = new ConsentData();
    }
    return this.consentData;
  }

  logErrorIfNoConsentDataDetected() {
    if (!this.tcfDetected && !this.uspDetected) {
      logError('cmpApi: Neither CMP nor USP detected! Using defaults.');
    }
  }

  /**
   * This function reads the consent string from the config to obtain the consent
   * information of the user.
   * @param {Object} data the data passed in the static configuration
   * @param {function(ConsentData)} finalCallback required; final callback
   */
  parseStaticConsentData(data, finalCallback) {
    if (!isPlainObject(data)) {
      logError('cmpApi: "static" did not specify consent data. Using defaults.');
      finalCallback(this.consentData);
      return;
    }

    // Try to detect the CMP version from the static object structure
    const cmpVersion = (data.getConsentData) ? 1 : (data.getTCData) ? 2 : 0;

    const logIt = (info, data) => {
      logInfo(`cmpApi: Using static consent data from config for ${info}`, data);
    };

    if (cmpVersion > 0) {
      logIt(`TCF v${this.cmpVersion}`, data);
      this.tcfDetected = true;
      const tcfData = ConsentManagement.parseTcfData(cmpVersion === 2 ? data.getTCData : data, cmpVersion);
      if (tcfData) {
        Object.assign(this.getOrCreateConsentData(), tcfData);
      }
    }
    if (isPlainObject(data.getUSPData)) {
      logIt('USP', data);
      this.uspDetected = true;
      const uspData = ConsentManagement.parseUspData(data.getUSPData);
      if (uspData) {
        Object.assign(this.getOrCreateConsentData(), uspData);
      }
    }
    this.logErrorIfNoConsentDataDetected();
    finalCallback(this.consentData);
  }

  /**
   * This function handles async interacting with an IAB compliant CMP
   * to obtain the consent information of the user.
   * @param {function(ConsentData)} finalCallback required; final callback
   */
  lookupIabConsent(finalCallback) {
    const self = this;
    let tcfDone = false;
    let ccpaDone = false;

    // I wish I had promises, but they are too expensive to keep...
    const done = (result) => {
      if (result) {
        Object.assign(self.getOrCreateConsentData(), result);
      }
      if (tcfDone && ccpaDone) {
        self.logErrorIfNoConsentDataDetected();
        finalCallback(self.consentData);
      }
    };

    this.lookupTcf((result) => {
      tcfDone = true;
      done(result);
    });

    this.lookupUsp((result) => {
      ccpaDone = true;
      done(result);
    });
  }

  lookupUsp(callback) {
    const { uspapiFrame, uspapiFunction } = ConsentManagement.findUsp();
    let uspFn;
    if (!uspapiFrame) {
      logInfo('cmpApi: USP not found! Using defaults for CCPA.');
      callback();
      return;
    }
    this.uspDetected = true;

    if (isFn(uspapiFunction)) {
      logInfo('cmpApi: Detected USP is directly accessible, calling it now.');
      uspFn = uspapiFunction;
    } else {
      logInfo('cmpApi: Detected USP is outside the current iframe. Using message passing.');
      uspFn = (command, version, messageCallback) => {
        const callId = Math.random() + '';
        const msg = {
          __uspapiCall: {
            command: command,
            version: version,
            callId: callId,
          }
        };
        window.addEventListener('message', (event) => {
          const result = event && event.data && event.data.__uspapiReturn;
          if (result && result.callId === callId) {
            messageCallback(result.returnValue, result.success);
          }
        }, false);
        uspapiFrame.postMessage(msg, '*');
      };
    }

    const uspCallback = (consentResponse, success) => {
      if (success) {
        callback(ConsentManagement.parseUspData(consentResponse));
      } else {
        logError('cmpApi: USP callback not succesful. Using defaults for CCPA.');
      }
    };
    uspFn('getUSPData', USPAPI_VERSION, uspCallback);
  }

  lookupTcf(callback) {
    const { cmpVersion, cmpFrame, cmpFunction } = ConsentManagement.findCMP();
    if (!cmpFrame || !isFn(cmpFunction)) {
      callback();
      return;
    }

    this.tcfDetected = true;

    // TCF V1 callbacks
    const cmpResponse = {};
    let consentDone = false;
    let vendorsDone = false;
    const done = () => {
      if (consentDone && vendorsDone) {
        callback(ConsentManagement.parseTcfData(cmpResponse, 1));
      }
    };
    const consentDataCallback = (data) => {
      logInfo('cmpApi: consentDataCallback');
      cmpResponse.getConsentData = data;
      consentDone = true;
      done();
    };
    const vendorConsentsCallback = (data) => {
      logInfo('cmpApi: vendorConsentsCallback');
      cmpResponse.getVendorConsents = data;
      vendorsDone = true;
      done();
    };

    // TCF V2 callback
    const v2CmpResponseCallback = (tcfData, success) => {
      logInfo('cmpApi: Received a response from CMP', tcfData);
      if (!success) {
        logError('cmpApi: CMP unable to register callback function. Please check CMP setup. Using defaults for GDPR.');
        callback();
        return;
      }
      if (tcfData.gdprApplies === false ||
        tcfData.eventStatus === 'tcloaded' ||
        tcfData.eventStatus === 'useractioncomplete'
      ) {
        callback(ConsentManagement.parseTcfData(tcfData, 2));
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
   * This function checks the consent data provided by USP to ensure it's in an expected state.
   * @param {object} consentObject required; object returned by CMP that contains user's consent choices
   * @param {number} cmpVersion the version reported by the CMP framework
   * @returns {Object} the parsed consent data
   */
  static parseUspData(consentObject) {
    if (!isPlainObject(consentObject) ||
      !isStr(consentObject.uspString)
    ) {
      logError('cmpApi: No or malformed USP data. Using defaults for CCPA.');
      return;
    }

    return {
      ccpaApplies: true,
      ccpaString: consentObject.uspString
    };
  }

  /**
   * This function checks the consent data provided by CMP to ensure it's in an expected state.
   * @param {object} consentObject required; object returned by CMP that contains user's consent choices
   * @param {number} cmpVersion the version reported by the CMP framework
   * @returns {Object} the parsed consent data
   */
  static parseTcfData(consentObject, cmpVersion) {
    let isValid, normalizeFn;
    if (cmpVersion === 1) {
      isValid = ConsentManagement.isValidV1ConsentObject;
      normalizeFn = ConsentManagement.normalizeV1Data;
    } else if (cmpVersion === 2) {
      isValid = ConsentManagement.isValidV2ConsentObject;
      normalizeFn = ConsentManagement.normalizeV2Data;
    } else {
      logError('cmpApi: No or malformed CMP data. Using defaults for GDPR.');
      return;
    }

    if (!isValid(consentObject)) {
      logError('cmpApi: Invalid consentObject. Using defaults for GDPR.', consentObject);
      return;
    }

    return normalizeFn(consentObject);
  }

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

  static normalizeV1Data(cmpConsentObject) {
    return {
      consentString: cmpConsentObject.getConsentData.consentData,
      vendorData: cmpConsentObject.getVendorConsents,
      gdprApplies: cmpConsentObject.getConsentData.gdprApplies,
      apiVersion: 1
    };
  }

  static normalizeV2Data(cmpConsentObject) {
    return {
      consentString: cmpConsentObject.tcString,
      vendorData: cmpConsentObject,
      gdprApplies: cmpConsentObject.gdprApplies,
      apiVersion: 2
    };
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
      logWarn('cmpApi: Local storage access granted by configuration override, consent will not be checked');
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
        logInfo('cmpApi: Cannot store privacy if it is not an object: ', privacy);
      }
    } catch (e) {
      logError(e);
    }
  }

  /**
   * @typedef {Object} CMPDetails
   * @property {number} cmpVersion - Version of CMP Found, 0 if not found
   * @property {Object} cmpFrame - The frame where the CPM function is declared
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

  /**
   * @typedef {Object} UspDetails
   * @property {Object} uspapiFrame - The frame where the CPM function is declared
   * @property {function} uspapiFunction - the CMP function to invoke
   *
   * This function tries to find the CMP in page.
   * @return {UspDetails}
   */
  static findUsp() {
    let f = window;
    let uspapiFrame;
    let uspapiFunction;

    while (!uspapiFrame) {
      try {
        if (typeof f.__uspapi === 'function') {
          uspapiFunction = f.__uspapi;
          uspapiFrame = f;
          break;
        }
      } catch (e) {}

      try {
        if (f.frames['__uspapiLocator']) {
          uspapiFrame = f;
          break;
        }
      } catch (e) {}
      if (f === window.top) break;
      f = f.parent;
    }
    return {
      uspapiFrame,
      uspapiFunction
    };
  }
}
