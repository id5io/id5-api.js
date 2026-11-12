import {startTimeMeasurement} from '@id5io/diagnostics';
import {DEFAULT_ENDPOINTS, FallbackEndpointsProvider, sameEndpoints} from './endpoints.js';
import {extensionsCallTimer} from './metrics.js';

export const ID5_LB_ENDPOINT = `https://lb.eu-1-id5-sync.com/lb/v1`;
export const ID5_LBS_ENDPOINT = 'https://lbs.eu-1-id5-sync.com/lbs/v1';

export class Extensions {
  /**
   * @typedef {Object} ExtensionsData
   */

  /**
   * @typedef {Object} GatherResult
   * @property {ExtensionsData} extensions - extensions data to attach to the fetch request
   * @property {Id5Endpoints} endpoints - endpoints the fetch should use
   * @property {boolean} apiBaseStored - false when the endpoints are a fallback api base that is not stored yet;
   * it is stored only after a fetch on it succeeds
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
   * @param {FallbackEndpointsProvider} [fallbackEndpoints] - endpoints to use when the default host does not answer
   */
  constructor(metrics, logger, store, fallbackEndpoints = new FallbackEndpointsProvider()) {
    this._metrics = metrics;
    this._log = logger;
    this._store = store;
    this._fallbackEndpoints = fallbackEndpoints;
  }

  /**
   * Endpoints to retry the fetch on when it got no HTTP response.
   * @param {Id5Endpoints} usedEndpoints - endpoints the failed fetch used
   * @returns {Id5Endpoints|undefined} undefined when there is no fallback api base to try
   * @package used by UidFetcher
   */
  retryEndpoints(usedEndpoints) {
    return this._fallbackEndpoints.retryFor(usedEndpoints);
  }

  /**
   * Updates the stored api base after a fetch succeeded:
   * - a fallback api base is stored when it is not stored yet (picked after a failed bounce, or reached by a retry),
   * - when the default endpoints answered after a fallback api base failed, the cached extensions are cleared,
   * so the next gather checks the default endpoints again.
   * @param {Id5Endpoints} usedEndpoints - endpoints the successful fetch used
   * @param {GatherResult} gathered - the result of gather the fetch started with
   * @package used by UidFetcher
   */
  confirmApiBase(usedEndpoints, gathered) {
    if (usedEndpoints.isFallback) {
      if (!sameEndpoints(usedEndpoints, gathered.endpoints) || !gathered.apiBaseStored) {
        this.#rememberApiBase(usedEndpoints, gathered.extensions);
      }
    } else if (gathered.endpoints.isFallback) {
      this._store.clearExtensions();
    }
  }

  /**
   * Stores the extensions together with the api base the fetch used, so the next gather goes straight to it.
   * @param {Id5Endpoints} endpoints - endpoints the fetch used
   * @param {ExtensionsData} extensions
   */
  #rememberApiBase(endpoints, extensions) {
    this._store.storeExtensions({...extensions, usedApiBase: endpoints.apiBase});
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
   * @returns {Promise<GatherResult>} - extensions data
   */
  gather(fetchDataList) {
    const cachedExtensions = this._store.getCachedExtensions();
    if (cachedExtensions !== undefined) {
      const {usedApiBase, ...extensions} = cachedExtensions;
      const endpoints = this._fallbackEndpoints.endpointsForApiBase(usedApiBase);
      if (endpoints) {
        return Promise.resolve({extensions, endpoints, apiBaseStored: true});
      }
    }
    // Handlers are attached right away, so a failed bounce is never an unhandled rejection
    const bounce = this.#submitBounce(fetchDataList)
      .then(data => ({data, reachable: true}), () => ({data: {}, reachable: false}));
    return Promise.all([this.#gatherExtensions(fetchDataList, bounce.then(({data}) => data)), bounce])
      .then(([extensions, {reachable}]) => {
        const endpoints = reachable ? DEFAULT_ENDPOINTS : (this._fallbackEndpoints.getEndpoints() || DEFAULT_ENDPOINTS);
        if (!endpoints.isFallback) {
          this.#rememberApiBase(endpoints, extensions);
          return {extensions, endpoints, apiBaseStored: true};
        }
        // Not stored yet: the fallback api base is stored only after a fetch on it succeeds
        this._log.warn(`Using ${endpoints.fetch}`);
        return {extensions, endpoints, apiBaseStored: false};
      });
  }

  /**
   * @param {array<FetchIdRequestData>} fetchDataList
   * @param {Promise<Object>} bouncePromise - bounce data to merge into the extensions
   * @returns {Promise<ExtensionsData>}
   */
  #gatherExtensions(fetchDataList, bouncePromise) {
    let extensionsCallTimeMeasurement = startTimeMeasurement();
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
   * @return {Promise<Object>} bounce data (empty on http error or in lookup mode); rejected when the call fails
   * at network level
   * @private
   */
  #submitBounce(fetchRequestDataList) {
    // Lookup mode must not send or store the id5 cookie
    const lookupMode = this.#lookupModeEnabledOnAnyRequest(fetchRequestDataList);
    const url = DEFAULT_ENDPOINTS.bounce;
    let timeMeasurement = startTimeMeasurement();
    return fetch(url, {credentials: lookupMode ? 'omit' : 'include'})
      .then(response => {
        timeMeasurement.record(extensionsCallTimer(this._metrics, 'bounce', response.ok));
        return response.ok && !lookupMode ? response.json().catch(() => ({})) : {};
      }, error => {
        timeMeasurement.record(extensionsCallTimer(this._metrics, 'bounce', false));
        this._log.warn(`Got error from ${url} endpoint`, error);
        return Promise.reject(error);
      });
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
   * @param {FallbackEndpointsProvider} [fallbackEndpoints]
   * @returns {Extensions}
   */
  createExtensions: function (metrics, log, store, fallbackEndpoints) {
    return new Extensions(metrics, log, store, fallbackEndpoints);
  }
};
