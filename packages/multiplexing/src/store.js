import {isNumber, isPlainObject, isStr} from './utils.js';
import {CONSTANTS} from './constants.js';

const MAX_RESPONSE_AGE_SEC = 14 * 24 * 3600; // 14 days
const SECONDS_IN_DAY = 24 * 60 * 60;

export class StoreItemConfig {
  constructor(name, expiresDays) {
    this.name = name;
    this.expiresDays = expiresDays;
  }

  withNameSuffixed(...suffixes) {
    let name = this.name;
    for (const suffix of suffixes) {
      name += `_${suffix}`;
    }
    return new StoreItemConfig(name, this.expiresDays);
  }
}

export class StorageConfig {
  constructor(storageExpirationDays = undefined) {
    let defaultStorageConfig = CONSTANTS.STORAGE_CONFIG;
    let createConfig = function (defaultConfig) {
      let expiresDays = storageExpirationDays !== undefined ? Math.max(1, storageExpirationDays) : defaultConfig.expiresDays;
      return new StoreItemConfig(defaultConfig.name, expiresDays);
    };

    this.ID5 = createConfig(defaultStorageConfig.ID5);
    this.ID5_V2 = createConfig(defaultStorageConfig.ID5_V2);
    this.LAST = createConfig(defaultStorageConfig.LAST);
    this.CONSENT_DATA = createConfig(defaultStorageConfig.CONSENT_DATA);
    this.PRIVACY = createConfig(defaultStorageConfig.PRIVACY);
    this.EXTENSIONS = new StoreItemConfig(defaultStorageConfig.EXTENSIONS.name, defaultStorageConfig.EXTENSIONS.expiresDays);
  }

  static DEFAULT = new StorageConfig();
}

export class Store {
  /**
   * @type {ClientStore}
   * @private
   */
  _clientStore;
  /**
   * @type {TrueLinkAdapter}
   * @private
   */
  _trueLinkAdapter;

  /**
   * @param {ClientStore} clientStore
   * @param {TrueLinkAdapter} trueLinkAdapter
   */
  constructor(clientStore, trueLinkAdapter) {
    this._clientStore = clientStore;
    this._trueLinkAdapter = trueLinkAdapter;
  }

  /**
   * @param {ConsentData} currentConsentData
   * @return {boolean}
   */
  hasConsentChanged(currentConsentData) {
    return currentConsentData && !this._clientStore.storedConsentDataMatchesConsentData(currentConsentData);
  }

  /**
   * @param {ConsentData} consentData
   */
  storeConsent(consentData) {
    this._clientStore.putHashedConsentData(consentData);
  }

  /**
   * Increments cached nb value for given cacheId by given value. If value is negative then cached value will be decremented
   * @param {string} cacheId  - increment cached
   * @param {number} [value] - value to increment, default 1
   */
  incNb(cacheId, value = 1) {
    this._clientStore.incNbV2(cacheId, value);
  }

  /**
   * @param {Map<string, CachedResponse>} cachedDataUsedInRequest
   */
  updateNbs(cachedDataUsedInRequest) {
    for (const [cacheId, cachedResponse] of cachedDataUsedInRequest) {
      const nbValueSentInRequest = cachedResponse?.nb;
      // value is increased by +1 every time cached response is provisioned to follower
      // in meanwhile between request sent and response received new followers may appear
      // cached response nb could be increased but not included in request
      // now instead of reset just decrease nb per cache id by value sent to sever
      // if anything added between remaining delta will be included in next request
      if (nbValueSentInRequest > 0) {
        this.incNb(cacheId, -nbValueSentInRequest);
      }
    }
  }

  /**
   * @param {array<FetchIdRequestData>} requestInputData
   * @param {RefreshedResponse} refreshedResponse
   * @param {Consents} consents
   */
  storeResponse(requestInputData, refreshedResponse, consents) {
    // V1 for non-multiplexed integration on the page (to exchange signature)
    this._clientStore.putResponseV1(refreshedResponse.getGenericResponse());
    this._clientStore.setResponseDateTimeV1(new Date(refreshedResponse.timestamp).toUTCString());
    // V2
    const updatedCache = new Set();
    requestInputData.forEach(data => {
      const cacheId = data.cacheId;
      // there may be multiple responses for the same cacheId
      // update only once with first non-empty
      if (!updatedCache.has(cacheId)) {
        const responseFor = refreshedResponse.getResponseFor(data.integrationId);
        if (responseFor) {
          this._clientStore.storeResponseV2(cacheId, responseFor, refreshedResponse.timestamp, consents);
          updatedCache.add(cacheId);
        }
      }
    });
    this._trueLinkAdapter.setPrivacy(refreshedResponse.getGenericResponse()?.privacy);
  }

  clearAll(fetchIdData) {
    this._clientStore.clearResponse();
    this._clientStore.clearDateTime();
    fetchIdData.forEach(data => {
      const cacheId = data.cacheId;
      this._clientStore.clearResponseV2(cacheId);
    });
    this._clientStore.clearHashedConsentData();
    this._trueLinkAdapter.clearPrivacy();
    this._clientStore.clearExtensions();
  }

  /**
   * @param {string} cacheId
   * @return {CachedResponse}
   */
  getCachedResponse(cacheId) {
    const storedResponseV2 = this._clientStore.getStoredResponseV2(cacheId);
    if (storedResponseV2) {
      return new CachedResponse(storedResponseV2.response, storedResponseV2.responseTimestamp, storedResponseV2.nb, storedResponseV2.consents);
    }
    return undefined;
  }

  /**
   * @return {ExtensionsData}
   */
  getCachedExtensions() {
    return this._clientStore.getExtensions();
  }

  /**
   * @param {ExtensionsData} extensions
   */
  storeExtensions(extensions) {
    let expiresDays = isNumber(extensions.ttl) ? extensions.ttl / SECONDS_IN_DAY : StorageConfig.DEFAULT.EXTENSIONS.expiresDays;
    let config = new StoreItemConfig(StorageConfig.DEFAULT.EXTENSIONS.name, expiresDays);
    return this._clientStore.storeExtensions(extensions, config);
  }

}

export class CachedResponse {
  /** @type {FetchResponse} */
  response;
  /** @type {number} */
  timestamp;
  /** @type {number} */
  nb;
  /**
   * @type {Consents}
   */
  consents;

  constructor(response, timestamp, nb = 0, consents = undefined) {
    this.response = response;
    this.timestamp = timestamp;
    this.nb = nb;
    this.consents = consents;
  }

  isExpired() {
    const maxAgeSec = this.getMaxAge();
    const isValidMaxAge = isNumber(maxAgeSec) && maxAgeSec > 0;
    return !isValidMaxAge || this._isOlderThanSec(maxAgeSec);
  }

  _isOlderThanSec(maxAgeSec) {
    return this.timestamp <= 0 || (this.getAgeSec() > maxAgeSec);
  }

  isStale() {
    return !this.timestamp || this._isOlderThanSec(MAX_RESPONSE_AGE_SEC);
  }

  isResponseComplete() {
    return isPlainObject(this.response) && isStr(this.response.universal_uid) && isStr(this.response.signature);
  }

  isValid() {
    return this.isResponseComplete() && !this.isStale();
  }

  getMaxAge() {
    return this.response?.cache_control?.max_age_sec;
  }

  /**
   *
   * @return {number} cached response age in msec
   */
  getAgeSec() {
    return ((Date.now() - this.timestamp) / 1000) | 0;
  }
}
