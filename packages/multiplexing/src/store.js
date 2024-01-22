import {isNumber} from './utils.js';
import CONSTANTS from './constants.js';

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
    this.LAST = createConfig(defaultStorageConfig.LAST);
    this.CONSENT_DATA = createConfig(defaultStorageConfig.CONSENT_DATA);
    this.PD = createConfig(defaultStorageConfig.PD);
    this.PRIVACY = createConfig(defaultStorageConfig.PRIVACY);
    this.SEGMENTS = createConfig(defaultStorageConfig.SEGMENTS);
  }
}

export class StoredDataState {
  storedResponse;
  storedDateTime;
  pdHasChanged;
  segmentsHaveChanged;
  refreshInSeconds;
  /**
   * nb counters per partner
   * @type {Map<number, number>}
   */
  nb;
  consentHasChanged;

  isResponsePresent() {
    return this.storedResponse !== undefined;
  }

  hasValidUid() {
    return this.storedResponse && this.storedResponse.universal_uid;
  }

  isResponseComplete() {
    return this.storedResponse && this.storedResponse.universal_uid && this.storedResponse.signature;
  }

  refreshInSecondsHasElapsed() {
    return this.storedDateTime <= 0 || ((Date.now() - this.storedDateTime) > (this.refreshInSeconds * 1000));
  }

  isStoredIdStale() {
    return this.storedDateTime <= 0 || ((Date.now() - this.storedDateTime) > 1209600000); // 14 days
  }
}

export class Store {
  /**
   * @type {ClientStore}
   * @private
   */
  _clientStore;

  /**
   *
   * @param {ClientStore} clientStore
   */
  constructor(clientStore) {
    this._clientStore = clientStore;
  }

  /**
   * @type {StoredDataState}
   * @param {array<FetchIdRequestData>}  fetchIdData
   * @param {ConsentData} consentData
   */
  getStoredDataState(fetchIdData, consentData = undefined) {
    const storedResponse = this._clientStore.getResponse();
    const storedDateTime = this._clientStore.getDateTime();
    let nb = {};
    let pdHasChanged = false;
    let segmentsHaveChanged = false;
    let refreshInSeconds = fetchIdData[0].refreshInSeconds || 7200;

    fetchIdData.forEach(data => {
      const partnerId = data.partnerId;
      const storedNb = this._clientStore.getNb(partnerId);
      nb[partnerId] = storedNb !== undefined ? storedNb : 0;
      const currentPdHasChanged = !this._clientStore.isStoredPdUpToDate(partnerId, data.pd);
      const currentSegmentsHasChanged = !this._clientStore.storedSegmentsMatchesSegments(partnerId, data.segments);
      segmentsHaveChanged = segmentsHaveChanged || currentSegmentsHasChanged;
      pdHasChanged = pdHasChanged || currentPdHasChanged;
      if (refreshInSeconds > data.refreshInSeconds) {
        refreshInSeconds = data.refreshInSeconds;
      }
    });

    if (isNumber(storedResponse?.cache_control?.max_age_sec)) {
      refreshInSeconds = storedResponse.cache_control.max_age_sec;
    }

    const consentHasChanged = consentData && !this._clientStore.storedConsentDataMatchesConsentData(consentData);

    return Object.assign(new StoredDataState(), {
      storedResponse,
      storedDateTime,
      pdHasChanged,
      segmentsHaveChanged,
      refreshInSeconds,
      nb,
      consentHasChanged
    });
  }

  /**
   * @param {ConsentData} consentData
   * @param {array<FetchIdRequestData>} fetchIdData
   */
  storeRequestData(consentData, fetchIdData) {
    // store it for V1 only , for V2 storage pd and segment are part of cache id
    this._clientStore.putHashedConsentData(consentData);
    fetchIdData.forEach(data => {
      const partnerId = data.partnerId;
      const pd = data.pd;
      const segments = data.segments;
      if (!this._clientStore.isStoredPdUpToDate(partnerId, pd)) {
        // we may have multiple data for the same partner (multiple integrations not all with pd)
        // to avoid overwrite valid pd with empty,
        // v1 isStoredPdUpToDate method can compare it and ignore empty it and take care
        this._clientStore.putHashedPd(partnerId, pd);
      }
      this._clientStore.putHashedSegments(partnerId, segments);
    });
  }

  /**
   * @param {array<FetchIdRequestData>}  fetchIdData
   * @param {StoredDataState} state
   */
  incNbs(fetchIdData, state) {
    fetchIdData.forEach(data => {
      const partnerId = data.partnerId;
      state.nb[partnerId] = this._clientStore.incNbV1(partnerId, state.nb[partnerId]);
      this._clientStore.incNbV2(data.cacheId);
    });
  }

  /**
   * @param {array<FetchIdRequestData>} fetchIdData
   * @param {RefreshedResponse} refreshedResponse
   * @param {boolean} cachedResponseUsed
   */
  storeResponse(fetchIdData, refreshedResponse, cachedResponseUsed) {
    this._clientStore.putResponseV1(refreshedResponse.getGenericResponse());
    this._clientStore.setResponseDateTimeV1(new Date(refreshedResponse.timestamp).toUTCString());
    const nbValue = cachedResponseUsed ? 0 : 1;
    fetchIdData.forEach(data => {
      const partnerId = data.partnerId;
      this._clientStore.setNbV1(partnerId, nbValue);
      // V2
      const cacheId = data.cacheId;
      this._clientStore.setNbV2(cacheId, nbValue);
      this._clientStore.storeResponseV2(cacheId, refreshedResponse.getResponseFor(data.integrationId), refreshedResponse.timestamp);
    });
  }

  clearAll(fetchIdData) {
    this._clientStore.clearResponse();
    this._clientStore.clearDateTime();
    fetchIdData.forEach(data => {
      const partnerId = data.partnerId;
      this._clientStore.clearNb(partnerId);
      this._clientStore.clearHashedPd(partnerId);
      this._clientStore.clearHashedSegments(partnerId);
    });
    this._clientStore.clearHashedConsentData();
  }
}
