import {startTimeMeasurement} from '@id5io/diagnostics';

export const ID5_LB_ENDPOINT = `https://lb.eu-1-id5-sync.com/lb/v1`;

export class Extensions {
  /**
   * @typedef {Object} ExtensionsData
   */

  /**
   * @type {Id5CommonMetrics}
   */
  _metrics;

  /**
   * @type {Logger}
   * @private
   */
  _log;

  /**
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   */
  constructor(metrics, logger) {
    this._metrics = metrics;
    this._log = logger;
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
    return `https://c${i}.eu-${version}-id5-sync.com`;
  }

  /**
   *
   * @param {String} url - url of extensions service
   * @param {String} extensionType - type of extension used in metrics
   * @returns {Promise}
   */
  submitExtensionCall(url, extensionType) {
    let extensionsCallTimeMeasurement = startTimeMeasurement();
    return fetch(url)
      .then(response => {
        if (response.ok) {
          extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer(extensionType, true));
          return response.json();
        } else {
          extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer(extensionType, false));
          let msg = `The call to get extensions at ${url} was not ok, status: ${response.status}, statusText: ${response.statusText}`;
          this._log.warn(msg);
          return Promise.reject(new Error(msg));
        }
      })
      .catch(error => {
        extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer(extensionType, false));
        this._log.warn(`Got error from ${url} endpoint`, error);
        return {};
      });
  };

  /**
   * @param {boolean} enabled - if dev chunks should be collected
   * @param {{name: string, urlVersion: number, length:number, version: number}} chunksType a type of chunks gathered, should be supported by server
   * @returns {Promise} a promise that if successful contains an object containing an array of chunks
   */
  gatherChunks(enabled, chunksType) {
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
        extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer(chunksType.name, true));
        return {[chunksType.name]: chunks, [chunksType.name + 'Version']: `${chunksType.version}`};
      }).catch((error) => {
        extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer(chunksType.name, false));
        this._log.warn(`Got error when getting ${chunksType.name}`, error);
        return {};
      });
    } else {
      return Promise.resolve({});
    }
  }

  /**
   * Gathers extensions data
   * @param {Array<FetchIdRequestData>} fetchDataList - config for extensions
   * @returns {Promise<ExtensionsData>} - extensions data
   */
  gather(fetchDataList) {
    let extensionsCallTimeMeasurement = startTimeMeasurement();
    return this.submitExtensionCall(ID5_LB_ENDPOINT, 'lb')
      .then(lbResult => {
        let chunksEnabled = this.getChunksEnabled(fetchDataList, lbResult);
        return Promise.allSettled([
          Promise.resolve(lbResult),
          this.gatherChunks(chunksEnabled, Extensions.CHUNKS_CONFIGS.devChunks),
          this.gatherChunks(chunksEnabled, Extensions.CHUNKS_CONFIGS.groupChunks)
        ]);
      }).then((results) => {
        extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer('all', true));
        let extensions = Extensions.DEFAULT_RESPONSE;
        results.forEach(result => {
          if (result.value) {
            extensions = {...extensions, ...result.value};
          }
        });
        return extensions;
      }).catch((error) => {
        extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer('all', false));
        this._log.error(`Got error ${error} when gathering extensions data`);
        return Extensions.DEFAULT_RESPONSE;
      });
  }

  /**
   * @param {Array<FetchIdRequestData>} fetchDataList
   * @param {{chunks: boolean | undefined}|undefined} lbResponse
   * @returns {boolean}
   */
  getChunksEnabled(fetchDataList, lbResponse) {
    let pdEnabled = fetchDataList.some(value => value.pd && value.pd.trim() !== '');
    let lbEnabled = lbResponse?.chunks;
    return pdEnabled || lbEnabled;
  }
}

export const EXTENSIONS = {
  /**
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} log
   * @returns {Extensions}
   */
  createExtensions: function (metrics, log) {
    return new Extensions(metrics, log);
  }
};
