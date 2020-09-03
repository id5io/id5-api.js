import * as utils from './utils';
import {config} from './config';

export let consentData;
export let staticConsentData;

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
  cmpSuccess(staticConsentData, finalCallback);
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
    // TODO might need to check if we're in an iframe...

    cmpSuccess(undefined, finalCallback);
  }
}

/**
 * Try to fetch consent from CMP
 * @param {string} cmpApi - API to use to fetch consent. Either iab or static
 * @param {function(object)} finalCallback required; final callback
 */
export function requestConsent(finalCallback) {
  const cfg = config.getConfig();
  if (cfg.allowID5WithoutConsentApi) {
    utils.logError('ID5 is operating in forced consent mode');
    finalCallback(consentData);
  } else if (!cmpCallMap[cfg.cmpApi]) {
    utils.logError(`Unknown consent API: ${cfg.cmpApi}`);
    resetConsentData();
    finalCallback(consentData);
  } else if (!consentData) {
    if (cfg.cmpApi === 'static') {
      if (utils.isPlainObject(config.getConfig().consentData)) {
        staticConsentData = config.getConfig().consentData;
      } else {
        utils.logError(`cmpApi: 'static' did not specify consentData.`);
      }
    }
    cmpCallMap[cfg.cmpApi].call(this, cmpSuccess, finalCallback);
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
  const cfg = config.getConfig();

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

  // do extra things for static config
  if (cfg.cmpApi === 'static') {
    cmpVersion = (consentObject.getConsentData) ? 1 : (consentObject.getTCData) ? 2 : 0;
    // remove extra layer in static v2 data object so it matches normal v2 CMP object for processing step
    if (cmpVersion === 2) {
      consentObject = consentObject.getTCData;
    }
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
  }

  finalCallback(consentData);
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
export function resetConsentData() {
  consentData = undefined;
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
 * @returns {boolean}
 */
export function isLocalStorageAllowed() {
  if (config.getConfig().allowID5WithoutConsentApi) {
    return true;
  } else if (!consentData) {
    return false;
  } else if (typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
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
    return true;
  }
}
