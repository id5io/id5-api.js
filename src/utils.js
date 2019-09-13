
import { config } from './config';

const tArr = 'Array';
const tStr = 'String';
const tFn = 'Function';
const tNumb = 'Number';
const tObject = 'Object';
const tBoolean = 'Boolean';
const toString = Object.prototype.toString;
let consoleExists = Boolean(window.console);
let consoleLogExists = Boolean(consoleExists && window.console.log);
let consoleInfoExists = Boolean(consoleExists && window.console.info);
let consoleWarnExists = Boolean(consoleExists && window.console.warn);
let consoleErrorExists = Boolean(consoleExists && window.console.error);

var uniqueRef = {};
export let bind = function(a, b) { return b; }.bind(null, 1, uniqueRef)() === uniqueRef
  ? Function.prototype.bind
  : function(bind) {
    var self = this;
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
      return self.apply(bind, args.concat(Array.prototype.slice.call(arguments)));
    };
  };

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

    var keyString = token + key.toUpperCase() + token;
    var re = new RegExp(keyString, 'g');

    str = str.replace(re, value);
  });

  return str;
}

/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
export function logMessage() {
  if (debugTurnedOn() && consoleLogExists) {
    console.log.apply(console, decorateLog(arguments, 'MESSAGE:'));
  }
}

export function logInfo() {
  if (debugTurnedOn() && consoleInfoExists) {
    console.info.apply(console, decorateLog(arguments, 'INFO:'));
  }
}

export function logWarn() {
  if (debugTurnedOn() && consoleWarnExists) {
    console.warn.apply(console, decorateLog(arguments, 'WARNING:'));
  }
}

export function logError() {
  if (debugTurnedOn() && consoleErrorExists) {
    console.error.apply(console, decorateLog(arguments, 'ERROR:'));
  }
}

function decorateLog(args, prefix) {
  args = [].slice.call(args);
  prefix && args.unshift(prefix);
  return args;
}

export function debugTurnedOn() {
  return !!config.getConfig('debug');
}

/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */
export function getParameterByName(name) {
  var regexS = '[\\?&]' + name + '=([^&#]*)';
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
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

  for (var k in object) {
    if (hasOwnProperty.call(object, k)) return false;
  }

  return true;
}

/**
 * Iterate object with the function
 * falls back to es5 `forEach`
 * @param {Array|Object} object
 * @param {Function(value, key, object)} fn
 */
export function _each(object, fn) {
  if (isEmpty(object)) return;
  if (isFn(object.forEach)) return object.forEach(fn, this);

  var k = 0;
  var l = object.length;

  if (l > 0) {
    for (; k < l; k++) fn(object[k], k, object);
  } else {
    for (k in object) {
      if (hasOwnProperty.call(object, k)) fn.call(this, object[k], k);
    }
  }
}

/**
 * Map an array or object into another array
 * given a function
 * @param {Array|Object} object
 * @param {Function(value, key, object)} callback
 * @return {Array}
 */
export function _map(object, callback) {
  if (isEmpty(object)) return [];
  if (isFn(object.map)) return object.map(callback);
  var output = [];
  _each(object, function (value, key) {
    output.push(callback(value, key, object));
  });

  return output;
}

export function isSafariBrowser() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function checkCookieSupport() {
  if (window.navigator.cookieEnabled || !!document.cookie.length) {
    return true;
  }
}
export function cookiesAreEnabled() {
  window.document.cookie = 'id5.cookieTest';
  return window.document.cookie.indexOf('id5.cookieTest') !== -1;
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
        logMessage('xhr success');
      },
      error: function(e) {
        logError('xhr error', null, e);
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
      logError('  xhr timeout after ', x.timeout, 'ms');
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
    logError('xhr construction', error);
  }
}
