/** @module id5-api */

import {
  deferPixelFire,
  gatherUaHints,
  InvocationLogger,
  isBoolean,
  isFencedFrame,
  isGlobalDebug,
  isGlobalTrace,
  setGlobalDebug
} from './utils.js';
import {getRefererInfo} from './refererDetection.js';
import {ConsentDataProvider} from './consentProvider.js';
import Id5Status from './id5Status.js';
import {version as currentVersion} from '../generated/version.js';
import {Config} from './config.js';
import {createPublisher, Id5CommonMetrics, partnerTag, startTimeMeasurement} from '@id5io/diagnostics';
import multiplexing, {ApiEvent, ClientStore, ConsentManagement, LocalStorage, WindowStorage} from '@id5io/multiplexing';

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
    const log = new InvocationLogger(ORIGIN, this.invocationId);
    try {
      log.info(`ID5 API version ${this._version}. Invoking init()`, passedOptions);

      const config = new Config(passedOptions, log);
      const options = config.getOptions();
      const metrics = this._configureDiagnostics(options.partnerId, options.diagnostics, log);
      if (metrics) {
        metrics.loadDelayTimer().recordNow(); // records time elapsed since page visit
        metrics.invocationCountSummary().record(this.invocationId, {
          fenced: isFencedFrame()
        }); // record invocation count
      }
      const storage = new WindowStorage(window, !config.hasCreativeRestrictions());
      const localStorage = new LocalStorage(storage);
      const forceAllowLocalStorageGrant = options.allowLocalStorageWithoutConsentApi || options.debugBypassConsent;
      const consentManagement = new ConsentManagement(localStorage, config.storageConfig, forceAllowLocalStorageGrant, log);
      const localStorageGrantChecker = () => consentManagement.localStorageGrant();
      const clientStore = new ClientStore(localStorageGrantChecker, localStorage, config.storageConfig, log);
      const instance = multiplexing.createInstance(window, log, metrics, storage);
      const consentDataProvider = new ConsentDataProvider(metrics, log);
      const partnerStatus = new Id5Status(config, clientStore, consentManagement, metrics, consentDataProvider, log, instance);
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
          canDoCascade: !options.applyCreativeRestrictions,
          forceAllowLocalStorageGrant: forceAllowLocalStorageGrant,
          storageExpirationDays: options.storageExpirationDays
        }));
      this._submitRefreshConsent(options, consentDataProvider, instance, metrics, log).then(consentData => {
        if (consentData) {
          consentManagement.setConsentData(consentData);
          clientStore.scheduleGC(metrics);
        }
      });
      log.info(`ID5 initialized for partner ${options.partnerId} with referer ${this._referer.referer} and options`, passedOptions);
      return partnerStatus;
    } catch (e) {
      log.error('Exception caught during init()', e);
    }
  }

  _doCascade(id5Status) {
    /**
     * Variable not inlined on purpose - to add type information
     * @param {CascadePixelCall} cascadeCommand
     */
    let callback = cascadeCommand => {
      const log = id5Status._logger;
      const config = id5Status.config;
      const options = config.getOptions();
      if (cascadeCommand.partnerId === options.partnerId && options.maxCascades >= 0 && !config.hasCreativeRestrictions()) {
        const isSync = options.partnerUserId && options.partnerUserId.length > 0;
        const gppPart = cascadeCommand.gppString ? `&gpp=${cascadeCommand.gppString}&gpp_sid=${cascadeCommand.gppSid}` : '';
        const syncUrl = `${HOST}/${isSync ? 's' : 'i'}/${options.partnerId}/${options.maxCascades}.gif?` +
          `id5id=${cascadeCommand.userId}&o=api${isSync ? '&puid=' + options.partnerUserId : ''}&gdpr_consent=${cascadeCommand.consentString}&gdpr=${cascadeCommand.gdprApplies}${gppPart}`;
        log.info('Opportunities to cascade available', syncUrl);
        deferPixelFire(syncUrl);
      }
    };
    return callback;
  }

  _submitRefreshConsent(options, consentDataProvider, instance, metrics, log) {
    let consentRequestTimeMeasurement = startTimeMeasurement();
    let consentRequestType = options.debugBypassConsent ? 'bypass' : options.cmpApi;
    return consentDataProvider.refreshConsentData(options.debugBypassConsent, options.cmpApi, options.consentData)
      .then(consentData => {
        consentRequestTimeMeasurement.record(metrics.consentRequestTimer(consentRequestType, {
          success: true,
          apiType: consentData.api
        }));
        instance.updateConsent(consentData);
        return consentData;
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
      const forceAllowLocalStorageGrant = updatedOptions.allowLocalStorageWithoutConsentApi || updatedOptions.debugBypassConsent;
      this._gatherFetchIdData(id5Status)
        .then(fetchIdData => {
          instance.updateFetchIdData(fetchIdData);
          instance.refreshUid({
            resetConsent: true,
            forceAllowLocalStorageGrant: forceAllowLocalStorageGrant,
            forceFetch: forceFetch
          });
        });
      this._submitRefreshConsent(updatedOptions, id5Status._consentDataProvider, instance, id5Status._metrics, id5Status._logger);
    } catch (e) {
      log.error('Exception caught from refreshId()', e);
    }
    return id5Status;
  }

  _gatherFetchIdData(id5Status) {
    const options = id5Status.getOptions();
    const log = id5Status._logger;
    return gatherUaHints(options.disableUaHints, log)
      .then(uaHints => {
        return {
          partnerId: options.partnerId,
          refererInfo: this._referer,
          origin: ORIGIN,
          originVersion: this._version,
          isUsingCdn: this._isUsingCdn,
          att: options.att,
          uaHints: uaHints,
          abTesting: options.abTesting,
          segments: options.segments,
          // TODO replace with diagnostic metric  there is prometheus graph lateJoinerData.invalidSegmentsCount == knownData.invalidSegmentsCount
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

  /**
   * @private
   * @param {number} partnerId
   * @param {Diagnostics} diagnosticsOptions
   * @param {Logger} log
   * @return {Id5CommonMetrics}
   */
  _configureDiagnostics(partnerId, diagnosticsOptions, log) {
    try {
      let metrics = new Id5CommonMetrics(ORIGIN, currentVersion);
      metrics.addCommonTags({
        ...partnerTag(partnerId),
        tml: this._referer.topmostLocation
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
