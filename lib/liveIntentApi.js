import CONSTANTS from './constants.json';
import { delve, isFn, isPlainObject, isStr, logInfo } from './utils.js';

/* eslint-disable no-unused-vars */
import LocalStorage from './localStorage.js';
/* eslint-enable no-unused-vars */

export class LiveIntentApi {
  /**
   * Used to disable the integration
   * @type {boolean}
   */
  isEnabled;

  /** @type {number} */
  invocationId;

  /**
   * The interface to the browser local storage
   * @type {LocalStorage}
   */
  localStorage;

  /** @type {object} */
  _windowObj;

  /**
   * The detection interval handler
   * @type {number}
   */
  _handler;

  /** @type {boolean} */
  _hasLiveIntentId = false;

  /** @type {string} */
  _liveIntentId = undefined;

  /** @type {number} */
  _liveIntentIdTimestamp;

  constructor(windowObj, isEnabled, invocationId, localStorage) {
    const self = this;
    this._windowObj = windowObj;
    this.isEnabled = isEnabled;
    this.invocationId = invocationId;
    this.localStorage = localStorage;
    if (isEnabled) {
      this._checkLocalStorage();
      logInfo(this.invocationId, 'Starting polling detection of LiveIntent API');
      this._handler = setInterval(() => {
        if (delve(this._windowObj, 'liQ.ready')) {
          logInfo(this.invocationId, 'Stopping polling detection of LiveIntent API: found');
          clearInterval(self._handler);
          self._onDetected();
        }
      }, CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS);
    }
  }

  _checkLocalStorage() {
    if (this.localStorage.isAvailable()) {
      const localStorageItem = this.localStorage.getItemWithExpiration(CONSTANTS.STORAGE_CONFIG.LIVE_INTENT);
      const localStorageObj = isStr(localStorageItem) ? JSON.parse(localStorageItem) : undefined;
      if (isPlainObject(localStorageObj)) {
        logInfo(this.invocationId, 'Retrieved LiveIntent ID from local storage');
        this._setLiveIntentId(localStorageObj);
      }
    }
  }

  _onDetected() {
    const self = this;
    logInfo(this.invocationId, 'Detected LiveIntent API on the page! Requesting their ID.');
    const resolve = delve(this._windowObj, 'liQ.resolve');
    if (isFn(resolve)) {
      resolve(result => {
        logInfo(self.invocationId, 'Received LiveIntent API `resolve` lookup response', result);
        if (result.unifiedId) {
          self._setLiveIntentIdFromResponse(result.unifiedId, Date.now());
        }
      });
    }
  }

  _setLiveIntentIdFromResponse(liveIntentId, timestamp) {
    const liveIntentObj = {
      liveIntentId,
      timestamp
    };
    this.localStorage.setItemWithExpiration(CONSTANTS.STORAGE_CONFIG.LIVE_INTENT, JSON.stringify(liveIntentObj));
    this._setLiveIntentId(liveIntentObj);
  }

  _setLiveIntentId(liveIntentObj) {
    logInfo(self.invocationId, 'Received LiveIntent ID', liveIntentObj);
    this._liveIntentId = liveIntentObj.liveIntentId;
    this._liveIntentIdTimestamp = liveIntentObj.timestamp;
    this._hasLiveIntentId = true;
  }

  getLiveIntentId() {
    return this.isEnabled ? this._liveIntentId : undefined;
  }

  hasLiveIntentId() {
    return this.isEnabled && this._hasLiveIntentId;
  }
}
