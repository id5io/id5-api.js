/**
 * Encapsulates a callback which can be called only once and
 * has a watchdog timer which calls it anyway even if not triggered
 * before the timeout.
 */
export class WatchdogSingletonCallback {
  /** @type {number} */
  _timeoutMs;

  /** @type {boolean} */
  _called;

  /** @type {Function} */
  _callbackFn;

  /** @type {Array} */
  _callbackArgs;

  /** @type {Function} */
  _beforeTrigger;

  /** @type {object} */
  _watchdog;

  constructor(callbackFn, timeout, immediate, beforeTrigger, ...callbackArgs) {
    this._callbackFn = callbackFn;
    this._callbackArgs = callbackArgs;
    this._timeoutMs = timeout;
    this._beforeTrigger = beforeTrigger;
    this._called = false;
    if (immediate) {
      this._watchdog = setTimeout(() => this._trigger(), 0);
    } else if (timeout > 0) {
      this._watchdog = setTimeout(() => this._trigger(), timeout);
    }
  }

  _trigger() {
    this._watchdog = undefined;
    if (!this._called) {
      this._called = true;
      setTimeout(() => {
        this._beforeTrigger();
        this._callbackFn.call(globalThis, ...this._callbackArgs);
      }, 0);
    }
  }

  triggerNow() {
    this.disableWatchdog();
    this._trigger();
  }

  disableWatchdog() {
    if (this._watchdog) {
      clearTimeout(this._watchdog);
      this._watchdog = undefined;
    }
  }
}
