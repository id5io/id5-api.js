/** @module id5-api */

import {
  InvocationLogger,
  isGlobalDebug,
  setGlobalDebug
} from '../utils.js';
import {getRefererInfo} from '../refererDetection.js';
import {version as currentVersion} from '../../generated/version.js';
import {Config} from '../config.js';
import {MeterRegistry} from '@id5io/diagnostics';
import multiplexing from '@id5io/multiplexing/lite';
import {Id5InstanceLite} from './id5InstanceLite.js';
import {PageLevelInfo} from '../core/id5Instance.js';

const ORIGIN = 'api-lite';

/**
 * Singleton which represents the entry point of the API.
 * In the ID5's id5-api.js bundle this is installed under window.ID5.
 * When using the ID5 API as a library, this module can be imported and ID5.init() can be called directly.
 */
export class Id5ApiLite {

  /** @type {boolean} */
  loaded = false;

  /** @type {boolean} */
  set debug(isDebug) {
    setGlobalDebug(isDebug);
  }

  get debug() {
    return isGlobalDebug();
  }

  /** @type {boolean} */
  _isUsingCdn = false;

  /** @type {object} */
  _referer = false;

  /** @type {string} */
  _version = currentVersion;

  /** @type {object} */
  versions = {};

  /** @type {number} */
  invocationId = 0;

  constructor() {
    this.loaded = true;
    this._isUsingCdn = !!(
      document &&
      document.currentScript &&
      document.currentScript.src &&
      document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0
    );
    this._referer = getRefererInfo();
    this.versions[currentVersion] = true;
  }

  /**
   * This function is a Factory for a new ID5 Instance and the entry point to get an integration running on a webpage
   * @param {Id5Options} passedOptions
   * @return {Id5InstanceLite} ID5 API Instance for this caller, for further interactions.
   */
  init(passedOptions) {
    this.invocationId += 1;
    const log = new InvocationLogger(ORIGIN, this.invocationId);
    try {
      log.info(`ID5 API version ${this._version}. Invoking init()`, passedOptions);
      const config = new Config(passedOptions, log);
      // metric will never be published from lite instance, thus created with DummyRegistry to not keep  anything in memory
      // dummy registry to not store anything in memory
      const metrics = new MeterRegistry();
      const passiveInstance = multiplexing.createPassiveInstance(window, log, metrics);
      return new Id5InstanceLite(config, metrics, log, passiveInstance, new PageLevelInfo(this._referer, this._version, this._isUsingCdn), ORIGIN);
    } catch (e) {
      log.error('Exception caught during init()', e);
    }
  }
}
