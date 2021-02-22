import * as utils from './utils';
import CONSTANTS from 'src/constants.json';

export default class ConsentManagement {
  consentData;
  staticConsentData;
  storedPrivacyData;
  cmpVersion = 0;

  cmpCallMap = {
    'iab': this.lookupIabConsent,
    'static': this.lookupStaticConsentData
  };

  /**
   * This function reads the consent string from the config to obtain the consent information of the user.
   * @param {function(ConsentManagement, string, function(object))} cmpSuccess acts as a success callback when the value is read from config; pass along consentObject (string) from CMP
   * @param {function(object)} finalCallback acts as an error callback while interacting with the config string; pass along an error message (string)
   */
  lookupStaticConsentData(cmpSuccess, finalCallback) {
    this.cmpVersion = (this.staticConsentData.getConsentData) ? 1 : (this.staticConsentData.getTCData) ? 2 : 0;
    utils.logInfo(`Using static consent data from config for TCF v${this.cmpVersion}`, this.staticConsentData);

    if (this.cmpVersion === 2) {
      // remove extra layer in static v2 data object so it matches normal v2 CMP object for processing step
      cmpSuccess(this, this.staticConsentData.getTCData, finalCallback);
    } else {
      cmpSuccess(this, this.staticConsentData, finalCallback);
    }
  }

  /**
   * @typedef {Object} CMPDetails
   * @property {number} cmpVersion - Version of CMP Found, 0 if not found
   * @property {function} [cmpFrame] -
   * @property {function} [cmpFunction] -
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

      // need separate try/catch blocks due to the exception errors thrown when trying to check for a frame that doesn't exist in 3rd party env
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
   * This function handles async interacting with an IAB compliant CMP to obtain the consent information of the user.
   * @param {function(ConsentManagement, string, function(object))} cmpSuccess acts as a success callback when CMP returns a value; pass along consentObject (string) from CMP
   * @param {function(object)} finalCallback required;
   */
  lookupIabConsent(cmpSuccess, finalCallback) {
    const consentThis = this;
    function v2CmpResponseCallback(tcfData, success) {
      utils.logInfo('Received a response from CMP', tcfData);
      if (success) {
        if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
          cmpSuccess(consentThis, tcfData, finalCallback);
        }
      } else {
        utils.logError(`CMP unable to register callback function.  Please check CMP setup.`);
        cmpSuccess(consentThis, undefined, finalCallback);
        // TODO cmpError('CMP unable to register callback function.  Please check CMP setup.', hookConfig);
      }
    }

    function handleV1CmpResponseCallbacks() {
      const cmpResponse = {};

      function afterEach() {
        if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
          cmpSuccess(consentThis, cmpResponse, finalCallback);
        }
      }

      return {
        consentDataCallback: function (consentResponse) {
          utils.logInfo(`cmpApi: consentDataCallback`);
          cmpResponse.getConsentData = consentResponse;
          afterEach();
        },
        vendorConsentsCallback: function (consentResponse) {
          utils.logInfo(`cmpApi: vendorConsentsCallback`);
          cmpResponse.getVendorConsents = consentResponse;
          afterEach();
        }
      }
    }

    let v1CallbackHandler = handleV1CmpResponseCallbacks();
    let {cmpVersion, cmpFrame, cmpFunction} = ConsentManagement.findCMP();
    this.cmpVersion = cmpVersion;

    if (!cmpFrame) {
      // TODO implement cmpError
      // return cmpError('CMP not found.', hookConfig);
      utils.logError(`CMP not found`);
      cmpSuccess(consentThis, undefined, finalCallback);
      return;
    }

    if (utils.isFn(cmpFunction)) {
      utils.logInfo(`cmpApi: calling getConsentData & getVendorConsents`);
      if (cmpVersion === 1) {
        cmpFunction('getConsentData', null, v1CallbackHandler.consentDataCallback);
        cmpFunction('getVendorConsents', null, v1CallbackHandler.vendorConsentsCallback);
      } else if (cmpVersion === 2) {
        cmpFunction('addEventListener', cmpVersion, v2CmpResponseCallback);
      }
    } else {
      cmpSuccess(consentThis, undefined, finalCallback);
    }
  }

  /**
   * Try to fetch consent from CMP
   * @param {boolean} debugBypassConsent
   * @param {string} cmpApi - CMP Api to use
   * @param {object} [providedConsentData] - static consent data provided to ID5 API
   * @param {function(object)} finalCallback required; final callback
   */
  requestConsent(debugBypassConsent, cmpApi, providedConsentData, finalCallback) {
    if (debugBypassConsent) {
      utils.logWarn('ID5 is operating in forced consent mode and will not retrieve any consent signals from the CMP');
      finalCallback(this.consentData);
    } else if (!this.cmpCallMap[cmpApi]) {
      utils.logError(`Unknown consent API: ${cmpApi}`);
      this.resetConsentData();
      finalCallback(this.consentData);
    } else if (!this.consentData) {
      if (cmpApi === 'static') {
        if (utils.isPlainObject(providedConsentData)) {
          this.staticConsentData = providedConsentData;
        } else {
          utils.logError(`cmpApi: 'static' did not specify consent data.`);
        }
      }
      this.cmpCallMap[cmpApi].call(this, ConsentManagement.cmpSuccess, finalCallback);
    } else {
      finalCallback(this.consentData);
    }
  }

  /**
   * This function checks the consent data provided by CMP to ensure it's in an expected state.
   * @param {ConsentManagement} consentThis
   * @param {object} consentObject required; object returned by CMP that contains user's consent choices
   * @param {function(object)} finalCallback required; final callback receiving the consent
   */
  static cmpSuccess(consentThis, consentObject, finalCallback) {
    function checkV1Data(consentObject) {
      let gdprApplies = consentObject && consentObject.getConsentData && consentObject.getConsentData.gdprApplies;
      return !!(
        (typeof gdprApplies !== 'boolean') ||
        (gdprApplies === true &&
          !(utils.isStr(consentObject.getConsentData.consentData) &&
            utils.isPlainObject(consentObject.getVendorConsents) &&
            Object.keys(consentObject.getVendorConsents).length > 1
          )
        )
      );
    }

    function checkV2Data() {
      let gdprApplies = consentObject && typeof consentObject.gdprApplies === 'boolean' ? consentObject.gdprApplies : undefined;
      let tcString = consentObject && consentObject.tcString;
      return !!(
        (typeof gdprApplies !== 'boolean') ||
        (gdprApplies === true && !utils.isStr(tcString))
      );
    }

    // determine which set of checks to run based on cmpVersion
    let checkFn = (consentThis.cmpVersion === 1) ? checkV1Data : (consentThis.cmpVersion === 2) ? checkV2Data : null;
    utils.logInfo('CMP Success callback for version', consentThis.cmpVersion, checkFn);
    if (utils.isFn(checkFn)) {
      if (checkFn(consentObject)) {
        consentThis.resetConsentData();
        utils.logError(`CMP returned unexpected value during lookup process.`, consentObject);
      } else {
        consentThis.storeConsentData(consentObject);
      }
    } else {
      // TODO: Log unhandled CMP version
    }

    finalCallback(consentThis.consentData);
  }

  /**
   * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
   */
  resetConsentData() {
    this.consentData = undefined;
    this.storedPrivacyData = undefined;
  }

  /**
   * Stores CMP data locally in module
   * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
   */
  storeConsentData(cmpConsentObject) {
    if (this.cmpVersion === 1) {
      this.consentData = {
        consentString: (cmpConsentObject) ? cmpConsentObject.getConsentData.consentData : undefined,
        vendorData: (cmpConsentObject) ? cmpConsentObject.getVendorConsents : undefined,
        gdprApplies: (cmpConsentObject) ? cmpConsentObject.getConsentData.gdprApplies : undefined,
        apiVersion: 1
      };
    } else if (this.cmpVersion === 2) {
      this.consentData = {
        consentString: (cmpConsentObject) ? cmpConsentObject.tcString : undefined,
        vendorData: (cmpConsentObject) || undefined,
        gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : undefined,
        apiVersion: 2
      };
    } else {
      this.consentData = {
        apiVersion: 0
      };
    }
  }

  /**
   * test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
   * @param {boolean} allowLocalStorageWithoutConsentApi
   * @param {boolean} debugBypassConsent
   * @returns {boolean}
   */
  isLocalStorageAllowed(allowLocalStorageWithoutConsentApi, debugBypassConsent) {
    if (allowLocalStorageWithoutConsentApi === true || debugBypassConsent === true) {
      utils.logWarn('Local storage access granted by configuration override, consent will not be checked');
      return true;
    } else if (!this.consentData) {
      // no cmp on page, so check if provisional access is allowed
      return this.isProvisionalLocalStorageAllowed();
    } else if (typeof this.consentData.gdprApplies === 'boolean' && this.consentData.gdprApplies) {
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
   * @return boolean|undefined
   */
  isProvisionalLocalStorageAllowed() {
    if (!utils.isPlainObject(this.storedPrivacyData)) {
      this.storedPrivacyData = JSON.parse(utils.getFromLocalStorage(CONSTANTS.STORAGE_CONFIG.PRIVACY));
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
      if (utils.isPlainObject(privacy)) {
        this.storedPrivacyData = privacy;
        utils.setInLocalStorage(CONSTANTS.STORAGE_CONFIG.PRIVACY, JSON.stringify(privacy));
      } else {
        utils.logInfo('Cannot store privacy if it is not an object: ', privacy);
      }
    } catch (e) {
      utils.logError(e);
    }
  }
}
