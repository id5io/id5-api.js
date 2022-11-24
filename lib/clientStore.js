/*
 * Module for managing storage of information in browser Local Storage and/or cookies
 */

import {cyrb53Hash, getCookie, isEmpty, logError, logInfo, logWarn, setCookie} from './utils.js';
import CONSTANTS from './constants.json';

/* eslint-disable no-unused-vars */
import {ConsentData, LocalStorageGrant} from './consentManagement.js';
/* eslint-enable no-unused-vars */

export default class ClientStore {
  /** @type {number} */
  invocationId;
  /** @type {function} */
  localStorageGrantChecker;
  /** @type {LocalStorage} */
  localStorage;

  /**
   * @param {number} invocationId
   * @param {function} localStorageGrantChecker
   * @param {LocalStorage} localStorage the localStorage abstraction object to use
   * @param {StorageConfig} storageConfig
   */
  constructor(invocationId, localStorageGrantChecker, localStorage, storageConfig) {
    this.invocationId = invocationId;
    this.localStorageGrantChecker = localStorageGrantChecker;
    this.localStorage = localStorage;
    this.storageConfig = storageConfig;
  }

  /**
   * Get stored data from local storage, if any, after checking if local storage is allowed
   * @param {StoreItemConfig} cacheConfig
   * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no consent or no access to localStorage
   */
  get(cacheConfig) {
    try {
      const localStorageGrant = this.localStorageGrant();
      if (localStorageGrant.isDefinitivelyAllowed()) {
        let value = this.localStorage.getItemWithExpiration(cacheConfig);
        logInfo(this.invocationId, `Local storage get key=${cacheConfig.name} value=${value}`);
        return value;
      } else {
        logWarn(this.invocationId, 'clientStore.get() has been called without definitive grant', localStorageGrant);
      }
    } catch (e) {
      logError(this.invocationId, e);
    }
  }

  /**
   * clear stored data from local storage, if any
   * @param {StoreItemConfig} cacheConfig
   * @param {{expiresDays: number, name: string}} cacheConfig
   */
  clear(cacheConfig) {
    try {
      this.localStorage.removeItemWithExpiration(cacheConfig);
    } catch (e) {
      logError(this.invocationId, e);
    }
  }

  /**
   * Puts the current data into local storage provided local storage access is definitively granted
   * @param {StoreItemConfig} cacheConfig
   * @param {string} data
   */
  put(cacheConfig, data) {
    try {
      const localStorageGrant = this.localStorageGrant();
      if (localStorageGrant.isDefinitivelyAllowed()) {
        logInfo(this.invocationId, `Local storage put key=${cacheConfig.name} value=${data}`);
        this.localStorage.setItemWithExpiration(cacheConfig, data);
      } else {
        logWarn(this.invocationId, 'clientStore.put() has been called without definitive grant', localStorageGrant);
      }
    } catch (e) {
      logError(this.invocationId, e);
    }
  }

  /**
   * @returns {LocalStorageGrant} see {ConsentManagement.localStorageGrant()}
   */
  localStorageGrant() {
    return this.localStorageGrantChecker();
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
    let storedValue = this.get(this.storageConfig.ID5);
    if (storedValue) {
      return JSON.parse(decodeURIComponent(storedValue));
    } else {
      return storedValue;
    }
  }

  clearResponse() {
    this.clear(this.storageConfig.ID5);
  }

  putResponse(response) {
    this.put(this.storageConfig.ID5, encodeURIComponent(response));
  }

  getHashedConsentData() {
    return this.get(this.storageConfig.CONSENT_DATA);
  }

  clearHashedConsentData() {
    this.clear(this.storageConfig.CONSENT_DATA);
  }

  /**
   * Stores a hash of the consent data for alter comparison
   * @param {ConsentData} consentData
   */
  putHashedConsentData(consentData) {
    if (consentData !== new ConsentData()) {
      this.put(this.storageConfig.CONSENT_DATA, consentData.hashCode());
    }
  }

  /**
   * Get current hash PD for this partner
   * @param {number} partnerId
   */
  getHashedPd(partnerId) {
    return this.get(this.pdCacheConfig(partnerId));
  }

  /**
   * Check current hash PD for this partner against the one in cache
   * @param {number} partnerId
   * @param {string} currentPd
   * @returns {boolean} true if stored PD shouldn't be replaced by current PD, false otherwise
   */
  isStoredPdUpToDate(partnerId, currentPd) {
    let storedPdHash = this.getHashedPd(partnerId);
    let storedIsBetter = isEmpty(currentPd) && !isEmpty(storedPdHash);
    let bothAreEmpty = isEmpty(storedPdHash) && isEmpty(currentPd);
    return storedIsBetter || bothAreEmpty || (storedPdHash === ClientStore.makeStoredHash(currentPd));
  }

  /**
   * Clear the hash PD for this partner
   * @param {number} partnerId
   */
  clearHashedPd(partnerId) {
    this.clear(this.pdCacheConfig(partnerId));
  }

  /**
   * Hash and store the PD for this partner
   * @param {number} partnerId
   * @param {string} [pd]
   */
  putHashedPd(partnerId, pd) {
    this.put(this.pdCacheConfig(partnerId), ClientStore.makeStoredHash(pd));
  }

  /**
   * Get stored segments hash for this partner
   * @param {number} partnerId
   */
  getHashedSegments(partnerId) {
    return this.get(this.segmentsCacheConfig(partnerId));
  }

  /**
   * Hash and store the segments for this partner
   * @param {number} partnerId
   * @param {Array<Segment>} [segments]
   */
  putHashedSegments(partnerId, segments) {
    this.put(this.segmentsCacheConfig(partnerId), ClientStore.makeStoredHash(JSON.stringify(segments)));
  }

  /**
   * Check current hash segments for this partner against the one in cache
   * @param {number} partnerId
   * @param {Array<Segment>} [segments]
   */
  storedSegmentsMatchesSegments(partnerId, segments) {
    return ClientStore.storedDataMatchesCurrentData(this.getHashedSegments(partnerId), ClientStore.makeStoredHash(JSON.stringify(segments)));
  }

  /**
   * Clear the hashed segments for this partner
   * @param {number} partnerId
   */
  clearHashedSegments(partnerId) {
    this.clear(this.segmentsCacheConfig(partnerId));
  }

  /**
   * creates a hash of a value to be stored
   * @param {string} value
   * @returns {string} hashed value
   */
  static makeStoredHash(value) {
    return cyrb53Hash(typeof value === 'string' ? value : '');
  }

  getDateTime() {
    return (new Date(this.get(this.storageConfig.LAST))).getTime();
  }

  clearDateTime() {
    this.clear(this.storageConfig.LAST);
  }

  setDateTime(timestamp) {
    this.put(this.storageConfig.LAST, timestamp);
  }

  getNb(partnerId) {
    const cachedNb = this.get(this.nbCacheConfig(partnerId));
    return (cachedNb) ? parseInt(cachedNb) : 0;
  }

  clearNb(partnerId) {
    this.clear(this.nbCacheConfig(partnerId));
  }

  setNb(partnerId, nb) {
    this.put(this.nbCacheConfig(partnerId), nb);
  }

  incNb(partnerId, nb) {
    nb++;
    this.setNb(partnerId, nb);
    return nb;
  }

  /**
   * Generate local storage config for PD of a given partner
   * @param {number} partnerId
   * @return {StoreItemConfig}
   */
  pdCacheConfig(partnerId) {
    return this.storageConfig.PD.withNameSuffixed(partnerId);
  }

  nbCacheConfig(partnerId) {
    return this.storageConfig.ID5.withNameSuffixed(partnerId, 'nb');
  }

  /**
   * Generate local storage config for segments of a given partner
   * @param {number} partnerId
   * @return {StoreItemConfig}
   */
  segmentsCacheConfig(partnerId) {
    return this.storageConfig.SEGMENTS.withNameSuffixed(partnerId);
  }

  clearAll(partnerId) {
    this.clearResponse();
    this.clearDateTime();
    this.clearNb(partnerId);
    this.clearHashedPd(partnerId);
    this.clearHashedSegments(partnerId);
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
