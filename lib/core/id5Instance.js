import {version as currentVersion} from '../../generated/version.js';
import {
  deepEqual,
  isFn,
  isGlobalTrace,
  isPlainObject,
  isDefined
} from '../utils.js';
import {ConsentSource} from '@id5io/multiplexing/consent';
import {ApiEvent} from '@id5io/multiplexing/events';
import {NamedLogger} from '@id5io/multiplexing/logger';
import {GCReclaimAllowed} from '../config.js';
import {WatchdogSingletonCallback} from '../callbacks.js';
import {startTimeMeasurement} from '@id5io/diagnostics';
import {instanceSurvivalTime, userIdNotificationDeliveryDelayTimer, userIdProvisioningDelayTimer} from '../metrics.js';
import {TargetingTags} from '../targetingTags.js';

/* eslint-disable no-unused-vars */
import {MeterRegistry} from '@id5io/diagnostics';
import {Config} from '../config.js';
import {GoogleSecureSignalProvider} from '../gssProvider.js';

/* eslint-enable no-unused-vars */

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
  /** @type {MeterRegistry} */
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
      this._survivalTimer.record(instanceSurvivalTime(this._metrics, {
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
  /** @type {Set<CoreId5Instance>} */
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
   * @param {CoreId5Instance} instance
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
  /** @type {CoreId5Instance}*/
  _ref;

  constructor(ref) {
    this._ref = ref;
  }

  /**
   * @return {CoreId5Instance}
   */
  deref() {
    return this._ref;
  }
}

/*
 * Class representing and instance of the ID5 API obtained through ID5.init()
 */
export class CoreId5Instance {
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

  /** @type {string} */
  _signature;

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

  /** @type {MeterRegistry} */
  _metrics;

  /** @type {Logger} */
  _log;

  /** @type {Instance} */
  _multiplexingInstance;

  /** @type {PageLevelInfo} */
  _pageLevelInfo;

  /** @type {string} */
  _origin;
  /**
   * @type {Ids}
   * @private
   */
  _ids;

  /** @type {string} */
  _publisherTrueLinkId;

  /** @type {string} */
  _gpId;

  /** @type {Consents}
   */
  _consents;

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
   * Returns collected consents data used to generate UserId
   * @returns {Consents}
   */
  getConsents() {
    return this._consents;
  }

  /**
   * Fire the provided callback when (and exactly once) a user id is available
   * if a timeout is provided, fire the callback at timeout even if user id is not yet available
   * @param {function(CoreId5Instance)} fn - callback function, receiving the current Id5Instance as first param
   * @param {number} [timeout] - watchdog timeout in ms
   * @return {CoreId5Instance} the current Id5Instance for chaining
   */
  onAvailable(fn, timeout) {
    if (!isFn(fn)) {
      throw new Error('onAvailable expects a function');
    }
    if (this._availableCallback) {
      this._log.warn('onAvailable was already called, ignoring');
    } else {
      this._availableCallback = new WatchdogSingletonCallback('onAvailable', this._log, this._metrics, fn, timeout, this._userIdAvailable, () => {
      }, this);
    }
    return this;
  }

  /**
   * Fire the provided callback each time a user id is available or updated.
   * Will be fired after onAvailable or onRefresh if both are provided
   * @param {function(CoreId5Instance)} fn - callback function, receiving the current Id5Instance as first param
   * @return {CoreId5Instance} the current Id5Instance for chaining
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

  unregister() {
    try {
      this._unregisterTargets.unregister('api-call');
      ID5_REGISTRY.unregister(this);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Internal API. These methods will be used internally and external usage is not supported.
   */

  /**
   * @param {Config} config
   * @param {MeterRegistry} metrics
   * @param {Logger} logger
   * @param {Instance} multiplexingInstance multiplexing instance reference
   * @param {PageLevelInfo} pageLevelInfo
   * @param {string} origin
   */
  constructor(config, metrics, logger, multiplexingInstance, pageLevelInfo, origin, registrationProperties = {}) {
    this.config = config;
    this._metrics = metrics;
    this._log = new NamedLogger('Id5Instance:', logger);
    this._multiplexingInstance = multiplexingInstance;
    this._userIdAvailablePromise = new Promise(resolve => {
      this._userIdAvailablePromiseResolver = resolve;
    });
    this._pageLevelInfo = pageLevelInfo;
    this._unregisterTargets = new UnregisterTargets(this._multiplexingInstance, this._metrics);
    this._origin = origin;
    ID5_REGISTRY.register(this);
    this._registrationProperties = registrationProperties
  }

  bootstrap() {
    const userIdReadyTimer = startTimeMeasurement();
    const options = this.config.getOptions();
    // best effort to avoid that mx instance has strong reference to id5Instance
    // this way Id5Instance, if not referenced by publisher, can be reclaimed by GC
    // then cleanup for multiplexing, metrics can be triggered
    const thisRef = this._ref();
    this._multiplexingInstance
      .on(ApiEvent.USER_ID_READY, (userIdData, notificationContext) => {
        const id5Instance = thisRef.deref();
        if (id5Instance) {
          try {
            const notificationContextTags = notificationContext?.tags ? {...notificationContext.tags} : {};
            const metrics = id5Instance._metrics;
            if (notificationContext?.timestamp) {
              userIdNotificationDeliveryDelayTimer(metrics, notificationContextTags).record(Date.now() - notificationContext.timestamp);
            }
            userIdReadyTimer.record(userIdProvisioningDelayTimer(metrics, userIdData.isFromCache, {
              ...notificationContextTags,
              isUpdate: id5Instance._userIdAvailable,
              hasOnAvailable: id5Instance._availableCallback !== undefined,
              hasOnRefresh: id5Instance._refreshCallback !== undefined,
              hasOnUpdate: id5Instance._updateCallback !== undefined,
              provisioner: notificationContext?.provisioner || 'leader',
              hasChanged: id5Instance._userId !== userIdData.responseObj.universal_uid
            }));
          } catch (e) {
            id5Instance._log.error('Failed to measure provisioning metrics', e);
          }
          id5Instance._setUserId(userIdData.responseObj, userIdData.isFromCache, userIdData.willBeRefreshed);
          id5Instance._consents = userIdData.consents;

          // Update GAM targeting tags
          TargetingTags.updateTargeting(userIdData, options.gamTargetingPrefix, options.exposeTargeting);
        }
      })
      .on(ApiEvent.USER_ID_FETCH_CANCELED, details => {
        const id5Instance = thisRef.deref();
        if (id5Instance) {
          id5Instance._log.info('ID5 User ID fetch canceled:', details.reason);
        }
      });

    this._log.info(`bootstrapped for partner ${options.partnerId} with referer ${this._pageLevelInfo?.refererInfo} and options`, this.getProvidedOptions());
  }

  init() {
    const options = this.config.getOptions();
    const gssProvider = options.gssProvider;
    if (gssProvider && gssProvider.enabled === true) {
      this._gssProvider = new GoogleSecureSignalProvider(options.gssProvider?.id || 'id5-sync.com');
    }
    return this._gatherFetchIdData().then(data => {
      this._multiplexingInstance.register({
        source: this._origin,
        sourceVersion: currentVersion,
        sourceConfiguration: {
          options
        },
        fetchIdData: data,
        singletonMode: options?.multiplexing?._disabled === true || options?.idLookupMode === true,
        forceAllowLocalStorageGrant: this.config.isForceAllowLocalStorageGrant(),
        storageExpirationDays: options.storageExpirationDays,
        ...(this._registrationProperties) // overwrite with custom registration properties
      });
    });
  }

  async _gatherFetchIdData() {
    const options = this.config.getOptions();
    return Promise.resolve({
      partnerId: options.partnerId,
      refererInfo: this._pageLevelInfo.refererInfo,
      origin: this._origin,
      originVersion: this._pageLevelInfo.apiVersion,
      isUsingCdn: this._pageLevelInfo.isUsingCdn,
      abTesting: options.abTesting,
      provider: options.provider,
      refreshInSeconds: options.refreshInSeconds, // TODO do we need this ?
      providedRefreshInSeconds: this.getProvidedOptions().refreshInSeconds,
      trace: isGlobalTrace(),
      consentSource: ConsentSource.none,
      segments: options.segments,
      invalidSegmentsCount: this.getInvalidSegments(),
      idLookupMode: options.idLookupMode
    });
  }

  /**
   * @return {WeakRef<CoreId5Instance>|StrongRef}
   * @private
   */
  _ref() {
    if (typeof WeakRef !== 'undefined') {
      return new WeakRef(this);
    }
    return new StrongRef(this);
  }

  /**
   * Set the user ID
   * @param {FetchResponse} response
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

    const hasChanged = this._userId !== userId || deepEqual(this._ext, response.ext) === false || deepEqual(this._ids, response.ids) === false;
    this._userIdAvailable = true;
    this._userId = userId;
    this._gpId = response.gp;
    this._ids = response.ids;
    this._userIdAvailablePromiseResolver(userId);
    this._ext = response.ext;
    this._publisherTrueLinkId = response.publisherTrueLinkId;
    this._fromCache = fromCache;
    this._signature = response.signature;
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

    if (this._gssProvider) {
      this._gssProvider.setUserId(this.getUserId());
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
}
