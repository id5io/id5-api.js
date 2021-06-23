/*
 * Class containing the status of the API for a partner
 */
import CONSTANTS from './constants.json';

import * as utils from './utils';

/* eslint-disable no-unused-vars */
import Config from './config';
import ClientStore from './clientStore.js';
import ConsentManagement from './consentManagement.js';
/* eslint-enable no-unused-vars */

export default class Id5Status {
  /** timerId of the onAvailable watchdog */
  _availableCallbackTimerId;
  /** @type {boolean} */
  _availableCallbackFired = false;
  /** @type {function} */
  _availableCallback;
  /** @type {function} */
  _updateCallback;
  /** timerId of the onRefresh watchdog */
  _refreshCallbackTimerId;
  /** @type {boolean} */
  _refreshCallbackFired = false;
  /** @type {function} */
  _refreshCallback;
  /** @type {boolean} */
  _isExposed;
  /** @type {boolean} */
  _fromCache;
  /** @type {boolean} */
  _isRefreshing = false;
  /** @type {boolean} */
  _isRefreshingWithFetch = false;
  /** @type {string} */
  _userId;
  /** @type {number} */
  _linkType;
  /** @type {Config} */
  config;
  /** @type {ClientStore} */
  clientStore;
  /** @type {ConsentManagement} */
  consentManagement;

  /**
   * @param {Config} config
   * @param {ClientStore} clientStore
   * @param {ConsentManagement} consentManagement
   */
  constructor(config, clientStore, consentManagement) {
    this.config = config;
    this.clientStore = clientStore;
    this.consentManagement = consentManagement;
  }

  /** @returns {Id5Options} options - Current options for this partner */
  getOptions() {
    return this.config.getOptions();
  }

  /** @param {Id5Options} options */
  updateOptions(options) {
    return this.config.updOptions(options);
  }

  /**
   * Notify status that a refresh is in progress
   * @param {boolean} forceFetch – server response required
   */
  startRefresh(forceFetch) {
    this._isRefreshing = true;
    this._isRefreshingWithFetch = forceFetch;
  }

  /**
   * Set the user Id for this Id5Status
   * @param {Object} response

   * @param {boolean} fromCache
   */
  setUserId(response, fromCache) {
    const userId = response.universal_uid;
    const linkType = response.link_type || 0;

    this._isExposed = true;
    if (utils.isPlainObject(response.ab_testing)) {
      switch (response.ab_testing.result) {
        case 'normal':
          // nothing to do
          break;
        default: // falls through
        case 'error':
          utils.logError('There was an error with A/B Testing. Make sure controlGroupRatio is a number >= 0 and <= 1');
          break;
        case 'control':
          this._isExposed = false;
          break;
      }
    }

    if (userId) {
      const hasChanged = this._userId !== userId || this._linkType !== linkType;
      this._userId = userId;
      this._linkType = linkType;
      this._fromCache = fromCache;
      utils.logInfo(`Id5Status.setUserId: user id updated, hasChanged: ${hasChanged}`);

      // Fire callback if not in control group
      if (this._isExposed) {
        const currentThis = this; // Preserve this within callback

        // Fire onAvailable if not yet fired
        if (utils.isFn(this._availableCallback) && this._availableCallbackFired === false) {
          // Cancel pending watchdog
          if (this._availableCallbackTimerId) {
            utils.logInfo(`Cancelling pending onAvailableCallback watchdog`);
            clearTimeout(this._availableCallbackTimerId);
            this._availableCallbackTimerId = undefined;
          }
          this._availableCallbackTimerId = setTimeout(() => Id5Status.doFireOnAvailableCallBack(currentThis), 0);
        }

        // Fire onRefresh if not yet fired and not from cache
        if (this._isRefreshing && utils.isFn(this._refreshCallback) && this._refreshCallbackFired === false) {
          if (fromCache === false || this._isRefreshingWithFetch === false) {
            // Cancel pending watchdog
            if (this._refreshCallbackTimerId) {
              utils.logInfo(`Cancelling pending onRefreshCallback watchdog`);
              clearTimeout(this._refreshCallbackTimerId);
              this._refreshCallbackTimerId = undefined;
            }
            this._refreshCallbackTimerId = setTimeout(() => Id5Status.doFireOnRefreshCallBack(currentThis), 0);
          }
        }

        // Always fire onUpdate if any change
        if (hasChanged && utils.isFn(this._updateCallback)) {
          setTimeout(() => Id5Status.doFireOnUpdateCallBack(currentThis), 0);
        }
      }
    } else {
      this._userId = undefined;
      this._linkType = undefined;
      this._fromCache = undefined;
      this._isExposed = undefined;
    }
  }

  /**
   * Return the current userId if available and not in control group
   * @return {string} userId
   */
  getUserId() {
    return this._isExposed === false ? '0' : this._userId;
  }

  /**
   * Return the current linkType if available and not in control group
   * @return {number} linkType
   */
  getLinkType() {
    return this._isExposed === false ? 0 : this._linkType;
  }

  /**
   * Return true if the userId provided is from cache
   * @return {boolean}
   */
  isFromCache() {
    return this._fromCache;
  }

  /**
   * Return true if we should expose this user Id within AB Test
   * @return {boolean}
   */
  exposeUserId() {
    return this._isExposed;
  }

  /**
   * Return the current userId in an object that can be added to the
   * eids array of an OpenRTB bid request
   * @return {object}
   */
  getUserIdAsEid() {
    return {
      source: CONSTANTS.ID5_EIDS_SOURCE,
      uids: [{
        id: this.getUserId(),
        ext: {
          linkType: this.getLinkType(),
          abTestingControlGroup: !this.exposeUserId()
        }
      }]
    };
  }

  /**
   * Fire the provided callback when (and exactly once) a user id is available
   * if a timeout is provided, fire the callback at timeout even if user id is not yet available
   * @param {function(Id5Status)} fn - callback function, receiving the current Id5Status as first param
   * @param {number} [timeout] - watchdog timeout in ms
   * @return {Id5Status} the current Id5Status for chaining
   */
  onAvailable(fn, timeout) {
    if (!utils.isFn(fn)) {
      throw new Error('onAvailable expect a function');
    }
    if (utils.isFn(this._availableCallback)) {
      utils.logInfo('onAvailable was already called, ignoring');
    } else {
      this._availableCallback = fn;
      const currentThis = this; // Preserve this within callback

      if (this.getUserId()) {
        utils.logInfo('Id5Status.onAvailable: User id already available firing callback immediately');
        this._availableCallbackTimerId = setTimeout(() => Id5Status.doFireOnAvailableCallBack(currentThis), 0);
      } else if (timeout > 0) {
        this._availableCallbackTimerId = setTimeout(() => Id5Status.doFireOnAvailableCallBack(currentThis), timeout);
      }
    }
    return this;
  }

  /**
   * Fire the provided callback each time a user id is available or updated. Will be fired after onAvailable or onRefresh if both are provided
   * @param {function(Id5Status)} fn - callback function, receiving the current Id5Status as first param
   * @return {Id5Status} the current Id5Status for chaining
   */
  onUpdate(fn) {
    if (!utils.isFn(fn)) {
      throw new Error('onUpdate expect a function');
    }
    this._updateCallback = fn;
    const currentThis = this; // Preserve this within callback
    if (this.getUserId()) {
      setTimeout(() => Id5Status.doFireOnUpdateCallBack(currentThis), 0);
    }
    return this;
  }

  /**
   * Fire the provided callback when (and exactly once) a user id is returned by refreshId()
   * if a timeout is provided, fire the callback at timeout even refersh is not done
   * @param {function(Id5Status)} fn - callback function, receiving the current Id5Status as first param
   * @param {number} [timeout] - watchdog timeout in ms
   * @return {Id5Status} the current Id5Status for chaining
   */
  onRefresh(fn, timeout) {
    if (!utils.isFn(fn)) {
      throw new Error('onRefresh expect a function');
    }
    // We have a pending onRefresh, cancel it.
    if (this._refreshCallbackTimerId) {
      clearTimeout(this._refreshCallbackTimerId);
      this._refreshCallbackTimerId = undefined;
    }
    this._refreshCallback = fn;
    const currentThis = this; // Preserve this within callback
    // If we are already after a non-forced refreshId and we already have a user id, then callback immediately
    if (this._isRefreshing === true && this._isRefreshingWithFetch === false && this.getUserId()) {
      this._refreshCallbackTimerId = setTimeout(() => Id5Status.doFireOnRefreshCallBack(currentThis), 0);
    } else if (timeout > 0) {
      this._refreshCallbackTimerId = setTimeout(() => Id5Status.doFireOnRefreshCallBack(currentThis), timeout);
    }
    return this;
  }

  /**
   * @return {boolean|undefined} see {ClientStore.isLocalStorageAllowed}
   */
  localStorageAllowed() {
    return this.clientStore.localStorageAllowed();
  }

  /**
   * This function fire the onAvailable callback of the passed Id5Status
   * @param {Id5Status} currentId5Status
   */
  static doFireOnAvailableCallBack(currentId5Status) {
    utils.logInfo(`Id5Status.doFireOnAvailableCallBack`);
    currentId5Status._availableCallbackFired = true;
    currentId5Status._availableCallbackTimerId = undefined;
    currentId5Status._availableCallback(currentId5Status);
  }

  /**
   * This function fire the onUpdate callback of the passed Id5Status
   * @param {Id5Status} currentId5Status
   */
  static doFireOnUpdateCallBack(currentId5Status) {
    utils.logInfo(`Id5Status.doFireOnUpdateCallBack`);
    currentId5Status._updateCallback(currentId5Status);
  }

  /**
   * This function fire the onRefresh callback of the passed Id5Status
   * @param {Id5Status} currentId5Status
   */
  static doFireOnRefreshCallBack(currentId5Status) {
    utils.logInfo(`Id5Status.doFireOnRefreshCallBack`);
    currentId5Status._refreshCallbackFired = true;
    currentId5Status._refreshCallbackTimerId = undefined;
    currentId5Status._isRefreshing = false;
    currentId5Status._isRefreshingWithFetch = false;
    currentId5Status._refreshCallback(currentId5Status);
  }
}
