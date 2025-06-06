import {delve, isArray, isBoolean, isFn, isPlainObject, isStr} from './utils.js';
import {isPurposeConsentSet} from './tcfUtils.js';
import {NO_OP_LOGGER} from '@id5io/multiplexing/logger';
import {API_TYPE, ConsentData, ConsentSource,GPP_SECTIONS,
  GppConsentData, GppTcfData,
  ID5_GVL_ID
} from '@id5io/multiplexing/consent';
import {consentDiscrepancyCounter} from './metrics.js';

const USPAPI_VERSION = 1;
const SURROGATE_CONFIG = Object.freeze({
  tcfv2: {
    objName: '__tcfapiCall',
    objKeys: ['command', 'version'],
    returnObjName: '__tcfapiReturn'
  },
  uspv1: {
    objName: '__uspapiCall',
    objKeys: ['command', 'version'],
    returnObjName: '__uspapiReturn'
  },
  gppv1: {
    objName: '__gppCall',
    objKeys: ['command', 'parameter'],
    returnObjName: '__gppReturn'
  }
});

const CALLBACK_POSITIONS = Object.freeze({
  TCF: 0,
  USP: 1,
  GPP: 2
});

const STORAGE_PURPOSE = 1;
const CA_STORAGE_PURPOSE = 10;

export class GPPClient {
  direct;
  version;

  constructor(direct, version) {
    this.direct = direct;
    this.version = version;
  }

  /** @returns {Promise<GppConsentData>} */
  async getConsentData() {
    return this.getClientConsentData(); // needs to be implemented by clients
  }

  /**
   * @param {Logger} log
   * @param {MeterRegistry} metrics
   * @return {Promise<GPPClient>}
   */
  static async create(log, metrics) {
    const {cmpApiFrame: gppApiFrame, cmpApiFunction: gppApiFunction} = ConsentDataProvider._findCmpApi('__gpp');
    let gppFn;
    let direct = false;
    if (!gppApiFrame) {
      log.warn('cmpApi: GPP not found! Using defaults.');
      return Promise.resolve();
    }

    if (isFn(gppApiFunction)) {
      direct = true;
      log.info('cmpApi: Detected GPP is directly accessible, calling it now.');
      gppFn = gppApiFunction;
    } else {
      log.info('cmpApi: Detected GPP is outside the current iframe. Using message passing.');
      const surrogate = ConsentDataProvider._buildCmpSurrogate(SURROGATE_CONFIG.gppv1, gppApiFrame);
      gppFn = function (command, callback, parameter) {
        surrogate(command, parameter, callback);
      };
    }

    const pingData = await new Promise((resolve) => {
      const pingReturn = gppFn('ping', function (pingData) {
        resolve(pingData);
      });
      if (isPlainObject(pingReturn)) {
        resolve(pingReturn);
      }
    });

    switch (pingData.gppVersion) {
      case GppClientV10.version:
        return new GppClientV10(pingData, gppFn, direct);
      case GppClientV11.version:
        return new GppClientV11(pingData, gppFn, direct, metrics);
      default: {
        const msg = `Unsupported version of gpp: ${pingData.gppVersion}`;
        log.warn(msg);
        return Promise.reject(msg);
      }
    }
  }

  static caTcfDataHasExpressConsent(tcfData) {
    let purposeConsent = tcfData['PurposesExpressConsent']
    if (isArray(purposeConsent) && purposeConsent.length > 0) {
      return purposeConsent[CA_STORAGE_PURPOSE - 1] === true
    } else {
      return undefined;   //the data provided by CMP is invalid, we will check the string on server side if there is no other consent signal
    }
  }

  static caTcfDataHasVendorExpressConsent(tcfData) {
    let vendorConsent = tcfData['VendorExpressConsent']
    if (isArray(vendorConsent) && vendorConsent.length > 0) {
      return vendorConsent.find(id => id == ID5_GVL_ID) !== undefined
    } else {
      return undefined;
    }
  }

  static tcfDataHasLocalStorageGrant(tcfData) {
    let purposeConsent = GPPClient.#getFieldValue(tcfData, 'PurposeConsent', 'PurposeConsents');
    if(isArray(purposeConsent) && purposeConsent.length > 0) {
      return purposeConsent[STORAGE_PURPOSE-1] === true
    } else {
      return undefined;   //the data provided by CMP is invalid, we will check the string on server side if there is no other consent signal
    }
  }

  static tcfDataHasID5VendorConsented(tcfData) {
    let vendorConsent = GPPClient.#getFieldValue(tcfData, 'VendorConsent', 'VendorConsents');
    // intentional loose equality to allow for int to string comparison
    if (vendorConsent.length > 0) {
      return vendorConsent?.find(id => id == ID5_GVL_ID) !== undefined;
    } else {
      return undefined;
    }
  }

  static #getFieldValue(obj, name1, name2) {
    return name1 in obj ? obj[name1] : obj[name2];
  }

  static getTcfData(tcfSection) {
    let tcfData = undefined;
    if (isArray(tcfSection) && isPlainObject(tcfSection[0])) {
      tcfData = tcfSection[0];
    } else if (isPlainObject(tcfSection)) { //for some reason iab API is sometimes returning tcf section as object instead of subsections array, despite claiming otherwise in specification
      tcfData = tcfSection;
    }
    return tcfData;
  }
}

class GppClientV10 extends GPPClient {
  static version = '1.0';
  gppFn;

  /** @type {boolean} */
  ready;

  /**
   * Subset of ping data as described in https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/cmp-api_1.0/Core/CMP%20API%20Specification.md#pingreturn-
   * @typedef {Object} PingDataV10
   * @property {string} [cmpStatus] - possible values: stub, loading, loaded, error
   * @property {string} [cmpDisplayStatus] - possible values: hidden, visible, disabled
   */

  /**
   * @param {PingDataV10} pingData
   * @param {Function} gppFn
   * @param {boolean} direct
   */
  constructor(pingData, gppFn, direct) {
    super(direct, GppClientV10.version);
    this.gppFn = gppFn;
    this.ready = this.isReady(pingData);
  }

  isReady(pingData) {
    return pingData.cmpStatus === 'loaded' && pingData.cmpDisplayStatus !== 'visible';
  }

  async getClientConsentData() {
    if (!this.ready) {
      this.ready = await new Promise(resolve => {
        this.gppFn('addEventListener', (event) => {
          if (this.isReady(event.pingData)) {
            resolve(true);
          } else {
            return false; // to not deregister the message listener in case of indirect communication
          }
        });
      });
    }
    const gppDataPromise = new Promise(resolve => {
      this.gppFn('getGPPData', (gppData) => {
        resolve(gppData);
      });
    });

    const tcfSectionPromise = new Promise(resolve => {
      this.gppFn('getSection', (sectionData) => {
        resolve(sectionData);
      }, 'tcfeuv2');
    });
    const [gppData, tcfData] = await Promise.all([gppDataPromise, tcfSectionPromise]);
    const gppConsentData = new GppConsentData(API_TYPE.GPP_V1_0, gppData.applicableSections, gppData.gppString);
    if (tcfData) {
      gppConsentData.euTcfSection = new GppTcfData(GPPClient.tcfDataHasLocalStorageGrant(tcfData), GPPClient.tcfDataHasID5VendorConsented(tcfData))
    }
    return gppConsentData;
  }
}

/**
 *
 * @param {ConsentData} consentData
 * @param {API_TYPE} apiType
 * @param {object} apiData
 */
function addApiData(consentData, apiType, apiData) {
  if (apiData) {
    consentData.apiTypes.push(apiType);
    Object.assign(consentData, apiData);
  }
}

class GppClientV11 extends GPPClient {
  static version = '1.1';
  gppFn;

  /**
   * Subset of ping data as described in https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/main/Core/CMP%20API%20Specification.md#pingreturn-
   * @typedef {Object} PingDataV11
   * @property {string} [signalStatus] - 'ready', 'not ready'
   * @property {string} [gppString] - the complete encoded GPP string, may be empty during CMP load
   * @property {number[]} [applicableSections] - section ID considered to be in force for this transaction. In most cases, this field should have a single section ID
   * @property {Object} [parsedSections] - an object of all parsed sections of the gppString property that are supported by the API on this page
   */

  /** @type {PingDataV11} */
  readyPingData;

  /** @type {MeterRegistry} metrics */
  metrics;

  constructor(pingData, gppFn, direct, metrics) {
    super(direct, GppClientV11.version);
    this.gppFn = gppFn;
    if (pingData.signalStatus === 'ready') {
      this.readyPingData = pingData;
    }
    this.metrics = metrics;
  }

  /**
   * @return {Promise<GppConsentData>}
   */
  async getClientConsentData() {
    const metrics = this.metrics;
    return new Promise(resolve => {
      let gotCmpConsent = false;
      if (this.readyPingData) {
        resolve(this.parsePingData(this.readyPingData));
      } else {
        const listeningStart = Date.now();
        //we have no way of telling if gpp cmp api will load on page - if after one second of waiting for consent gpp api
        //it's still stub - use stub answer
        let _timeoutId = setTimeout(() => {
          _timeoutId = undefined;
          this.gppFn('ping', (pingData) => {
            if (pingData.cmpStatus === 'stub') {
              metrics.counter('gpp.stubUsed', {cmpId: pingData.cmpId}).inc();
              resolve(this.parsePingData(pingData));
            }
          });
        }, 1000);
        this.gppFn('addEventListener', (event) => {
          if (event.pingData.signalStatus === 'ready') {
            if (!gotCmpConsent) {
              if (_timeoutId) {
                clearTimeout(_timeoutId);
                _timeoutId = undefined;
              } else if (!gotCmpConsent) {
                metrics.timer('gpp.lateCmp', {cmpId: event.pingData.cmpId}).record(Date.now() - listeningStart);
              }
              resolve(this.parsePingData(event.pingData));
              gotCmpConsent = true;
            } else {
              GppClientV11.measureAdditionalEvent(event, metrics, listeningStart);
            }
          } else {
            return false; // to not deregister the message listener in case of indirect communication
          }
        });
      }
    });
  }

  static measureAdditionalEvent(event, metrics, listeningStart) {
    if (['cmpStatus', 'cmpDisplayStatus', 'signalStatus', 'sectionChange'].includes(event.eventName)) {
      metrics.timer('gpp.additionalEvents', {
        cmpId: event.pingData.cmpId,
        name: event.eventName
      }).record(Date.now() - listeningStart);
    }
  }

  /**
   * @param {PingDataV11} pingData
   * @return {GppConsentData}
   */
  parsePingData(pingData) {
    const gppConsentData = new GppConsentData(API_TYPE.GPP_V1_1, pingData.applicableSections, pingData.gppString);
    if(gppConsentData.applicableSections.includes(GPP_SECTIONS.TCFEUV2)) {
      let tcfData = GPPClient.getTcfData(pingData.parsedSections?.tcfeuv2);
      if (tcfData) {
        gppConsentData.euTcfSection = new GppTcfData(GPPClient.tcfDataHasLocalStorageGrant(tcfData), GPPClient.tcfDataHasID5VendorConsented(tcfData))
      }
    }
    if(gppConsentData.applicableSections.includes(GPP_SECTIONS.TCFCAV1)) {
      let caTcfData = GPPClient.getTcfData(pingData.parsedSections?.tcfcav1);
      if (caTcfData) {
        gppConsentData.canadaTcfSection = new GppTcfData(GPPClient.caTcfDataHasExpressConsent(caTcfData), GPPClient.caTcfDataHasVendorExpressConsent(caTcfData))
      }
    }
    return gppConsentData;
  }
}

export class ConsentDataProvider {
  _lookupInProgress;
  _log;
  /**
   * @type {MeterRegistry}
   * @private
   */
  _metrics;
  /**
   * @type {Promise<ConsentData>}
   * @private
   */
  _consentDataPromise;

  /**
   * @param {MeterRegistry} metrics
   * @param {Logger} log
   */
  constructor(metrics, log = NO_OP_LOGGER) {
    this._metrics = metrics;
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
      consentData.source = ConsentSource.partner;
      return Promise.resolve(consentData);
    } else {
      switch (cmpApi) {
        case 'static':
          return new Promise((resolve) => {
            this._parseStaticConsentData(providedConsentData, resolve);
          });
        case 'iab':
          return new Promise((resolve) => {
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
    consentData.source = ConsentSource.partner;
    // Try to detect the API from the static object structure
    if (isPlainObject(data.getTCData)) {
      const tcfData = this._parseTcfData(data.getTCData);
      addApiData(consentData, API_TYPE.TCF_V2, tcfData);
      try {
        const metrics = this._metrics;
        this._lookupTcf((foundTcf) => {
          consentDiscrepancyCounter(metrics, {
            apiType: API_TYPE.TCF_V2,
            sameString: foundTcf?.consentString === tcfData?.consentString,
            sameLSPC: foundTcf?.localStoragePurposeConsent === tcfData?.localStoragePurposeConsent,
            sameVendorsConsentForId5Granted: foundTcf?.vendorsConsentForId5Granted === tcfData?.vendorsConsentForId5Granted,
            sameGdpr: foundTcf?.gdprApplies === tcfData?.gdprApplies
          }).inc();
        });
      } catch (e) {
        // do nothing
      }
    }
    if (isArray(data.allowedVendors)) {
      addApiData(consentData, API_TYPE.ID5_ALLOWED_VENDORS, {
        allowedVendors: data.allowedVendors.map(item => item.toString()),
        gdprApplies: true
      });
    }
    if (isPlainObject(data.getUSPData)) {
      const uspData = this._parseUspData(data.getUSPData);
      addApiData(consentData, API_TYPE.USP_V1, uspData);
      try {
        const metrics = this._metrics;
        this._lookupUsp((foundUsp) => {
          consentDiscrepancyCounter(metrics, {
            apiType: API_TYPE.USP_V1,
            sameString: foundUsp?.ccpaString === uspData?.ccpaString
          }).inc();
        });
      } catch (e) {
        // do nothing
      }
    }
    if (consentData.apiTypes.length === 0) {
      this._log.warn('cmpApi: No static consent data detected! Using defaults.');
    }
    this._log.info(`cmpApi: Detected APIs '${consentData.apiTypes}' from static consent data`, data);
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
    consentData.source = ConsentSource.cmp;
    // Builds callbacks for the various APIs. It does debouncing and groups
    // the result from all callbacks. It assumes all callbacks are created
    // before any of them fires.
    const makeCallback = (callbackPos) => {
      done[callbackPos] = 0;
      return (result, apiType) => {
        if (!done[callbackPos]) {
          done[callbackPos] = Date.now();
          if (result) {
            addApiData(consentData, apiType, result);
          }
          if (done.every(d => d > 0)) {
            finalCallback(consentData);
          }
        }
      };
    };

    const callbackTcf = makeCallback(CALLBACK_POSITIONS.TCF);
    const callbackUsp = makeCallback(CALLBACK_POSITIONS.USP);
    const callbackGpp = makeCallback(CALLBACK_POSITIONS.GPP);
    this._lookupGpp(callbackGpp);
    this._lookupTcf(callbackTcf);
    this._lookupUsp(callbackUsp);
  }

  /**
   * @param callback
   * @private
   */
  _lookupUsp(callback) {
    const {cmpApiFrame: uspapiFrame, cmpApiFunction: uspapiFunction} = ConsentDataProvider._findCmpApi('__uspapi');
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
      uspFn = ConsentDataProvider._buildCmpSurrogate(SURROGATE_CONFIG.uspv1, uspapiFrame);
    }

    const uspCallback = (consentResponse, success) => {
      if (success) {
        callback(this._parseUspData(consentResponse), API_TYPE.USP_V1);
      } else {
        this._log.error('cmpApi: USP callback not successful. Using defaults for CCPA.');
        callback();
      }
    };
    uspFn('getUSPData', USPAPI_VERSION, uspCallback);
  }

  /**
   * @param {Function} callback
   * @private
   */
  async _lookupGpp(callback) {
    const lookupStart = Date.now();
    try {
      let client = await GPPClient.create(this._log, this._metrics);
      if (client) {
        let commonTags = {gppVersion: client.version, directCmp: client.direct};
        try {
          let consentData = await client.getConsentData();
          let consentDataPart = {
            gppData: consentData
          };
          callback(consentDataPart, consentData.version);
          let finishedDate = Date.now();
          this._metrics.timer('gpp.delay', commonTags).record(finishedDate - lookupStart);
        } catch (e) {
          this._metrics.counter('gpp.failure', Object.assign({type: 'CONSENT'}, commonTags)).inc();
          this._log.error('cmpApi: getting GPP consent not successful. Using defaults for Gpp.');
          callback();
        }
      } else {
        callback();
      }
    } catch (e) {
      this._metrics.counter('gpp.failure', {type: 'CLIENT'}).inc();
      this._log.error('cmpApi: creating GPP client not successful. Using defaults for Gpp.');
      callback();
    }
  }

  /**
   * This function builds a surrogate CMP function which behaves as the original
   * except it uses message passing to communicate to the CMP function of choice
   * @param {Object} config decides how to build the function based on the CMP type
   * @param {Object} apiFrame the frame where the API is located. Discovered by detection.
   * @returns {function} the function to call
   */
  static _buildCmpSurrogate(config, apiFrame) {
    return (param0, param1, messageCallback) => {
      const callId = Math.random() + '';
      const msg = {};
      const requestObj = {};
      requestObj[config.objKeys[0]] = param0;
      requestObj[config.objKeys[1]] = param1;
      requestObj.callId = callId;
      msg[config.objName] = requestObj;
      const eventHandler = (event) => {
        const result = delve(event, `data.${config.returnObjName}`);
        if (result && result.callId === callId) {
          const shouldDeregister = messageCallback(result.returnValue, result.success);
          // there are listeners which can invoke the callback multiple times, so we need to know when to deregister
          if (shouldDeregister === undefined || shouldDeregister === true) {
            window.removeEventListener('message', eventHandler);
          }
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
    const {cmpFrame, cmpFunction} = ConsentDataProvider._findTCF();
    if (!cmpFrame) {
      this._log.warn('cmpApi: TCF not found! Using defaults for GDPR.');
      callback();
      return;
    }

    if (isFn(cmpFunction)) {
      this._lookupDirectTcf(cmpFunction, callback);
    } else {
      this._log.info('cmpApi: Detected TCF is outside the current iframe. Using message passing.');
      this._lookupMessageTcf(cmpFrame, callback);
    }
  }

  /**
   * @private
   */
  _lookupMessageTcf(cmpFrame, callback) {
    const cmpFunction = ConsentDataProvider._buildCmpSurrogate(SURROGATE_CONFIG.tcfv2, cmpFrame);
    this._lookupDirectTcf(cmpFunction, callback);
  }

  /**
   * @private
   */
  _lookupDirectTcf(cmpFunction, callback) {
    const cmpVersion = 2;
    const log = this._log;
    const logcb = (callback, data) => {
      log.info(`cmpApi: TCFv2 - Received a call back: ${callback}`, data);
    };
    const logNoSuccess = callback => {
      log.error(`cmpApi: TCFv2 - Received insuccess: ${callback}. Please check your CMP setup. Using defaults for GDPR.`);
    };
    // TCF V2 callback
    const tcfResponseCallback = (tcfData, success) => {
      logcb('event', tcfData);
      if (!success) {
        logNoSuccess('addEventListener');
        callback();
        return;
      }
      if (tcfData &&
        (tcfData.gdprApplies === false ||
          tcfData.eventStatus === 'tcloaded' ||
          tcfData.eventStatus === 'useractioncomplete')
      ) {
        callback(this._parseTcfData(tcfData), API_TYPE.TCF_V2);
      } else {
        return false; // to not deregister the message listener in case of indirect communication
      }
    };
    cmpFunction('addEventListener', cmpVersion, tcfResponseCallback);
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
      ccpaString: consentObject.uspString
    };
  }

  /**
   * This function checks the consent data provided by CMP to ensure it's in an expected state.
   * @param {object} consentObject required; object returned by CMP that contains user's consent choices
   * @returns {Object} the parsed consent data
   * @private
   */
  _parseTcfData(consentObject) {
    let log = this._log;
    let isValid, normalizeFn;
    isValid = ConsentDataProvider._isValidV2ConsentObject;
    normalizeFn = ConsentDataProvider._normalizeV2Data;
    if (!isValid(consentObject)) {
      log.error('cmpApi: Invalid CMP data. Using defaults for GDPR.', consentObject);
      return;
    }
    return normalizeFn(consentObject);
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

  static _tcfDataHasID5VendorConsented(cmpConsentObject) {
    return cmpConsentObject?.vendor?.consents?.[ID5_GVL_ID] === true;
  }

  /**
   * @private
   */
  static _normalizeV2Data(cmpConsentObject) {
    let decodedStorageConsent = delve(cmpConsentObject, 'purpose.consents.1');
    if (!isBoolean(decodedStorageConsent)) {
      decodedStorageConsent = isPurposeConsentSet(cmpConsentObject.tcString, STORAGE_PURPOSE);
    }
    let vendorsConsentForId5Granted = ConsentDataProvider._tcfDataHasID5VendorConsented(cmpConsentObject);
    return {
      consentString: cmpConsentObject.tcString,
      localStoragePurposeConsent: decodedStorageConsent,
      gdprApplies: cmpConsentObject.gdprApplies,
      vendorsConsentForId5Granted: vendorsConsentForId5Granted
    };
  }


  /**
   * @typedef {Object} CMPDetails
   * @property {Object} cmpFrame - The frame where the CMP function is declared
   * @property {function} cmpFunction - the CMP function to invoke
   *
   * This function tries to find the CMP in page.
   * @return {CMPDetails}
   * @private
   */
  static _findTCF() {
    let f = window;
    let cmpFrame;
    let cmpFunction;
    while (!cmpFrame) {
      try {
        if (typeof f.__tcfapi === 'function') {
          cmpFunction = f.__tcfapi;
          cmpFrame = f;
          break;
        }
      } catch (e) {
        // Continue ignoring the error
      }

      // need separate try/catch blocks due to the exception errors
      // thrown when trying to check for a frame that doesn't exist
      // in 3rd party env
      try {
        if (f.frames['__tcfapiLocator']) {
          cmpFrame = f;
          break;
        }
      } catch (e) {
        // Continue ignoring the error
      }

      if (f === window.top) break;
      f = f.parent;
    }
    return {
      cmpFrame,
      cmpFunction
    };
  }

  /**
   * @typedef {Object} CmpApiDetails
   * @property {Object} cmpApiFrame - The frame where the CMP function is declared
   * @property {function} cmpApiFunction - the CMP function to invoke
   *
   * This function tries to find the CMP in page.
   * @return {CmpApiDetails}
   * @private
   */
  static _findCmpApi(cmpName) {
    let f = window;
    let cmpApiFrame;
    let cmpApiFunction;

    while (!cmpApiFrame) {
      try {
        if (typeof f[cmpName] === 'function') {
          cmpApiFunction = f[cmpName];
          cmpApiFrame = f;
          break;
        }
      } catch (e) {
        // Continue ignoring the error
      }

      try {
        if (f.frames[`${cmpName}Locator`]) {
          cmpApiFrame = f;
          break;
        }
      } catch (e) {
        // Continue ignoring the error
      }
      if (f === window.top) break;
      f = f.parent;
    }
    return {
      cmpApiFrame,
      cmpApiFunction
    };
  }
}
