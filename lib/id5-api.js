/** @module id5-api */

import {
  deferPixelFire,
  filterUaHints,
  InvocationLogger,
  isBoolean,
  isDefined,
  isGlobalDebug,
  isGlobalTrace,
  setGlobalDebug
} from './utils.js';
import {getRefererInfo} from './refererDetection.js';
import {ConsentDataProvider} from './consentProvider.js';
import Id5Status from './id5Status.js';
import {version as currentVersion} from '../generated/version.js';
import LocalStorage from './localStorage.js';
import Config from './config.js';
import {LiveIntentApi} from './liveIntentApi.js';
import {createPublisher, Id5CommonMetrics, partnerTag, startTimeMeasurement} from '@id5io/diagnostics';
import multiplexing, {ApiEvent, ConsentManagement, ClientStore} from '@id5io/multiplexing';

const HOST = 'https://id5-sync.com';
const ORIGIN = 'api';

/**
 * Singleton which represents the entry point of the API.
 * In the ID5's id5-api.js bundle this is installed under window.ID5.
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
   * This function will initialize ID5, wait for consent then try to fetch or refresh ID5 user id if required
   * @param {Id5Options} passedOptions
   * @return {Id5Status} Status of the ID5 API for this caller, for further interactions
   */
  init(passedOptions) {
    this.invocationId += 1;
    const log = new InvocationLogger(this.invocationId);
    try {
      log.info(`ID5 API version ${this._version}. Invoking init()`, passedOptions);

      const config = new Config(passedOptions, log);
      const options = config.getOptions();
      const metrics = this._configureDiagnostics(options, log);
      if (metrics) {
        metrics.loadDelayTimer().recordNow(); // records time elapsed since page visit
        metrics.invocationCountSummary().record(this.invocationId); // record invocation count
      }
      // By using window.top we say we want to use storage only if we're in a first-party context
      const localStorage = new LocalStorage(window.top, !options.applyCreativeRestrictions);

      const liveIntentApi = new LiveIntentApi(window, !options.disableLiveIntentIntegration, localStorage, config.storageConfig, log);
      const consentManagement = new ConsentManagement(localStorage, config.storageConfig,
        options.allowLocalStorageWithoutConsentApi || options.debugBypassConsent, log);
      const localStorageGrantChecker = () => consentManagement.localStorageGrant();
      const clientStore = new ClientStore(localStorageGrantChecker, localStorage, config.storageConfig, log);
      const instance = multiplexing.createInstance(window, log, metrics, consentManagement, clientStore);
      const consentDataProvider = new ConsentDataProvider(log);
      const partnerStatus = new Id5Status(config, clientStore, consentManagement, liveIntentApi, metrics, consentDataProvider, log, instance);
      const userIdReadyTimer = startTimeMeasurement();
      instance
        .on(ApiEvent.CASCADE_NEEDED, this._doCascade(partnerStatus))
        .on(ApiEvent.USER_ID_READY, (userIdData, notificationContext) => {
          try {
            const notificationContextTags = notificationContext?.tags ? {...notificationContext.tags} : {};
            if (notificationContext?.timestamp) {
              metrics.userIdNotificationDeliveryDelayTimer(notificationContextTags).record(Date.now() - notificationContext.timestamp);
            }
            userIdReadyTimer.record(metrics.userIdProvisioningDelayTimer(userIdData.isFromCache, {
              ...notificationContextTags,
              isUpdate: partnerStatus._userIdAvailable
            }));
          } catch (e) {
            log.error('Failed to measure provisioning metrics', e);
          }
          partnerStatus.setUserId(userIdData.responseObj, userIdData.isFromCache);
        })
        .on(ApiEvent.USER_ID_FETCH_CANCELED, details => log.info('ID5 User ID fetch canceled:', details.reason));
      this._gatherFetchIdData(partnerStatus).then(data => instance.register(
        {
          source: ORIGIN,
          sourceVersion: currentVersion,
          sourceConfiguration: {
            options: partnerStatus.getOptions()
          },
          fetchIdData: data,
          singletonMode: options?.multiplexing?._disabled === true,
          canDoCascade: true
        }));
      this._submitRefreshConsent(options, consentDataProvider, instance, metrics, log);
      log.info(`ID5 initialized for partner ${options.partnerId} with referer ${this._referer.referer} and options`, passedOptions);
      return partnerStatus;
    } catch (e) {
      log.error('Exception caught during init()', e);
    }
  };

  _doCascade(id5Status) {
    return cascadeCommand => {
      const log = id5Status._logger;
      const options = id5Status.getOptions();
      if (cascadeCommand.partnerId === options.partnerId && options.maxCascades >= 0 && !options.applyCreativeRestrictions) {
        const isSync = options.partnerUserId && options.partnerUserId.length > 0;
        const syncUrl = `${HOST}/${isSync ? 's' : 'i'}/${options.partnerId}/${options.maxCascades}.gif?id5id=${cascadeCommand.userId}&o=api&${isSync ? 'puid=' + options.partnerUserId + '&' : ''}gdpr_consent=${cascadeCommand.consentString}&gdpr=${cascadeCommand.gdprApplies}`;
        log.info('Opportunities to cascade available', syncUrl);
        deferPixelFire(syncUrl);
      }
    };
  }

  _submitRefreshConsent(options, consentDataProvider, instance, metrics, log) {
    let consentRequestTimeMeasurement = startTimeMeasurement();
    let consentRequestType = options.debugBypassConsent ? 'bypass' : options.cmpApi;
    consentDataProvider.refreshConsentData(options.debugBypassConsent, options.cmpApi, options.consentData)
      .then(consentData => {
        consentRequestTimeMeasurement.record(metrics.consentRequestTimer(consentRequestType, {
          success: true,
          apiType: consentData.api
        }));
        instance.updateConsent(consentData);
      })
      .catch(error => {
        // TODO should notify somehow it was failed, to let leader reject waiting - whatever is done id will not be provisioned
        // TODO unless consent is delivered in a different way?
        // in multi instances scenario consent may be delivered by other instance to let API leader continue
        // in single instance scenario it will never be delivered which will result in id not being provisioned
        log.error(`Couldn't get consent data`, error);
        consentRequestTimeMeasurement.record(metrics.consentRequestTimer(consentRequestType, {
          success: false,
          error: error.message
        }));
      });
  }

  /**
   * @param {Id5Status} id5Status - Initializes id5Status returned by `init()`
   * @param {boolean} forceFetch
   * @param {Id5Options} [options] - Options to update
   * @return {Id5Status} provided id5Status for chaining
   */
  refreshId(id5Status, forceFetch = false, options = {}) {
    if (!isBoolean(forceFetch)) {
      throw new Error('Invalid signature for refreshId(): second parameter must be a boolean');
    }
    const log = id5Status._logger;
    try {
      log.info('Invoking refreshId()', arguments);
      id5Status.startRefresh(forceFetch);
      id5Status.updateOptions(options);
      const updatedOptions = id5Status.getOptions();
      const instance = id5Status.instance;
      this._gatherFetchIdData(id5Status)
        .then(fetchIdData => {
          instance.updateFetchIdData(fetchIdData);
          instance.refreshUid({
            resetConsent: true,
            forceAllowLocalStorageGrant: updatedOptions.allowLocalStorageWithoutConsentApi || updatedOptions.debugBypassConsent,
            forceFetch: forceFetch
          });
        });
      this._submitRefreshConsent(updatedOptions, id5Status._consentDataProvider, instance, id5Status._metrics, id5Status._logger);
    } catch (e) {
      log.error('Exception caught from refreshId()', e);
    }
    return id5Status;
  };

  _gatherFetchIdData(id5Status) {
    const options = id5Status.getOptions();
    const log = id5Status._logger;
    return this.gatherUaHints(options)
      .then(hints => hints !== undefined ? filterUaHints(hints) : undefined)
      .catch(error => log.error('Error while calling navigator.userAgentData.getHighEntropyValues()', error))
      .then(uaHints => {
        return {
          partnerId: options.partnerId,
          refererInfo: this._referer,
          origin: ORIGIN,
          originVersion: this._version,
          isLocalStorageAvailable: id5Status.clientStore.isLocalStorageAvailable(),
          isUsingCdn: this._isUsingCdn,
          att: options.att,
          uaHints: uaHints,
          liveIntentId: id5Status.liveIntentApi.hasLiveIntentId() ? undefined : id5Status.liveIntentApi.getLiveIntentId(),
          abTesting: options.abTesting,
          segments: options.segments,
          // TODO replace with diagnostic metric  there is prometeus graph lateJoinerData.invalidSegmentsCount == knownData.invalidSegmentsCount
          invalidSegmentsCount: id5Status.getInvalidSegments(),
          provider: options.provider,
          pd: options.pd,
          partnerUserId: options.partnerUserId,
          refreshInSeconds: options.refreshInSeconds, // TODO do we need this ?
          providedRefreshInSeconds: id5Status.getProvidedOptions().refreshInSeconds,
          trace: isGlobalTrace()
        };
      });
  }

  gatherUaHints(options) {
    if (isDefined(window.navigator.userAgentData) && !options.disableUaHints) {
      return window.navigator.userAgentData.getHighEntropyValues(['architecture', 'fullVersionList', 'model', 'platformVersion']);
    }
    return Promise.resolve();
  }

  /**
   *
   * @param {Id5Options} options
   * @param {Logger} log
   * @return {Id5CommonMetrics}
   * @private
   */
  _configureDiagnostics(options, log) {
    try {
      let metrics = new Id5CommonMetrics(ORIGIN, currentVersion);
      metrics.addCommonTags({
        ...partnerTag(options.partnerId),
        tml: this._referer.topmostLocation
      });
      if (!options.diagnostics?.publishingDisabled) {
        let publisher = createPublisher(options.diagnostics.publishingSampleRatio);
        if (options.diagnostics?.publishAfterLoadInMsec && options.diagnostics.publishAfterLoadInMsec > 0) {
          metrics.schedulePublishAfterMsec(options.diagnostics.publishAfterLoadInMsec, publisher);
        }
        if (options.diagnostics?.publishBeforeWindowUnload) {
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
