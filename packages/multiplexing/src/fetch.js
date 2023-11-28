import {ajax, isDefined, isStr, isPlainObject, objectEntries} from './utils.js';
import {
  /* eslint-disable no-unused-vars */
  ConsentManager,
  /* eslint-enable no-unused-vars */
  NoConsentError
} from './consent.js';
import {startTimeMeasurement} from '@id5io/diagnostics';

/* eslint-disable no-unused-vars */
import {Store} from './store.js';
import {WindowStorage} from './localStorage.js';
/* eslint-enable no-unused-vars */

const HOST = 'https://id5-sync.com';
const MULTI_FETCH_ENDPOINT_V3 = `/gm/v3`;

/**
 * FetchIdData data enriched with mutiplexing insights. Used when called multiplexed fetch request
 * @typedef {FetchIdData} FetchIdRequestData
 * @property {string} integrationId - unique multiplexing integration id
 * @property {string} role - multiplexing integration role {leader|follower}
 * @property {string} requestCount - number of times integration was included in multiplexed requests so far within session
 */

/**
 * @typedef {Object} FetchResponse
 * @property {string} universal_uid
 * @property {string} signature
 * @property {boolean} cascade_needed
 */

/**
 * @typedef {Object} MultiFetchResponse
 * @property {FetchResponse} generic
 * @property {Map<string, FetchResponse>} responses
 */

export class CachedResponse {
  /**
   * @type number
   */
  timestamp;
  /**
   * @type {FetchResponse}
   */
  response;

  /**
   *
   * @param {FetchResponse} response
   * @param {number} timestamp
   */
  constructor(response, timestamp = Date.now()) {
    this.response = response;
    this.timestamp = timestamp;
  }
}

export class RefreshedResponse {
  /**
   * @type number
   */
  timestamp;
  /**
   * @type {MultiFetchResponse}
   */
  response;

  constructor(response, timestamp = Date.now()) {
    this.response = response;
    this.timestamp = timestamp;
  }

  getGenericResponse() {
    return this.response.generic;
  }

  getResponseFor(requestId) {
    if (this.response.responses[requestId]) {
      return {
        ...this.response.generic,
        ...this.response.responses[requestId]
      };
    }
    return undefined;
  }
}

export class UidRefresher {
  /**
   * @type {Extensions}
   * @private
   */
  _extensionsProvider;
  /**
   * @type {Id5CommonMetrics}
   */
  _metrics;
  /**
   * @type {Logger}
   * @private
   */
  _log;

  constructor(extensions, metrics, log) {
    this._extensionsProvider = extensions;
    this._metrics = metrics;
    this._log = log;
  }

  /**
   * @param {ConsentData} consentData
   * @param {array<FetchIdRequestData>} fetchRequestIdData
   * @param {Map<number, number>} nbs
   * @param {String} signature
   * @param {number} refreshInSecondUsed
   * @param {boolean} isLocalStorageAvailable
   * @return {Promise<MultiFetchResponse>}
   */
  refreshUid(fetchRequestIdData, consentData, nbs, signature, refreshInSecondUsed, isLocalStorageAvailable) {
    return this._extensionsProvider.gather(fetchRequestIdData)
      .then(extensions => {
        const requests = fetchRequestIdData.map(fetchIdData => {
          return this._createRequest(consentData, fetchIdData, signature, nbs, refreshInSecondUsed, extensions, isLocalStorageAvailable);
        });
        const log = this._log;
        const metrics = this._metrics;
        const refresher = this;
        return new Promise((resolve, reject) => {
          const fetchTimeMeasurement = startTimeMeasurement();
          const url = `${HOST}${MULTI_FETCH_ENDPOINT_V3}`;
          log.info(`Fetching ID5 ID from:`, url, requests);
          ajax(url, {
            success: function (jsonResponse) {
              fetchTimeMeasurement.record(metrics?.fetchSuccessfulCallTimer());
              try {
                resolve(refresher._validateResponse(jsonResponse));
              } catch (e) {
                reject(e);
              }
            },
            error: function (error) {
              fetchTimeMeasurement.record(metrics?.fetchFailureCallTimer());
              reject(error);
            }
          }, JSON.stringify({requests: requests}), {method: 'POST', withCredentials: true}, log);
        });
      });
  }

  _validateResponse(jsonResponse) {
    if (!jsonResponse || !isStr(jsonResponse) || jsonResponse.length < 1) {
      throw new Error(`Empty fetch response from ID5 servers: "${jsonResponse}"`);
    }
    const responseObj = JSON.parse(jsonResponse);
    if (!isPlainObject(responseObj.generic)) {
      throw new Error(`Server response failed to validate: ${jsonResponse}`);
    }
    this._log.info('Valid json response from ID5 received', responseObj);
    return responseObj;
  }

  /**
   * @param {ConsentData} consentData
   * @param {FetchIdRequestData} fetchIdData
   * @param {Map<number, number>} nbs
   * @param {String} signature
   * @param {number} refreshInSecondUsed
   * @param {Object} extensions
   * @param {boolean|undefined} isLocalStorageAvaliable
   * @return {Object}
   */
  _createRequest(consentData, fetchIdData, signature, nbs, refreshInSecondUsed, extensions, isLocalStorageAvaliable) {
    this._log.info('Create request data for', {
      fetchIdData,
      consentData,
      signature,
      nbs,
      refreshInSecondUsed,
      extensions
    });
    const partner = fetchIdData.partnerId;
    const data = {
      'requestId': fetchIdData.integrationId,
      'requestCount': fetchIdData.requestCount,
      'role': fetchIdData.role,
      'partner': partner,
      'v': fetchIdData.originVersion,
      'o': fetchIdData.origin,
      'tml': fetchIdData.refererInfo?.topmostLocation,
      'ref': fetchIdData.refererInfo?.ref,
      'cu': fetchIdData.refererInfo?.canonicalUrl,
      'u': fetchIdData.refererInfo?.stack[0] || window.location.href,
      'top': fetchIdData.refererInfo?.reachedTop ? 1 : 0,
      'localStorage': isLocalStorageAvaliable === true ? 1 : 0,
      'nbPage': nbs[partner],
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

    if (fetchIdData.trace) {
      data._trace = true;
    }

    data.provided_options = {
      refresh_in_seconds: fetchIdData.providedRefreshInSeconds
    };

    data.used_refresh_in_seconds = refreshInSecondUsed;
    data.extensions = extensions;
    return data;
  }
}

/**
 * @typedef {Object} RefreshResult
 * @property {RefreshedResponse} refreshedResponse
 * @property {ConsentData} consentData
 */

export class RefreshResult {
  /**
   * @type {ConsentData}
   */
  consentData;

  /**
   * @type {RefreshedResponse}
   */
  refreshedResponse;

  constructor(consentData, refreshedResponse = undefined) {
    this.consentData = consentData;
    this.refreshedResponse = refreshedResponse;
  }
}

class FetchIdResult {
  /**
   * @type {CachedResponse}
   */
  cachedResponse;

  /**
   * @type {Promise<RefreshResult>}
   */
  refreshResult;
}

export class UidFetcher {
  /**
   * @type {Store}
   */
  _store;

  /**
   * @type {ConsentManager}
   */
  _consentManager;

  /**
   * @type {UidRefresher}
   * @private
   */
  _uidRefresher;

  /**
   * @type {Id5CommonMetrics}
   */
  _metrics;

  /**
   * @type {Logger}
   * @private
   */
  _log;

  /**
   * @param {ConsentManager} consentManager
   * @param {Store} store
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   * @param {Extensions} extensions
   * @param {UidRefresher} uidRefresher
   */
  constructor(consentManager, store, metrics, logger, extensions, uidRefresher = new UidRefresher(extensions, metrics, logger)) {
    this._store = store;
    this._consentManager = consentManager;
    this._metrics = metrics;
    this._log = logger;
    this._uidRefresher = uidRefresher;
  }

  /**
   * This function get the user ID for the given config

   * @param {array<FetchIdRequestData>} fetchRequestIdData
   * @param {boolean} forceFetch - Force a call to server
   * @return {FetchIdResult}
   */
  getId(fetchRequestIdData, forceFetch = false) {
    const result = new FetchIdResult();
    const log = this._log;
    log.info('Get id', fetchRequestIdData);
    const store = this._store;
    const consentManager = this._consentManager;
    const metrics = this._metrics;
    const localStorageGrant = consentManager.localStorageGrant();

    let storedDataState;
    let cachedResponseUsed = false;
    if (localStorageGrant.isDefinitivelyAllowed()) {
      log.info('Using local storage for cached ID', localStorageGrant);
      storedDataState = store.getStoredDataState(fetchRequestIdData);
    }

    if (storedDataState && storedDataState.hasValidUid() && !storedDataState.pdHasChanged && !storedDataState.segmentsHaveChanged && !storedDataState.isStoredIdStale()) {
      // we have a valid stored response and pd is not different, so
      // use the stored response to make the ID available right away
      log.info('ID5 User ID available from cache:', storedDataState);
      result.cachedResponse = new CachedResponse(storedDataState.storedResponse, storedDataState.storedDateTime);
      store.incNbs(fetchRequestIdData, storedDataState);
      cachedResponseUsed = true;
    } else {
      log.info('No ID5 User ID available from cache', storedDataState);
    }

    log.info('Waiting for consent');
    const waitForConsentTimer = metrics.timer('fetch.consent.wait.time', {cachedResponseUsed});
    result.refreshResult = consentManager.getConsentData().then((consentData) => {
      log.info('Consent received', consentData);
      if (waitForConsentTimer) {
        waitForConsentTimer.recordNow();
      }
      const localStorageGrant = consentManager.localStorageGrant();
      log.info('Local storage grant', localStorageGrant);
      if (!localStorageGrant.allowed) {
        log.info('No legal basis to use ID5', consentData);
        throw new NoConsentError(consentData, 'No legal basis to use ID5');
      }

      // with given consent we can check if it is accessible
      const isLocalStorageAvailable = WindowStorage.checkIfAccessible();

      // refresh storage state
      storedDataState = store.getStoredDataState(fetchRequestIdData, consentData);
      const consentHasChanged = storedDataState.consentHasChanged;

      // store hashed consent data pd for future page loads if local storage allowed
      if (localStorageGrant.isDefinitivelyAllowed()) {
        store.storeRequestData(consentData, fetchRequestIdData);
      }

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
        const nbs = storedDataState?.nb;
        const signature = storedDataState?.storedResponse?.signature;
        const refreshInSecondUsed = storedDataState?.refreshInSeconds;
        const fetcher = this;
        log.info(`Fetching ID5 ID (forceFetch:${forceFetch})`);
        return this._uidRefresher.refreshUid(fetchRequestIdData, consentData, nbs, signature, refreshInSecondUsed, isLocalStorageAvailable)
          .then(response => {
            return fetcher.handleSuccessfulFetchResponse(response, fetchRequestIdData, cachedResponseUsed, consentData);
          });
      } else {
        // to let caller know it's done
        return new RefreshResult(consentData);
      }
    });
    return result;
  }

  /**
   * @param {MultiFetchResponse} response
   * @param {array<FetchIdRequestData>} fetchIdData
   * @param {boolean} cachedResponseUsed
   * @param {ConsentData} consentData
   * @return {RefreshResult}
   */
  handleSuccessfulFetchResponse(response, fetchIdData, cachedResponseUsed, consentData) {
    const log = this._log;
    const consentManager = this._consentManager;
    const store = this._store;
    // privacy has to be stored first, so we can use it when storing other values
    consentManager.setStoredPrivacy(response.generic.privacy);
    const localStorageGrant = consentManager.localStorageGrant();
    if (localStorageGrant.isDefinitivelyAllowed()) {
      log.info('Storing ID and request hashes in cache');
      store.storeRequestData(consentData, fetchIdData);
      store.storeResponse(fetchIdData, response.generic, cachedResponseUsed);
    } else {
      log.info('Cannot use local storage to cache ID', localStorageGrant);
      store.clearAll(fetchIdData);
    }
    return new RefreshResult(consentData, new RefreshedResponse(response));
  }
}
