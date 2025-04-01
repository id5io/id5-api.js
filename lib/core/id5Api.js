/** @module id5-api */

import {
  isGlobalDebug,
  setGlobalDebug
} from '../utils.js';
import {getRefererInfo} from '../refererDetection.js';
import {version as currentVersion} from '../../generated/version.js';

/**
 * Singleton which represents the entry point of the API.
 * In the ID5's id5-api.js or id5-id5-lite.js bundle this is installed under window.ID5.
 * Depending on how it was loaded it may have assigned ApiStandard (init, refreshId) or ApiLite (initLite) interface.
 * When using the ID5 API as a library, this module can be imported and ID5.init() can be called directly.
 */
export class Id5Api {

  /** @type {boolean} */
  loaded = false;

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

  get version() {
    return this._version;
  }

  /** @type {boolean} */
  set debug(isDebug) {
    setGlobalDebug(isDebug);
  }

  get debug() {
    return isGlobalDebug();
  }

  /**
   * Standard API
   */
  /**
   * @type boolean
   */
  ApiStandardLoaded = false;
  /**
   * @type {(options:Id5Options) => Id5Instance}
   */
  init;

  /**
   * @type {(id5Insatnce:Id5Instance, forceFetch:boolean, options:Id5Options)=>Id5Instance}
   */
  refreshId;

  /**
   * @param {Id5Api} id5Api
   * @param {ApiStandard} apiStandard
   */
  static assignApiStandard(id5Api, apiStandard) {
    id5Api.init = function (options) {
      return apiStandard.init(options);
    };
    id5Api.refreshId = function (id5Insatnce, forceFetch, options) {
      return apiStandard.refreshId(id5Insatnce, forceFetch, options);
    };
    id5Api.ApiStandardLoaded = true;
  }

  /**
   * Lite API
   */
  /**
   * @type {boolean}
   */
  ApiLiteLoaded = false;
  /**
   * @type {(options:Id5Options) => Id5InstanceLite}
   */
  initLite;

  /**
   * @param {Id5Api} id5Api
   * @param {ApiLite} apiLite
   */
  static assignApiLite(id5Api, apiLite) {
    id5Api.initLite = function (options) {
      return apiLite.init(options);
    };
    id5Api.ApiLiteLoaded = true;
  }

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
}
