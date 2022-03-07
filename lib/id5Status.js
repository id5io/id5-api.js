/*
 * Class containing the status of the API for a partner
 */
import CONSTANTS from './constants.json';

import { isFn, logInfo, logError, isPlainObject } from './utils.js';

/* eslint-disable no-unused-vars */
import Config from './config.js';
import ClientStore from './clientStore.js';
import { ConsentManagement } from './consentManagement.js';
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
  /** @type {boolean} */
  _userIdAvailable = false;
  /** @type {number} */
  invocationId;
  /** @type {Config} */
  config;
  /** @type {ClientStore} */
  clientStore;
  /** @type {ConsentManagement} */
  consentManagement;

  /**
   * @param {number} invocationId
   * @param {Config} config
   * @param {ClientStore} clientStore
   * @param {ConsentManagement} consentManagement
   */
  constructor(invocationId, config, clientStore, consentManagement) {
    this.invocationId = invocationId;
    this.config = config;
    this.clientStore = clientStore;
    this.consentManagement = consentManagement;
  }

  /** @returns {Id5Options} options - Current options for this partner */
  getOptions() {
    return this.config.getOptions();
  }

  /**
   * Return how many invalid segments we got in the options
   * @returns {number} invalidSegments
   */
  getInvalidSegments() {
    return this.config.getInvalidSegments();
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
    const _this = this;
    const userId = response.universal_uid;
    const linkType = response.link_type || 0;

    this._isExposed = true;
    if (isPlainObject(response.ab_testing)) {
      switch (response.ab_testing.result) {
        case 'normal':
          // nothing to do
          break;
        default: // falls through
        case 'error':
          logError(this.invocationId, 'There was an error with A/B Testing. Make sure controlGroupRatio is a number >= 0 and <= 1');
          break;
        case 'control':
          this._isExposed = false;
          logInfo(this.invocationId, 'User is in control group!');
          break;
      }
    }

    const hasChanged = this._userId !== userId || this._linkType !== linkType;
    this._userIdAvailable = true;
    this._userId = userId;
    this._linkType = linkType;
    this._fromCache = fromCache;
    logInfo(this.invocationId, `Id5Status.setUserId: user id updated, hasChanged: ${hasChanged}`);

    // Fire onAvailable if not yet fired
    if (isFn(this._availableCallback) && this._availableCallbackFired === false) {
      // Cancel pending watchdog
      if (this._availableCallbackTimerId) {
        logInfo(this.invocationId, `Cancelling pending onAvailableCallback watchdog`);
        clearTimeout(this._availableCallbackTimerId);
        this._availableCallbackTimerId = undefined;
      }
      this._availableCallbackTimerId = setTimeout(() => Id5Status.doFireOnAvailableCallBack(_this), 0);
    }

    // Fire onRefresh if not yet fired and not from cache
    if (this._isRefreshing && isFn(this._refreshCallback) && this._refreshCallbackFired === false) {
      if (fromCache === false || this._isRefreshingWithFetch === false) {
        // Cancel pending watchdog
        if (this._refreshCallbackTimerId) {
          logInfo(this.invocationId, `Cancelling pending onRefreshCallback watchdog`);
          clearTimeout(this._refreshCallbackTimerId);
          this._refreshCallbackTimerId = undefined;
        }
        this._refreshCallbackTimerId = setTimeout(() => Id5Status.doFireOnRefreshCallBack(_this), 0);
      }
    }

    // Always fire onUpdate if any change
    if (hasChanged && isFn(this._updateCallback)) {
      setTimeout(() => Id5Status.doFireOnUpdateCallBack(_this), 0);
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
        atype: 1,
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
    if (!isFn(fn)) {
      throw new Error('onAvailable expect a function');
    }
    if (isFn(this._availableCallback)) {
      logInfo(this.invocationId, 'onAvailable was already called, ignoring');
    } else {
      this._availableCallback = fn;
      const currentThis = this; // Preserve this within callback

      if (this._userIdAvailable) {
        logInfo(this.invocationId, 'Id5Status.onAvailable: User id already available firing callback immediately');
        this._availableCallbackTimerId = setTimeout(() => Id5Status.doFireOnAvailableCallBack(currentThis), 0);
      } else if (timeout > 0) {
        this._availableCallbackTimerId = setTimeout(() => Id5Status.doFireOnAvailableCallBack(currentThis), timeout);
      }
    }
    return this;
  }

  /**
   * Fire the provided callback each time a user id is available or updated.
   * Will be fired after onAvailable or onRefresh if both are provided
   * @param {function(Id5Status)} fn - callback function, receiving the current Id5Status as first param
   * @return {Id5Status} the current Id5Status for chaining
   */
  onUpdate(fn) {
    if (!isFn(fn)) {
      throw new Error('onUpdate expect a function');
    }
    this._updateCallback = fn;
    const currentThis = this; // Preserve this within callback
    if (this._userIdAvailable) {
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
    if (!isFn(fn)) {
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
    if (this._isRefreshing === true && this._isRefreshingWithFetch === false && this._userIdAvailable) {
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
    logInfo(currentId5Status.invocationId, 'Id5Status.doFireOnAvailableCallBack');
    currentId5Status._availableCallbackFired = true;
    currentId5Status._availableCallbackTimerId = undefined;
    currentId5Status._availableCallback(currentId5Status);
  }

  /**
   * This function fire the onUpdate callback of the passed Id5Status
   * @param {Id5Status} currentId5Status
   */
  static doFireOnUpdateCallBack(currentId5Status) {
    logInfo(currentId5Status.invocationId, 'Id5Status.doFireOnUpdateCallBack');
    currentId5Status._updateCallback(currentId5Status);
  }

  /**
   * This function fire the onRefresh callback of the passed Id5Status
   * @param {Id5Status} currentId5Status
   */
  static doFireOnRefreshCallBack(currentId5Status) {
    logInfo(currentId5Status.invocationId, 'Id5Status.doFireOnRefreshCallBack');
    currentId5Status._refreshCallbackFired = true;
    currentId5Status._refreshCallbackTimerId = undefined;
    currentId5Status._isRefreshing = false;
    currentId5Status._isRefreshingWithFetch = false;
    currentId5Status._refreshCallback(currentId5Status);
  }
}
