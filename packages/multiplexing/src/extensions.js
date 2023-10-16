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

  static DEFAULT_RESPONSE = {
    lbCDN: '%%LB_CDN%%' // lbCDN substitution macro
  };

  static getChunkUrl(i) {
    return `https://c${i}.eu-3-id5-sync.com`;
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
   * @param {Array<FetchIdData>} fetchDataList - fetch data used to decide if dev chunks should be collected
   * @returns {Promise} a promise that if successful contains an object containing an array of dev chunks
   */
  gatherDevChunks(fetchDataList) {
    const extensionType = 'devChunks';
    if (fetchDataList.some(value => value.pd != null && value.pd.trim() !== '')) {
      let extensionsCallTimeMeasurement = startTimeMeasurement();
      return Promise.all(Array.from({length: 8}, (_, i) => {
        const chunkUrl = Extensions.getChunkUrl(i);
        return fetch(chunkUrl).then(r => {
          if (!r.ok) {
            throw new Error(`The call to get dev chunk was not ok, status: ${r.status}, statusText: ${r.statusText}`);
          } else {
            return r.text();
          }
        });
      })).then(chunks => {
        extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer(extensionType, true));
        return {devChunks: chunks, devChunksVersion: '4'};
      }).catch((error) => {
        extensionsCallTimeMeasurement.record(this._metrics.extensionsCallTimer(extensionType, false));
        this._log.warn(`Got error when getting dev chunks`, error);
        return {};
      });
    } else {
      return Promise.resolve({});
    }
  }

  /**
   * Gathers extensions data
   * @param {Array<FetchIdData>} fetchDataList - config for extensions
   * @returns {Promise<ExtensionsData>} - extensions data
   */
  gather(fetchDataList) {
    let extensionsCallTimeMeasurement = startTimeMeasurement();
    return Promise.allSettled([this.submitExtensionCall(ID5_LB_ENDPOINT, 'lb'), this.gatherDevChunks(fetchDataList)])
      .then((results) => {
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
