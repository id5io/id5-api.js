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
 * Gathers UA Hints from the browser if possible and enabled adn returns them
 * after filtering them for known unneeded values
 * @param {boolean} disableUaHints
 * @param {Logger} log
 * @returns {Promise<Object>} The filtered UA hints
 */
export async function gatherUaHints(disableUaHints, log) {
  if (!isDefined(window.navigator.userAgentData) || disableUaHints) {
    return undefined;
  }

  let hints;

  try {
    hints = await window.navigator.userAgentData.getHighEntropyValues(['architecture', 'fullVersionList', 'model', 'platformVersion']);
  } catch (error) {
    log.error('Error while calling navigator.userAgentData.getHighEntropyValues()', error);
    return undefined;
  }

  return filterUaHints(hints);
}

/**
 * removes in place GREASE-like UA brands from the user agent hints brands and
 * fullVersionList lists
 * https://wicg.github.io/ua-client-hints/#grease
 * @param {object} uaHints
 * @returns {object} the filterd uaHints
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
