import {
  delve,
  isArray,
  isBoolean,
  isFn,
  isPlainObject,
  isStr
} from './utils.js';
import {isPurposeConsentSet} from './tcfUtils.js';
import {API_TYPE, ConsentData} from './consentManagement.js';
import {NoopLogger} from '@id5io/multiplexing';

const USPAPI_VERSION = 1;
const SURROGATE_CONFIG = {
  tcfv1: {
    objName: '__cmpCall',
    objKeys: ['command', 'parameter'],
    returnObjName: '__cmpReturn'
  },
  tcfv2: {
    objName: '__tcfapiCall',
    objKeys: ['command', 'version'],
    returnObjName: '__tcfapiReturn'
  },
  uspv1: {
    objName: '__uspapiCall',
    objKeys: ['command', 'version'],
    returnObjName: '__uspapiReturn'
  }
};

export class ConsentDataProvider {
  _lookupInProgress;
  _log;

  /**
   * @param {Logger} log
   */
  constructor(log = NoopLogger) {
    this._log = log;
  }

  refreshConsentData(debugBypassConsent, cmpApi, providedConsentData) {
    const self = this;
    if (!self._lookupInProgress) {
      self._lookupInProgress = true;
      self._consentDataPromise = this._lookupConsentData(debugBypassConsent, cmpApi, providedConsentData)
        .finally(() => {
          self._lookupInProgress = false;
        });
    }
    return this._consentDataPromise;
  }

  /**
   * Try to fetch consent from CMP. Main entry point to retrieve consent data.
   * @param {boolean} debugBypassConsent
   * @param {string} cmpApi - CMP Api to use
   * @param {object} [providedConsentData] - static consent data provided to ID5 API at init() time
   * @return {Promise<ConsentData>}  consentData promise
   * @private
   */
  _lookupConsentData(debugBypassConsent, cmpApi, providedConsentData) {
    if (debugBypassConsent) {
      this._log.warn('cmpApi: ID5 is operating in forced consent mode and will not retrieve any consent signals from the CMP');
      let consentData = new ConsentData();
      consentData.forcedGrantByConfig = true;
      return Promise.resolve(consentData);
    } else {
      switch (cmpApi) {
        case 'static':
          return new Promise((resolve, reject) => {
            this._parseStaticConsentData(providedConsentData, resolve);
          });
        case 'iab':
          return new Promise((resolve, reject) => {
            this._lookupIabConsent(resolve);
          });
        default:
          this._log.error(`cmpApi: Unknown consent API: ${cmpApi}`);
          return Promise.reject(new Error(`Unknown consent API: ${cmpApi}`));
      }
    }
  }

  /**
   * This function reads the consent string from the config to obtain the consent
   * information of the user.
   * @param {Object} data the data passed in the static configuration
   * @param {function(ConsentData)} finalCallback required; final callback
   * @private
   */
  _parseStaticConsentData(data, finalCallback) {
    data = data || {};

    let consentData = new ConsentData();
    // Try to detect the API from the static object structure
    let mergeData = {};
    if (isPlainObject(data.getConsentData)) {
      mergeData = this._parseTcfData(data, 1);
    } else if (isPlainObject(data.getTCData)) {
      mergeData = this._parseTcfData(data.getTCData, 2);
    } else if (isArray(data.allowedVendors)) {
      mergeData = {
        api: API_TYPE.ID5_ALLOWED_VENDORS,
        allowedVendors: data.allowedVendors.map(item => String(item)),
        gdprApplies: true
      };
    } else if (isPlainObject(data.getUSPData)) {
      mergeData = this._parseUspData(data.getUSPData);
    } else {
      this._log.warn('cmpApi: No static consent data detected! Using defaults.');
    }
    Object.assign(consentData, mergeData);
    this._log.info(`cmpApi: Detected API '${consentData.api}' from static consent data`, data);
    finalCallback(consentData);
  }

  /**
   * This function handles async interacting with an IAB compliant CMP
   * to obtain the consent information of the user.
   * @param {function(ConsentData)} finalCallback required; final callback
   * @private
   */
  _lookupIabConsent(finalCallback) {
    const done = [];
    let consentData = new ConsentData();
    // Builds callbacks for the various APIs. It does debouncing and groups
    // the result from all callbacks. It assumes all callbacks are created
    // before any of them fires.
    const makeCallback = (callbackPos) => {
      done[callbackPos] = false;
      return (result) => {
        if (!done[callbackPos]) {
          done[callbackPos] = true;
          if (result) {
            Object.assign(consentData, result);
          }
          if (done.every(d => d)) {
            finalCallback(consentData);
          }
        }
      };
    };

    const callbackTcf = makeCallback(0);
    const callbackUsp = makeCallback(1);
    this._lookupTcf(callbackTcf);
    this._lookupUsp(callbackUsp);
  }

  /**
   * @param callback
   * @private
   */
  _lookupUsp(callback) {
    const {uspapiFrame, uspapiFunction} = ConsentDataProvider._findUsp();
    let uspFn;
    if (!uspapiFrame) {
      this._log.warn('cmpApi: USP not found! Using defaults for CCPA.');
      callback();
      return;
    }

    if (isFn(uspapiFunction)) {
      this._log.info('cmpApi: Detected USP is directly accessible, calling it now.');
      uspFn = uspapiFunction;
    } else {
      this._log.info('cmpApi: Detected USP is outside the current iframe. Using message passing.');
      uspFn = ConsentDataProvider._buildCmpSurrogate('uspv1', uspapiFrame);
    }

    const uspCallback = (consentResponse, success) => {
      if (success) {
        callback(this._parseUspData(consentResponse));
      } else {
        this._log.error('cmpApi: USP callback not successful. Using defaults for CCPA.');
        callback();
      }
    };
    uspFn('getUSPData', USPAPI_VERSION, uspCallback);
  }

  /**
   * This function builds a surrogate CMP function which behaves as the original
   * except it uses message passing to communicate to the CMP function of choice
   * @param {string} typeOfCall decides how to build the function based on the CMP type
   * @param {Object} apiFrame the frame where the API is located. Discovered by detection.
   * @returns {function} the function to call
   * @private
   */
  static _buildCmpSurrogate(typeOfCall, apiFrame) {
    return (param0, param1, messageCallback) => {
      const callId = Math.random() + '';
      const config = SURROGATE_CONFIG[typeOfCall];
      const msg = {};
      const requestObj = {};
      requestObj[config.objKeys[0]] = param0;
      requestObj[config.objKeys[1]] = param1;
      requestObj.callId = callId;
      msg[config.objName] = requestObj;
      const eventHandler = (event) => {
        const result = delve(event, `data.${config.returnObjName}`);
        if (result && result.callId === callId) {
          window.removeEventListener('message', eventHandler);
          messageCallback(result.returnValue, result.success);
        }
      };
      window.addEventListener('message', eventHandler, false);
      apiFrame.postMessage(msg, '*');
    };
  }

  /**
   * @private
   */
  _lookupTcf(callback) {
    const {cmpVersion, cmpFrame, cmpFunction} = ConsentDataProvider._findTCF();
    if (!cmpFrame) {
      this._log.warn('cmpApi: TCF not found! Using defaults for GDPR.');
      callback();
      return;
    }

    if (isFn(cmpFunction)) {
      this._lookupDirectTcf(cmpVersion, cmpFunction, callback);
    } else {
      this._log.info('cmpApi: Detected TCF is outside the current iframe. Using message passing.');
      this._lookupMessageTcf(cmpVersion, cmpFrame, callback);
    }
  }

  /**
   * @private
   */
  _lookupMessageTcf(cmpVersion, cmpFrame, callback) {
    const cmpFunction = ConsentDataProvider._buildCmpSurrogate(cmpVersion === 1 ? 'tcfv1' : 'tcfv2', cmpFrame);
    this._lookupDirectTcf(cmpVersion, cmpFunction, callback);
  }

  /**
   * @private
   */
  _lookupDirectTcf(cmpVersion, cmpFunction, callback) {
    // TCF V1 callbacks
    const log = this._log;
    const cmpResponse = {};
    const done = {};
    const logcb = (version, callback, data) => {
      log.info(`cmpApi: TCFv${version} - Received a call back: ${callback}`, data);
    };
    const logNoSuccess = (version, callback) => {
      log.error(`cmpApi: TCFv${version} - Received insuccess: ${callback}. Please check your CMP setup. Using defaults for GDPR.`);
    };
    const makeV1Callback = (verb) => {
      done[verb] = false;
      return (data, success) => {
        done[verb] = true;
        if (!success) {
          logNoSuccess(1, verb);
        } else {
          logcb(1, verb, data);
          cmpResponse[verb] = data;
        }
        if (Object.values(done).every(d => d)) {
          callback(this._parseTcfData(cmpResponse, 1));
        }
      };
    };

    // TCF V2 callback
    const v2CmpResponseCallback = (tcfData, success) => {
      logcb(2, 'event', tcfData);
      if (!success) {
        logNoSuccess(2, 'addEventListener');
        callback();
        return;
      }
      if (tcfData &&
        (tcfData.gdprApplies === false ||
          tcfData.eventStatus === 'tcloaded' ||
          tcfData.eventStatus === 'useractioncomplete')
      ) {
        callback(this._parseTcfData(tcfData, 2));
      }
    };

    if (cmpVersion === 1) {
      const consentDataCallback = makeV1Callback('getConsentData');
      const vendorConsentsCallback = makeV1Callback('getVendorConsents');
      cmpFunction('getConsentData', null, consentDataCallback);
      cmpFunction('getVendorConsents', null, vendorConsentsCallback);
    } else if (cmpVersion === 2) {
      cmpFunction('addEventListener', cmpVersion, v2CmpResponseCallback);
    }
  }

  /**
   * This function checks the consent data provided by USP to ensure it's in an expected state.
   * @param {object} consentObject required; object returned by CMP that contains user's consent choices
   * @returns {Object} the parsed consent data
   * @private
   */
  _parseUspData(consentObject) {
    if (!isPlainObject(consentObject) ||
      !isStr(consentObject.uspString)
    ) {
      this._log.error('cmpApi: No or malformed USP data. Using defaults for CCPA.');
      return;
    }
    return {
      api: API_TYPE.USP_V1,
      hasCcpaString: true,
      ccpaString: consentObject.uspString
    };
  }

  /**
   * This function checks the consent data provided by CMP to ensure it's in an expected state.
   * @param {object} consentObject required; object returned by CMP that contains user's consent choices
   * @param {number} cmpVersion the version reported by the CMP framework
   * @returns {Object} the parsed consent data
   * @private
   */
  _parseTcfData(consentObject, cmpVersion) {
    let log = this._log;
    let isValid, normalizeFn;
    if (cmpVersion === 1) {
      isValid = ConsentDataProvider._isValidV1ConsentObject;
      normalizeFn = ConsentDataProvider._normalizeV1Data;
    } else if (cmpVersion === 2) {
      isValid = ConsentDataProvider._isValidV2ConsentObject;
      normalizeFn = ConsentDataProvider._normalizeV2Data;
    } else {
      log.error('cmpApi: No or malformed CMP data. Using defaults for GDPR.');
      return;
    }

    if (!isValid(consentObject)) {
      log.error('cmpApi: Invalid CMP data. Using defaults for GDPR.', consentObject);
      return;
    }
    return normalizeFn(consentObject);
  }

  /**
   * @private
   */
  static _isValidV1ConsentObject(consentObject) {
    const gdprApplies = delve(consentObject, 'getConsentData.gdprApplies');

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
   * @private
   */
  static _isValidV2ConsentObject(consentObject) {
    const gdprApplies = consentObject &&
      consentObject.gdprApplies;
    const tcString = consentObject &&
      consentObject.tcString;

    if (gdprApplies === false) {
      return true;
    }

    return isStr(tcString);
  }

  /**
   * @private
   */
  static _normalizeV1Data(cmpConsentObject) {
    return {
      consentString: cmpConsentObject.getConsentData.consentData,
      localStoragePurposeConsent: delve(cmpConsentObject, 'getVendorConsents.purposeConsents.1'),
      gdprApplies: cmpConsentObject.getConsentData.gdprApplies,
      api: API_TYPE.TCF_V1
    };
  }

  /**
   * @private
   */
  static _normalizeV2Data(cmpConsentObject) {
    let decodedStorageConsent = delve(cmpConsentObject, 'purpose.consents.1');
    if (!isBoolean(decodedStorageConsent)) {
      decodedStorageConsent = isPurposeConsentSet(cmpConsentObject.tcString, 1);
    }
    return {
      consentString: cmpConsentObject.tcString,
      localStoragePurposeConsent: decodedStorageConsent,
      gdprApplies: cmpConsentObject.gdprApplies,
      api: API_TYPE.TCF_V2
    };
  }

  /**
   * @typedef {Object} CMPDetails
   * @property {number} cmpVersion - Version of CMP Found, 0 if not found
   * @property {Object} cmpFrame - The frame where the CPM function is declared
   * @property {function} cmpFunction - the CMP function to invoke
   *
   * This function tries to find the CMP in page.
   * @return {CMPDetails}
   * @private
   */
  static _findTCF() {
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
      } catch (e) {
      }

      // need separate try/catch blocks due to the exception errors
      // thrown when trying to check for a frame that doesn't exist
      // in 3rd party env
      try {
        if (f.frames['__tcfapiLocator']) {
          cmpVersion = 2;
          cmpFrame = f;
          break;
        }
      } catch (e) {
      }

      try {
        if (f.frames['__cmpLocator']) {
          cmpVersion = 1;
          cmpFrame = f;
          break;
        }
      } catch (e) {
      }

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
   * @private
   */
  static _findUsp() {
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
      } catch (e) {
      }

      try {
        if (f.frames['__uspapiLocator']) {
          uspapiFrame = f;
          break;
        }
      } catch (e) {
      }
      if (f === window.top) break;
      f = f.parent;
    }
    return {
      uspapiFrame,
      uspapiFunction
    };
  }
}
