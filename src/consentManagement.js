import * as utils from './utils';
import CONSTANTS from 'src/constants.json';

export let consentData;
export let staticConsentData;
export let storedPrivacyData;

let cmpVersion = 0;

const cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};

/**
 * This function reads the consent string from the config to obtain the consent information of the user.
 * @param {function(string, function(object))} cmpSuccess acts as a success callback when the value is read from config; pass along consentObject (string) from CMP
 * @param {function(object)} finalCallback acts as an error callback while interacting with the config string; pass along an error message (string)
 */
function lookupStaticConsentData(cmpSuccess, finalCallback) {
  cmpVersion = (staticConsentData.getConsentData) ? 1 : (staticConsentData.getTCData) ? 2 : 0;
  // remove extra layer in static v2 data object so it matches normal v2 CMP object for processing step
  if (cmpVersion === 2) {
    cmpSuccess(staticConsentData.getTCData, finalCallback);
  } else {
    cmpSuccess(staticConsentData, finalCallback);
  }
}

/**
 * This function handles async interacting with an IAB compliant CMP to obtain the consent information of the user.
 * @param {function(string, function(object))} cmpSuccess acts as a success callback when CMP returns a value; pass along consentObject (string) from CMP
 * @param {function(object)} finalCallback required;
 */
function lookupIabConsent(cmpSuccess, finalCallback) {
  function findCMP() {
    cmpVersion = 0;
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
      cmpFrame,
      cmpFunction
    };
  }

  function v2CmpResponseCallback(tcfData, success) {
    utils.logInfo('Received a response from CMP', tcfData);
    if (success) {
      if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
        cmpSuccess(tcfData, finalCallback);
      }
    } else {
      utils.logError(`CMP unable to register callback function.  Please check CMP setup.`);
      cmpSuccess(undefined, finalCallback);
      // TODO cmpError('CMP unable to register callback function.  Please check CMP setup.', hookConfig);
    }
  }

  function handleV1CmpResponseCallbacks() {
    const cmpResponse = {};

    function afterEach() {
      if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
        cmpSuccess(cmpResponse, finalCallback);
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
  let { cmpFrame, cmpFunction } = findCMP();

  if (!cmpFrame) {
    // TODO implement cmpError
    // return cmpError('CMP not found.', hookConfig);
    utils.logError(`CMP not found`);
    return cmpSuccess(undefined, finalCallback);
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
    cmpSuccess(undefined, finalCallback);
  }
}

/**
 * Try to fetch consent from CMP
 * @param {boolean} debugBypassConsent
 * @param {string} cmpApi - CMP Api to use
 * @param {object} [providedConsentData] - static consent data provided to ID5 API
 * @param {function(object)} finalCallback required; final callback
 */
export function requestConsent(debugBypassConsent, cmpApi, providedConsentData, finalCallback) {
  if (debugBypassConsent) {
    utils.logError('ID5 is operating in forced consent mode');
    finalCallback(consentData);
  } else if (!cmpCallMap[cmpApi]) {
    utils.logError(`Unknown consent API: ${cmpApi}`);
    resetConsentData();
    finalCallback(consentData);
  } else if (!consentData) {
    if (cmpApi === 'static') {
      if (utils.isPlainObject(providedConsentData)) {
        staticConsentData = providedConsentData;
      } else {
        utils.logError(`cmpApi: 'static' did not specify consentData.`);
      }
    }
    cmpCallMap[cmpApi].call(this, cmpSuccess, finalCallback);
  } else {
    finalCallback(consentData);
  }
}

/**
 * This function checks the consent data provided by CMP to ensure it's in an expected state.
 * @param {object} consentObject required; object returned by CMP that contains user's consent choices
 * @param {function(ConsentData)} finalCallback required; final callback receiving the consent
 */
function cmpSuccess(consentObject, finalCallback) {
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
  let checkFn = (cmpVersion === 1) ? checkV1Data : (cmpVersion === 2) ? checkV2Data : null;
  utils.logInfo('CMP Success callback for version', cmpVersion, checkFn);
  if (utils.isFn(checkFn)) {
    if (checkFn(consentObject)) {
      resetConsentData();
      utils.logError(`CMP returned unexpected value during lookup process.`, consentObject);
    } else {
      storeConsentData(consentObject);
    }
  } else {
    // TODO: Log unhandled CMP version
  }

  finalCallback(consentData);
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentData = undefined;
  storedPrivacyData = undefined;
}

/**
 * Stores CMP data locally in module
 * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function storeConsentData(cmpConsentObject) {
  if (cmpVersion === 1) {
    consentData = {
      consentString: (cmpConsentObject) ? cmpConsentObject.getConsentData.consentData : undefined,
      vendorData: (cmpConsentObject) ? cmpConsentObject.getVendorConsents : undefined,
      gdprApplies: (cmpConsentObject) ? cmpConsentObject.getConsentData.gdprApplies : undefined,
      apiVersion: 1
    };
  } else if (cmpVersion === 2) {
    consentData = {
      consentString: (cmpConsentObject) ? cmpConsentObject.tcString : undefined,
      vendorData: (cmpConsentObject) || undefined,
      gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : undefined,
      apiVersion: 2
    };
  } else {
    consentData = {
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
export function isLocalStorageAllowed(allowLocalStorageWithoutConsentApi, debugBypassConsent) {
  if (allowLocalStorageWithoutConsentApi === true || debugBypassConsent === true) {
    return true;
  } else if (!consentData) {
    // no cmp on page, so check if provisional access is allowed
    return isProvisionalLocalStorageAllowed();
  } else if (typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
    // gdpr applies
    if (!consentData.consentString || consentData.apiVersion === 0) {
      return false;
    } else if (consentData.apiVersion === 1 && consentData.vendorData && consentData.vendorData.purposeConsents && consentData.vendorData.purposeConsents['1'] === false) {
      return false;
    } else if (consentData.apiVersion === 2 && consentData.vendorData && consentData.vendorData.purpose && consentData.vendorData.purpose.consents && consentData.vendorData.purpose.consents['1'] === false) {
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
export function isProvisionalLocalStorageAllowed() {
  if (!utils.isPlainObject(storedPrivacyData)) {
    storedPrivacyData = JSON.parse(utils.getFromLocalStorage(CONSTANTS.STORAGE_CONFIG.PRIVACY));
  }

  if (storedPrivacyData && storedPrivacyData.id5_consent === true) {
    return true;
  } else if (!storedPrivacyData || typeof storedPrivacyData.jurisdiction === 'undefined') {
    return undefined;
  } else {
    const jurisdictionRequiresConsent = (typeof CONSTANTS.PRIVACY.JURISDICTIONS[storedPrivacyData.jurisdiction] !== 'undefined') ? CONSTANTS.PRIVACY.JURISDICTIONS[storedPrivacyData.jurisdiction] : false;
    return (jurisdictionRequiresConsent === false || storedPrivacyData.id5_consent === true);
  }
}

export function setStoredPrivacy(privacy) {
  try {
    if (utils.isPlainObject(privacy)) {
      storedPrivacyData = privacy;
      utils.setInLocalStorage(CONSTANTS.STORAGE_CONFIG.PRIVACY, JSON.stringify(privacy));
    } else {
      utils.logInfo('Cannot store privacy if it is not an object: ', privacy);
    }
  } catch (e) {
    utils.logError(e);
  }
}
