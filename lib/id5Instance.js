import {version as currentVersion} from '../generated/version.js';
import {
  deepEqual,
  deferPixelFire,
  isFn,
  isGlobalTrace,
  isPlainObject,
  isDefined
} from './utils.js';
import {UaHints} from './uaHints.js';
import {ConsentSource} from '@id5io/multiplexing';

/* eslint-disable no-unused-vars */
import {Id5CommonMetrics, startTimeMeasurement, Timer} from '@id5io/diagnostics';
import {ApiEvent, CONSTANTS, ClientStore, ConsentManagement, NamedLogger} from '@id5io/multiplexing';
import {Config, GCReclaimAllowed} from './config.js';
import {WatchdogSingletonCallback} from './callbacks.js';
/* eslint-enable no-unused-vars */

const HOST = 'https://id5-sync.com';
export const ORIGIN = 'api';

export class Ext {
  /** @type {number} */
  linkType;
}

export class PageLevelInfo {
  /** @type {RefererInfo} */
  refererInfo;

  /** @type {string} */
  apiVersion;

  /** @type {boolean} */
  isUsingCdn;

  constructor(refererInfo, apiVersion, isUsingCdn) {
    this.refererInfo = refererInfo;
    this.apiVersion = apiVersion;
    this.isUsingCdn = isUsingCdn;
  }
}

class UnregisterTargets {
  _targets;
  /** @type {Id5CommonMetrics} */
  _metrics;
  /** @type {TimeMeasurement} */
  _survivalTimer;

  constructor(multiplexingInstance, metrics) {
    this._targets = [multiplexingInstance, metrics];
    this._metrics = metrics;
    this._survivalTimer = startTimeMeasurement();
  }

  unregister(origin) {
    if (this._survivalTimer && this._metrics) {
      this._survivalTimer.record(this._metrics.instanceSurvivalTime({
        unregisterTrigger: origin // gc reclaim or api call
      }));
    }
    this._targets.forEach(target => {
      try {
        if (isDefined(target) && isFn(target.unregister)) {
          target.unregister();
        }
      } catch (e) {
        // ignore
      }
    });
  }
}

class Id5InstanceFinalizationRegistry {
  /** @type {FinalizationRegistry} */
  _finalizationRegistry;
  /** @type {Set<Id5Instance>} */
  _instancesHolder;

  constructor() {
    this._instancesHolder = new Set();
    try {
      this._finalizationRegistry = new FinalizationRegistry((unregisterTarget) => {
        try {
          if (isDefined(unregisterTarget) && isFn(unregisterTarget.unregister)) {
            unregisterTarget.unregister('gc-reclaim');
          }
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }
  }

  /**
   *
   * @param {Id5Instance} instance
   */
  register(instance) {
    try {
      if (instance.getOptions().allowGCReclaim !== GCReclaimAllowed.ASAP) {
        // if not ASAP reclaimable then keep instance globally,
        // it will be released on configured stage
        this._instancesHolder.add(instance);
      }
      this._finalizationRegistry.register(instance, instance._unregisterTargets, instance);
    } catch (e) {
      // let continue
    }
  }

  unregister(instance) {
    try {
      this.releaseInstance(instance, true); // force release (unregistered by api call let GC cleanup)
      this._finalizationRegistry.unregister(instance); // not needed cleanup executed by api call
    } catch (e) {
      // let continue
    }
  }

  releaseInstance(instance, forceRelease = false) {
    const canBeReleased = !instance.getOptions().allowGCReclaim !== GCReclaimAllowed.NEVER;
    if (canBeReleased || forceRelease) {
      this._instancesHolder.delete(instance);
    }
  }
}

if (!globalThis.__id5_finalization_registry) {
  globalThis.__id5_finalization_registry = new Id5InstanceFinalizationRegistry();
}

export const ID5_REGISTRY = globalThis.__id5_finalization_registry;

/**
 * Polyfill just in case WeakRef is not supported
 */
class StrongRef {
  /** @type {Id5Instance}*/
  _ref;

  constructor(ref) {
    this._ref = ref;
  }

  /**
   * @return {Id5Instance}
   */
  deref() {
    return this._ref;
  }
}

/*
 * Class representing and instance of the ID5 API obtained through ID5.init()
 */
export class Id5Instance {
  /** @type {WatchdogSingletonCallback} */
  _availableCallback;

  /** @type {function} */
  _updateCallback;

  /** @type {WatchdogSingletonCallback} */
  _refreshCallback;

  /** @type {boolean} */
  _isExposed;

  /** @type {boolean} */
  _fromCache;

  /** @type {boolean} */
  _isRefreshing = false;

  /** @type {boolean} */
  _isRefreshingWithFetch = false;

  /** @type {string} */
  _userId;

  /** @type {Ext} */
  _ext;

  /** @type {boolean} */
  _userIdAvailable = false;

  /** @type {Promise<string>} */
  _userIdAvailablePromise;

  /** @type {Function} */
  _userIdAvailablePromiseResolver;

  /** @type {number} */
  invocationId;

  /** @type {Config} */
  config;

  /** @type {ClientStore} */
  clientStore;

  /** @type {ConsentManagement} */
  consentManagement;

  /** @type {ConsentDataProvider} */
  _consentDataProvider;

  /** @type {Id5CommonMetrics} */
  _metrics;

  /** @type {Logger} */
  _log;

  /** @type {Instance} */
  _multiplexingInstance;

  /** @type {PageLevelInfo} */
  _pageLevelInfo;

  /**
   * Public API. These methods will remain mostly unchanged and represent what the partners can use on their side
   */

  /** @returns {Id5Options} options - Current options for this partner */
  getOptions() {
    return this.config.getOptions();
  }

  /** @returns {Id5Options} providedOptions - configuration properties set by partner */
  getProvidedOptions() {
    return this.config.getProvidedOptions();
  }

  /**
   * Return how many invalid segments we got in the options
   * @returns {number} invalidSegments
   */
  getInvalidSegments() {
    return this.config.getInvalidSegments();
  }

  /**
   * Return the current userId if available and not in control group
   * @return {string} userId
   */
  getUserId() {
    return this._isExposed === false ? '0' : this._userId;
  }

  /**
   * Return the current linkType if available and not in control group
   * @return {number} linkType
   */
  getLinkType() {
    return this._isExposed === false ? 0 : this.getExt().linkType;
  }

  /**
   * Return the current ext object if available and not in control group
   * @return {Ext} ext object
   */
  getExt() {
    let exposedExt = this._isExposed === false ? {} : this._ext;
    return Object.assign({abTestingControlGroup: !this.exposeUserId()}, exposedExt);
  }

  /**
   * Return true if the userId provided is from cache
   * @return {boolean}
   */
  isFromCache() {
    return this._fromCache;
  }

  /**
   * Return true if we should expose this user Id within AB Test
   * @return {boolean}
   */
  exposeUserId() {
    return this._isExposed;
  }

  /**
   * Return the current userId in an object that can be added to the
   * eids array of an OpenRTB bid request
   * @return {object}
   */
  getUserIdAsEid() {
    return {
      source: CONSTANTS.ID5_EIDS_SOURCE,
      uids: [{
        atype: 1,
        id: this.getUserId(),
        ext: this.getExt()
      }]
    };
  }

  /**
   * Fire the provided callback when (and exactly once) a user id is available
   * if a timeout is provided, fire the callback at timeout even if user id is not yet available
   * @param {function(Id5Instance)} fn - callback function, receiving the current Id5Instance as first param
   * @param {number} [timeout] - watchdog timeout in ms
   * @return {Id5Instance} the current Id5Instance for chaining
   */
  onAvailable(fn, timeout) {
    if (!isFn(fn)) {
      throw new Error('onAvailable expects a function');
    }
    if (this._availableCallback) {
      this._log.warn('onAvailable was already called, ignoring');
    } else {
      this._availableCallback = new WatchdogSingletonCallback(fn, timeout, this._userIdAvailable, () => {
        this._log.debug('Firing onAvailable callback');
      }, this);
    }
    return this;
  }

  /**
   * Fire the provided callback each time a user id is available or updated.
   * Will be fired after onAvailable or onRefresh if both are provided
   * @param {function(Id5Instance)} fn - callback function, receiving the current Id5Instance as first param
   * @return {Id5Instance} the current Id5Instance for chaining
   */
  onUpdate(fn) {
    if (!isFn(fn)) {
      throw new Error('onUpdate expects a function');
    }
    this._updateCallback = fn;
    if (this._userIdAvailable) {
      this._fireOnUpdate();
    }
    return this;
  }

  /**
   * Fire the provided callback when (and exactly once) a user id is returned by refreshId()
   * if a timeout is provided, fire the callback at timeout even if refresh is not done
   * @param {function(Id5Instance)} fn - callback function, receiving the current Id5Instance as first param
   * @param {number} [timeout] - watchdog timeout in ms
   * @return {Id5Instance} the current Id5Instance for chaining
   */
  onRefresh(fn, timeout) {
    if (!isFn(fn)) {
      throw new Error('onRefresh expects a function');
    }
    // We have a pending onRefresh, cancel it.
    if (this._refreshCallback) {
      this._refreshCallback.disableWatchdog();
    }
    const fireImmediately = this._isRefreshing === true && this._isRefreshingWithFetch === false && this._userIdAvailable;
    this._refreshCallback = new WatchdogSingletonCallback(fn, timeout, fireImmediately, () => {
      this._log.debug('Firing onRefresh callback');
      this._isRefreshing = false;
      this._isRefreshingWithFetch = false;
    }, this);
    return this;
  }

  unregister() {
    try {
      this._unregisterTargets.unregister('api-call');
      ID5_REGISTRY.unregister(this);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Sends an event to the ID5 server side with the ID5 ID and some additional free form metadata.
   * The Metadata must be a "map" aka a JSON object with no nested JSON objects and String values.
   * Currently supported event types:
   * - "view" - The creative was rendered into the page
   * @param {string} eventType
   * @param {Object} metadata
   * @returns {Promise<Response>} The response from the ID5 server
   */
  collectEvent(eventType, metadata) {
    const sendEvent = (id5id) => {
      const fetchPayload = new Request('https://id5-sync.com/event', {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          partnerId: this.config.getOptions().partnerId,
          id5id,
          eventType,
          metadata
        })
      });
      this._log.info('Sending event', fetchPayload);
      return fetch(fetchPayload)
        .catch(reason => this._log.error('Error while sending event to ID5 of type ' + eventType, reason));
    };

    if (this._userIdAvailable) {
      return sendEvent(this._userId);
    } else {
      return this._userIdAvailablePromise.then(id5id => sendEvent(id5id));
    }
  }

  /**
   * Internal API. These methods will be used internally and external usage is not supported.
   */

  /**
   * @param {Config} config
   * @param {ClientStore} clientStore
   * @param {ConsentManagement} consentManagement
   * @param {Id5CommonMetrics} metrics
   * @param {ConsentDataProvider} consentDataProvider
   * @param {Logger} logger
   * @param {Instance} multiplexingInstance multiplexing instance reference
   * @param {PageLevelInfo} pageLevelInfo
   */
  constructor(config, clientStore, consentManagement, metrics, consentDataProvider, logger, multiplexingInstance, pageLevelInfo) {
    this.config = config;
    this.clientStore = clientStore;
    this.consentManagement = consentManagement;
    this._metrics = metrics;
    this._consentDataProvider = consentDataProvider;
    this._log = new NamedLogger('Id5Instance:', logger);
    this._multiplexingInstance = multiplexingInstance;
    this._userIdAvailablePromise = new Promise(resolve => {
      this._userIdAvailablePromiseResolver = resolve;
    });
    this._pageLevelInfo = pageLevelInfo;
    this._unregisterTargets = new UnregisterTargets(this._multiplexingInstance, this._metrics);
    ID5_REGISTRY.register(this);
  }

  bootstrap() {
    const userIdReadyTimer = startTimeMeasurement();
    const options = this.config.getOptions();
    // best effort to avoid that mx instance has strong reference to id5Instance
    // this way Id5Instance, if not referenced by publisher, can be reclaimed by GC
    // then cleanup for multiplexing, metrics can be triggered
    const thisRef = this._ref();
    this._multiplexingInstance
      .on(ApiEvent.CASCADE_NEEDED, cascadeCommand => {
        const id5Instance = thisRef.deref();
        if (id5Instance) {
          id5Instance._doCascade(cascadeCommand);
        }
      })
      .on(ApiEvent.USER_ID_READY, (userIdData, notificationContext) => {
        const id5Instance = thisRef.deref();
        if (id5Instance) {
          try {
            const notificationContextTags = notificationContext?.tags ? {...notificationContext.tags} : {};
            const metrics = id5Instance._metrics;
            if (notificationContext?.timestamp) {
              metrics.userIdNotificationDeliveryDelayTimer(notificationContextTags).record(Date.now() - notificationContext.timestamp);
            }
            userIdReadyTimer.record(metrics.userIdProvisioningDelayTimer(userIdData.isFromCache, {
              ...notificationContextTags,
              isUpdate: id5Instance._userIdAvailable,
              hasOnAvailable: id5Instance._availableCallback !== undefined,
              hasOnRefresh: id5Instance._refreshCallback !== undefined,
              hasOnUpdate: id5Instance._updateCallback !== undefined
            }));
          } catch (e) {
            id5Instance._log.error('Failed to measure provisioning metrics', e);
          }
          id5Instance._setUserId(userIdData.responseObj, userIdData.isFromCache, userIdData.willBeRefreshed);
        }
      })
      .on(ApiEvent.USER_ID_FETCH_CANCELED, details => {
        const id5Instance = thisRef.deref();
        if (id5Instance) {
          id5Instance._log.info('ID5 User ID fetch canceled:', details.reason);
        }
      });

    this._log.info(`bootstrapped for partner ${options.partnerId} with referer ${this._refererInfo} and options`, this.getProvidedOptions());
  }

  firstFetch() {
    const options = this.config.getOptions();
    const fetchDataPromise = this._gatherFetchIdData().then(data => {
      this._multiplexingInstance.register({
        source: ORIGIN,
        sourceVersion: currentVersion,
        sourceConfiguration: {
          options
        },
        fetchIdData: data,
        singletonMode: options?.multiplexing?._disabled === true,
        canDoCascade: !this.config.hasCreativeRestrictions(),
        forceAllowLocalStorageGrant: this.consentManagement.isForceAllowLocalStorageGrant(),
        storageExpirationDays: options.storageExpirationDays
      });
    });

    const refreshConsentPromise = this._submitRefreshConsent().then(consentData => {
      if (consentData) {
        this.consentManagement.setConsentData(consentData);
      }
    });

    return Promise.allSettled([fetchDataPromise, refreshConsentPromise]);
  }

  refreshId(forceFetch, options) {
    let fetchDataPromise, refreshConsentPromise;
    this._log.info(`ID refresh requested (force=${forceFetch}) with additional options `, options);
    try {
      this._isRefreshing = true;
      this._isRefreshingWithFetch = forceFetch;
      this.config.updOptions(options);

      const updatedOptions = this.config.getOptions();
      const forceAllowLocalStorageGrant = updatedOptions.allowLocalStorageWithoutConsentApi || updatedOptions.debugBypassConsent;
      fetchDataPromise = this._gatherFetchIdData().then(fetchIdData => {
        this._multiplexingInstance.updateFetchIdData(fetchIdData);
        this._multiplexingInstance.refreshUid({
          resetConsent: true,
          forceAllowLocalStorageGrant: forceAllowLocalStorageGrant,
          forceFetch: forceFetch
        });
        refreshConsentPromise = this._submitRefreshConsent();
      });
      this._metrics.refreshCallCounter('public-api').inc()
    } catch (e) {
      this._log.error('Exception caught from refreshId()', e);
      return Promise.reject(e);
    }
    return Promise.allSettled([fetchDataPromise, refreshConsentPromise]);
  }

  _doCascade(cascadeCommand) {
    const options = this.config.getOptions();
    if (cascadeCommand.partnerId === options.partnerId
      && options.maxCascades >= 0
      && !this.config.hasCreativeRestrictions()
    ) {
      const isSync = options.partnerUserId && options.partnerUserId.length > 0;
      const endpoint = isSync ? 's' : 'i';
      const url = new URL(`/${endpoint}/${options.partnerId}/${options.maxCascades}.gif`, HOST);
      const params = url.searchParams;
      params.set('o', 'api');
      params.set('id5id', cascadeCommand.userId);
      params.set('gdpr_consent', cascadeCommand.consentString);
      params.set('gdpr', cascadeCommand.gdprApplies);
      if (cascadeCommand.gppString) {
        params.set('gpp', cascadeCommand.gppString);
        params.set('gpp_sid', cascadeCommand.gppSid);
      }
      if (isSync) {
        params.set('puid', options.partnerUserId);
      }
      this._log.info('Opportunities to cascade available', url.href);
      deferPixelFire(url.href);
    }
  }

  async _gatherFetchIdData() {
    const options = this.config.getOptions();
    const uaHints = await UaHints.gatherUaHints(options.disableUaHints, this._log);
    return {
      partnerId: options.partnerId,
      refererInfo: this._pageLevelInfo.refererInfo,
      origin: ORIGIN,
      originVersion: this._pageLevelInfo.apiVersion,
      isUsingCdn: this._pageLevelInfo.isUsingCdn,
      att: options.att,
      uaHints: uaHints,
      abTesting: options.abTesting,
      segments: options.segments,
      // TODO replace with diagnostic metric  there is prometheus graph lateJoinerData.invalidSegmentsCount == knownData.invalidSegmentsCount
      invalidSegmentsCount: this.getInvalidSegments(),
      provider: options.provider,
      pd: options.pd,
      partnerUserId: options.partnerUserId,
      refreshInSeconds: options.refreshInSeconds, // TODO do we need this ?
      providedRefreshInSeconds: this.getProvidedOptions().refreshInSeconds,
      trace: isGlobalTrace(),
      allowedVendors: options.consentData?.allowedVendors,
      consentSource: options.cmpApi === 'iab' && options.debugBypassConsent !== true ? ConsentSource.cmp : ConsentSource.partner
    };
  }

  /**
   * @return {WeakRef<Id5Instance>|StrongRef}
   * @private
   */
  _ref() {
    if (typeof WeakRef !== 'undefined') {
      return new WeakRef(this);
    }
    return new StrongRef(this);
  }

  async _submitRefreshConsent() {
    const options = this.config.getOptions();
    let consentRequestTimeMeasurement = startTimeMeasurement();
    let consentRequestType = options.debugBypassConsent ? 'bypass' : options.cmpApi;
    let consentData;
    try {
      consentData = await this._consentDataProvider.refreshConsentData(
        options.debugBypassConsent,
        options.cmpApi,
        options.consentData);
      const apiTypeTags = {};
      consentData.apiTypes.forEach(apiType => apiTypeTags[apiType] = true);
      consentRequestTimeMeasurement.record(this._metrics.consentRequestTimer(consentRequestType, {
        success: true,
        ...apiTypeTags
      }));
      this._multiplexingInstance.updateConsent(consentData);
    } catch (error) {
      // TODO should notify somehow it was failed, to let leader reject waiting - whatever is done id will not be provisioned
      // TODO unless consent is delivered in a different way?
      // in multi instances scenario consent may be delivered by other instance to let API leader continue
      // in single instance scenario it will never be delivered which will result in id not being provisioned
      this._log.error(`Couldn't get consent data`, error);
      consentRequestTimeMeasurement.record(this._metrics.consentRequestTimer(consentRequestType, {
        success: false,
        error: error.message
      }));
    }
    return consentData;
  }

  /**
   * Set the user ID
   * @param {Object} response
   * @param {boolean} fromCache
   * @param {boolean} willBeRefreshed
   */
  _setUserId(response, fromCache, willBeRefreshed = false) {
    const userId = response.universal_uid;
    this._isExposed = true;
    if (isPlainObject(response.ab_testing)) {
      switch (response.ab_testing.result) {
        case 'normal':
          // nothing to do
          break;
        default: // falls through
        case 'error':
          this._log.error('There was an error with A/B Testing. Make sure controlGroupRatio is a number >= 0 and <= 1');
          break;
        case 'control':
          this._isExposed = false;
          this._log.info('User is in control group!');
          break;
      }
    }

    const hasChanged = this._userId !== userId || deepEqual(this._ext, response.ext) === false;
    this._userIdAvailable = true;
    this._userId = userId;
    this._userIdAvailablePromiseResolver(userId);
    this._ext = response.ext;
    this._fromCache = fromCache;
    this._log.info('User id updated', {hasChanged, fromCache});

    // Fire callbacks
    if (this._availableCallback) {
      this._availableCallback.triggerNow();
    }
    if (this._isRefreshing && this._refreshCallback && (fromCache === false || this._isRefreshingWithFetch === false)) {
      this._refreshCallback.triggerNow();
    }

    if (hasChanged) {
      this._fireOnUpdate();
    }

    if (this.getOptions().allowGCReclaim === GCReclaimAllowed.AFTER_UID_SET && (!fromCache || !willBeRefreshed)) {
      ID5_REGISTRY.releaseInstance(this);
    }
  }

  _fireOnUpdate() {
    setTimeout(() => {
      if (isFn(this._updateCallback)) {
        this._log.debug('Firing onUpdate');
        this._updateCallback(this);
      }
    }, 0);
  }

  /**
   * @return {LocalStorageGrant} see {ClientStore.localStorageGrant}
   */
  localStorageGrant() {
    return this.clientStore.localStorageGrant();
  }
}
