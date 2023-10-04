export class LazyValue {
  _valuePromise;
  _value;

  constructor() {
    this.reset();
  }

  reset() {
    const holder = this;
    holder._value = undefined;
    holder._valuePromise = new Promise((resolve, reject) => {
      holder._resolve = resolve;
    });
  }

  /**
   *
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
   *
   * @return {boolean}
   */
  hasValue() {
    return this._value !== undefined;
  }

  getValue() {
    return this._value;
  }
}
