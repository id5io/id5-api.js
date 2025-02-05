import {NO_OP_LOGGER} from './logger.js';

export function semanticVersionCompare(version1, version2) {
  let semanticVersionPattern = '^\\d+(\\.\\d+(\\.\\d+){0,1}){0,1}$';
  if (!version1.match(semanticVersionPattern) || !version2.match(semanticVersionPattern)
  ) {
    return undefined;
  }

  let v1 = version1.split('.');
  let v2 = version2.split('.');
  let asInt = (val) => {
    return parseInt(val) || 0;
  };
  let compareInt = (i1, i2) => {
    let diff = i1 - i2;
    return diff === 0 ? 0 : (diff < 0 ? -1 : 1);
  };

  let majorCompare = compareInt(asInt(v1[0]), asInt(v2[0]));
  if (majorCompare === 0) {
    let minorCompare = compareInt(asInt(v1[1]), asInt(v2[1]));
    if (minorCompare === 0) {
      return compareInt(asInt(v1[2]), asInt(v2[2]));
    }
    return minorCompare;
  }
  return majorCompare;
}

const tArr = 'Array';
const tStr = 'String';
const tFn = 'Function';
const tNumb = 'Number';
const tObject = 'Object';
const tBoolean = 'Boolean';
const toString = Object.prototype.toString;

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

export function generateId() {
  if (isDefined(globalThis)
    && isDefined(globalThis.crypto)
    && isFn(globalThis.crypto.randomUUID)
  ) {
    return globalThis.crypto.randomUUID();
  }
  // sufficiently as for the use case
  return `${(Math.random() * 1000000) | 0}`;
}

/**
 * Iterate object with the function
 * falls back to es5 `forEach`
 * @param {Array|Object} object
 * @param {function(value, key, object)} fn
 */
export function _each(object, fn) {
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

function parse(url, options) {
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

function format(obj) {
  return (obj.protocol || 'http') + '://' +
    (obj.host ||
        obj.hostname + (obj.port ? `:${obj.port}` : '')) +
    (obj.pathname || '') +
    (obj.search ? `?${formatQS(obj.search || '')}` : '') +
    (obj.hash ? `#${obj.hash}` : '');
}

function parseQS(query) {
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

function formatQS(query) {
  return Object
    .keys(query)
    .map(k => Array.isArray(query[k])
      ? query[k].map(v => `${k}[]=${v}`).join('&')
      : `${k}=${query[k]}`)
    .join('&');
}

/**
 * Simple IE9+ and cross-browser ajax request function
 * Note: x-domain requests in IE9 do not support the use of cookies
 *
 * @param url string url
 * @param callback {object | function} callback
 * @param data mixed data
 * @param options object
 * @param {Logger} log
 */
export function ajax(url, callback, data, options = {}, log = NO_OP_LOGGER) {
  const XHR_DONE = 4;
  try {
    let x;
    let method = options.method || (data ? 'POST' : 'GET');
    let parser = document.createElement('a');
    parser.href = url;

    let callbacks = typeof callback === 'object' && callback !== null ? callback : {
      success: function() {
        log.info('ajax', 'xhr success');
      },
      error: function(e) {
        log.error('ajax', 'xhr error', null, e);
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
      log.error('ajax', 'xhr timeout after ', x.timeout, 'ms');
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
    log.error('ajax', 'xhr construction', error);
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
