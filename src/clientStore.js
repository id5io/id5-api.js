/*
 * Module for managing storage of information in browser Local Storage and/or cookies
 */

import * as utils from './utils';
import CONSTANTS from './constants.json';
import ID5 from './id5-api';

/**
 * Get stored data from local storage, if any, after checking if local storage is allowed
 * @param {StoreItem} cacheConfig
 * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no consent or no access to localStorage
 */
function get(cacheConfig) {
  try {
    if (ID5.localStorageAllowed === true) {
      return utils.getFromLocalStorage(cacheConfig);
    } else {
      utils.logError('clientStore.get() has been called without localStorageAllowed')
    }
  } catch (e) {
    utils.logError(e);
  }
}

/**
 * clear stored data from local storage, if any
 * @param {StoreItem} cacheConfig
 */
function clear(cacheConfig) {
  try {
    utils.removeFromLocalStorage(cacheConfig);
  } catch (e) {
    utils.logError(e);
  }
}

/**
 * puts the current data into local storage, after checking for local storage access
 * @param {StoreItem} cacheConfig
 * @param {string} data
 */
function put(cacheConfig, data) {
  try {
    if (ID5.localStorageAllowed === true) {
      utils.setInLocalStorage(cacheConfig, data);
    } else {
      utils.logError('clientStore.get() has been called without localStorageAllowed')
    }
  } catch (e) {
    utils.logError(e);
  }
}

export function getResponseFromLegacyCookie() {
  let legacyStoredValue;
  CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function(cookie) {
    if (utils.getCookie(cookie)) {
      legacyStoredValue = utils.getCookie(cookie);
    }
  });
  if (legacyStoredValue) {
    return JSON.parse(legacyStoredValue);
  } else {
    return null;
  }
}

export function getResponse() {
  let storedValue = get(CONSTANTS.STORAGE_CONFIG.ID5);
  if (storedValue) {
    return JSON.parse(storedValue);
  } else {
    return storedValue;
  }
}

export function clearResponse() {
  clear(CONSTANTS.STORAGE_CONFIG.ID5);
}

export function putResponse(response) {
  put(CONSTANTS.STORAGE_CONFIG.ID5, response);
}

function getHashedConsentData() {
  return get(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA);
}

export function clearHashedConsentData() {
  clear(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA);
}

export function putHashedConsentData(consentData) {
  put(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA, makeStoredConsentDataHash(consentData));
}

/**
 * Get current hash PD for this partner
 * @param {number} partnerId
 */
function getHashedPd(partnerId) {
  return get(pdCacheConfig(partnerId));
}

/**
 * Check current hash PD for this partner against the one in cache
 * @param {number} partnerId
 * @param {string} pd
 */
export function storedPdMatchesPd(partnerId, pd) {
  return storedDataMatchesCurrentData(getHashedPd(partnerId), makeStoredPdHash(pd));
}

/**
 * Clear the hash PD for this partner
 * @param {number} partnerId
 */
export function clearHashedPd(partnerId) {
  clear(pdCacheConfig(partnerId));
}

/**
 * Hash and store the PD for this partner
 * @param {number} partnerId
 * @param {string} [pd]
 */
export function putHashedPd(partnerId, pd) {
  put(pdCacheConfig(partnerId), makeStoredPdHash(pd));
}

/**
 * Generate local storage config for PD of a given partner
 * @param {number} partnerId
 * @return {StoreItem}
 */
function pdCacheConfig(partnerId) {
  return {
    name: `${CONSTANTS.STORAGE_CONFIG.PD.name}_${partnerId}`,
    expiresDays: CONSTANTS.STORAGE_CONFIG.PD.expiresDays
  }
}

/**
 * creates a hash of pd for storage
 * @param {string} pd
 * @returns {string}
 */
function makeStoredPdHash(pd) {
  return utils.cyrb53Hash(typeof pd === 'string' ? pd : '');
}

export function getDateTime() {
  return (new Date(+get(CONSTANTS.STORAGE_CONFIG.LAST))).getTime()
}

export function clearDateTime() {
  clear(CONSTANTS.STORAGE_CONFIG.LAST);
}

export function setDateTime(timestamp) {
  put(CONSTANTS.STORAGE_CONFIG.LAST, timestamp);
}

function nbCacheConfig(partnerId) {
  return {
    name: `${CONSTANTS.STORAGE_CONFIG.ID5.name}_${partnerId}_nb`,
    expiresDays: CONSTANTS.STORAGE_CONFIG.ID5.expiresDays
  }
}

export function getNb(partnerId) {
  const cachedNb = get(nbCacheConfig(partnerId));
  return (cachedNb) ? parseInt(cachedNb) : 0;
}

function clearNb(partnerId) {
  clear(nbCacheConfig(partnerId));
}

export function setNb(partnerId, nb) {
  put(nbCacheConfig(partnerId), nb);
}

export function incNb(partnerId, nb) {
  nb++;
  setNb(partnerId, nb);
  return nb;
}

export function syncCallback() {
  put(CONSTANTS.STORAGE_CONFIG.FS, '1');
}

export function forceSync() {
  const cachedFs = get(CONSTANTS.STORAGE_CONFIG.FS);
  // Force cascade if we have access to Local Storage and we never cascaded
  return (typeof cachedFs === 'undefined' || cachedFs === '1') ? 0 : 1;
}

export function clearAll(partnerId) {
  clearResponse();
  clearDateTime();
  clearNb(partnerId);
  clearHashedPd(partnerId);
  clearHashedConsentData();
}

export function removeLegacyCookies(partnerId) {
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
export function storedConsentDataMatchesConsentData(consentData) {
  return storedDataMatchesCurrentData(getHashedConsentData(), makeStoredConsentDataHash(consentData));
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
