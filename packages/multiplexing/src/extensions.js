import {ajax} from '../../../lib/utils.js';
import Promise from './promise.js';
import {NoopLogger} from './logger.js';

export const ID5_LB_ENDPOINT = `https://lb.eu-1-id5-sync.com/lb/v1`;

export class Extensions {
  /**
   * @typedef {Object} ExtensionsData
   */

  /**
   * Gathers extensions data
   * @param {Logger} log - logger
   * @returns {Promise<ExtensionsData>} - extensions data
   */
  gather(log = NoopLogger) {
    const DEFAULT_RESPONSE = {
      lbCDN: '%%LB_CDN%%' // lbCDN substitution macro
    };
    const parseResponse = function (url, response) {
      try {
        return JSON.parse(response);
      } catch (error) {
        log.error(`Cannot parse the JSON  response from: ${url}`, response);
        return DEFAULT_RESPONSE;
      }
    };

    const submitExtensionCall = function (url) {
      return new Promise(resolve => {
        ajax(url,
          {
            success: function (response) {
              const jsonResponse = parseResponse(url, response);
              resolve(jsonResponse);
            },
            error: function (error) {
              log.warn(`Got error from ${url} endpoint`, error);
              resolve(DEFAULT_RESPONSE); // if fails, then complete successfully
            }
          }, null);
      });
    };

    return Promise.allSettled([
      submitExtensionCall(ID5_LB_ENDPOINT)
    ]).then((results) => {
      let extensions = DEFAULT_RESPONSE;
      results.forEach(result => {
        if (result.value) {
          extensions = {...extensions, ...result.value};
        }
      });
      return extensions;
    }).catch((error) => {
      log.error(`Got error ${error} when gathering extensions data`);
      return DEFAULT_RESPONSE;
    });
  }
}

export const EXTENSIONS = new Extensions();
