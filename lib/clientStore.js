/*
 * Module for managing storage of information in browser Local Storage and/or cookies
 */

import { logError, getCookie, setCookie, cyrb53Hash } from './utils.js';
import CONSTANTS from './constants.json';

export default class ClientStore {
  /** @type {function} */
  localStorageAllowedCallback;
  /** @type {LocalStorage} */
  localStorage;

  /**
   * @param {function} localStorageAllowedCallback
   * @param {LocalStorage} localStorage the localStorage abstraction object to use
   */
  constructor(localStorageAllowedCallback, localStorage) {
    this.localStorageAllowedCallback = localStorageAllowedCallback;
    this.localStorage = localStorage;
  }

  /**
   * Get stored data from local storage, if any, after checking if local storage is allowed
   * @param {StoreItem} cacheConfig
   * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no consent or no access to localStorage
   */
  get(cacheConfig) {
    try {
      if (this.localStorageAllowedCallback() === true) {
        return this.localStorage.getItemWithExpiration(cacheConfig);
      } else {
        logError('clientStore.get() has been called without localStorageAllowed');
      }
    } catch (e) {
      logError(e);
    }
  }

  /**
   * clear stored data from local storage, if any
   * @param {StoreItem} cacheConfig
   */
  clear(cacheConfig) {
    try {
      this.localStorage.removeItemWithExpiration(cacheConfig);
    } catch (e) {
      logError(e);
    }
  }

  /**
   * puts the current data into local storage, after checking for local storage access
   * @param {StoreItem} cacheConfig
   * @param {string} data
   */
  put(cacheConfig, data) {
    try {
      if (this.localStorageAllowedCallback() === true) {
        this.localStorage.setItemWithExpiration(cacheConfig, data);
      } else {
        logError('clientStore.put() has been called without localStorageAllowed');
      }
    } catch (e) {
      logError(e);
    }
  }

  /**
   * @returns {boolean|undefined} see {ConsentManagement.isLocalStorageAllowed()}
   */
  localStorageAllowed() {
    return this.localStorageAllowedCallback();
  }

  /**
   * @returns {boolean} true if localStorage is available
   */
  isLocalStorageAvailable() {
    return this.localStorage.isAvailable();
  }

  getResponseFromLegacyCookie() {
    let legacyStoredValue;
    CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
      if (getCookie(cookie)) {
        legacyStoredValue = getCookie(cookie);
      }
    });
    if (legacyStoredValue) {
      return JSON.parse(legacyStoredValue);
    } else {
      return null;
    }
  }

  getResponse() {
    let storedValue = this.get(CONSTANTS.STORAGE_CONFIG.ID5);
    if (storedValue) {
      return JSON.parse(decodeURIComponent(storedValue));
    } else {
      return storedValue;
    }
  }

  clearResponse() {
    this.clear(CONSTANTS.STORAGE_CONFIG.ID5);
  }

  putResponse(response) {
    this.put(CONSTANTS.STORAGE_CONFIG.ID5, encodeURIComponent(response));
  }

  getHashedConsentData() {
    return this.get(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA);
  }

  clearHashedConsentData() {
    this.clear(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA);
  }

  /**
   * Stores a hash of the consent data for alter comparison
   * @param {ConsentData} consentData
   */
  putHashedConsentData(consentData) {
    this.put(CONSTANTS.STORAGE_CONFIG.CONSENT_DATA, consentData.hashCode());
  }

  /**
   * Get current hash PD for this partner
   * @param {number} partnerId
   */
  getHashedPd(partnerId) {
    return this.get(ClientStore.pdCacheConfig(partnerId));
  }

  /**
   * Check current hash PD for this partner against the one in cache
   * @param {number} partnerId
   * @param {string} pd
   */
  storedPdMatchesPd(partnerId, pd) {
    return ClientStore.storedDataMatchesCurrentData(this.getHashedPd(partnerId), ClientStore.makeStoredHash(pd));
  }

  /**
   * Clear the hash PD for this partner
   * @param {number} partnerId
   */
  clearHashedPd(partnerId) {
    this.clear(ClientStore.pdCacheConfig(partnerId));
  }

  /**
   * Hash and store the PD for this partner
   * @param {number} partnerId
   * @param {string} [pd]
   */
  putHashedPd(partnerId, pd) {
    this.put(ClientStore.pdCacheConfig(partnerId), ClientStore.makeStoredHash(pd));
  }

  /**
   * Generate local storage config for PD of a given partner
   * @param {number} partnerId
   * @return {StoreItem}
   */
  static pdCacheConfig(partnerId) {
    return {
      name: `${CONSTANTS.STORAGE_CONFIG.PD.name}_${partnerId}`,
      expiresDays: CONSTANTS.STORAGE_CONFIG.PD.expiresDays
    };
  }

  /**
   * creates a hash of a user identifier for storage
   * @param {string} userId
   * @returns {string}
   */
  static makeStoredHash(userId) {
    return cyrb53Hash(typeof userId === 'string' ? userId : '');
  }

  getDateTime() {
    return (new Date(this.get(CONSTANTS.STORAGE_CONFIG.LAST))).getTime();
  }

  clearDateTime() {
    this.clear(CONSTANTS.STORAGE_CONFIG.LAST);
  }

  setDateTime(timestamp) {
    this.put(CONSTANTS.STORAGE_CONFIG.LAST, timestamp);
  }

  static nbCacheConfig(partnerId) {
    return {
      name: `${CONSTANTS.STORAGE_CONFIG.ID5.name}_${partnerId}_nb`,
      expiresDays: CONSTANTS.STORAGE_CONFIG.ID5.expiresDays
    };
  }

  getNb(partnerId) {
    const cachedNb = this.get(ClientStore.nbCacheConfig(partnerId));
    return (cachedNb) ? parseInt(cachedNb) : 0;
  }

  clearNb(partnerId) {
    this.clear(ClientStore.nbCacheConfig(partnerId));
  }

  setNb(partnerId, nb) {
    this.put(ClientStore.nbCacheConfig(partnerId), nb);
  }

  incNb(partnerId, nb) {
    nb++;
    this.setNb(partnerId, nb);
    return nb;
  }

  clearAll(partnerId) {
    this.clearResponse();
    this.clearDateTime();
    this.clearNb(partnerId);
    this.clearHashedPd(partnerId);
    this.clearHashedConsentData();
  }

  removeLegacyCookies(partnerId) {
    const expired = (new Date(Date.now() - 1000)).toUTCString();
    CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
      setCookie(`${cookie}`, '', expired);
      setCookie(`${cookie}_nb`, '', expired);
      setCookie(`${cookie}_${partnerId}_nb`, '', expired);
      setCookie(`${cookie}_last`, '', expired);
      setCookie(`${cookie}.cached_pd`, '', expired);
      setCookie(`${cookie}.cached_consent_data`, '', expired);
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
  static storedDataMatchesCurrentData(storedData, currentData) {
    return (
      typeof storedData === 'undefined' ||
      storedData === null ||
      storedData === currentData
    );
  }

  /**
   * Checks whether current consent data matches stored consent data
   * @param {ConsentData} consentData current consent data
   * @returns true if it matches
   */
  storedConsentDataMatchesConsentData(consentData) {
    return ClientStore.storedDataMatchesCurrentData(this.getHashedConsentData(), consentData.hashCode());
  }
}
