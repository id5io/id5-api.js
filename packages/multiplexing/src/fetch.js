import {ajax, isDefined, isGlobalTrace, isStr, objectEntries} from '../../../lib/utils.js';
import {ApiEvent} from './apiEvent.js';
import {startTimeMeasurement} from '@id5io/diagnostics';

const HOST = 'https://id5-sync.com';

export class UidFetcher {
  /**
   * @type {Logger}
   * @private
   */
  _log;
  /**
   * @type {Store}
   */
  _store;

  /**
   * @param {ConsentManager} consentManager
   * @param {Store} store
   * @param {MeterRegistry} metrics
   * @param {Logger} logger
   * @param {Extensions} extensions
   */
  constructor(consentManager, store, metrics, logger, extensions) {
    this._store = store;
    this._consentManager = consentManager;
    this._extensionsProvider = extensions;
    this._metrics = metrics;
    this._log = logger;
  }

  /**
   * This function get the user ID for the given config
   * @param {ApiEventsDispatcher} dispatcher
   * @param {array<FetchIdData>} fetchIdData
   * @param {boolean} forceFetch - Force a call to server
   */
  getId(dispatcher, fetchIdData, forceFetch = false) {
    const log = this._log;
    log.info('Get id', fetchIdData);
    const store = this._store;
    const consentManager = this._consentManager;
    const metrics = this._metrics;
    const localStorageGrant = consentManager.localStorageGrant();

    let storedDataState;
    let cachedResponseUsed = false;
    if (localStorageGrant.isDefinitivelyAllowed()) {
      log.info('Using local storage for cached ID', localStorageGrant);
      storedDataState = store.getStoredDataState(fetchIdData);
    }

    if (storedDataState && storedDataState.hasValidUid() && !storedDataState.pdHasChanged && !storedDataState.segmentsHaveChanged && !storedDataState.isStoredIdStale()) {
      // we have a valid stored response and pd is not different, so
      // use the stored response to make the ID available right away
      log.info('ID5 User ID available from cache:', storedDataState);

      dispatcher.emit(ApiEvent.USER_ID_READY, {
        timestamp: storedDataState.storedDateTime,
        responseObj: storedDataState.storedResponse,
        isFromCache: true
      });
      store.incNbs(fetchIdData, storedDataState);
      cachedResponseUsed = true;
    } else {
      log.info('No ID5 User ID available from cache', storedDataState);
    }

    log.info('Waiting for consent');
    const waitForConsentTimer = metrics.timer('id5.api.fetch.consent.wait.time', {cachedResponseUsed});
    consentManager.getConsentData().then((consentData) => {
      log.info('Consent received', consentData);
      if (waitForConsentTimer) {
        waitForConsentTimer.recordNow();
      }
      const localStorageGrant = consentManager.localStorageGrant();
      log.info('Local storage grant', localStorageGrant);
      if (!localStorageGrant.allowed) {
        log.info('No legal basis to use ID5', consentData);
        dispatcher.emit(ApiEvent.USER_ID_FETCH_CANCELED, {
          reason: 'No legal basis to use ID5'
        });
        return;
      }
      // refresh storage state
      storedDataState = store.getStoredDataState(fetchIdData, consentData);
      const consentHasChanged = storedDataState.consentHasChanged;

      // store hashed consent data pd for future page loads
      store.storeRequestData(consentData, fetchIdData);

      // make a call to fetch a new ID5 ID if:
      // - there is no valid universal_uid or no signature in cache
      // - the last refresh was longer than refreshInSeconds ago
      // - consent has changed since the last ID was fetched
      // - pd has changed since the last ID was fetched
      // - segments have changed since the last ID was fetched
      // - fetch is being forced (e.g. by refreshId())
      // - cached response hasn't been delivered in previous step (no consent information before)
      const missingStoredData = !storedDataState.isResponseComplete();
      const refreshInSecondsHasElapsed = storedDataState.refreshInSecondsHasElapsed();
      const pdHasChanged = storedDataState.pdHasChanged;
      const segmentsHaveChanged = storedDataState.segmentsHaveChanged;
      if (
        missingStoredData ||
        refreshInSecondsHasElapsed ||
        consentHasChanged ||
        pdHasChanged ||
        segmentsHaveChanged ||
        forceFetch || !cachedResponseUsed
      ) {
        log.info(`Decided to fetch a fresh ID5 ID`, {
          missingStoredData,
          refreshInSecondsHasElapsed,
          consentHasChanged,
          pdHasChanged,
          segmentsHaveChanged,
          forceFetch,
          cachedResponseUsed
        });
        let extensionsCallTimeMeasurement = metrics?.extensionsCallTimer().startMeasurement();
        this._extensionsProvider.gather(log)
          .then(extensions => {
            if (extensionsCallTimeMeasurement) {
              extensionsCallTimeMeasurement.record();
            }
            const requests = fetchIdData.map(fetchIdData => {
              const instanceRequest = this.createRequest(storedDataState, consentData, fetchIdData);
              instanceRequest.extensions = extensions;
              return instanceRequest;
            });
            this.fetchFreshID5ID(dispatcher, requests, fetchIdData, consentData, forceFetch, cachedResponseUsed);
          });
      }
    });
  }

  /**
   *
   * @param {StoredDataState} storedResponseState
   * @param {ConsentData} consentData
   * @param {FetchIdData} fetchIdData
   * @return {Object}
   */
  createRequest(storedResponseState, consentData, fetchIdData) {
    this._log.info('Create request data for', {storedResponseState, fetchIdData, consentData});
    const partner = fetchIdData.partnerId;
    const data = {
      'requestId': fetchIdData.integrationId,
      'partner': partner,
      'v': fetchIdData.originVersion,
      'o': fetchIdData.origin,
      'tml': fetchIdData.refererInfo?.topmostLocation,
      'ref': fetchIdData.refererInfo?.ref,
      'cu': fetchIdData.refererInfo?.canonicalUrl,
      'u': fetchIdData.refererInfo?.stack[0] || window.location.href,
      'top': fetchIdData.refererInfo?.reachedTop ? 1 : 0,
      'localStorage': fetchIdData.isLocalStorageAvailable ? 1 : 0,
      'nbPage': storedResponseState?.nb[partner],
      'id5cdn': fetchIdData.isUsingCdn,
      'ua': window.navigator.userAgent,
      'att': fetchIdData.att
    };
    const gdprApplies = consentData.gdprApplies;
    if (isDefined(gdprApplies)) {
      data.gdpr = gdprApplies ? 1 : 0;
    }
    const gdprConsentString = consentData.consentString;
    if (isDefined(gdprConsentString)) {
      data.gdpr_consent = gdprConsentString;
    }

    if (isDefined(consentData.allowedVendors)) {
      data.allowed_vendors = consentData.allowedVendors;
    }

    const signature = storedResponseState?.storedResponse?.signature;
    if (isDefined(signature)) {
      data.s = signature;
    }
    const uaHints = fetchIdData.uaHints;
    if (isDefined(uaHints)) {
      data.ua_hints = uaHints;
    }

    if (consentData.hasCcpaString) {
      data.us_privacy = consentData.ccpaString;
    }

    if (fetchIdData.liveIntentId) {
      data.li = fetchIdData.liveIntentId;
    }

    objectEntries({
      pd: 'pd',
      partnerUserId: 'puid',
      provider: 'provider',
      segments: 'segments'
    }).forEach(entry => {
      const [optKey, dataKey] = entry;
      if (isDefined(fetchIdData[optKey])) {
        data[dataKey] = fetchIdData[optKey];
      }
    });

    // pass in A/B Testing configuration, if applicable
    const abTesting = fetchIdData.abTesting;
    if (abTesting && abTesting.enabled === true) {
      data.ab_testing = {
        enabled: true,
        control_group_pct: abTesting.controlGroupPct
      };
    }

    const invalidSegmentsCount = fetchIdData.invalidSegmentsCount;
    if (invalidSegmentsCount && invalidSegmentsCount > 0) {
      data._invalid_segments = invalidSegmentsCount;
    }

    if (isGlobalTrace()) {
      data._trace = true;
    }

    data.provided_options = {
      refresh_in_seconds: fetchIdData.providedRefreshInSeconds
    };

    data.used_refresh_in_seconds = storedResponseState?.refreshInSeconds;

    return data;
  }

  /**
   *
   * @param {ApiEventsDispatcher} dispatcher
   * @param {array<Object>} requests
   * @param {array<FetchIdData>} fetchIdData
   * @param {ConsentData} consentData
   * @param {boolean} forceFetch
   * @param {boolean} cachedResponseUsed
   */
  fetchFreshID5ID(dispatcher, requests, fetchIdData, consentData, forceFetch, cachedResponseUsed) {
    const url = `${HOST}/gm/v2`;
    let fetchTimeMeasurement = startTimeMeasurement();
    const log = this._log;
    log.info(`Fetching ID5 ID (forceFetch:${forceFetch}) from:`, url, requests);
    ajax(url, {
      success: this.handleSuccessfulFetchResponse(dispatcher, fetchIdData, cachedResponseUsed, consentData, fetchTimeMeasurement),
      error: error => {
        log.error('Error during AJAX request to ID5 server', error);
        if (fetchTimeMeasurement) {
          fetchTimeMeasurement.record(this._metrics?.fetchFailureCallTimer());
        }
      }
    }, JSON.stringify({requests: requests}), {method: 'POST', withCredentials: true});
  }

  /**
   * @param {ApiEventsDispatcher} dispatcher
   * @param {array<FetchIdData>} fetchIdData
   * @param {boolean} cachedResponseUsed
   * @param {ConsentData} consentData
   * @param {TimeMeasurement} fetchTimeMeasurement
   * @return {(function(*): void)|*}
   */
  handleSuccessfulFetchResponse(dispatcher, fetchIdData, cachedResponseUsed, consentData, fetchTimeMeasurement) {
    const log = this._log;
    const consentManager = this._consentManager;
    const store = this._store;
    return response => {
      if (fetchTimeMeasurement) {
        fetchTimeMeasurement.record(this._metrics?.fetchSuccessfulCallTimer());
      }
      let responseObj = this.validateResponseIsCorrectJson(response, 'fetch');
      if (!responseObj) {
        return;
      }
      if (!isStr(responseObj.universal_uid)) {
        log.error('Server response failed to validate', responseObj);
        return;
      }
      log.info('Valid json response from ID5 received', responseObj);
      try {
        dispatcher.emit(ApiEvent.USER_ID_READY, {
          timestamp: Date.now(),
          responseObj: responseObj,
          isFromCache: false
        });
        // privacy has to be stored first, so we can use it when storing other values
        consentManager.setStoredPrivacy(responseObj.privacy);

        const localStorageGrant = consentManager.localStorageGrant();
        if (localStorageGrant.isDefinitivelyAllowed()) {
          log.info('Storing ID in cache');
          store.storeResponse(fetchIdData, response, cachedResponseUsed);
        } else {
          log.info('Cannot use local storage to cache ID', localStorageGrant);
          store.clearAll(fetchIdData);
        }

        if (responseObj.cascade_needed === true && localStorageGrant.isDefinitivelyAllowed()) {
          // TODO move it to leader class upon UID ready event ?
          dispatcher.emit(ApiEvent.CASCADE_NEEDED, {
            partnerId: fetchIdData[0].partnerId,
            consentString: consentData.consentString,
            gdprApplies: consentData.gdprApplies,
            userId: responseObj.universal_uid
          });
        }
      } catch (error) {
        log.error('Error during processing of valid ID5 server response', responseObj, error);
      }
    };
  }

  validateResponseIsCorrectJson(response, responseType) {
    if (!response || !isStr(response) || response.length < 1) {
      this._log.error(`Empty ${responseType} response from ID5 servers: "${response}"`);
    } else {
      try {
        return JSON.parse(response);
      } catch (error) {
        this._log.error(`Cannot parse the JSON server ${responseType} response`, response);
      }
    }
    return null;
  }
}
