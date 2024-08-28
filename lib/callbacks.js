import {startTimeMeasurement} from '@id5io/diagnostics';
/**
 * Encapsulates a callback which can be called only once and
 * has a watchdog timer which calls it anyway even if not triggered
 * before the timeout.
 */
export class WatchdogSingletonCallback {
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

  /** @type {Logger} */
  _log;

  /** @type {Id5CommonMetrics} */
  _metrics;

  /** @type {string} */
  _callbackName;

  constructor(name, log, metrics, callbackFn, timeout, immediate, beforeTrigger, ...callbackArgs) {
    this._callbackName = name
    this._log = log;
    this._metrics = metrics;
    this._callbackFn = callbackFn;
    this._callbackArgs = callbackArgs;
    this._beforeTrigger = beforeTrigger;
    this._called = false;
    this._callbackTriggerTimer = startTimeMeasurement();
    this._timeout = timeout;
    if (immediate) {
      this._watchdog = setTimeout(() => this._trigger("immediate"), 0);
    } else if (timeout > 0) {
      this._watchdog = setTimeout(() => this._trigger("timeout"), timeout);
    }
  }

  _trigger(trigger = "unknown") {
    this._watchdog = undefined;
    let durationMs = this._callbackTriggerTimer.record(this._metrics.timer("callback.trigger.time", {
      trigger: trigger,
      callbackName: this._callbackName,
      timeout: this._timeout
    }));
    if (!this._called) {
      this._called = true;
      setTimeout(() => {
        this._log.debug(`Firing ${this._callbackName} callback after ${durationMs}ms. Triggered by ${trigger}, configured timeoutMs=${this._timeout}`);
        this._beforeTrigger();
        this._callbackFn.call(globalThis, ...this._callbackArgs);
      }, 0);
    }
  }

  triggerNow(trigger = "eventOccurred") {
    this.disableWatchdog();
    this._trigger(trigger);
  }

  disableWatchdog() {
    if (this._watchdog) {
      clearTimeout(this._watchdog);
      this._watchdog = undefined;
    }
  }
}
