import { version as currentVersion } from '../generated/version.js';
import {
  deepEqual,
  deferPixelFire,
  isFn,
  isGlobalTrace,
  isPlainObject
} from './utils.js';
import { UaHints } from './uaHints.js';

/* eslint-disable no-unused-vars */
import { Id5CommonMetrics, startTimeMeasurement } from '@id5io/diagnostics';
import { ApiEvent, CONSTANTS, ClientStore, ConsentManagement, NamedLogger } from '@id5io/multiplexing';
import { Config } from './config.js';
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

/*
 * Class representing and instance of the ID5 API obtained through ID5.init()
 */
export class Id5Instance {
  /** timerId of the onAvailable watchdog */
  _availableCallbackTimerId;

  /** @type {boolean} */
  _availableCallbackFired = false;

  /** @type {function} */
  _availableCallback;

  /** @type {function} */
  _updateCallback;

  /** timerId of the onRefresh watchdog */
  _refreshCallbackTimerId;

  /** @type {boolean} */
  _refreshCallbackFired = false;

  /** @type {function} */
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

  /**
   * @type {Id5CommonMetrics}
   * @private
   */
  _metrics;

  /**
   * @type {Logger}
   * @private
   */
  _log;

  /** @type {MultiplexInstance} */
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
    return Object.assign({ abTestingControlGroup: !this.exposeUserId() }, exposedExt);
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
    if (isFn(this._availableCallback)) {
      this._log.info('onAvailable was already called, ignoring');
    } else {
      this._availableCallback = fn;
      const currentThis = this; // Preserve this within callback

      if (this._userIdAvailable) {
        this._log.info('User id already available firing callback immediately');
        this._availableCallbackTimerId = setTimeout(() => Id5Instance.doFireOnAvailableCallBack(currentThis), 0);
      } else if (timeout > 0) {
        this._availableCallbackTimerId = setTimeout(() => Id5Instance.doFireOnAvailableCallBack(currentThis), timeout);
      }
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
      throw new Error('onUpdate expect a function');
    }
    this._updateCallback = fn;
    const currentThis = this; // Preserve this within callback
    if (this._userIdAvailable) {
      setTimeout(() => Id5Instance.doFireOnUpdateCallBack(currentThis), 0);
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
      throw new Error('onRefresh expect a function');
    }
    // We have a pending onRefresh, cancel it.
    if (this._refreshCallbackTimerId) {
      clearTimeout(this._refreshCallbackTimerId);
      this._refreshCallbackTimerId = undefined;
    }
    this._refreshCallback = fn;
    const currentThis = this; // Preserve this within callback
    // If we are already after a non-forced refreshId and we already have a user id, then callback immediately
    if (this._isRefreshing === true && this._isRefreshingWithFetch === false && this._userIdAvailable) {
      this._refreshCallbackTimerId = setTimeout(() => Id5Instance.doFireOnRefreshCallBack(currentThis), 0);
    } else if (timeout > 0) {
      this._refreshCallbackTimerId = setTimeout(() => Id5Instance.doFireOnRefreshCallBack(currentThis), timeout);
    }
    return this;
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
    this._userIdAvailablePromise = new Promise(resolve => { this._userIdAvailablePromiseResolver = resolve; });
    this._pageLevelInfo = pageLevelInfo;
  }

  bootstrap() {
    const userIdReadyTimer = startTimeMeasurement();
    const options = this.config.getOptions();

    this._multiplexingInstance
      .on(ApiEvent.CASCADE_NEEDED, cascadeCommand => this._doCascade(cascadeCommand))
      .on(ApiEvent.USER_ID_READY, (userIdData, notificationContext) => {
        try {
          const notificationContextTags = notificationContext?.tags ? { ...notificationContext.tags } : {};
          if (notificationContext?.timestamp) {
            this._metrics.userIdNotificationDeliveryDelayTimer(notificationContextTags).record(Date.now() - notificationContext.timestamp);
          }
          userIdReadyTimer.record(this._metrics.userIdProvisioningDelayTimer(userIdData.isFromCache, {
            ...notificationContextTags,
            isUpdate: this._userIdAvailable
          }));
        } catch (e) {
          this._log.error('Failed to measure provisioning metrics', e);
        }
        this._setUserId(userIdData.responseObj, userIdData.isFromCache);
      })
      .on(ApiEvent.USER_ID_FETCH_CANCELED, details =>
        this._log.info('ID5 User ID fetch canceled:', details.reason
        ));

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
    try {
      this._log.info('Invoking refreshId()', arguments);
      this._isRefreshing = true;
      this._isRefreshingWithFetch = forceFetch;
      this.config.updOptions(options);

      const updatedOptions = this.config.getOptions();
      const forceAllowLocalStorageGrant = updatedOptions.allowLocalStorageWithoutConsentApi || updatedOptions.debugBypassConsent;
      this._gatherFetchIdData().then(fetchIdData => {
        this._multiplexingInstance.updateFetchIdData(fetchIdData);
        this._multiplexingInstance.refreshUid({
          resetConsent: true,
          forceAllowLocalStorageGrant: forceAllowLocalStorageGrant,
          forceFetch: forceFetch
        });
      });
      this._submitRefreshConsent();
    } catch (e) {
      this._log.error('Exception caught from refreshId()', e);
    }
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
      params.set('o', 'api')
      params.set('id5id', cascadeCommand.userId)
      params.set('gdpr_consent', cascadeCommand.consentString)
      params.set('gdpr', cascadeCommand.gdprApplies)
      if (cascadeCommand.gppString) {
        params.set('gpp_string', cascadeCommand.gppString);
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
      trace: isGlobalTrace()
    };
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
      consentRequestTimeMeasurement.record(this._metrics.consentRequestTimer(consentRequestType, {
        success: true,
        apiType: consentData.api
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
   */
  _setUserId(response, fromCache) {
    const _this = this;
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
    this._log.info(`User id updated, hasChanged: ${hasChanged}, fromCache: ${fromCache}`);

    // Fire onAvailable if not yet fired
    if (isFn(this._availableCallback) && this._availableCallbackFired === false) {
      // Cancel pending watchdog
      if (this._availableCallbackTimerId) {
        this._log.info('Cancelling pending onAvailableCallback watchdog');
        clearTimeout(this._availableCallbackTimerId);
        this._availableCallbackTimerId = undefined;
      }
      this._availableCallbackTimerId = setTimeout(() => Id5Instance.doFireOnAvailableCallBack(_this), 0);
    }

    // Fire onRefresh if not yet fired and not from cache
    if (this._isRefreshing && isFn(this._refreshCallback) && this._refreshCallbackFired === false) {
      if (fromCache === false || this._isRefreshingWithFetch === false) {
        // Cancel pending watchdog
        if (this._refreshCallbackTimerId) {
          this._log.info('Cancelling pending onRefreshCallback watchdog');
          clearTimeout(this._refreshCallbackTimerId);
          this._refreshCallbackTimerId = undefined;
        }
        this._refreshCallbackTimerId = setTimeout(() => Id5Instance.doFireOnRefreshCallBack(_this), 0);
      }
    }

    // Always fire onUpdate if any change
    if (hasChanged && isFn(this._updateCallback)) {
      setTimeout(() => Id5Instance.doFireOnUpdateCallBack(_this), 0);
    }
  }

  /**
   * @return {LocalStorageGrant} see {ClientStore.localStorageGrant}
   */
  localStorageGrant() {
    return this.clientStore.localStorageGrant();
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
   * This function fire the onAvailable callback of the passed Id5Instance
   * @param {Id5Instance} currentId5Instance
   */
  static doFireOnAvailableCallBack(currentId5Instance) {
    currentId5Instance._log.info('Id5Instance.doFireOnAvailableCallBack');
    currentId5Instance._availableCallbackFired = true;
    currentId5Instance._availableCallbackTimerId = undefined;
    currentId5Instance._availableCallback(currentId5Instance);
  }

  /**
   * This function fire the onUpdate callback of the passed Id5Instance
   * @param {Id5Instance} currentId5Instance
   */
  static doFireOnUpdateCallBack(currentId5Instance) {
    currentId5Instance._log.info('Id5Instance.doFireOnUpdateCallBack');
    currentId5Instance._updateCallback(currentId5Instance);
  }

  /**
   * This function fire the onRefresh callback of the passed Id5Instance
   * @param {Id5Instance} currentId5Instance
   */
  static doFireOnRefreshCallBack(currentId5Instance) {
    currentId5Instance._log.info('Id5Instance.doFireOnRefreshCallBack');
    currentId5Instance._refreshCallbackFired = true;
    currentId5Instance._refreshCallbackTimerId = undefined;
    currentId5Instance._isRefreshing = false;
    currentId5Instance._isRefreshingWithFetch = false;
    currentId5Instance._refreshCallback(currentId5Instance);
  }
}
