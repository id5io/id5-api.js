import {default as PolyfillPromise} from 'promise-polyfill';

function getPromise() {
  let root = typeof global !== 'undefined' ? global : window;
  if (root !== undefined && root.Promise !== undefined) {
    return root.Promise;
  }
  return PolyfillPromise;
}

const Promise = getPromise();
export default Promise;

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
