/** @module id5-api */

import {
  setGlobalDebug,
  isGlobalDebug,
  logInfo,
  logError,
  isBoolean,
  ajax,
  isStr,
  isDefined,
  deferPixelFire } from './utils.js';
import { getRefererInfo } from './refererDetection.js';
import ClientStore from './clientStore.js';
import { ConsentManagement } from './consentManagement.js';
import Id5Status from './id5Status.js';
import { version as currentVersion } from '../generated/version.js';
import LocalStorage from './localStorage.js';
import Config from './config.js';

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
    const invocationId = this.invocationId;
    this.invocationId += 1;
    try {
      logInfo(invocationId, `ID5 API version ${this._version}. Invoking init()`, passedOptions);

      const config = new Config(invocationId, passedOptions);
      const options = config.getOptions();

      // By using window.top we say we want to use storage only if we're in a first-party context
      const localStorage = new LocalStorage(window.top, !options.applyCreativeRestrictions);

      const consentManagement = new ConsentManagement(invocationId, localStorage);
      const clientStore = new ClientStore(invocationId,
        () => consentManagement.isLocalStorageAllowed(options.allowLocalStorageWithoutConsentApi, options.debugBypassConsent),
        localStorage);

      const partnerStatus = new Id5Status(0, config, clientStore, consentManagement);
      this.getId(partnerStatus, false);
      logInfo(invocationId, `ID5 initialized for partner ${options.partnerId} with referer ${this._referer.referer} and options`, passedOptions);
      return partnerStatus;
    } catch (e) {
      logError(invocationId, 'Exception caught during init()', e);
    }
  };

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

    try {
      logInfo(id5Status.invocationId, 'Invoking refreshId()', arguments);
      id5Status.startRefresh(forceFetch);
      id5Status.updateOptions(options);
      id5Status.consentManagement.resetConsentData();
      this.getId(id5Status, forceFetch);
    } catch (e) {
      logError(id5Status.invocationId, 'Exception caught from refreshId()', e);
    }
    return id5Status;
  };

  /**
   * This function get the user ID for the given config
   * @param {Id5Status} id5Status
   * @param {boolean} forceFetch - Force a call to server
   */
  getId(id5Status, forceFetch = false) {
    const options = id5Status.getOptions();
    let storedResponse;
    let storedDateTime;
    let nb = 0;
    let refreshInSecondsHasElapsed = false;
    let pdHasChanged = false;
    let cachedResponseUsed = false;

    if (id5Status.localStorageAllowed()) {
      storedResponse = id5Status.clientStore.getResponse();
      storedDateTime = id5Status.clientStore.getDateTime();

      refreshInSecondsHasElapsed = storedDateTime <= 0 || ((Date.now() - storedDateTime) > (options.refreshInSeconds * 1000));
      nb = id5Status.clientStore.getNb(options.partnerId);
      pdHasChanged = !id5Status.clientStore.storedPdMatchesPd(options.partnerId, options.pd);
    }

    if (!storedResponse) {
      storedResponse = id5Status.clientStore.getResponseFromLegacyCookie();
      refreshInSecondsHasElapsed = true; // Force a refresh if we have legacy cookie
    }

    if (storedResponse && storedResponse.universal_uid && !pdHasChanged) {
      // we have a valid stored response and pd is not different, so
      // use the stored response to make the ID available right away
      logInfo(id5Status.invocationId, 'ID5 User ID available from cache:', {
        storedResponse,
        storedDateTime,
        refreshNeeded: refreshInSecondsHasElapsed
      });

      id5Status.setUserId(storedResponse, true);
      nb = id5Status.clientStore.incNb(options.partnerId, nb);
      cachedResponseUsed = true;
    } else if (storedResponse && storedResponse.universal_uid && pdHasChanged) {
      logInfo(id5Status.invocationId, 'PD value has changed, so ignoring User ID from cache');
    } else if (storedResponse && !storedResponse.universal_uid) {
      logError(id5Status.invocationId, 'Invalid stored response: ', storedResponse);
    } else {
      logInfo(id5Status.invocationId, 'No ID5 User ID available from cache');
    }

    id5Status.consentManagement.requestConsent(options.debugBypassConsent, options.cmpApi, options.consentData, (consentData) => {
      if (id5Status.localStorageAllowed() === false) {
        logInfo(id5Status.invocationId, 'No legal basis to use ID5', consentData);
        return;
      }

      logInfo(id5Status.invocationId, 'Consent to access local storage is: ' + id5Status.localStorageAllowed());

      storedResponse = id5Status.clientStore.getResponse() || id5Status.clientStore.getResponseFromLegacyCookie();

      // store hashed consent data and pd for future page loads
      const consentHasChanged = !id5Status.clientStore.storedConsentDataMatchesConsentData(consentData);
      id5Status.clientStore.putHashedConsentData(consentData);
      id5Status.clientStore.putHashedPd(options.partnerId, options.pd);

      // make a call to fetch a new ID5 ID if:
      // - there is no valid universal_uid or no signature in cache
      // - the last refresh was longer than refreshInSeconds ago
      // - consent has changed since the last ID was fetched
      // - pd has changed since the last ID was fetched
      // - fetch is being forced (e.g. by refreshId())
      const missingStoredData = !storedResponse || !storedResponse.universal_uid || !storedResponse.signature;
      if (
        missingStoredData ||
        refreshInSecondsHasElapsed ||
        consentHasChanged ||
        pdHasChanged ||
        forceFetch
      ) {
        logInfo(id5Status.invocationId, `Decided to fetch a fresh ID5 ID`, {
          missingStoredData,
          refreshInSecondsHasElapsed,
          consentHasChanged,
          pdHasChanged,
          forceFetch
        });

        const url = `https://id5-sync.com/g/v2/${options.partnerId}.json`;
        const gdprApplies = consentData.gdprApplies ? 1 : 0;
        const data = {
          'partner': options.partnerId,
          'v': this._version,
          'o': 'api',
          'gdpr': gdprApplies,
          'rf': this._referer.referer,
          'u': this._referer.stack[0] || window.location.href,
          'top': this._referer.reachedTop ? 1 : 0,
          'localStorage': id5Status.clientStore.isLocalStorageAvailable() ? 1 : 0,
          'nbPage': nb,
          'id5cdn': this._isUsingCdn
        };

        // pass in optional data, but only if populated
        const gdprConsentString = consentData.gdprApplies ? consentData.consentString : undefined;
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

        if (consentData.hasCcpaString) {
          data.us_privacy = consentData.ccpaString;
        }

        Object.entries({
          pd: 'pd',
          partnerUserId: 'puid',
          provider: 'provider',
          segments: 'segments'
        }).forEach(entry => {
          const [optKey, dataKey] = entry;
          if (isDefined(options[optKey])) {
            data[dataKey] = options[optKey];
          }
        });

        // pass in A/B Testing configuration, if applicable
        if (options.abTesting.enabled === true) {
          data.ab_testing = {
            enabled: true,
            control_group_pct: id5Status.getOptions().abTesting.controlGroupPct
          };
        }

        // Monitoring server side for excluded invalid segments
        if (id5Status.getInvalidSegments() > 0) {
          data._invalid_segments = id5Status.getInvalidSegments();
        }

        logInfo(id5Status.invocationId, 'Fetching ID5 user ID from:', url, data);
        ajax(url, {
          success: response => {
            if (!response || !isStr(response) || response.length < 1) {
              logError(id5Status.invocationId, `Empty response from ID5 servers: "${response}"`);
              return;
            }
            let responseObj;
            try {
              responseObj = JSON.parse(response);
            } catch (error) {
              logError(id5Status.invocationId, 'Cannot parse the JSON server response', response);
              return;
            }
            if (!isStr(responseObj.universal_uid)) {
              logError(id5Status.invocationId, 'Could parse JSON response but failed to validate', responseObj);
              return;
            }
            logInfo(id5Status.invocationId, 'Valid json response from ID5 received', responseObj);
            try {
              id5Status.setUserId(responseObj, false);

              // privacy has to be stored first so we can use it when storing other values
              id5Status.consentManagement.setStoredPrivacy(responseObj.privacy);

              // @TODO: !isDefined(responseObj.privacy) is only needed until fetch endpoint is updated and always returns a privacy object
              // once it does, I don't see a reason to keep that part of the if clause
              if (id5Status.localStorageAllowed() === true || !isDefined(responseObj.privacy)) {
                id5Status.clientStore.putResponse(response);
                id5Status.clientStore.setDateTime(new Date().toUTCString());
                id5Status.clientStore.setNb(options.partnerId, (cachedResponseUsed ? 0 : 1));
              } else {
                id5Status.clientStore.clearAll(options.partnerId);
              }
              // TEMPORARY until all clients have upgraded past v1.0.0
              // remove cookies that were previously set
              id5Status.clientStore.removeLegacyCookies(options.partnerId);

              if (responseObj.cascade_needed === true && id5Status.localStorageAllowed() === true && options.maxCascades >= 0 && !options.applyCreativeRestrictions) {
                const isSync = options.partnerUserId && options.partnerUserId.length > 0;
                const syncUrl = `https://id5-sync.com/${isSync ? 's' : 'i'}/${options.partnerId}/${options.maxCascades}.gif?id5id=${id5Status._userId}&o=api&${isSync ? 'puid=' + options.partnerUserId + '&' : ''}gdpr_consent=${gdprConsentString}&gdpr=${gdprApplies}`;
                logInfo(id5Status.invocationId, 'Opportunities to cascade available', syncUrl);
                deferPixelFire(syncUrl);
              }
            } catch (error) {
              logError(id5Status.invocationId, 'Error during processing of valid ID5 server response', responseObj, error);
            }
          },
          error: error => {
            logError(id5Status.invocationId, 'Error during AJAX request to ID5 server', error);
          }
        }, JSON.stringify(data), {method: 'POST', withCredentials: true});
      }
    });
  }
}

const ID5 = new Id5Api();
export default ID5;
