/** @module id5-api */

import { getGlobal } from './id5-apiGlobal';
import { config } from './config';
import * as utils from './utils';
import * as consent from './consentManagement';
import { getRefererInfo } from './refererDetection';

const ID5_STORAGE_CONFIG = {
  name: 'id5id',
  expiresDays: 90
};
const LAST_STORAGE_CONFIG = {
  name: 'id5id_last',
  expiresDays: 90
};
const CONSENT_DATA_STORAGE_CONFIG = {
  name: 'id5id_cached_consent_data',
  expiresDays: 30
};
const PD_STORAGE_CONFIG = {
  name: 'id5id_cached_pd',
  expiresDays: 30
};
const FS_STORAGE_CONFIG = {
  name: 'id5id_fs',
  expiresDays: 7
};

// order the legacy cookie names in reverse priority order so the last
// cookie in the array is the most preferred to use
export const LEGACY_COOKIE_NAMES = [ 'id5.1st', 'id5id.1st' ];

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
    const cfg = config.setConfig(options);
    ID5.userConfig = options;
    ID5.config = cfg;
    ID5.initialized = true;
    ID5.callbackFired = false;
    ID5.getConfig = config.getConfig;
    const referer = getRefererInfo();
    utils.logInfo(`ID5 detected referer is ${referer.referer}`);

    if (typeof cfg.partnerId !== 'number') {
      throw new Error('partnerId is required and must be a number');
    }

    const storedResponse = JSON.parse(utils.getFromLocalStorage(ID5_STORAGE_CONFIG) || getFromLegacyCookie());
    const storedDateTime = (new Date(+utils.getFromLocalStorage(LAST_STORAGE_CONFIG))).getTime();
    const refreshInSecondsHasElapsed = storedDateTime <= 0 || ((Date.now() - storedDateTime) > (cfg.refreshInSeconds * 1000));
    let nb = getNbFromCache(cfg.partnerId);
    let idSetFromStoredResponse = false;

    // always save the current pd to track if it changes
    const pd = cfg.pd || '';
    const storedPd = getStoredPd();
    this.setStoredPd(pd);
    const pdHasChanged = !storedPdMatchesPd(storedPd, pd);

    // Callback watchdogs
    if (utils.isFn(this.config.callback) && this.config.callbackTimeoutInMs >= 0) {
      setTimeout(() => this.fireCallBack(), this.config.callbackTimeoutInMs);
    }

    // TEMPORARY until all clients have upgraded past v1.0.0
    // remove cookies that were previously set
    removeLegacyCookies(cfg.partnerId);

    if (storedResponse && !pdHasChanged) {
      if (storedResponse.universal_uid) {
        ID5.userId = storedResponse.universal_uid;
        ID5.linkType = storedResponse.link_type || 0;
      }
      nb = incrementNb(cfg.partnerId, nb);
      idSetFromStoredResponse = true;
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
      // always save the current consent data to track if it changes
      const storedConsentData = getStoredConsentData();
      this.setStoredConsentData(consentData);

      if (consent.isLocalStorageAllowed()) {
        utils.logInfo('Consent to access local storage and cookies is given');

        // make a call to fetch a new ID5 ID if:
        // - there is no valid universal_uid or no signature in cache
        // - the last refresh was longer than refreshInSeconds ago
        // - consent has changed since the last ID was fetched
        // - pd has changed since the last ID was fetched
        if (
          !storedResponse || !storedResponse.universal_uid || !storedResponse.signature ||
          refreshInSecondsHasElapsed ||
          !storedConsentDataMatchesConsentData(storedConsentData, consentData) ||
          pdHasChanged
        ) {
          const gdprApplies = (consentData && consentData.gdprApplies) ? 1 : 0;
          const gdprConsentString = (consentData && consentData.gdprApplies) ? consentData.consentString : '';
          const url = `https://id5-sync.com/g/v2/${cfg.partnerId}.json?gdpr_consent=${gdprConsentString}&gdpr=${gdprApplies}`;
          const signature = (storedResponse && storedResponse.signature) ? storedResponse.signature : '';
          const data = {
            'partner': cfg.partnerId,
            'v': ID5.version,
            'o': 'api',
            'rf': referer.referer,
            'u': referer.stack[0] || window.location.href,
            'top': referer.reachedTop ? 1 : 0,
            's': signature,
            'pd': pd,
            'nbPage': nb
          };
          if (cfg.tpids && utils.isArray(cfg.tpids) && cfg.tpids.length > 0) {
            data.tpids = cfg.tpids;
          }

          utils.logInfo('Fetching ID5 user ID from:', url, data);
          utils.ajax(url, {
            success: response => {
              utils.logInfo('Response from ID5 received:', response);
              let responseObj;
              if (response) {
                try {
                  responseObj = JSON.parse(response);
                  if (responseObj.universal_uid) {
                    ID5.userId = responseObj.universal_uid;
                    utils.setInLocalStorage(ID5_STORAGE_CONFIG, response);
                    utils.setInLocalStorage(LAST_STORAGE_CONFIG, Date.now());
                    utils.setInLocalStorage(nbCacheConfig(cfg.partnerId), (idSetFromStoredResponse ? 0 : 1));
                    if (responseObj.cascade_needed === true) {
                      const isSync = cfg.partnerUserId && cfg.partnerUserId.length > 0;
                      const syncUrl = `https://id5-sync.com/${isSync ? 's' : 'i'}/${cfg.partnerId}/8.gif?id5id=${ID5.userId}&fs=${forceSync()}&o=api&${isSync ? 'puid=' + cfg.partnerUserId + '&' : ''}gdpr_consent=${gdprConsentString}&gdpr=${gdprApplies}`;
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
  } catch (e) {
    utils.logError('Exception catch', e);
  }
};

ID5.fireCallBack = function () {
  if (!this.callbackFired && utils.isFn(this.config.callback)) {
    this.callbackFired = true;
    utils.logInfo('Scheduling callback');
    setTimeout(() => this.config.callback(ID5), 0);
  }
}

function nbCacheConfig(partnerId) {
  return {
    name: `${ID5_STORAGE_CONFIG.name}_${partnerId}_nb`,
    expiresDays: ID5_STORAGE_CONFIG.expiresDays
  }
}
function getNbFromCache(partnerId) {
  const cachedNb = utils.getFromLocalStorage(nbCacheConfig(partnerId));
  return (cachedNb) ? parseInt(cachedNb) : 0;
}
function incrementNb(partnerId, nb) {
  nb++;
  utils.setInLocalStorage(nbCacheConfig(partnerId), nb);
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
};
ID5.setStoredConsentData = function (consentData) {
  setStored(CONSENT_DATA_STORAGE_CONFIG, makeStoredConsentDataHash(consentData));
}
ID5.setStoredPd = function (pd) {
  setStored(PD_STORAGE_CONFIG, makeStoredPdHash(pd));
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
  return getStored(CONSENT_DATA_STORAGE_CONFIG);
}
function getStoredPd() {
  return getStored(PD_STORAGE_CONFIG);
}

function handleDeferPixelFireCallback() {
  setStored(FS_STORAGE_CONFIG, 0);
}
function forceSync() {
  const cachedFs = getStored(FS_STORAGE_CONFIG);
  return (cachedFs) ? parseInt(cachedFs) : 1;
}

function getFromLegacyCookie() {
  let legacyStoredValue;
  LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    if (utils.getCookie(cookie)) {
      legacyStoredValue = utils.getCookie(cookie);
    }
  });
  return legacyStoredValue || null;
}

function removeLegacyCookies(partnerId) {
  const expired = (new Date(Date.now() - 1000)).toUTCString();
  LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    utils.setCookie(`${cookie}`, '', expired);
    utils.setCookie(`${cookie}_nb`, '', expired);
    utils.setCookie(`${cookie}_${partnerId}_nb`, '', expired);
    utils.setCookie(`${cookie}_last`, '', expired);
    utils.setCookie(`${cookie}.cached_pd`, '', expired);
    utils.setCookie(`${cookie}.cached_consent_data`, '', expired);
  });
}
export default ID5;
