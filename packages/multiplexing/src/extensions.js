import {startTimeMeasurement} from '@id5io/diagnostics';
import {isDefined} from './utils.js';
import {extensionsCallTimer} from './metrics.js';

export const ID5_LB_ENDPOINT = `https://lb.eu-1-id5-sync.com/lb/v1`;
export const ID5_BOUNCE_ENDPOINT = `https://id5-sync.com/bounce`;
export const ID5_LBS_ENDPOINT = 'https://lbs.eu-1-id5-sync.com/lbs/v1';

export class Extensions {
  /**
   * @typedef {Object} ExtensionsData
   */

  /**
   * @type {MeterRegistry}
   */
  _metrics;

  /**
   * @type {Logger}
   * @private
   */
  _log;

  /**
   * @type {Store}
   * @private
   */
  _store;

  /**
   * @param {MeterRegistry} metrics
   * @param {Logger} logger
   * @param {Store} store
   */
  constructor(metrics, logger, store) {
    this._metrics = metrics;
    this._log = logger;
    this._store = store;
  }

  static CHUNKS_CONFIGS = Object.freeze({
    devChunks: {
      name: 'devChunks',
      urlVersion: 3,
      length: 8,
      version: 4
    },
    groupChunks: {
      name: 'groupChunks',
      urlVersion: 4,
      length: 8,
      version: 4
    }
  });

  static DEFAULT_RESPONSE = {
    lbCDN: '%%LB_CDN%%' // lbCDN substitution macro
  };

  static getChunkUrl(i, version) {
    return `https://d${i}.eu-${version}-id5-sync.com`;
  }

  /**
   * @param {String} url - url of extensions service
   * @param {String} extensionType - type of extension used in metrics
   * @param {RequestInit} fetchOptions - optional `fetch` call options
   * @returns {Promise}
   */
  #submitExtensionCall(url, extensionType, fetchOptions = undefined) {
    let extensionsCallTimeMeasurement = startTimeMeasurement();
    return fetch(url, fetchOptions)
      .then(response => {
        if (response.ok) {
          extensionsCallTimeMeasurement.record(extensionsCallTimer(this._metrics, extensionType, true));
          return response.json();
        } else {
          extensionsCallTimeMeasurement.record(extensionsCallTimer(this._metrics, extensionType, false));
          let msg = `The call to get extensions at ${url} was not ok, status: ${response.status}, statusText: ${response.statusText}`;
          this._log.warn(msg);
          return Promise.reject(new Error(msg));
        }
      })
      .catch(error => {
        extensionsCallTimeMeasurement.record(extensionsCallTimer(this._metrics, extensionType, false));
        this._log.warn(`Got error from ${url} endpoint`, error);
        return {};
      });
  }

  /**
   * @param {boolean} enabled - if dev chunks should be collected
   * @param {{name: string, urlVersion: number, length:number, version: number}} chunksType a type of chunks gathered, should be supported by server
   * @returns {Promise} a promise that if successful contains an object containing an array of chunks
   */
  #gatherChunks(enabled, chunksType) {
    if (enabled) {
      let extensionsCallTimeMeasurement = startTimeMeasurement();
      return Promise.all(Array.from({length: chunksType.length}, (_, i) => {
        const chunkUrl = Extensions.getChunkUrl(i, chunksType.urlVersion);
        return fetch(chunkUrl).then(r => {
          if (!r.ok) {
            throw new Error(`The call to get ${chunksType.name} was not ok, status: ${r.status}, statusText: ${r.statusText}`);
          } else {
            return r.text();
          }
        });
      })).then(chunks => {
        extensionsCallTimeMeasurement.record(extensionsCallTimer(this._metrics, chunksType.name, true));
        return {[chunksType.name]: chunks, [chunksType.name + 'Version']: `${chunksType.version}`};
      }).catch((error) => {
        extensionsCallTimeMeasurement.record(extensionsCallTimer(this._metrics, chunksType.name, false));
        this._log.warn(`Got error when getting ${chunksType.name}`, error);
        return {};
      });
    } else {
      return Promise.resolve({});
    }
  }

  /**
   * Gathers extensions data
   * @param {array<FetchIdRequestData>} fetchDataList - the fetch requests data which can be used here to configure extension calls
   * @returns {Promise<ExtensionsData>} - extensions data
   */
  gather(fetchDataList) {
    let cachedExtensions = this._store.getCachedExtensions();
    if (cachedExtensions !== undefined) {
      return Promise.resolve(cachedExtensions);
    }
    let extensionsCallTimeMeasurement = startTimeMeasurement();
    let bouncePromise = this.#submitBounce(fetchDataList);
    let lbsPromise = this.#submitLbs();
    return this.#submitExtensionCall(ID5_LB_ENDPOINT, 'lb')
      .then(lbResult => {
        let chunksEnabled = this.#getChunksEnabled(lbResult, this.#lookupModeEnabledOnAnyRequest(fetchDataList));
        return Promise.allSettled([
          Promise.resolve(lbResult),
          this.#gatherChunks(chunksEnabled, Extensions.CHUNKS_CONFIGS.devChunks),
          this.#gatherChunks(chunksEnabled, Extensions.CHUNKS_CONFIGS.groupChunks),
          bouncePromise,
          lbsPromise
        ]);
      }).then((results) => {
        extensionsCallTimeMeasurement.record(extensionsCallTimer(this._metrics, 'all', true));
        let extensions = Extensions.DEFAULT_RESPONSE;
        results.forEach(result => {
          if (result.value) {
            extensions = {...extensions, ...result.value};
          }
        });
        this._store.storeExtensions(extensions);
        return extensions;
      }).catch((error) => {
        extensionsCallTimeMeasurement.record(extensionsCallTimer(this._metrics, 'all', false));
        this._log.error(`Got error ${error} when gathering extensions data`);
        return Extensions.DEFAULT_RESPONSE;
      });
  }

  #submitLbs() {
    const controller = new AbortController();
    const lbsTimeout = setTimeout(() => controller.abort(), 3000);
    let lbsPromise = this.#submitExtensionCall(ID5_LBS_ENDPOINT, 'lbs', {
      signal: controller.signal
    });
    return lbsPromise.finally(() => {
      clearTimeout(lbsTimeout);
    });
  }

  /**
   * @param {array<FetchIdRequestData>} fetchRequestDataList - the fetch requests data which can be used here to configure extension calls
   * @return {Promise<Object>}
   * @private
   */
  #submitBounce(fetchRequestDataList) {
    const hasSignature = fetchRequestDataList.some(fetchRequest => isDefined(fetchRequest.cacheData?.signature));
    if (hasSignature || this.#lookupModeEnabledOnAnyRequest(fetchRequestDataList)) {
      return Promise.resolve({});
    }
    return this.#submitExtensionCall(ID5_BOUNCE_ENDPOINT, 'bounce', {credentials: 'include'});
  }

  /**
   * @param {{chunks: integer | undefined}|undefined} lbResponse
   * @param {boolean} lookupModeEnabled
   * @returns {boolean}
   * @private
   */
  #getChunksEnabled(lbResponse, lookupModeEnabled) {
    let lbEnabled = lbResponse?.chunks;
    if (lbEnabled === 0 || lookupModeEnabled) {
      return false;
    } else {
      return lbEnabled;
    }
  }

  /**
   * @param {array<FetchIdRequestData>} fetchRequests - the fetch requests data which can be used here to configure extension calls
   * @return {boolean}
   * @private
   */
  #lookupModeEnabledOnAnyRequest(fetchRequests) {
    return fetchRequests.some(fetchRequest => fetchRequest.idLookupMode === true);
  }
}

export const EXTENSIONS = {
  /**
   * @param {MeterRegistry} metrics
   * @param {Logger} log
   * @param {Store} store
   * @returns {Extensions}
   */
  createExtensions: function (metrics, log, store) {
    return new Extensions(metrics, log, store);
  }
};
