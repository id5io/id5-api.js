import { isDefined } from './utils.js';

export class LazyValue {
  _valuePromise;
  _value;
  _resolve;

  constructor() {
    this.reset();
  }

  reset() {
    const self = this;
    self._value = undefined;
    self._valuePromise = new Promise((resolve) => {
      self._resolve = resolve;
    });
  }

  /**
   * @param {T} value
   */
  set(value) {
    this._value = value;
    this._resolve(this._value);
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
    return isDefined(this._value);
  }

  getValue() {
    return this._value;
  }
}
