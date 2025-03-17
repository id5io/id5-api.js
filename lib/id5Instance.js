import {
  deferPixelFire,
  isFn,
} from './utils.js';
import {ApiEvent} from '@id5io/multiplexing/events';
import {ConsentSource} from '@id5io/multiplexing/consent';
import {WatchdogSingletonCallback} from './callbacks.js';
import {startTimeMeasurement} from '@id5io/diagnostics';
import {CoreId5Instance} from './core/id5Instance.js';

/* eslint-disable no-unused-vars */
import {MeterRegistry} from '@id5io/diagnostics';
import {Config} from './config.js';
import {UaHints} from './uaHints.js';
import {consentRequestTimer, refreshCallCounter} from './metrics.js';
import {CONSTANTS} from '@id5io/multiplexing';
/* eslint-enable no-unused-vars */

const HOST = 'https://id5-sync.com';
const DEFAULT_ORIGIN = 'api';

export * from './core/id5Instance.js'

/*
 * Class representing and instance of the ID5 API obtained through ID5.init()
 */
export class Id5Instance extends CoreId5Instance {

  /** @type {ClientStore} */
  clientStore;

  /** @type {ConsentManagement} */
  consentManagement;

  /** @type {ConsentDataProvider} */
  _consentDataProvider;

  /** @type {TrueLinkAdapter} */
  _trueLinkAdapter;

  /**
   * Public API. These methods will remain mostly unchanged and represent what the partners can use on their side
   */

  /**
   * Return how many invalid segments we got in the options
   * @returns {number} invalidSegments
   */
  getInvalidSegments() {
    return this.config.getInvalidSegments();
  }

  /**
   * Return the publisher TrueLinkId, if partner has it enabled and integrated with TrueLink
   * @return {string} publisher TrueLinkId
   */
  getPublisherTrueLinkId() {
    return this._isExposed === false ? undefined : this._publisherTrueLinkId;
  }

  /**
   * @deprecated
   * Returns the current userId in an object that can be added to the
   * eids array of an OpenRTB bid request
   * @return {OpenRtbEID}
   */
  getUserIdAsEid() {
    return this._ids?.id5id?.eid ?? {
      source: CONSTANTS.ID5_EIDS_SOURCE,
      uids: [{
        atype: 1,
        id: this.getUserId(),
        ext: this.getExt()
      }]
    };
  }

  /**
   * Returns the all user IDs (including ID userId) provisioned to id5-api.js in OpenRTB EID format
   * that can be added to the eids array of an OpenRTB bid request
   * @return {array<OpenRtbEID>} array of the user IDs in OpenRTB EID format
   */

  getUserIdsAsEids() {
    const eids = super.getUserIdsAsEids();
    // fallback to depraceted method for backward compatibility
    return (eids === undefined || eids.length < 1) ? [this.getUserIdAsEid()] : eids
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
    this._refreshCallback = new WatchdogSingletonCallback('onRefresh', this._log, this._metrics, fn, timeout, fireImmediately, () => {
      this._isRefreshing = false;
      this._isRefreshingWithFetch = false;
    }, this);
    return this;
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
   * @param {MeterRegistry} metrics
   * @param {ConsentDataProvider} consentDataProvider
   * @param {Logger} logger
   * @param {Instance} multiplexingInstance multiplexing instance reference
   * @param {PageLevelInfo} pageLevelInfo
   * @param {TrueLinkAdapter} trueLinkAdapter
   * @param {string} origin
   */
  constructor(config, clientStore, consentManagement, metrics, consentDataProvider, logger, multiplexingInstance, pageLevelInfo, trueLinkAdapter, origin) {
    super(config, metrics, logger, multiplexingInstance, pageLevelInfo,  origin || DEFAULT_ORIGIN)
    this.clientStore = clientStore;
    this.consentManagement = consentManagement;
    this._consentDataProvider = consentDataProvider;
    this._trueLinkAdapter = trueLinkAdapter;
  }

  bootstrap() {
    super.bootstrap();
    const thisRef = this._ref();
    this._multiplexingInstance
      .on(ApiEvent.CASCADE_NEEDED, cascadeCommand => {
        /** @type Id5Instance */
        const id5Instance = thisRef.deref();
        if (id5Instance) {
          id5Instance._doCascade(cascadeCommand);
        }
      })
  }

  init() {
    const fetchDataPromise = super.init();

    const refreshConsentPromise = this._submitRefreshConsent().then(consentData => {
      if (consentData) {
        this.consentManagement.setConsentData(consentData);
      }
    });
    // try to lookup for cached userId in instance's localStorge, in addition to lookup made by leader (may have different localstorage)
    fetchDataPromise.then(() => {
      // if it happened before registration it would fail due to lack of all data required to calculate cacheId
      // let's try with cached consent data, if unsuccessfult try again once consent is resolved
      const result = this._multiplexingInstance.lookupForCachedId();
      if (!result.provisioned) {
        this._log.info('Couldn\'t find cached userId. Will try again when consent is resolved');
        // couldn't find anything so let's try again when consent is resolved
        refreshConsentPromise.then(() => {
          // if it happened before consent lookup it would not have access to localstorage, so effectively it would found nothing even if userId had been stored there
          this._log.info('Consent resolved. Looking for cached id again');
          this._multiplexingInstance.lookupForCachedId();
        });
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
      refreshCallCounter(this._metrics,'public-api').inc();
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
    const uaHintsPromise = UaHints.gatherUaHints(options.disableUaHints, this._log);
    const commonDataPromise = super._gatherFetchIdData();
    return Promise.allSettled([commonDataPromise, uaHintsPromise]).then(([commonData, uaHints]) => {
      return {
        ...(commonData.value),
        uaHints: uaHints.value,
        segments: options.segments,
        // TODO replace with diagnostic metric  there is prometheus graph lateJoinerData.invalidSegmentsCount == knownData.invalidSegmentsCount
        invalidSegmentsCount: this.getInvalidSegments(),
        allowedVendors: options.consentData?.allowedVendors,
        consentSource: options.cmpApi === 'iab' && options.debugBypassConsent !== true ? ConsentSource.cmp : ConsentSource.partner,
        trueLink: this._trueLinkAdapter.getTrueLink()
      }});
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
      consentRequestTimeMeasurement.record(consentRequestTimer(this._metrics,consentRequestType, {
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
      consentRequestTimeMeasurement.record(consentRequestTimer(this._metrics, consentRequestType, {
        success: false,
        error: error.message
      }));
    }
    return consentData;
  }

  /**
   * @return {LocalStorageGrant} see {ClientStore.localStorageGrant}
   */
  localStorageGrant() {
    return this.clientStore.localStorageGrant();
  }

}
