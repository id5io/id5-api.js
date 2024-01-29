import {ajax, isDefined, isStr, isPlainObject, objectEntries} from './utils.js';
import {
  /* eslint-disable no-unused-vars */
  ConsentManager,
  /* eslint-enable no-unused-vars */
  NoConsentError
} from './consent.js';
import {startTimeMeasurement} from '@id5io/diagnostics';

/* eslint-disable no-unused-vars */
import {Store, CachedResponse} from './store.js';
import {WindowStorage} from './localStorage.js';
import {Logger} from './logger.js';
/* eslint-enable no-unused-vars */

const HOST = 'https://id5-sync.com';
const MULTI_FETCH_ENDPOINT_V3 = `/gm/v3`;

/**
 * FetchIdData data enriched with mutiplexing insights. Used when called multiplexed fetch request
 * @typedef {FetchIdData} FetchIdRequestData
 * @property {string} integrationId - unique multiplexing integration id
 * @property {string} role - multiplexing integration role {leader|follower}
 * @property {string} requestCount - number of times integration was included in multiplexed requests so far within session
 * @property {string} cacheId - instance client storage cache identifier
 */

/**
 * @typedef {Object} ResponseCacheControl
 * @property {number} max_age_sec
 */

/**
 * @typedef {Object} FetchResponse
 * @property {string} universal_uid
 * @property {string} signature
 * @property {ResponseCacheControl} [cache_control]
 * @property {boolean|undefined} [cascade_needed]
 */

/**
 * @typedef {Object} MultiFetchResponse
 * @property {FetchResponse} generic
 * @property {Map<string, FetchResponse>} responses
 */

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

  /**
   *
   * @param requestId
   * @return {FetchResponse}
   */
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
   * @param {Map<string, CachedResponse>} cacheData
   * @param {boolean} isLocalStorageAvailable
   * @return {Promise<MultiFetchResponse>}
   */
  refreshUid(fetchRequestIdData, consentData, cacheData, isLocalStorageAvailable) {
    return this._extensionsProvider.gather(fetchRequestIdData)
      .then(extensions => {
        const requests = fetchRequestIdData.map(fetchIdData => {
          const cachedRequest = cacheData.get(fetchIdData.cacheId);
          const signature = cachedRequest?.response?.signature;
          const nbValue = cachedRequest?.nb;
          const cacheMaxAge = cachedRequest?.getMaxAge();
          return this._createRequest(consentData, fetchIdData, signature, nbValue, cacheMaxAge, extensions, isLocalStorageAvailable);
        });
        const log = this._log;
        const metrics = this._metrics;
        const refresher = this;
        return new Promise((resolve, reject) => {
          const fetchTimeMeasurement = startTimeMeasurement();
          const url = `${HOST}${MULTI_FETCH_ENDPOINT_V3}`;
          log.info('Fetching ID5 ID from:', url, requests);
          ajax(url, {
            success: function (jsonResponse) {
              log.info('Success at fetch call:', jsonResponse);
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
   * @param {number} nbValue
   * @param {String} signature
   * @param {number} refreshInSecondUsed
   * @param {Object} extensions
   * @param {boolean|undefined} isLocalStorageAvaliable
   * @return {Object}
   */
  _createRequest(consentData, fetchIdData, signature, nbValue, refreshInSecondUsed, extensions, isLocalStorageAvaliable) {
    this._log.info('Create request data for', {
      fetchIdData,
      consentData,
      signature,
      nbValue,
      refreshInSecondUsed,
      extensions
    });
    const partner = fetchIdData.partnerId;
    const data = {
      'requestId': fetchIdData.integrationId,
      'requestCount': fetchIdData.requestCount,
      'role': fetchIdData.role,
      'cacheId': fetchIdData.cacheId,
      'partner': partner,
      'v': fetchIdData.originVersion,
      'o': fetchIdData.origin,
      'tml': fetchIdData.refererInfo?.topmostLocation,
      'ref': fetchIdData.refererInfo?.ref,
      'cu': fetchIdData.refererInfo?.canonicalUrl,
      'u': fetchIdData.refererInfo?.stack[0] || window.location.href,
      'top': fetchIdData.refererInfo?.reachedTop ? 1 : 0,
      'localStorage': isLocalStorageAvaliable === true ? 1 : 0,
      'nbPage': nbValue,
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

    if (isDefined(consentData.gppData)) {
      data.gpp_string = consentData.gppData.gppString;
      data.gpp_sid = consentData.gppData.applicableSections.join(',');
    }

    if (isDefined(signature)) {
      data.s = signature;
    }
    const uaHints = fetchIdData.uaHints;
    if (isDefined(uaHints)) {
      data.ua_hints = uaHints;
    }

    if (isDefined(consentData.ccpaString) && !(consentData.ccpaString === '')) {
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
   * @param {boolean} refreshRequired - Force a call to server
   * @return {Promise<RefreshResult>}
   */
  getId(fetchRequestIdData, refreshRequired = true) {
    const log = this._log;
    log.info('UidFetcher: requested to get an id:', fetchRequestIdData);
    const store = this._store;
    const consentManager = this._consentManager;
    const metrics = this._metrics;

    log.info('Waiting for consent');
    const waitForConsentTimer = metrics.timer('fetch.consent.wait.time');
    return consentManager.getConsentData().then(consentData => {
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

      const consentHasChanged = store.hasConsentChanged(consentData);
      // store hashed consent data for future page loads if local storage allowed
      if (localStorageGrant.isDefinitivelyAllowed()) {
        store.storeConsent(consentData);
      }

      // make a call to fetch a new ID5 ID if:
      // - consent has changed since the last ID was fetched
      // - refreshedRequired (leader decision - i.e. fetch is being forced (e.g. by refreshId()),  no valid cached data for any follower)
      if (consentHasChanged || refreshRequired) {
        log.info(`Decided to fetch a fresh ID5 ID`, {
          consentHasChanged,
          refreshRequired
        });
        const cacheData = this._collectCacheData(fetchRequestIdData);
        const fetcher = this;
        log.info(`Fetching ID5 ID (forceFetch:${refreshRequired})`);
        return this._uidRefresher.refreshUid(fetchRequestIdData, consentData, cacheData, isLocalStorageAvailable)
          .then(response => {
            return fetcher._handleSuccessfulFetchResponse(response, fetchRequestIdData, consentData, cacheData);
          });
      } else {
        log.info('Not decided to refresh ID5 ID', {consentHasChanged, refreshRequired});
        // to let caller know it's done
        return new RefreshResult(consentData, undefined);
      }
    });
  }

  /**
   * @param {MultiFetchResponse} response
   * @param {array<FetchIdRequestData>} fetchIdData
   * @param {ConsentData} consentData
   * @param {Map<string, CachedResponse>} cachedData
   * @return {RefreshResult}
   */
  _handleSuccessfulFetchResponse(response, fetchIdData, consentData, cachedData) {
    const log = this._log;
    const consentManager = this._consentManager;
    const store = this._store;
    const refreshedResponse = new RefreshedResponse(response);
    // privacy has to be stored first, so we can use it when storing other values
    consentManager.setStoredPrivacy(response.generic.privacy);
    const localStorageGrant = consentManager.localStorageGrant();
    if (localStorageGrant.isDefinitivelyAllowed()) {
      log.info('Storing ID and request hashes in cache');
      store.updateNbs(cachedData);
      store.storeResponse(fetchIdData, refreshedResponse);
    } else {
      log.info('Cannot use local storage to cache ID', localStorageGrant);
      store.clearAll(fetchIdData);
    }
    return new RefreshResult(consentData, refreshedResponse);
  }

  _collectCacheData(fetchRequestIdData) {
    // collect cache data to include in request (nb counters, signature)
    // this data may not be accessible by leader earlier so get this here
    /** @type {Map<string, CachedResponse>} */
    const cacheData = new Map();
    for (const requestData of fetchRequestIdData) {
      const cacheId = requestData.cacheId;
      if (!cacheData.has(cacheId)) {
        const cachedResponse = this._store.getCachedResponse(cacheId);
        if (cachedResponse) {
          cacheData.set(cacheId, cachedResponse);
        }
      }
    }
    return cacheData;
  }
}
