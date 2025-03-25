import {ajax, isDefined, isPlainObject, isStr} from './utils.js';
import {startTimeMeasurement} from '@id5io/diagnostics';

/* eslint-disable no-unused-vars */
import {CachedResponse} from './store.js';
import {Logger} from './logger.js';
import {fetchFailureCallTimer, fetchSuccessfulCallTimer} from './metrics.js';
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
 * @property {boolean} refresh - true if this instance require refresh, false otherwise
 * @property {CachedResponse} cacheData
 * @property {String} sourceVersion - version that instance has been registered with (can be different from `originVersion` defined in `FetchIdData`)
 * @property {String} source - source where this instance were loaded from like api/api-lite/id5-prebid-ext-module (can be different from `origin` defined in `FetchIdData`)
 */

/**
 * @typedef {Object} ResponseCacheControl
 * @property {number} max_age_sec
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

  /**
   * @return {FetchResponse}
   */
  getGenericResponse() {
    return this.response.generic;
  }

  /**
   *
   * @param requestId
   * @return {FetchResponse}
   */
  getResponseFor(requestId) {
    if (this.response?.responses && this.response?.responses[requestId]) {
      return {
        ...this.response.generic,
        ...this.response.responses[requestId]
      };
    }
    return undefined;
  }
}

export class UidFetcher {
  /**
   * @type {Extensions}
   * @private
   */
  _extensionsProvider;
  /**
   * @type {MeterRegistry}
   */
  _metrics;
  /**
   * @type {Logger}
   * @private
   */
  _log;

  constructor(metrics, log, extensions) {
    this._extensionsProvider = extensions;
    this._metrics = metrics;
    this._log = log;
  }

  /**
   * @param {array<FetchIdRequestData>} fetchRequestIdData
   * @param {ConsentData} consentData
   * @param {boolean} isLocalStorageAvailable
   * @return {Promise<RefreshedResponse>}
   */
  fetchId(fetchRequestIdData, consentData, isLocalStorageAvailable) {
    return this._extensionsProvider.gather(fetchRequestIdData)
      .then(extensions => {
        const requests = fetchRequestIdData.map(fetchIdData => {
          const cachedRequest = fetchIdData.cacheData;
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
              fetchTimeMeasurement.record(fetchSuccessfulCallTimer(metrics));
              try {
                resolve(new RefreshedResponse(refresher._validateResponse(jsonResponse)));
              } catch (e) {
                reject(e);
              }
            },
            error: function (error) {
              fetchTimeMeasurement.record(fetchFailureCallTimer(metrics));
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
      'refresh': fetchIdData.refresh,
      'source' : fetchIdData.source,
      'sourceVersion': fetchIdData.sourceVersion,
      'partner': partner,
      'v': fetchIdData.originVersion,
      'o': fetchIdData.origin,
      'tml': fetchIdData.refererInfo?.topmostLocation,
      'ref': fetchIdData.refererInfo?.ref,
      'cu': fetchIdData.refererInfo?.canonicalUrl,
      'u': fetchIdData.refererInfo?.stack?.[0] || window.location?.href,
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

    if (isDefined(fetchIdData.allowedVendors)) {
      data.allowed_vendors = fetchIdData.allowedVendors;
    } else if (isDefined(consentData.allowedVendors)) {
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

    Object.entries({
      pd: 'pd',
      partnerUserId: 'puid',
      provider: 'provider',
      segments: 'segments',
      trueLink: 'true_link'
    }).forEach(([optKey, dataKey]) => {
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
