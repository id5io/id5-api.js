import {NoopLogger} from './logger.js';

export const ID5_LB_ENDPOINT = `https://lb.eu-1-id5-sync.com/lb/v1`;

export class Extensions {
  /**
   * @typedef {Object} ExtensionsData
   */

  static DEFAULT_RESPONSE = {
    lbCDN: '%%LB_CDN%%' // lbCDN substitution macro
  };

  static getChunkUrl(i) {
    return `https://c${i}.eu-3-id5-sync.com`;
  }

  /**
   *
   * @param {Logger} log - logger
   * @param {String} url - url of extensions service
   * @returns {Promise}
   */
  static submitExtensionCall(log, url) {
    return fetch(url)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          let msg = `The call to get extensions at ${url} was not ok, status: ${response.status}, statusText: ${response.statusText}`;
          log.warn(msg);
          return Promise.reject(new Error(msg));
        }
      })
      .catch(error => {
        log.warn(`Got error from ${url} endpoint`, error);
        return {};
      });
  };

  /**
   * @param {Array<FetchIdData>} fetchDataList - fetch data used to decide if dev chunks should be collected
   * @param {Logger} log - logger
   * @returns {Promise} a promise that if successful contains an object containing an array of dev chunks
   */
  static gatherDevChunks(fetchDataList, log) {
    if (fetchDataList.some(value => value.pd != null && value.pd.trim() !== '')) {
      return Promise.all(Array.from({length: 8}, (_, i) => {
        const chunkUrl = this.getChunkUrl(i);
        return fetch(chunkUrl).then(r => {
          if (!r.ok) {
            throw new Error(`The call to get dev chunk was not ok, status: ${r.status}, statusText: ${r.statusText}`);
          } else {
            return r.text();
          }
        });
      })).then(chunks => {
        return {devChunks: chunks, devChunksVersion: '3'};
      }).catch((error) => {
        log.warn(`Got error when getting dev chunks`, error);
        return {};
      });
    } else {
      return Promise.resolve({});
    }
  }

  /**
   * Gathers extensions data
   * @param {Array<FetchIdData>} fetchDataList - config for extensions
   * @param {Logger} log - logger
   * @returns {Promise<ExtensionsData>} - extensions data
   */
  gather(fetchDataList, log = NoopLogger) {
    return Promise.allSettled([Extensions.submitExtensionCall(log, ID5_LB_ENDPOINT), Extensions.gatherDevChunks(fetchDataList, log)]).then((results) => {
      let extensions = Extensions.DEFAULT_RESPONSE;
      results.forEach(result => {
        if (result.value) {
          extensions = {...extensions, ...result.value};
        }
      });
      return extensions;
    }).catch((error) => {
      log.error(`Got error ${error} when gathering extensions data`);
      return Extensions.DEFAULT_RESPONSE;
    });
  }
}

export const EXTENSIONS = new Extensions();
