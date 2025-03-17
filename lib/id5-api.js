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
import {Id5Instance, PageLevelInfo} from './id5Instance.js';
import {version as currentVersion} from '../generated/version.js';
import {Config} from './config.js';
import {createPublisher, MeterRegistryPublisher} from '@id5io/diagnostics';
import multiplexing, {
  ClientStore,
  ConsentManagement,
  LocalStorage,
  StorageConfig,
  WindowStorage
} from '@id5io/multiplexing';
import {TrueLinkAdapter} from '@id5io/multiplexing/trueLink';
import {invocationCountSummary, loadDelayTimer, Id5CommonMetrics, partnerTag} from './metrics.js';

const DEFAULT_ORIGIN = 'api';

/**
 * Singleton which represents the entry point of the API.
 * In the ID5's id5-api.js bundle this is installed under window.ID5.
 * When using the ID5 API as a library, this module can be imported and ID5.init() can be called directly.
 */
export class Id5Api {
  origin;

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

  constructor(origin = DEFAULT_ORIGIN) {
    this.loaded = true;
    this._isUsingCdn = !!(
      document &&
      document.currentScript &&
      document.currentScript.src &&
      document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0
    );
    this._referer = getRefererInfo();
    this.versions[currentVersion] = true;
    this.origin = origin;
  }

  /**
   * This function is a Factory for a new ID5 Instance and the entry point to get an integration running on a webpage
   * @param {Id5Options} passedOptions
   * @return {Id5Instance} ID5 API Instance for this caller, for further interactions.
   */
  init(passedOptions) {
    this.invocationId += 1;
    const log = new InvocationLogger(this.origin, this.invocationId);
    try {
      log.info(`ID5 API version ${this._version}. Invoking init()`, passedOptions);

      const config = new Config(passedOptions, log);
      const options = config.getOptions();
      const metrics = this._configureDiagnostics(options, log);
      if (metrics) {
        loadDelayTimer(metrics).recordNow(); // records time elapsed since page visit
        invocationCountSummary(metrics).record(this.invocationId, {
          fenced: isFencedFrame()
        }); // record invocation count
      }
      const storage = new WindowStorage(window, !config.hasCreativeRestrictions());
      const localStorage = new LocalStorage(storage, log);
      const forceAllowLocalStorageGrant = options.allowLocalStorageWithoutConsentApi || options.debugBypassConsent;
      const storageConfig = new StorageConfig(options.storageExpirationDays);
      const consentManagement = new ConsentManagement(localStorage, storageConfig, forceAllowLocalStorageGrant, log, metrics);
      const localStorageGrantChecker = () => consentManagement.localStorageGrant("instance-client-store");
      const clientStore = new ClientStore(localStorageGrantChecker, localStorage, storageConfig, log);
      const trueLinkAdapter = new TrueLinkAdapter();
      const multiplexingInstance = multiplexing.createInstance(window, log, metrics, storage, trueLinkAdapter, clientStore);
      const consentDataProvider = new ConsentDataProvider(metrics, log);
      const pageLevelInfo = new PageLevelInfo(this._referer, this._version, this._isUsingCdn);
      const id5Instance = new Id5Instance(config, clientStore, consentManagement, metrics, consentDataProvider, log, multiplexingInstance, pageLevelInfo, trueLinkAdapter, this.origin);
      id5Instance.bootstrap();
      id5Instance.init();
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
      const partnerId = options.partnerId;
      const metrics = new Id5CommonMetrics(this.origin, currentVersion);
      metrics.addCommonTags({
        ...partnerTag(partnerId),
        tml: this._referer.topmostLocation,
        provider: options.provider ? options.provider : 'default'
      });
      const diagnosticsOptions = options.diagnostics;
      if (!diagnosticsOptions?.publishingDisabled) {
        const publisher = new MeterRegistryPublisher(metrics, createPublisher(diagnosticsOptions.publishingSampleRatio));
        if (diagnosticsOptions?.publishAfterLoadInMsec && diagnosticsOptions.publishAfterLoadInMsec > 0) {
          publisher.schedulePublishAfterMsec(diagnosticsOptions.publishAfterLoadInMsec);
        }
        if (diagnosticsOptions?.publishBeforeWindowUnload) {
          publisher.schedulePublishBeforeUnload();
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
