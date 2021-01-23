/*
 * Class containing the status of the API for a partner
 */

import Config from './config';
import * as abTesting from './abTesting';
import * as utils from './utils';

export default class Id5Status {
  timerId;
  /** @type boolean */
  _callbackFired = false;
  /** @type boolean */
  _isExposed;
  /** @type boolean */
  _fromCache;
  /** @type string */
  _userId;
  /** @type number */
  _linkType;
  /** @type Config */
  config;

  /** @param {Id5Options} options */
  constructor(options) {
    this.config = new Config(options);
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
   * Set the user Id for this Id5Status
   * @param {string} [userId]
   * @param {number} [linkType]
   * @param {boolean} [fromCache]
   */
  setUserId(userId, linkType, fromCache = false) {
    if (userId) {
      this._userId = userId;
      this._linkType = linkType;
      this._fromCache = fromCache;

      // Evaluate if should be exposed
      const options = this.config.getOptions();
      if (options.abTesting.enabled === true) {
        this._isExposed = !abTesting.isInControlGroup(userId, options.abTesting.controlGroupPct);
      } else {
        this._isExposed = true;
      }

      // Fire callback if not in control group
      if (this._isExposed) {
        this.fireCallBack();
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
   * This function cancel any pending watchdog callback
   */
  cancelCallback() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
    this._callbackFired = false;
  }

  /**
   * This function schedule the watchdog of the callback if configured
   */
  scheduleWatchDog() {
    if (this._callbackFired === true) {
      utils.logInfo('scheduleWatchDog: Callback was already called, ignoring');
    } else {
      if (this.timerId) {
        utils.logError('scheduleWatchDog: Watchdog timer already in progress, canceling and rescheduling');
      }
      this.cancelCallback();
      const currentThis = this; // Preserve this within callback
      if (utils.isFn(this.getOptions().callbackOnAvailable) && this.getOptions().callbackTimeoutInMs >= 0) {
        this.timerId = setTimeout(() => Id5Status.doFireCallBack(currentThis), this.getOptions().callbackTimeoutInMs);
      }
    }
  }

  /**
   * This function fire the callbacks of the current Id5Status
   */
  fireCallBack() {
    if (this._callbackFired === true) {
      utils.logInfo('fireCallBack: callbackOnAvailable was already called, ignoring');
    } else {
      this.cancelCallback();
      const currentThis = this; // Preserve this within callbacks
      if (utils.isFn(this.getOptions().callbackOnAvailable)) {
        this.timerId = setTimeout(() => Id5Status.doFireCallBack(currentThis), 0);
      }
    }
  }

  /**
   * This function fire the callback of the passed Id5Status
   * @param {Id5Status} currentId5Status
   */
  static doFireCallBack(currentId5Status) {
    const callbackOnAvailable = currentId5Status.getOptions().callbackOnAvailable;
    currentId5Status.timerId = undefined;
    if (!currentId5Status._callbackFired && utils.isFn(callbackOnAvailable)) {
      utils.logInfo('Calling callbackOnAvailable');
      currentId5Status._callbackFired = true;
      callbackOnAvailable(currentId5Status);
    }
  }
}
