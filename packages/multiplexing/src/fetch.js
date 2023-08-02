import EXTENSIONS from '../../../lib/extensions.js';
import {ajax, isDefined, isGlobalTrace, isNumber, isStr, objectEntries} from '../../../lib/utils.js';
import {ApiEvent} from '@id5io/multiplexing';
import {startTimeMeasurement} from '@id5io/diagnostics';

const HOST = 'https://id5-sync.com';

export class UidFetcher {
  /**
   * @type {Logger}
   * @private
   */
  log;

  constructor(dispatcher, consentManagement, clientStore, metrics, logger) {
    this.clientStore = clientStore;
    this.dispatcher = dispatcher;
    this.consentManagement = consentManagement;
    this.metrics = metrics;
    this.log = logger;
  }
  /**
   * This function get the user ID for the given config
   * @param {FetchIdData} fetchIdData
   * @param {boolean} forceFetch - Force a call to server
   */
  getId(fetchIdData, forceFetch = false) {
    const log = this.log;
    const extensionsProvider = EXTENSIONS;
    log.info('Get id', fetchIdData);
    const clientStore = this.clientStore;
    const dispatcher = this.dispatcher;
    const consentManagement = this.consentManagement;
    const metrics = this.metrics;
    const localStorageGrant = clientStore.localStorageGrant();
    const partnerId = fetchIdData.partnerId;
    const pd = fetchIdData.pd;
    const segments = fetchIdData.segments;

    let storedResponse;
    let storedDateTime;
    let nb = 0;
    let refreshInSecondsHasElapsed = false;
    let pdHasChanged = false;
    let segmentsHaveChanged = false;
    let cachedResponseUsed = false;
    let refreshInSeconds = fetchIdData.refreshInSeconds; // TODO FOR multi instance use min ?
    if (localStorageGrant.isDefinitivelyAllowed()) {
      log.info('Using local storage for cached ID', localStorageGrant);
      storedResponse = clientStore.getResponse();
      storedDateTime = clientStore.getDateTime();
      if (isNumber(storedResponse?.cache_control?.max_age_sec)) {
        refreshInSeconds = storedResponse.cache_control.max_age_sec;
      }

      refreshInSecondsHasElapsed = storedDateTime <= 0 || ((Date.now() - storedDateTime) > (refreshInSeconds * 1000));
      nb = clientStore.getNb(partnerId);
      pdHasChanged = !clientStore.isStoredPdUpToDate(partnerId, pd);
      segmentsHaveChanged = !clientStore.storedSegmentsMatchesSegments(partnerId, segments);
    }

    if (!storedResponse) {
      log.info('No cached ID found');
      // TODO This is legacy and should be fixed
      // refreshInSecondsHasElapsed should not be forced here but recalculated few lines bellow upon consent received
      // after consent is received it may happen than storedResponse will be accessible and if it is not stale it can be returned
      // if this flag is not forced here it may happen in some cases we may neither return stored response nor fetch new one
      // so let's keep it here until it is not fixed
      refreshInSecondsHasElapsed = true;
    }

    if (storedResponse && storedResponse.universal_uid && !pdHasChanged && !segmentsHaveChanged) {
      // we have a valid stored response and pd is not different, so
      // use the stored response to make the ID available right away
      log.info('ID5 User ID available from cache:', {
        storedResponse,
        storedDateTime,
        refreshNeeded: refreshInSecondsHasElapsed
      });

      const isStoredIdStale = storedDateTime <= 0 || ((Date.now() - storedDateTime) > 1209600000); // 14 days
      if (!isStoredIdStale) {
        dispatcher.emit(ApiEvent.USER_ID_READY, {
          timestamp: storedDateTime,
          responseObj: storedResponse,
          isFromCache: true
        });
        nb = clientStore.incNb(partnerId, nb);
        cachedResponseUsed = true;
      }
    } else if (storedResponse && storedResponse.universal_uid && pdHasChanged) {
      log.info('PD value has changed, so ignoring User ID from cache');
    } else if (storedResponse && storedResponse.universal_uid && segmentsHaveChanged) {
      log.info('Segments have changed, so ignoring User ID from cache');
    } else if (storedResponse && !storedResponse.universal_uid) {
      log.error('Invalid stored response: ', storedResponse);
    } else {
      log.info('No ID5 User ID available from cache');
    }

    log.info('Waiting for consent');
    consentManagement.getConsentData().then((consentData) => {
      log.info('Consent received', consentData);
      const localStorageGrant = clientStore.localStorageGrant();
      log.info('Local storage grant', localStorageGrant);
      if (!localStorageGrant.allowed) {
        log.info('No legal basis to use ID5', consentData);
        dispatcher.emit(ApiEvent.USER_ID_FETCH_CANCELED, {
          reason: 'No legal basis to use ID5'
        });
        return;
      }
      storedResponse = clientStore.getResponse();

      // store hashed consent data and pd for future page loads
      const consentHasChanged = !clientStore.storedConsentDataMatchesConsentData(consentData);
      clientStore.putHashedConsentData(consentData);
      let shouldStorePd = !clientStore.isStoredPdUpToDate(partnerId, pd);
      if (shouldStorePd) {
        clientStore.putHashedPd(partnerId, pd);
      }
      clientStore.putHashedSegments(partnerId, segments);

      // make a call to fetch a new ID5 ID if:
      // - there is no valid universal_uid or no signature in cache
      // - the last refresh was longer than refreshInSeconds ago
      // - consent has changed since the last ID was fetched
      // - pd has changed since the last ID was fetched
      // - segments have changed since the last ID was fetched
      // - fetch is being forced (e.g. by refreshId())
      const missingStoredData = !storedResponse || !storedResponse.universal_uid || !storedResponse.signature;
      if (
        missingStoredData ||
        refreshInSecondsHasElapsed ||
        consentHasChanged ||
        pdHasChanged ||
        segmentsHaveChanged ||
        forceFetch
      ) {
        log.info(`Decided to fetch a fresh ID5 ID`, {
          missingStoredData,
          refreshInSecondsHasElapsed,
          consentHasChanged,
          pdHasChanged,
          segmentsHaveChanged,
          forceFetch
        });
        let extensionsCallTimeMeasurement = metrics?.extensionsCallTimer().startMeasurement();
        extensionsProvider.gather(log)
          .then(extensions => {
            if (extensionsCallTimeMeasurement) {
              extensionsCallTimeMeasurement.record();
            }
            const data = this.gatherData(nb, consentData, storedResponse, refreshInSeconds, fetchIdData);
            data.extensions = extensions;
            this.fetchFreshID5ID(data, fetchIdData, consentData, forceFetch, cachedResponseUsed);
          });
      }
    });
  }

  gatherData(nb, consentData, storedResponse, refreshInSeconds, fetchIdData) {
    const data = {
      'partner': fetchIdData.partnerId,
      'v': fetchIdData.originVersion,
      'o': fetchIdData.origin,
      'tml': fetchIdData.refererInfo?.topmostLocation,
      'ref': fetchIdData.refererInfo?.ref,
      'cu': fetchIdData.refererInfo?.canonicalUrl,
      'u': fetchIdData.refererInfo?.stack[0] || window.location.href,
      'top': fetchIdData.refererInfo?.reachedTop ? 1 : 0,
      'localStorage': fetchIdData.isLocalStorageAvailable ? 1 : 0,
      'nbPage': nb,
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

    const signature = (storedResponse && storedResponse.signature) ? storedResponse.signature : undefined;
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

    data.used_refresh_in_seconds = refreshInSeconds;

    return data;
  }

  fetchFreshID5ID(data, fetchIdData, consentData, forceFetch, cachedResponseUsed) {
    const url = `${HOST}/g/v2/${fetchIdData.partnerId}.json`;
    let fetchTimeMeasurement = startTimeMeasurement();
    const log = this.log;
    log.info(`Fetching ID5 ID (forceFetch:${forceFetch}) from:`, url, data);
    ajax(url, {
      success: this.handleSuccessfulFetchResponse(fetchIdData, cachedResponseUsed, consentData, fetchTimeMeasurement),
      error: error => {
        log.error('Error during AJAX request to ID5 server', error);
        if (fetchTimeMeasurement) {
          fetchTimeMeasurement.record(this.metrics?.fetchFailureCallTimer());
        }
      }
    }, JSON.stringify(data), {method: 'POST', withCredentials: true});
  }

  /**
   *
   * @param {FetchIdData} fetchIdData
   * @param cachedResponseUsed
   * @param {ConsentData} consentData
   * @param fetchTimeMeasurement
   * @return {(function(*): void)|*}
   */
  handleSuccessfulFetchResponse(fetchIdData, cachedResponseUsed, consentData, fetchTimeMeasurement) {
    const log = this.log;
    const dispatcher = this.dispatcher;
    const consentManagement = this.consentManagement;
    const clientStore = this.clientStore;
    return response => {
      if (fetchTimeMeasurement) {
        fetchTimeMeasurement.record(this.metrics?.fetchSuccessfulCallTimer());
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
        consentManagement.setStoredPrivacy(responseObj.privacy);

        const localStorageGrant = clientStore.localStorageGrant();
        if (localStorageGrant.isDefinitivelyAllowed()) {
          log.info('Storing ID in cache');
          clientStore.putResponse(response);
          clientStore.setDateTime(new Date().toUTCString());
          clientStore.setNb(fetchIdData.partnerId, (cachedResponseUsed ? 0 : 1));
        } else {
          log.info('Cannot use local storage to cache ID', localStorageGrant);
          clientStore.clearAll(fetchIdData.partnerId);
        }

        if (responseObj.cascade_needed === true && localStorageGrant.isDefinitivelyAllowed()) {
          // TODO in real multiplexing delegate to only one in follower
          // TODO maybe this should be handled upon ApiEvent.USER_ID_READY by follower
          dispatcher.emit(ApiEvent.CASCADE_NEEDED, {
            partnerId: fetchIdData.partnerId,
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
      this.log.error(`Empty ${responseType} response from ID5 servers: "${response}"`);
    } else {
      try {
        return JSON.parse(response);
      } catch (error) {
        this.log.error(`Cannot parse the JSON server ${responseType} response`, response);
      }
    }
    return null;
  }
}
