/** @module id5-api */

import { getGlobal } from './id5-apiGlobal';
import { config } from './config';
import CONSTANTS from 'src/constants.json';
import * as utils from './utils';
import * as consent from './consentManagement';
import { getRefererInfo } from './refererDetection';
import * as abTesting from './abTesting';

// const ID5_STORAGE_CONFIG = {
//   name: 'id5id',
//   expiresDays: 90
// };
// const LAST_STORAGE_CONFIG = {
//   name: 'id5id_last',
//   expiresDays: 90
// };
// const CONSENT_DATA_STORAGE_CONFIG = {
//   name: 'id5id_cached_consent_data',
//   expiresDays: 30
// };
// const PD_STORAGE_CONFIG = {
//   name: 'id5id_cached_pd',
//   expiresDays: 30
// };
// const FS_STORAGE_CONFIG = {
//   name: 'id5id_fs',
//   expiresDays: 7
// };

// order the legacy cookie names in reverse priority order so the last
// cookie in the array is the most preferred to use
// export const CONSTANTS.LEGACY_COOKIE_NAMES = [ 'id5.1st', 'id5id.1st' ];

export const ID5 = getGlobal();

ID5.loaded = true;
ID5.initialized = false;
ID5.callbackFired = false;

/**
 * This function will initialize ID5, wait for consent then try to fetch or refresh ID5 user id if required
 * @param {Id5Config} options
 * @alias module:ID5.init
 */
// TODO: Use Async init by pushing setting in a queue
ID5.init = function (options) {
  if (typeof ID5.version === 'undefined') {
    throw new Error('ID5.version variable is missing! Make sure you build from source with "gulp build" from this project. Contact support@id5.io for help.');
  }

  try {
    utils.logInfo('Invoking ID5.init', arguments);
    ID5.initialized = true;
    ID5.getConfig = config.getConfig;
    ID5.getProvidedConfig = config.getProvidedConfig;
    ID5.setConfig = config.setConfig;
    ID5.exposeId = abTesting.exposeId;

    this.getId(options, false);
  } catch (e) {
    utils.logError('Exception caught from ID5.init', e);
  }
};

ID5.refreshId = function (forceFetch = false, options = {}) {
  if (ID5.initialized !== true) {
    throw new Error('ID5.refreshID() cannot be called before ID5.init()!');
  }

  try {
    utils.logInfo('Invoking ID5.refreshId', arguments);

    if (!utils.isBoolean(forceFetch)) {
      throw new Error('Invalid signature for ID5.refreshID: first parameter must be a boolean');
    }

    // consent may have changed, so we need to check it again
    consent.resetConsentData();

    this.getId(options, forceFetch);
  } catch (e) {
    utils.logError('Exception caught from ID5.refreshId', e);
  }
};

ID5.getId = function(options, forceFetch = false) {
  ID5.config = config.setConfig(options);
  ID5.callbackFired = false;
  abTesting.init();

  const referer = getRefererInfo();
  utils.logInfo(`ID5 detected referer is ${referer.referer}`);

  if (!this.config.partnerId || typeof this.config.partnerId !== 'number') {
    throw new Error('partnerId is required and must be a number');
  }

  // pick up data from local storage, if access is allowed and the data exists
  const storedResponse = getStoredResponse();
  const storedDateTime = getStoredDateTime();
  const refreshInSecondsHasElapsed = storedDateTime <= 0 || ((Date.now() - storedDateTime) > (this.config.refreshInSeconds * 1000));
  let nb = getStoredNb(this.config.partnerId);
  ID5.fromCache = false;

  // always save the current pd to track if it changes
  // (will only store if local storage access is allowed)
  const pd = this.config.pd || '';
  const storedPd = getStoredPd();
  const pdHasChanged = !storedPdMatchesPd(storedPd, pd);

  // Callback watchdogs
  if (utils.isFn(this.config.callback) && this.config.callbackTimeoutInMs >= 0) {
    setTimeout(() => this.fireCallBack(), this.config.callbackTimeoutInMs);
  }

  // TEMPORARY until all clients have upgraded past v1.0.0
  // remove cookies that were previously set
  removeLegacyCookies(this.config.partnerId);

  if (storedResponse && !pdHasChanged) {
    // we have a valid stored response and pd is not different, so
    // use the stored response to make the ID available right away

    if (storedResponse.universal_uid && abTesting.exposeId()) {
      ID5.userId = storedResponse.universal_uid;
      ID5.linkType = storedResponse.link_type || 0;
    } else if (storedResponse.universal_uid) {
      // we're in A/B testing and this is the control group, so do
      // not set a userId or linkType
      ID5.userId = ID5.linkType = 0;
    }

    nb = incrementNb(this.config.partnerId, nb);
    ID5.fromCache = true;
    if (ID5.userId) {
      this.fireCallBack();
    }


    utils.logInfo('ID5 User ID available from cache:', { storedResponse, storedDateTime, refreshNeeded: refreshInSecondsHasElapsed });
  } else if (storedResponse && pdHasChanged) {
    utils.logInfo('PD value has changed, so ignoring User ID from cache');
  } else {
    utils.logInfo('No ID5 User ID available from cache');
  }

  consent.requestConsent((consentData) => {
    if (consent.isLocalStorageAllowed()) {
      utils.logInfo('Consent to access local storage and cookies is given');

      // store hashed consent data and pd for future page loads
      const storedConsentData = getStoredConsentData();
      this.setStoredConsentData(consentData);
      this.setStoredPd(pd);

      // make a call to fetch a new ID5 ID if:
      // - there is no valid universal_uid or no signature in cache
      // - the last refresh was longer than refreshInSeconds ago
      // - consent has changed since the last ID was fetched
      // - pd has changed since the last ID was fetched
      // - fetch is being forced (e.g. by refreshId())
      if (
        !storedResponse || !storedResponse.universal_uid || !storedResponse.signature ||
        refreshInSecondsHasElapsed ||
        !storedConsentDataMatchesConsentData(storedConsentData, consentData) ||
        pdHasChanged ||
        forceFetch
      ) {
        const url = `https://id5-sync.com/g/v2/${this.config.partnerId}.json`;
        const gdprApplies = (consentData && consentData.gdprApplies) ? 1 : 0;
        const gdprConsentString = (consentData && consentData.gdprApplies) ? consentData.consentString : '';
        const signature = (storedResponse && storedResponse.signature) ? storedResponse.signature : '';
        const data = {
          'partner': this.config.partnerId,
          'v': ID5.version,
          'o': 'api',
          'gdpr': gdprApplies,
          'gdpr_consent': gdprConsentString,
          'rf': referer.referer,
          'u': referer.stack[0] || window.location.href,
          'top': referer.reachedTop ? 1 : 0,
          's': signature,
          'pd': pd,
          'nbPage': nb,
          'id5cdn': (document.currentScript && document.currentScript.src && document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0)
        };
        if (this.config.tpids && utils.isArray(this.config.tpids) && this.config.tpids.length > 0) {
          data.tpids = this.config.tpids;
        }

        utils.logInfo('Fetching ID5 user ID from:', url, data);
        if (forceFetch) {
          utils.logInfo('...with Force Fetch');
        }
        utils.ajax(url, {
          success: response => {
            let responseObj;
            if (response) {
              try {
                responseObj = JSON.parse(response);
                utils.logInfo('Response from ID5 received:', responseObj);
                if (responseObj.universal_uid) {
                  if (abTesting.exposeId()) {
                    ID5.userId = responseObj.universal_uid;
                    ID5.linkType = responseObj.link_type || 0
                  } else {
                    // we're in A/B testing and this is the control group, so do
                    // not set a userId or linkType
                    ID5.userId = ID5.linkType = 0;
                  }
                  setStoredResponse(response);
                  setStoredDateTime(Date.now());
                  setStoredNb(this.config.partnerId, (ID5.fromCache ? 0 : 1));
                  setStoredPrivacy(response.privacy);
                  ID5.fromCache = false;

                  if (responseObj.cascade_needed === true) {
                    const isSync = this.config.partnerUserId && this.config.partnerUserId.length > 0;
                    const syncUrl = `https://id5-sync.com/${isSync ? 's' : 'i'}/${this.config.partnerId}/8.gif?id5id=${ID5.userId}&fs=${forceSync()}&o=api&${isSync ? 'puid=' + this.config.partnerUserId + '&' : ''}gdpr_consent=${gdprConsentString}&gdpr=${gdprApplies}`;
                    utils.logInfo('Opportunities to cascade available:', syncUrl);
                    utils.deferPixelFire(syncUrl, undefined, handleDeferPixelFireCallback);
                  }
                  this.fireCallBack();
                } else {
                  utils.logError('Invalid response from ID5 servers:', response);
                }
              } catch (error) {
                utils.logError(error);
              }
            } else {
              utils.logError('Empty response from ID5 servers:', response);
            }
          },
          error: error => {
            utils.logError(error);
          }
        }, JSON.stringify(data), { method: 'POST', withCredentials: true });
      }
    } else {
      utils.logInfo('No legal basis to use ID5', consentData);
    }
  });
}

ID5.fireCallBack = function () {
  if (!this.callbackFired && utils.isFn(this.config.callback)) {
    utils.logInfo('Scheduling callback');
    setTimeout(() => this.config.callback(ID5), 0);
    this.callbackFired = true;
  }
}

function nbCacheConfig(partnerId) {
  return {
    name: `${CONSTANTS.STORAGE_CONFIG.ID5.name}_${partnerId}_nb`,
    expiresDays: CONSTANTS.STORAGE_CONFIG.ID5.expiresDays
  }
}
function getStoredNb(partnerId) {
  const cachedNb = getStored(nbCacheConfig(partnerId));
  return (cachedNb) ? parseInt(cachedNb) : 0;
}
function setStoredNb(partnerId, nb) {
  setStored(nbCacheConfig(partnerId), nb);
}
function incrementNb(partnerId, nb) {
  nb++;
  setStoredNb(partnerId, nb);
  return nb;
}

/**
 * makes an object that can be stored with only the keys we need to check.
 * excluding the vendorConsents object since the consentString is enough to know
 * if consent has changed without needing to have all the details in an object
 * @param consentData
 * @returns string
 */
function makeStoredConsentDataHash(consentData) {
  const storedConsentData = {
    consentString: '',
    gdprApplies: false,
    apiVersion: 0
  };

  if (consentData) {
    storedConsentData.consentString = consentData.consentString;
    storedConsentData.gdprApplies = consentData.gdprApplies;
    storedConsentData.apiVersion = consentData.apiVersion;
  }

  return utils.cyrb53Hash(JSON.stringify(storedConsentData));
}

/**
 * creates a hash of pd for storage
 * @param pd
 * @returns string
 */
function makeStoredPdHash(pd) {
  return utils.cyrb53Hash(typeof pd === 'string' ? pd : '');
}

/**
 * puts the current data into local storage
 * @param cacheConfig
 * @param data
 */
function setStored(cacheConfig, data) {
  try {
    utils.setInLocalStorage(cacheConfig, data);
  } catch (error) {
    utils.logError(error);
  }
}

ID5.setStoredConsentData = function (consentData) {
  setStored(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA, makeStoredConsentDataHash(consentData));
}
ID5.setStoredPd = function (pd) {
  setStored(CONSTANTS.STORAGE_CONFIG.PD, makeStoredPdHash(pd));
}
function setStoredResponse(response) {
  setStored(CONSTANTS.STORAGE_CONFIG.ID5, response);
}
function setStoredDateTime(timestamp) {
  setStored(CONSTANTS.STORAGE_CONFIG.LAST, timestamp);
}
function setStoredPrivacy(privacy) {
  setStored(CONSTANTS.STORAGE_CONFIG.PRIVACY, JSON.stringify(privacy));
}

/**
 * test if the data stored locally matches the current data.
 * if there is nothing in storage, return true and we'll do an actual comparison next time.
 * this way, we don't force a refresh for every user when this code rolls out
 * @param storedData
 * @param currentData
 * @returns {boolean}
 */
function storedDataMatchesCurrentData(storedData, currentData) {
  return (
    typeof storedData === 'undefined' ||
    storedData === null ||
    storedData === currentData
  );
}
function storedConsentDataMatchesConsentData(storedConsentData, consentData) {
  return storedDataMatchesCurrentData(storedConsentData, makeStoredConsentDataHash(consentData));
}
function storedPdMatchesPd(storedPd, pd) {
  return storedDataMatchesCurrentData(storedPd, makeStoredPdHash(pd));
}

/**
 * get stored data from local storage, if any
 * @returns {string}
 */
function getStored(cacheConfig) {
  try {
    return utils.getFromLocalStorage(cacheConfig);
  } catch (e) {
    utils.logError(e);
  }
}

function getStoredConsentData() {
  return getStored(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA);
}
function getStoredPd() {
  return getStored(CONSTANTS.STORAGE_CONFIG.PD);
}
function getStoredResponse() {
  return JSON.parse(getStored(CONSTANTS.STORAGE_CONFIG.ID5) || getFromLegacyCookie());
}
function getStoredDateTime() {
  return (new Date(+getStored(CONSTANTS.STORAGE_CONFIG.LAST))).getTime()
}

function handleDeferPixelFireCallback() {
  setStored(CONSTANTS.STORAGE_CONFIG.FS, 0);
}
function forceSync() {
  const cachedFs = getStored(CONSTANTS.STORAGE_CONFIG.FS);
  return (cachedFs) ? parseInt(cachedFs) : 1;
}

function getFromLegacyCookie() {
  let legacyStoredValue;
  CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    if (utils.getCookie(cookie)) {
      legacyStoredValue = utils.getCookie(cookie);
    }
  });
  return legacyStoredValue || null;
}

function removeLegacyCookies(partnerId) {
  const expired = (new Date(Date.now() - 1000)).toUTCString();
  CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    utils.setCookie(`${cookie}`, '', expired);
    utils.setCookie(`${cookie}_nb`, '', expired);
    utils.setCookie(`${cookie}_${partnerId}_nb`, '', expired);
    utils.setCookie(`${cookie}_last`, '', expired);
    utils.setCookie(`${cookie}.cached_pd`, '', expired);
    utils.setCookie(`${cookie}.cached_consent_data`, '', expired);
  });
}

export default ID5;
