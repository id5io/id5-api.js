import { isDefined } from './utils.js';

export class LazyValue {
  _valuePromise;
  _value;
  _resolve;
  _hasValue;

  constructor() {
    this.reset();
  }

  reset() {
    this._value = undefined;
    this._hasValue = false;
    this._valuePromise = new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  /**
   * @param {T} value
   */
  set(value) {
    if (this._hasValue) {
      this._valuePromise = Promise.resolve(value);
    } else {
      this._hasValue = true;
      this._resolve(value);
    }
    this._value = value;
  }

  /**
   * @return {Promise<T>}
   */
  getValuePromise() {
    return this._valuePromise;
  }

  /**
   * @return {boolean}
   */
  hasValue() {
    return this._hasValue;
  }

  getValue() {
    return this._value;
  }
}
