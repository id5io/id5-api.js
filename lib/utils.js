const tArr = 'Array';
const tStr = 'String';
const tFn = 'Function';
const tNumb = 'Number';
const tObject = 'Object';
const tBoolean = 'Boolean';
const toString = Object.prototype.toString;
const isParamDebug = getParameterByName('id5_debug').toUpperCase() === 'TRUE';
const isParamTrace = getParameterByName('id5_debug').toUpperCase() === 'TRACE';
const consoleExists = Boolean(window.console);

let isDebug = false;

/*
 *   Substitutes into a string from a given map using the token
 *   Usage
 *   var str = 'text %%REPLACE%% this text with %%SOMETHING%%';
 *   var map = {};
 *   map['replace'] = 'it was subbed';
 *   map['something'] = 'something else';
 *   console.log(replaceTokenInString(str, map, '%%')); => "text it was subbed this text with something else"
 */
export function replaceTokenInString(str, map, token) {
  _each(map, function (value, key) {
    value = (value === undefined) ? '' : value;

    let keyString = token + key.toUpperCase() + token;
    let re = new RegExp(keyString, 'g');

    str = str.replace(re, value);
  });

  return str;
}

export function all(array, fn) {
  let result = true;
  _each(array, (value) => (result = result && fn(value)));
  return result;
}

/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
export function logInfo(invocationId, ...messages) {
  doLog(console.info, invocationId, 'INFO', messages);
}

export function logWarn(invocationId, ...messages) {
  doLog(console.warn, invocationId, 'WARNING', messages);
}

export function logError(invocationId, ...messages) {
  doLog(console.error, invocationId, 'ERROR', messages);
}

function doLog(consoleMethod, invocationId, prefix, messages) {
  if (isGlobalDebug() && consoleExists && consoleMethod) {
    consoleMethod.apply(console, [`%cID5 - #${invocationId}`,
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

/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */
export function getParameterByName(name) {
  const regexS = '[\\?&]' + name + '=([^&#]*)';
  const regex = new RegExp(regexS);
  const results = regex.exec(window.location.search);
  if (results === null) {
    return '';
  }

  return decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Return if the object is of the
 * given type.
 * @param {*} object to test
 * @param {String} _t type string (e.g., Array)
 * @return {Boolean} if object is of type _t
 */
export function isA(object, _t) {
  return toString.call(object) === '[object ' + _t + ']';
}

export function isFn(object) {
  return isA(object, tFn);
}

export function isStr(object) {
  return isA(object, tStr);
}

export function isArray(object) {
  return isA(object, tArr);
}

export function isNumber(object) {
  return isA(object, tNumb);
}

export function isPlainObject(object) {
  return isA(object, tObject);
}

export function isBoolean(object) {
  return isA(object, tBoolean);
}

export function isDefined(object) {
  return typeof object !== 'undefined';
}

/**
 * Return if the object is "empty";
 * this includes falsey, no keys, or no items at indices
 * @param {*} object object to test
 * @return {Boolean} if object is empty
 */
export function isEmpty(object) {
  if (!object) return true;
  if (isArray(object) || isStr(object)) {
    return !(object.length > 0);
  }

  for (let k in object) {
    if (hasOwnProperty.call(object, k)) return false;
  }

  return true;
}

/**
 * Iterate object with the function
 * falls back to es5 `forEach`
 * @param {Array|Object} object
 * @param {function(value, key, object)} fn
 */
function _each(object, fn) {
  if (isEmpty(object)) return;
  if (isFn(object.forEach)) return object.forEach(fn, this);

  let k = 0;
  let l = object.length;

  if (l > 0) {
    for (; k < l; k++) fn(object[k], k, object);
  } else {
    for (k in object) {
      if (hasOwnProperty.call(object, k)) fn.call(this, object[k], k);
    }
  }
}

export function getCookie(name) {
  let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? decodeURIComponent(m[2]) : null;
}

export function setCookie(key, value, expires) {
  document.cookie = `${key}=${encodeURIComponent(value)}${(expires !== '') ? `; expires=${expires}` : ''}; path=/`;
}

export function parseQS(query) {
  return !query ? {} : query
    .replace(/^\?/, '')
    .split('&')
    .reduce((acc, criteria) => {
      let [k, v] = criteria.split('=');
      if (/\[\]$/.test(k)) {
        k = k.replace('[]', '');
        acc[k] = acc[k] || [];
        acc[k].push(v);
      } else {
        acc[k] = v || '';
      }
      return acc;
    }, {});
}

export function formatQS(query) {
  return Object
    .keys(query)
    .map(k => Array.isArray(query[k])
      ? query[k].map(v => `${k}[]=${v}`).join('&')
      : `${k}=${query[k]}`)
    .join('&');
}

export function parse(url, options) {
  let parsed = document.createElement('a');
  if (options && 'noDecodeWholeURL' in options && options.noDecodeWholeURL) {
    parsed.href = url;
  } else {
    parsed.href = decodeURIComponent(url);
  }
  // in window.location 'search' is string, not object
  let qsAsString = (options && 'decodeSearchAsString' in options && options.decodeSearchAsString);
  return {
    href: parsed.href,
    protocol: (parsed.protocol || '').replace(/:$/, ''),
    hostname: parsed.hostname,
    port: +parsed.port,
    pathname: parsed.pathname.replace(/^(?!\/)/, '/'),
    search: (qsAsString) ? parsed.search : parseQS(parsed.search || ''),
    hash: (parsed.hash || '').replace(/^#/, ''),
    host: parsed.host || window.location.host
  };
}

export function format(obj) {
  return (obj.protocol || 'http') + '://' +
    (obj.host ||
        obj.hostname + (obj.port ? `:${obj.port}` : '')) +
    (obj.pathname || '') +
    (obj.search ? `?${formatQS(obj.search || '')}` : '') +
    (obj.hash ? `#${obj.hash}` : '');
}

const XHR_DONE = 4;

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
  try {
    let x;
    let method = options.method || (data ? 'POST' : 'GET');
    let parser = document.createElement('a');
    parser.href = url;

    let callbacks = typeof callback === 'object' && callback !== null ? callback : {
      success: function() {
        logInfo('ajax', 'xhr success');
      },
      error: function(e) {
        logError('ajax', 'xhr error', null, e);
      }
    };

    if (typeof callback === 'function') {
      callbacks.success = callback;
    }

    x = new window.XMLHttpRequest();

    x.onreadystatechange = function () {
      if (x.readyState === XHR_DONE) {
        let status = x.status;
        if ((status >= 200 && status < 300) || status === 304) {
          callbacks.success(x.responseText, x);
        } else {
          callbacks.error(x.statusText, x);
        }
      }
    };

    x.ontimeout = function () {
      logError('ajax', 'xhr timeout after ', x.timeout, 'ms');
    };

    if (method === 'GET' && data) {
      let urlInfo = parse(url, options);
      Object.assign(urlInfo.search, data);
      url = format(urlInfo);
    }

    x.open(method, url, true);

    if (options.withCredentials) {
      x.withCredentials = true;
    }
    _each(options.customHeaders, (value, header) => {
      x.setRequestHeader(header, value);
    });
    if (options.preflight) {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }
    x.setRequestHeader('Content-Type', options.contentType || 'text/plain');

    if (method === 'POST' && data) {
      x.send(data);
    } else {
      x.send();
    }
  } catch (error) {
    logError('ajax', 'xhr construction', error);
  }
}

/**
 * add an Image pixel to the DOM for the given sync Url
 *
 * @param syncUrl
 * @param initCallBack Called when pixel is initiated. Always called. Optional
 * @param callback Called when pixel is loaded. May never be called. Optional
 */
export function fireAsyncPixel(syncUrl, initCallBack, callback) {
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
 * returns a hash of a string using a fast algorithm
 * source: https://stackoverflow.com/a/52171480/845390
 * @param {string} str
 * @param {number} [seed] (optional)
 * @returns {string}
 */
export function cyrb53Hash(str, seed = 0) {
  // IE doesn't support imul
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul#Polyfill
  let imul = function(opA, opB) {
    if (isFn(Math.imul)) {
      return Math.imul(opA, opB);
    } else {
      opB |= 0; // ensure that opB is an integer. opA will automatically be coerced.
      // floating points give us 53 bits of precision to work with plus 1 sign bit
      // automatically handled for our convienence:
      // 1. 0x003fffff /*opA & 0x000fffff*/ * 0x7fffffff /*opB*/ = 0x1fffff7fc00001
      //    0x1fffff7fc00001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
      var result = (opA & 0x003fffff) * opB;
      // 2. We can remove an integer coersion from the statement above because:
      //    0x1fffff7fc00001 + 0xffc00000 = 0x1fffffff800001
      //    0x1fffffff800001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
      if (opA & 0xffc00000) result += (opA & 0xffc00000) * opB | 0;
      return result | 0;
    }
  };

  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = imul(h1 ^ ch, 2654435761);
    h2 = imul(h2 ^ ch, 1597334677);
  }
  h1 = imul(h1 ^ (h1 >>> 16), 2246822507) ^ imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = imul(h2 ^ (h2 >>> 16), 2246822507) ^ imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString();
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
  _each(arr, element => {
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

export function objectEntries(obj) {
  let ownProps = Object.keys(obj);
  let i = ownProps.length;
  let resArray = new Array(i); // preallocate the Array
  while (i--) {
    resArray[i] = [ownProps[i], obj[ownProps[i]]];
  }
  return resArray;
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
