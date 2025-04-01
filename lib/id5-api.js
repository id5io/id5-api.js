/** @module id5-api */

import {
  InvocationLogger,
  isBoolean,
  isFencedFrame
} from './utils.js';
import {ConsentDataProvider} from './consentProvider.js';
import {API_STANDARD_ORIGIN, Id5Instance, PageLevelInfo} from './id5Instance.js';
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
import {Id5Api} from './core/id5Api.js';

/**
 * Implements Standard API js api
 */
export class ApiStandard {

  /**
   * @type {Id5Api}
   * @private
   */
  _id5Api;

  /**
   *
   * @param {Id5Api} id5Api
   */
  constructor(id5Api) {
    this._id5Api = id5Api;
    Id5Api.assignApiStandard(id5Api,this);
  }

  /**
   * This function is a Factory for a new ID5 Instance and the entry point to get an integration running on a webpage
   * @param {Id5Options} passedOptions
   * @return {Id5Instance} ID5 API Instance for this caller, for further interactions.
   */
  init(passedOptions) {
    const id5Api = this._id5Api;
    id5Api.invocationId += 1;
    const log = new InvocationLogger(API_STANDARD_ORIGIN, id5Api.invocationId);
    try {
      log.info(`ID5 API version ${id5Api._version}. Invoking init()`, passedOptions);

      const config = new Config(passedOptions, log);
      const options = config.getOptions();
      const metrics = this._configureDiagnostics(options, log);
      if (metrics) {
        loadDelayTimer(metrics).recordNow(); // records time elapsed since page visit
        invocationCountSummary(metrics).record(id5Api.invocationId, {
          fenced: isFencedFrame()
        }); // record invocation count
      }
      const storage = new WindowStorage(window, !config.hasCreativeRestrictions());
      const localStorage = new LocalStorage(storage, log);
      const forceAllowLocalStorageGrant = config.isForceAllowLocalStorageGrant();
      const storageConfig = new StorageConfig(options.storageExpirationDays);
      const consentManagement = new ConsentManagement(localStorage, storageConfig, forceAllowLocalStorageGrant, log, metrics);
      const localStorageGrantChecker = () => consentManagement.localStorageGrant("instance-client-store");
      const clientStore = new ClientStore(localStorageGrantChecker, localStorage, storageConfig, log);
      const trueLinkAdapter = new TrueLinkAdapter();
      const multiplexingInstance = multiplexing.createInstance(window, log, metrics, storage, trueLinkAdapter, clientStore);
      const consentDataProvider = new ConsentDataProvider(metrics, log);
      const pageLevelInfo = new PageLevelInfo(id5Api._referer, id5Api._version, id5Api._isUsingCdn);
      const id5Instance = new Id5Instance(config, clientStore, consentManagement, metrics, consentDataProvider, log, multiplexingInstance, pageLevelInfo, trueLinkAdapter);
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
      const id5Api = this._id5Api;
      const partnerId = options.partnerId;
      const metrics = new Id5CommonMetrics(API_STANDARD_ORIGIN, currentVersion);
      metrics.addCommonTags({
        ...partnerTag(partnerId),
        tml: id5Api._referer.topmostLocation,
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
new ApiStandard(ID5); // assign standard API
export default ID5;
