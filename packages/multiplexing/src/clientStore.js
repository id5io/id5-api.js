/*
 * Module for managing storage of information in browser Local Storage and/or cookies
 */

import {cyrb53Hash, isStr, isNumber} from './utils.js';

/* eslint-disable no-unused-vars */
import {ConsentData, LocalStorageGrant} from './consent.js';
import {StorageConfig, StoreItemConfig} from './store.js';
import {LocalStorage} from './localStorage.js';
import {Logger} from './logger.js';

/* eslint-enable no-unused-vars */

/**
 * @typedef {Object} StoredResponseV2
 * @property {FetchResponse} response
 * @property {number} responseTimestamp
 * @property {number} nb
 */

export class ClientStore {
  /** @type {function} */
  localStorageGrantChecker;

  /** @type {LocalStorage} */
  localStorage;

  /**
   * @type {Logger}
   * @private
   */
  _log;

  /**
   * @param {function} localStorageGrantChecker
   * @param {LocalStorage} localStorage the localStorage abstraction object to use
   * @param {StorageConfig} storageConfig
   * @param {Logger} logger
   */
  constructor(localStorageGrantChecker, localStorage, storageConfig, logger) {
    this.localStorageGrantChecker = localStorageGrantChecker;
    this.localStorage = localStorage;
    this.storageConfig = storageConfig;
    this._log = logger;
  }

  /**
   * Get stored data from local storage, if any, after checking if local storage is allowed
   * @param {StoreItemConfig} cacheConfig
   * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no consent or no access to localStorage
   */
  get(cacheConfig) {
    const log = this._log;
    try {
      const localStorageGrant = this.localStorageGrant();
      if (localStorageGrant.isDefinitivelyAllowed()) {
        let value = this.localStorage.getItemWithExpiration(cacheConfig);
        log.info(`Local storage get key=${cacheConfig.name} value=${value}`);
        return value;
      } else {
        log.warn('clientStore.get() has been called without definitive grant', localStorageGrant);
      }
    } catch (e) {
      log.error(e);
    }
  }

  /**
   * Get stored data from local storage, if any, after checking if local storage is allowed
   * @param {StoreItemConfig} cacheConfig
   * @returns {Object|undefined} the stored object, undefined if no value or expired were stored, no consent or no access to localStorage
   */
  _getObject(cacheConfig) {
    const log = this._log;
    try {
      const localStorageGrant = this.localStorageGrant();
      if (localStorageGrant.isDefinitivelyAllowed()) {
        let value = this.localStorage.getObjectWithExpiration(cacheConfig);
        log.info(`Local storage get key=${cacheConfig.name} value=${value}`);
        return value;
      } else {
        log.warn('clientStore.get() has been called without definitive grant', localStorageGrant);
      }
    } catch (e) {
      log.error(e);
    }
  }

  /**
   * clear stored data from local storage, if any
   * @param {StoreItemConfig} cacheConfig
   * @param {{expiresDays: number, name: string}} cacheConfig
   */
  clear(cacheConfig) {
    const log = this._log;
    try {
      this.localStorage.removeItemWithExpiration(cacheConfig);
    } catch (e) {
      log.error(e);
    }
  }

  /**
   *
   * @param metrics {Id5CommonMetrics}
   */
  scheduleGC(metrics) {
    const localStorageGrant = this.localStorageGrant();
    const localStorage = this.localStorage;
    const prefix = this.storageConfig.ID5_V2.name;
    setTimeout(function () {
      if (localStorageGrant.isDefinitivelyAllowed()) {
        const stats = localStorage.removeExpiredObjectWithPrefix(prefix);
        metrics.storageAllKeysCounter().record(stats?.all || 0);
        metrics.storageExpiredKeysCounter().record(stats?.expired || 0);
      }
    }, 0);
  }

  /**
   * clear stored data from local storage, if any
   * @param {StoreItemConfig} cacheConfig
   * @param {{expiresDays: number, name: string}} cacheConfig
   */
  _clearObject(cacheConfig) {
    const log = this._log;
    try {
      this.localStorage.removeItem(cacheConfig.name);
    } catch (e) {
      log.error(e);
    }
  }

  /**
   * Puts the current data into local storage provided local storage access is definitively granted
   * @param {StoreItemConfig} cacheConfig
   * @param {string} data
   * @private
   */
  _put(cacheConfig, data) {
    const log = this._log;
    try {
      const localStorageGrant = this.localStorageGrant();
      if (localStorageGrant.isDefinitivelyAllowed()) {
        log.info(`Local storage put key=${cacheConfig.name} value=${data}`);
        this.localStorage.setItemWithExpiration(cacheConfig, data);
      } else {
        log.warn('clientStore._put() has been called without definitive grant', localStorageGrant);
      }
    } catch (e) {
      log.error(e);
    }
  }

  /**
   * Puts the current data into local storage provided local storage access is definitively granted
   * @param {StoreItemConfig} cacheConfig
   * @param {Function<Object,Object>} dataUpdateFn
   * @private
   */
  _updateObject(cacheConfig, dataUpdateFn) {
    const log = this._log;
    try {
      const localStorageGrant = this.localStorageGrant();
      if (localStorageGrant.isDefinitivelyAllowed()) {
        return this.localStorage.updateObjectWithExpiration(cacheConfig, dataUpdateFn);
      } else {
        log.warn('clientStore._updateObject() has been called without definitive grant', localStorageGrant);
      }
    } catch (e) {
      log.error(e);
    }
  }

  /**
   * @returns {LocalStorageGrant} see {ConsentManagement.localStorageGrant()}
   */
  localStorageGrant() {
    return this.localStorageGrantChecker();
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

  clearResponseV2(cacheId) {
    this._clearObject(this.storageConfig.ID5_V2.withNameSuffixed(cacheId));
  }

  putResponseV1(response) {
    this._put(this.storageConfig.ID5, encodeURIComponent(isStr(response) ? response : JSON.stringify(response)));
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
      this._put(this.storageConfig.CONSENT_DATA, consentData.hashCode());
    }
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

  setResponseDateTimeV1(timestamp) {
    this._put(this.storageConfig.LAST, timestamp);
  }

  /**
   * @param {string} cacheId
   * @param {FetchResponse} response
   * @param {number} responseTimestamp
   * @return {StoredResponseV2}
   */
  storeResponseV2(cacheId, response, responseTimestamp = Date.now()) {
    return this._updateObject(this.storageConfig.ID5_V2.withNameSuffixed(cacheId), previousData => {
      return {
        ...previousData,
        response: response,
        responseTimestamp: responseTimestamp
      };
    });
  }

  /**
   *
   * @param {string} cacheId
   * @return {StoredResponseV2}
   */
  getStoredResponseV2(cacheId) {
    return this._getObject(this.storageConfig.ID5_V2.withNameSuffixed(cacheId));
  }

  /**
   *
   * @param {string} cacheId
   * @param {number} value
   * @return {StoredResponseV2}
   */
  incNbV2(cacheId, value = 1) {
    return this._updateObject(this.storageConfig.ID5_V2.withNameSuffixed(cacheId), previousData => {
      const increasedNb = Math.max(0, isNumber(previousData?.nb) ? Math.round(previousData.nb) + value : value);
      return {
        ...previousData,
        nb: increasedNb
      };
    });
  }

  /**
   * test if the data stored locally matches the current data.
   * if there is nothing in storage, return true, and we'll do an actual comparison next time.
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
