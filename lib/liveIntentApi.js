import {
  /* eslint-disable no-unused-vars */
  LocalStorage,
  /* eslint-enable no-unused-vars */
  CONSTANTS, NoopLogger} from '@id5io/multiplexing';
import {delve, isFn, isPlainObject, isStr} from './utils.js';

export class LiveIntentApi {
  /**
   * Used to disable the integration
   * @type {boolean}
   */
  isEnabled;

  /**
   * The interface to the browser local storage
   * @type {LocalStorage}
   */
  localStorage;

  storageConfig;

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

  constructor(windowObj, isEnabled, localStorage, storageConfig, logger = NoopLogger) {
    const self = this;
    this._windowObj = windowObj;
    this.isEnabled = isEnabled;
    this.localStorage = localStorage;
    this.storageConfig = storageConfig;
    this._log = logger;
    if (isEnabled) {
      this._checkLocalStorage();
      this._log.info('Starting polling detection of LiveIntent API');
      this._handler = setInterval(() => {
        if (delve(this._windowObj, 'liQ.ready')) {
          this._log.info('Stopping polling detection of LiveIntent API: found');
          clearInterval(self._handler);
          self._onDetected();
        }
      }, CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS);
    }
  }

  _checkLocalStorage() {
    if (this.localStorage.isAvailable()) {
      const localStorageItem = this.localStorage.getItemWithExpiration(this.storageConfig.LIVE_INTENT);
      const localStorageObj = isStr(localStorageItem) ? JSON.parse(localStorageItem) : undefined;
      if (isPlainObject(localStorageObj)) {
        this._log.info('Retrieved LiveIntent ID from local storage');
        this._setLiveIntentId(localStorageObj);
      }
    }
  }

  _onDetected() {
    const self = this;
    const log = self._log;
    log.info('Detected LiveIntent API on the page! Requesting their ID.');
    const resolve = delve(this._windowObj, 'liQ.resolve');
    if (isFn(resolve)) {
      try {
        resolve(result => {
          log.info('Received LiveIntent API `resolve` lookup response', result);
          if (result.unifiedId) {
            self._setLiveIntentIdFromResponse(result.unifiedId, Date.now());
          }
        });
      } catch (e) {
        log.error('Error caught while calling resolve() on LiveIntent API', e);
      }
    }
  }

  _setLiveIntentIdFromResponse(liveIntentId, timestamp) {
    const liveIntentObj = {
      liveIntentId,
      timestamp
    };
    this.localStorage.setItemWithExpiration(this.storageConfig.LIVE_INTENT, JSON.stringify(liveIntentObj));
    this._setLiveIntentId(liveIntentObj);
  }

  _setLiveIntentId(liveIntentObj) {
    this._log.info('Received LiveIntent ID', liveIntentObj);
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
