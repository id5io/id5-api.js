import * as utils from './utils';
import {config} from './config';

/**
 * @typedef {Object} ConsentData
 * @property {String|undefined} consentString -
 * @property {Object|undefined} vendorData -
 * @property {(boolean|undefined)} gdprApplies - does GDPR apply for this user ?
 */

/**
 * @property {ConsentData}
 */
export let consentData;

export let staticConsentData;

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
  function handleCmpResponseCallbacks() {
    const cmpResponse = {};

    function afterEach() {
      if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
        cmpSuccess(cmpResponse, finalCallback);
      }
    }

    return {
      consentDataCallback: function (consentResponse) {
        cmpResponse.getConsentData = consentResponse;
        afterEach();
      },
      vendorConsentsCallback: function (consentResponse) {
        cmpResponse.getVendorConsents = consentResponse;
        afterEach();
      }
    }
  }

  let callbackHandler = handleCmpResponseCallbacks();
  let cmpFunction;

  try {
    cmpFunction = window.__cmp || window.top.__cmp;
  } catch (e) { }

  if (utils.isFn(cmpFunction)) {
    cmpFunction('getConsentData', null, callbackHandler.consentDataCallback);
    cmpFunction('getVendorConsents', null, callbackHandler.vendorConsentsCallback);
  } else {
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
    utils.logWarn('ID5 is operating in forced consent mode');
  }
  if (!cmpCallMap[cfg.cmpApi]) {
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
  let gdprApplies = consentObject && consentObject.getConsentData && consentObject.getConsentData.gdprApplies;
  if (
    (typeof gdprApplies !== 'boolean') ||
    (gdprApplies === true &&
      !(utils.isStr(consentObject.getConsentData.consentData) &&
        utils.isPlainObject(consentObject.getVendorConsents) &&
        Object.keys(consentObject.getVendorConsents).length > 1
      )
    )
  ) {
    resetConsentData();
    utils.logError(`CMP returned unexpected value during lookup process.`, consentObject);
  } else {
    consentData = {
      consentString: (consentObject) ? consentObject.getConsentData.consentData : undefined,
      vendorData: (consentObject) ? consentObject.getVendorConsents : undefined,
      gdprApplies: (consentObject) ? consentObject.getConsentData.gdprApplies : undefined
    };
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
 * test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
 * @returns {boolean}
 */
export function isLocalStorageAllowed() {
  if (config.getConfig().allowID5WithoutConsentApi) {
    return true;
  } else if (!consentData) {
    return false;
  } else if (typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
    if (!consentData.consentString) {
      return false;
    } else if (consentData.vendorData && consentData.vendorData.purposeConsents && consentData.vendorData.purposeConsents['1'] === false) {
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
}
