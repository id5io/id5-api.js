import { Logger, utils } from '@id5io/multiplexing';

const isParamDebug = getParameterByName('id5_debug').toUpperCase() === 'TRUE';
const isParamTrace = getParameterByName('id5_debug').toUpperCase() === 'TRACE';
const consoleExists = Boolean(window.console);

let isDebug = false;

export function all(array, fn) {
  let result = true;
  utils._each(array, (value) => (result = result && fn(value)));
  return result;
}

/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
export function logDebug(origin, invocationId, ...messages) {
  doLog(console.info, origin, invocationId, 'DEBUG', messages);
}

export function logInfo(origin, invocationId, ...messages) {
  doLog(console.info, origin, invocationId, 'INFO', messages);
}

export function logWarn(origin, invocationId, ...messages) {
  doLog(console.warn, origin, invocationId, 'WARNING', messages);
}

export function logError(origin, invocationId, ...messages) {
  doLog(console.error, origin, invocationId, 'ERROR', messages);
}

function doLog(consoleMethod, origin, invocationId, prefix, messages) {
  if (isGlobalDebug() && consoleExists && consoleMethod) {
    consoleMethod.apply(console, [`%cID5 - ${origin}#${invocationId}`,
      'color: #fff; background: #1c307e; padding: 1px 4px; border-radius: 3px;',
      prefix].concat(messages));
  }
}

export function setGlobalDebug(value) {
  isDebug = !!value;
}

export function isGlobalDebug() {
  return isParamDebug || isParamTrace || isDebug;
}

export function isGlobalTrace() {
  return isParamTrace;
}

export class InvocationLogger extends Logger {
  /**
   * @type {number|string}
   */
  _invocationId;

  /**
   * @type {string}
   */
  _origin;

  /**
   * @param {string} origin
   * @param {number|string} invocationId
   */
  constructor(origin, invocationId) {
    super();
    this._invocationId = invocationId;
    this._origin = origin;
  }

  debug(...args) {
    logDebug(this._origin, this._invocationId, ...args);
  }

  info(...args) {
    logInfo(this._origin, this._invocationId, ...args);
  }

  warn(...args) {
    logWarn(this._origin, this._invocationId, ...args);
  }

  error(...args) {
    logError(this._origin, this._invocationId, ...args);
  }
}

/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */
function getParameterByName(name) {
  const regexS = '[\\?&]' + name + '=([^&#]*)';
  const regex = new RegExp(regexS);
  const results = regex.exec(window.location.search);
  if (results === null) {
    return '';
  }

  return decodeURIComponent(results[1].replace(/\+/g, ' '));
}

export const isA = utils.isA;

export const isFn = utils.isFn;

export const isStr = utils.isStr;

export const isArray = utils.isArray;

export const isNumber = utils.isNumber;

export const isPlainObject = utils.isPlainObject;

export const isBoolean = utils.isBoolean;

export const isDefined = utils.isDefined;

export const isEmpty = utils.isEmpty;

const ajaxLogger = new InvocationLogger('ajax');
/**
 * Simple IE9+ and cross-browser ajax request function
 * Note: x-domain requests in IE9 do not support the use of cookies
 *
 * @param url string url
 * @param callback {object | function} callback
 * @param data mixed data
 * @param options object
 */
export function ajax(url, callback, data, options = {}) {
  utils.ajax(url, callback, data, options, ajaxLogger);
}

/**
 * add an Image pixel to the DOM for the given sync Url
 *
 * @param syncUrl
 * @param initCallBack Called when pixel is initiated. Always called. Optional
 * @param callback Called when pixel is loaded. May never be called. Optional
 */
function fireAsyncPixel(syncUrl, initCallBack, callback) {
  let img = new Image();
  img.src = syncUrl;
  if (isFn(initCallBack)) {
    initCallBack();
  }
  if (isFn(callback)) {
    if (img.complete) {
      callback();
    } else {
      img.addEventListener('load', callback);
    }
  }
}

/**
 * wait until the page finishes loading and then fire a pixel
 *
 * @param syncUrl
 * @param initCallBack Called when pixel is initiated. Optional
 * @param loadedCallback Called when pixel is loaded (may never be called). Optional
 */
export function deferPixelFire(syncUrl, initCallBack, loadedCallback) {
  if (document.readyState !== 'loading') {
    fireAsyncPixel(syncUrl, initCallBack, loadedCallback);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      fireAsyncPixel(syncUrl, initCallBack, loadedCallback);
    });
  }
}

/**
 * Returns an array which is a filtered subset of the original leaving
 * the original unchanged
 * @param {Array} arr
 * @param {Function} test
 * @returns an array which is a filtered subset of the original
 */
function filter(arr, test) {
  const result = [];
  utils._each(arr, element => {
    if (test(element)) {
      result.push(element);
    }
  });
  return result;
}

/**
 * removes in place GREASE-like UA brands from the user agent hints brands and
 * fullVersionList lists
 * https://wicg.github.io/ua-client-hints/#grease
 * @param {object} uaHints
 * @returns {object} the uaHints
 */
export function filterUaHints(uaHints) {
  if (!isDefined(uaHints)) {
    return undefined;
  }
  const GREASE_REGEX = /[()-.:;=?_/]/g;
  if (isArray(uaHints.brands)) {
    uaHints.brands = filter(uaHints.brands, element =>
      isStr(element.brand) && element.brand.search(GREASE_REGEX) < 0);
  }
  if (isArray(uaHints.fullVersionList)) {
    uaHints.fullVersionList = filter(uaHints.fullVersionList, element =>
      isStr(element.brand) && element.brand.search(GREASE_REGEX) < 0);
  }
  return uaHints;
}

/**
 * License for dlv: https://github.com/developit/dlv
 * Copyright (c) 2021 Jason Miller
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
export function delve(obj, key, def, p, undef) {
  key = key.split ? key.split('.') : key;
  for (p = 0; p < key.length; p++) {
    obj = obj ? obj[key[p]] : undef;
  }
  return obj === undef ? def : obj;
}

const isNonNullObject = (object) => {
  return object != null && typeof object === 'object';
};

/**
 * Compares properties of two objects recursively, looking also at nested objects. Handles primitives and null values.
 * @returns {boolean} true if objects have exactly the same properties, false if not
 */
export function deepEqual(obj1, obj2) {
  const bothObjects = isNonNullObject(obj1) && isNonNullObject(obj2);
  if (!bothObjects) {
    // compare values directly if they are not objects
    return obj1 === obj2;
  }

  // If the objects have different numbers of properties, they are not equal
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) {
    return false;
  }

  // Iterate over the properties of the first object
  for (let key of keys1) {
    // Recursively compare nested objects
    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  // If all properties match, the objects are equal
  return true;
}

/**
 * Compares two software version numbers (e.g. "1.7.1" or "1.2b").
 *
 * This function was born in http://stackoverflow.com/a/6832721.
 *
 * @param {string} v1 The first version to be compared.
 * @param {string} v2 The second version to be compared.
 * @param {object} [options] Optional flags that affect comparison behavior:
 * <ul>
 *     <li>
 *         <tt>lexicographical: true</tt> compares each part of the version strings lexicographically instead of
 *         naturally; this allows suffixes such as "b" or "dev" but will cause "1.10" to be considered smaller than
 *         "1.2".
 *     </li>
 *     <li>
 *         <tt>zeroExtend: true</tt> changes the result if one version string has less parts than the other. In
 *         this case the shorter string will be padded with "zero" parts instead of being considered smaller.
 *     </li>
 * </ul>
 * @returns {number|NaN}
 * <ul>
 *    <li>0 if the versions are equal</li>
 *    <li>a negative integer iff v1 < v2</li>
 *    <li>a positive integer iff v1 > v2</li>
 *    <li>NaN if either version string is in the wrong format</li>
 * </ul>
 *
 * @copyright by Jon Papaioannou (["john", "papaioannou"].join(".") + "@gmail.com")
 * @license This function is in the public domain. Do what you want with it, no strings attached.
 */
export function versionCompare(v1, v2, options) {
  const lexicographical = options && options.lexicographical;
  const zeroExtend = options && options.zeroExtend;
  let v1parts = v1.split('.');
  let v2parts = v2.split('.');

  function isValidPart(x) {
    return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
  }

  if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
    return NaN;
  }

  if (zeroExtend) {
    while (v1parts.length < v2parts.length) v1parts.push('0');
    while (v2parts.length < v1parts.length) v2parts.push('0');
  }

  if (!lexicographical) {
    v1parts = v1parts.map(Number);
    v2parts = v2parts.map(Number);
  }

  for (var i = 0; i < v1parts.length; ++i) {
    if (v2parts.length === i) {
      return 1;
    }

    if (v1parts[i] === v2parts[i]) {
      continue;
    } else if (v1parts[i] > v2parts[i]) {
      return 1;
    } else {
      return -1;
    }
  }

  if (v1parts.length !== v2parts.length) {
    return -1;
  }

  return 0;
}
