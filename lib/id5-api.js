/** @module id5-api */

import {
  InvocationLogger,
  isBoolean,
  isFencedFrame,
  isGlobalDebug,
  setGlobalDebug
} from './utils.js';
import {getRefererInfo} from './refererDetection.js';
import {ConsentDataProvider} from './consentProvider.js';
import {Id5Instance, ORIGIN, PageLevelInfo} from './id5Instance.js';
import {version as currentVersion} from '../generated/version.js';
import {Config} from './config.js';
import {createPublisher, Id5CommonMetrics, partnerTag} from '@id5io/diagnostics';
import multiplexing, {ClientStore, ConsentManagement, LocalStorage, WindowStorage} from '@id5io/multiplexing';
import {TrueLinkAdapter} from "@id5io/multiplexing/src/trueLink.js";

/**
 * Singleton which represents the entry point of the API.
 * In the ID5's id5-api.js bundle this is installed under window.ID5.
 * When using the ID5 API as a library, this module can be imported and ID5.init() can be called directly.
 */
class Id5Api {
  /** @type {boolean} */
  loaded = false;

  /** @type {boolean} */
  set debug(isDebug) {
    setGlobalDebug(isDebug);
  }

  get debug() {
    return isGlobalDebug();
  }

  /** @type {boolean} */
  _isUsingCdn = false;

  /** @type {object} */
  _referer = false;

  /** @type {string} */
  _version = currentVersion;

  /** @type {object} */
  versions = {};

  /** @type {number} */
  invocationId = 0;

  constructor() {
    this.loaded = true;
    this._isUsingCdn = !!(
      document &&
      document.currentScript &&
      document.currentScript.src &&
      document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0
    );
    this._referer = getRefererInfo();
    this.versions[currentVersion] = true;
  }

  /**
   * This function is a Factory for a new ID5 Instance and the entry point to get an integration running on a webpage
   * @param {Id5Options} passedOptions
   * @return {Id5Instance} ID5 API Instance for this caller, for further interactions.
   */
  init(passedOptions) {
    this.invocationId += 1;
    const log = new InvocationLogger(ORIGIN, this.invocationId);
    try {
      log.info(`ID5 API version ${this._version}. Invoking init()`, passedOptions);

      const config = new Config(passedOptions, log);
      const options = config.getOptions();
      const metrics = this._configureDiagnostics(options, log);
      if (metrics) {
        metrics.loadDelayTimer().recordNow(); // records time elapsed since page visit
        metrics.invocationCountSummary().record(this.invocationId, {
          fenced: isFencedFrame()
        }); // record invocation count
      }
      const storage = new WindowStorage(window, !config.hasCreativeRestrictions());
      const localStorage = new LocalStorage(storage);
      const forceAllowLocalStorageGrant = options.allowLocalStorageWithoutConsentApi || options.debugBypassConsent;
      const consentManagement = new ConsentManagement(localStorage, config.storageConfig, forceAllowLocalStorageGrant, log, metrics);
      const localStorageGrantChecker = () => consentManagement.localStorageGrant();
      const clientStore = new ClientStore(localStorageGrantChecker, localStorage, config.storageConfig, log);
      const trueLinkAdapter = new TrueLinkAdapter()
      const multiplexingInstance = multiplexing.createInstance(window, log, metrics, storage, trueLinkAdapter);
      const consentDataProvider = new ConsentDataProvider(metrics, log);
      const pageLevelInfo = new PageLevelInfo(this._referer, this._version, this._isUsingCdn);
      const id5Instance = new Id5Instance(config, clientStore, consentManagement, metrics, consentDataProvider, log, multiplexingInstance, pageLevelInfo, trueLinkAdapter);
      id5Instance.bootstrap();
      id5Instance.firstFetch();
      clientStore.scheduleGC(metrics);
      return id5Instance;
    } catch (e) {
      log.error('Exception caught during init()', e);
    }
  }

  /**
   * @param {Id5Instance} id5Instance - The instance returned by ID5.init()
   * @param {boolean} forceFetch - when set to true force server side refresh
   * @param {Id5Options} options - New updated options to use. Note that partnerId cannot be updated.
   * @return {Id5Instance} provided id5Instance for chaining
   */
  refreshId(id5Instance, forceFetch = false, options = {}) {
    if (!isBoolean(forceFetch)) {
      throw new Error('Invalid usage of refreshId(): second parameter must be a boolean');
    }
    id5Instance.refreshId(forceFetch, options);
    return id5Instance;
  }

  /**
   * @private
   * @param {Id5Options} options
   * @param {Logger} log
   * @return {Id5CommonMetrics}
   */
  _configureDiagnostics(options, log) {
    try {
      const partnerId =  options.partnerId
      const metrics = new Id5CommonMetrics(ORIGIN, currentVersion);
      const diagnosticsOptions = options.diagnostics
      metrics.addCommonTags({
        ...partnerTag(partnerId),
        tml: this._referer.topmostLocation,
        provider: options.provider ? options.provider : 'default'
      });
      if (!diagnosticsOptions?.publishingDisabled) {
        let publisher = createPublisher(diagnosticsOptions.publishingSampleRatio);
        if (diagnosticsOptions?.publishAfterLoadInMsec && diagnosticsOptions.publishAfterLoadInMsec > 0) {
          metrics.schedulePublishAfterMsec(diagnosticsOptions.publishAfterLoadInMsec, publisher);
        }
        if (diagnosticsOptions?.publishBeforeWindowUnload) {
          metrics.schedulePublishBeforeUnload(publisher);
        }
      }
      return metrics;
    } catch (e) {
      log.error('Failed to configure diagnostics', e);
      return undefined;
    }
  }
}

const ID5 = new Id5Api();
export default ID5;
