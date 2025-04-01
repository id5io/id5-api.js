/** @module id5-api */

import {
  InvocationLogger
} from '../utils.js';
import {Config} from '../config.js';
import {MeterRegistry} from '@id5io/diagnostics';
import multiplexing from '@id5io/multiplexing/lite';
import {API_LITE_ORIGIN, Id5InstanceLite} from './id5InstanceLite.js';
import {PageLevelInfo} from '../core/id5Instance.js';
import {Id5Api} from '../core/id5Api.js';

/**
 * Singleton which represents the entry point of the API.
 * In the ID5's id5-api.js bundle this is installed under window.ID5.
 * When using the ID5 API as a library, this module can be imported and ID5.init() can be called directly.
 */
export class ApiLite {

  /**
   * @type {Id5Api}
   * @private
   */
  _id5Api;

  /**
   *
   * @param {Id5Api} id5Api
   */
  constructor(id5Api) {
    this._id5Api = id5Api;
    Id5Api.assignApiLite(id5Api, this);
  }

  /**
   * This function is a Factory for a new ID5 Instance and the entry point to get an integration running on a webpage
   * @param {Id5Options} passedOptions
   * @return {Id5InstanceLite} ID5 API Instance for this caller, for further interactions.
   */
  init(passedOptions) {
    const id5Api = this._id5Api;
    id5Api.invocationId++;
    const log = new InvocationLogger(API_LITE_ORIGIN, id5Api.invocationId);
    try {
      log.info(`ID5 API version ${id5Api.version}. Invoking init()`, passedOptions);
      const config = new Config(passedOptions, log);
      // metric will never be published from lite instance, thus created with DummyRegistry to not keep  anything in memory
      // dummy registry to not store anything in memory
      const metrics = new MeterRegistry();
      const passiveInstance = multiplexing.createPassiveInstance(window, log, metrics);
      const id5InstanceLite = new Id5InstanceLite(config, metrics, log, passiveInstance, new PageLevelInfo(id5Api._referer, id5Api._version, id5Api._isUsingCdn));
      id5InstanceLite.bootstrap();
      id5InstanceLite.init();
      return id5InstanceLite;
    } catch (e) {
      log.error('Exception caught during init()', e);
    }
  }
}
