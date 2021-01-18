/**
 * id5-api.js - The ID5 API is designed to make accessing the ID5 Universal ID simple for publishers and their ad tech vendors. The ID5 Universal ID is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. For more information, visit https://id5.io/universal-id.
 * @version v0.9.7-pre
 * @link https://id5.io/
 * @license Apache-2.0
 */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "bind", function() { return bind; });
/* harmony export (immutable) */ __webpack_exports__["replaceTokenInString"] = replaceTokenInString;
/* harmony export (immutable) */ __webpack_exports__["logMessage"] = logMessage;
/* harmony export (immutable) */ __webpack_exports__["logInfo"] = logInfo;
/* harmony export (immutable) */ __webpack_exports__["logWarn"] = logWarn;
/* harmony export (immutable) */ __webpack_exports__["logError"] = logError;
/* harmony export (immutable) */ __webpack_exports__["getParameterByName"] = getParameterByName;
/* harmony export (immutable) */ __webpack_exports__["isA"] = isA;
/* harmony export (immutable) */ __webpack_exports__["isFn"] = isFn;
/* harmony export (immutable) */ __webpack_exports__["isStr"] = isStr;
/* harmony export (immutable) */ __webpack_exports__["isArray"] = isArray;
/* harmony export (immutable) */ __webpack_exports__["isNumber"] = isNumber;
/* harmony export (immutable) */ __webpack_exports__["isPlainObject"] = isPlainObject;
/* harmony export (immutable) */ __webpack_exports__["isBoolean"] = isBoolean;
/* harmony export (immutable) */ __webpack_exports__["isEmpty"] = isEmpty;
/* harmony export (immutable) */ __webpack_exports__["_each"] = _each;
/* harmony export (immutable) */ __webpack_exports__["_map"] = _map;
/* harmony export (immutable) */ __webpack_exports__["isSafariBrowser"] = isSafariBrowser;
/* harmony export (immutable) */ __webpack_exports__["checkCookieSupport"] = checkCookieSupport;
/* harmony export (immutable) */ __webpack_exports__["cookiesAreEnabled"] = cookiesAreEnabled;
/* harmony export (immutable) */ __webpack_exports__["getCookie"] = getCookie;
/* harmony export (immutable) */ __webpack_exports__["setCookie"] = setCookie;
/* harmony export (immutable) */ __webpack_exports__["getItemFromLocalStorage"] = getItemFromLocalStorage;
/* harmony export (immutable) */ __webpack_exports__["getFromLocalStorage"] = getFromLocalStorage;
/* harmony export (immutable) */ __webpack_exports__["setItemInLocalStorage"] = setItemInLocalStorage;
/* harmony export (immutable) */ __webpack_exports__["setInLocalStorage"] = setInLocalStorage;
/* harmony export (immutable) */ __webpack_exports__["removeItemFromLocalStorage"] = removeItemFromLocalStorage;
/* harmony export (immutable) */ __webpack_exports__["removeFromLocalStorage"] = removeFromLocalStorage;
/* harmony export (immutable) */ __webpack_exports__["parseQS"] = parseQS;
/* harmony export (immutable) */ __webpack_exports__["formatQS"] = formatQS;
/* harmony export (immutable) */ __webpack_exports__["parse"] = parse;
/* harmony export (immutable) */ __webpack_exports__["format"] = format;
/* harmony export (immutable) */ __webpack_exports__["ajax"] = ajax;
/* harmony export (immutable) */ __webpack_exports__["fireAsyncPixel"] = fireAsyncPixel;
/* harmony export (immutable) */ __webpack_exports__["deferPixelFire"] = deferPixelFire;
/* harmony export (immutable) */ __webpack_exports__["cyrb53Hash"] = cyrb53Hash;
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var tArr = 'Array';
var tStr = 'String';
var tFn = 'Function';
var tNumb = 'Number';
var tObject = 'Object';
var tBoolean = 'Boolean';
var toString = Object.prototype.toString;
var consoleExists = Boolean(window.console);
var consoleLogExists = Boolean(consoleExists && window.console.log);
var consoleInfoExists = Boolean(consoleExists && window.console.info);
var consoleWarnExists = Boolean(consoleExists && window.console.warn);
var consoleErrorExists = Boolean(consoleExists && window.console.error);
var uniqueRef = {};
var bind = function (a, b) {
  return b;
}.bind(null, 1, uniqueRef)() === uniqueRef ? Function.prototype.bind : function (bind) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  return function () {
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

function replaceTokenInString(str, map, token) {
  _each(map, function (value, key) {
    value = value === undefined ? '' : value;
    var keyString = token + key.toUpperCase() + token;
    var re = new RegExp(keyString, 'g');
    str = str.replace(re, value);
  });

  return str;
}
/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */

function logMessage() {
  if (debugTurnedOn() && consoleLogExists) {
    console.log.apply(console, decorateLog(arguments, 'MESSAGE:'));
  }
}
function logInfo() {
  if (debugTurnedOn() && consoleInfoExists) {
    console.info.apply(console, decorateLog(arguments, 'INFO:'));
  }
}
function logWarn() {
  if (debugTurnedOn() && consoleWarnExists) {
    console.warn.apply(console, decorateLog(arguments, 'WARNING:'));
  }
}
function logError() {
  if (debugTurnedOn() && consoleErrorExists) {
    console.error.apply(console, decorateLog(arguments, 'ERROR:'));
  }
}

function decorateLog(args, prefix) {
  args = [].slice.call(args);
  prefix && args.unshift(prefix);
  args.unshift('display: inline-block; color: #fff; background: #1c307e; padding: 1px 4px; border-radius: 3px;');
  args.unshift('%cID5');
  return args;
}

function debugTurnedOn() {
  return ID5.debug === true;
}
/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */


function getParameterByName(name) {
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

function isA(object, _t) {
  return toString.call(object) === '[object ' + _t + ']';
}
function isFn(object) {
  return isA(object, tFn);
}
function isStr(object) {
  return isA(object, tStr);
}
function isArray(object) {
  return isA(object, tArr);
}
function isNumber(object) {
  return isA(object, tNumb);
}
function isPlainObject(object) {
  return isA(object, tObject);
}
function isBoolean(object) {
  return isA(object, tBoolean);
}
/**
 * Return if the object is "empty";
 * this includes falsey, no keys, or no items at indices
 * @param {*} object object to test
 * @return {Boolean} if object is empty
 */

function isEmpty(object) {
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
 * @param {function(value, key, object)} fn
 */

function _each(object, fn) {
  if (isEmpty(object)) return;
  if (isFn(object.forEach)) return object.forEach(fn, this);
  var k = 0;
  var l = object.length;

  if (l > 0) {
    for (; k < l; k++) {
      fn(object[k], k, object);
    }
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
 * @param {function(value, key, object)} callback
 * @return {Array}
 */

function _map(object, callback) {
  if (isEmpty(object)) return [];
  if (isFn(object.map)) return object.map(callback);
  var output = [];

  _each(object, function (value, key) {
    output.push(callback(value, key, object));
  });

  return output;
}
function isSafariBrowser() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function checkCookieSupport() {
  if (window.navigator.cookieEnabled || !!document.cookie.length) {
    return true;
  }
}
function cookiesAreEnabled() {
  window.document.cookie = 'id5.cookieTest';
  return window.document.cookie.indexOf('id5.cookieTest') !== -1;
}
function getCookie(name) {
  var m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? decodeURIComponent(m[2]) : null;
}
function setCookie(key, value, expires) {
  document.cookie = "".concat(key, "=").concat(encodeURIComponent(value)).concat(expires !== '' ? "; expires=".concat(expires) : '', "; path=/");
}
/**
 * @returns {boolean}
 */

function hasLocalStorage() {
  try {
    return !!window.localStorage;
  } catch (e) {
    logError('Local storage api disabled!');
  }

  return false;
}
/**
 * @typedef {object} StoreItem
 * @property {string} name - Unique key of the stored value
 * @property {number} expiresDays - Number of days of TTL
 */

/**
 * Get stored string from local storage
 *
 * @param {string} key
 * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no localStorage
 */


function getItemFromLocalStorage(key) {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(key);
  }
}
/**
 * Get StoreItem from local storage
 *
 * @param {string} storageConfig.name
 * @param {number} storageConfig.expiresDays
 * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no localStorage
 */

function getFromLocalStorage(storageConfig) {
  var storedValueExp = window.localStorage.getItem("".concat(storageConfig.name, "_exp"));

  if (storedValueExp && new Date(storedValueExp).getTime() - Date.now() > 0) {
    // result is not expired, so it can be retrieved
    return getItemFromLocalStorage(storageConfig.name);
  } else {
    // if we got here, then we have an expired item, so we need to remove the item
    // from the local storage
    removeFromLocalStorage(storageConfig);
    return null;
  }
}
/**
 * Put string in local storage
 *
 * @param {string} key
 * @param {string} value
 * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no localStorage
 */

function setItemInLocalStorage(key, value) {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
  }
}
/**
 * Put StoreItem in local storage
 *
 * @param {StoreItem} storageConfig
 * @param {string} value
 * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no localStorage
 */

function setInLocalStorage(storageConfig, value) {
  // always set an expiration
  var expiresStr = new Date(Date.now() + storageConfig.expiresDays * (60 * 60 * 24 * 1000)).toUTCString();
  setItemInLocalStorage("".concat(storageConfig.name, "_exp"), expiresStr);
  setItemInLocalStorage("".concat(storageConfig.name), value);
}
/**
 * Clear a string in local storage
 *
 * @param {string} key
 */

function removeItemFromLocalStorage(key) {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(key);
  }
}
/**
 * Clear StoreItem in local storage
 *
 * @param {StoreItem} storageConfig
 */

function removeFromLocalStorage(storageConfig) {
  removeItemFromLocalStorage("".concat(storageConfig.name));
  removeItemFromLocalStorage("".concat(storageConfig.name, "_exp"));
}
function parseQS(query) {
  return !query ? {} : query.replace(/^\?/, '').split('&').reduce(function (acc, criteria) {
    var _criteria$split = criteria.split('='),
        _criteria$split2 = _slicedToArray(_criteria$split, 2),
        k = _criteria$split2[0],
        v = _criteria$split2[1];

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
  return Object.keys(query).map(function (k) {
    return Array.isArray(query[k]) ? query[k].map(function (v) {
      return "".concat(k, "[]=").concat(v);
    }).join('&') : "".concat(k, "=").concat(query[k]);
  }).join('&');
}
function parse(url, options) {
  var parsed = document.createElement('a');

  if (options && 'noDecodeWholeURL' in options && options.noDecodeWholeURL) {
    parsed.href = url;
  } else {
    parsed.href = decodeURIComponent(url);
  } // in window.location 'search' is string, not object


  var qsAsString = options && 'decodeSearchAsString' in options && options.decodeSearchAsString;
  return {
    href: parsed.href,
    protocol: (parsed.protocol || '').replace(/:$/, ''),
    hostname: parsed.hostname,
    port: +parsed.port,
    pathname: parsed.pathname.replace(/^(?!\/)/, '/'),
    search: qsAsString ? parsed.search : parseQS(parsed.search || ''),
    hash: (parsed.hash || '').replace(/^#/, ''),
    host: parsed.host || window.location.host
  };
}
function format(obj) {
  return (obj.protocol || 'http') + '://' + (obj.host || obj.hostname + (obj.port ? ":".concat(obj.port) : '')) + (obj.pathname || '') + (obj.search ? "?".concat(formatQS(obj.search || '')) : '') + (obj.hash ? "#".concat(obj.hash) : '');
}
var XHR_DONE = 4;
/**
 * Simple IE9+ and cross-browser ajax request function
 * Note: x-domain requests in IE9 do not support the use of cookies
 *
 * @param url string url
 * @param callback {object | function} callback
 * @param data mixed data
 * @param options object
 */

function ajax(url, callback, data) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  try {
    var x;
    var method = options.method || (data ? 'POST' : 'GET');
    var parser = document.createElement('a');
    parser.href = url;
    var callbacks = _typeof(callback) === 'object' && callback !== null ? callback : {
      success: function success() {
        logMessage('xhr success');
      },
      error: function error(e) {
        logError('xhr error', null, e);
      }
    };

    if (typeof callback === 'function') {
      callbacks.success = callback;
    }

    x = new window.XMLHttpRequest();

    x.onreadystatechange = function () {
      if (x.readyState === XHR_DONE) {
        var status = x.status;

        if (status >= 200 && status < 300 || status === 304) {
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
      var urlInfo = parse(url, options);

      _extends(urlInfo.search, data);

      url = format(urlInfo);
    }

    x.open(method, url, true);

    if (options.withCredentials) {
      x.withCredentials = true;
    }

    _each(options.customHeaders, function (value, header) {
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
/**
 * add an Image pixel to the DOM for the given sync Url
 *
 * @param syncUrl
 * @param initCallBack Called when pixel is initiated. Always called. Optional
 * @param callback Called when pixel is loaded. May never be called. Optional
 */

function fireAsyncPixel(syncUrl, initCallBack, callback) {
  var img = new Image();
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

function deferPixelFire(syncUrl, initCallBack, loadedCallback) {
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

function cyrb53Hash(str) {
  var seed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  // IE doesn't support imul
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul#Polyfill
  var imul = function imul(opA, opB) {
    if (isFn(Math.imul)) {
      return Math.imul(opA, opB);
    } else {
      opB |= 0; // ensure that opB is an integer. opA will automatically be coerced.
      // floating points give us 53 bits of precision to work with plus 1 sign bit
      // automatically handled for our convienence:
      // 1. 0x003fffff /*opA & 0x000fffff*/ * 0x7fffffff /*opB*/ = 0x1fffff7fc00001
      //    0x1fffff7fc00001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/

      var result = (opA & 0x003fffff) * opB; // 2. We can remove an integer coersion from the statement above because:
      //    0x1fffff7fc00001 + 0xffc00000 = 0x1fffffff800001
      //    0x1fffffff800001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/

      if (opA & 0xffc00000) result += (opA & 0xffc00000) * opB | 0;
      return result | 0;
    }
  };

  var h1 = 0xdeadbeef ^ seed;
  var h2 = 0x41c6ce57 ^ seed;

  for (var i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = imul(h1 ^ ch, 2654435761);
    h2 = imul(h2 ^ ch, 1597334677);
  }

  h1 = imul(h1 ^ h1 >>> 16, 2246822507) ^ imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = imul(h2 ^ h2 >>> 16, 2246822507) ^ imul(h1 ^ h1 >>> 13, 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString();
}

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ID5", function() { return ID5; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__config__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__refererDetection__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_src_abTesting__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__clientStore__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__consentManagement__ = __webpack_require__(7);
/** @module id5-api */





 // This syntax allows multiple injection of id5-api.js while resetting only the attributes we need

window.ID5 = window.ID5 || {
  loaded: true,
  debug: false,
  versions: {},
  localStorageAllowed: undefined,
  initialized: false,
  callbackFired: false
};
var ID5 = window.ID5; // TODO: Check for different versions in the same page at init

/**
 * This function will initialize ID5, wait for consent then try to fetch or refresh ID5 user id if required
 * @param {Id5Config} options
 * @alias module:ID5.init
 */

ID5.init = function (options) {
  if (typeof ID5.version === 'undefined') {
    throw new Error('ID5.version variable is missing! Make sure you build from source with "gulp build" from this project. Contact support@id5.io for help.');
  }

  try {
    __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('Invoking ID5.init', arguments);
    ID5.initialized = true;
    ID5.config = new __WEBPACK_IMPORTED_MODULE_0__config__["a" /* default */](options);
    ID5.debug =
    /* ID5.debug || */
    ID5.config.getConfig().debug;
    ID5.consent = new __WEBPACK_IMPORTED_MODULE_5__consentManagement__["a" /* default */]();
    this.getId(ID5.config.getConfig(), false);
  } catch (e) {
    __WEBPACK_IMPORTED_MODULE_1__utils__["logError"]('Exception caught from ID5.init', e);
  }
};

ID5.updateLocalStorageAllowed = function () {
  var cfg = ID5.config.getConfig();
  ID5.localStorageAllowed = ID5.consent.isLocalStorageAllowed(cfg.allowLocalStorageWithoutConsentApi, cfg.debugBypassConsent);
};

ID5.exposeId = function () {
  if (ID5.initialized !== true) {
    throw new Error('ID5.exposeId() cannot be called before ID5.init()!');
  }

  var cfg = ID5.config.getConfig();

  if (cfg.abTesting.enabled === true) {
    return !Object(__WEBPACK_IMPORTED_MODULE_3_src_abTesting__["a" /* default */])(ID5.userId, cfg.abTesting.controlGroupPct);
  } else {
    return true;
  }
};

ID5.refreshId = function () {
  var forceFetch = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (ID5.initialized !== true) {
    throw new Error('ID5.refreshID() cannot be called before ID5.init()!');
  }

  if (!__WEBPACK_IMPORTED_MODULE_1__utils__["isBoolean"](forceFetch)) {
    throw new Error('Invalid signature for ID5.refreshId: first parameter must be a boolean');
  }

  try {
    __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('Invoking ID5.refreshId', arguments);
    ID5.config.updConfig(options); // consent may have changed, so we need to check it again

    ID5.consent.resetConsentData();
    this.getId(ID5.config.getConfig(), forceFetch);
  } catch (e) {
    __WEBPACK_IMPORTED_MODULE_1__utils__["logError"]('Exception caught from ID5.refreshId', e);
  }
};
/**
 * This function get the user ID for the given config
 * @param {Id5Config} cfg
 * @param {boolean} forceFetch - Force a call to server
 */


ID5.getId = function (cfg) {
  var _this = this;

  var forceFetch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  ID5.callbackFired = false;
  var referer = Object(__WEBPACK_IMPORTED_MODULE_2__refererDetection__["a" /* getRefererInfo */])();
  __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]("ID5 detected referer is ".concat(referer.referer));

  if (!cfg.partnerId || typeof cfg.partnerId !== 'number') {
    throw new Error('partnerId is required and must be a number');
  }

  var storedResponse;
  var storedDateTime;
  var nb = 0;
  var refreshInSecondsHasElapsed = false;
  var pdHasChanged = false;
  ID5.updateLocalStorageAllowed();

  if (ID5.localStorageAllowed) {
    storedResponse = __WEBPACK_IMPORTED_MODULE_4__clientStore__["e" /* getResponse */]();
    storedDateTime = __WEBPACK_IMPORTED_MODULE_4__clientStore__["c" /* getDateTime */]();
    refreshInSecondsHasElapsed = storedDateTime <= 0 || Date.now() - storedDateTime > cfg.refreshInSeconds * 1000;
    nb = __WEBPACK_IMPORTED_MODULE_4__clientStore__["d" /* getNb */](cfg.partnerId);
    pdHasChanged = !__WEBPACK_IMPORTED_MODULE_4__clientStore__["o" /* storedPdMatchesPd */](cfg.partnerId, cfg.pd);
  }

  if (!storedResponse) {
    storedResponse = __WEBPACK_IMPORTED_MODULE_4__clientStore__["f" /* getResponseFromLegacyCookie */]();
    refreshInSecondsHasElapsed = true; // Force a refresh if we have legacy cookie
  } // @FIXME: on a refresh call, we should not reset, as partner may have passed pd on refresh


  ID5.fromCache = false; // Callback watchdogs

  if (__WEBPACK_IMPORTED_MODULE_1__utils__["isFn"](cfg.callback) && cfg.callbackTimeoutInMs >= 0) {
    setTimeout(function () {
      return _this.fireCallBack(cfg);
    }, cfg.callbackTimeoutInMs);
  }

  if (storedResponse && !pdHasChanged) {
    // we have a valid stored response and pd is not different, so
    // use the stored response to make the ID available right away
    if (storedResponse.universal_uid && this.exposeId()) {
      ID5.userId = storedResponse.universal_uid;
      ID5.linkType = storedResponse.link_type || 0;
    } else if (storedResponse.universal_uid) {
      // we're in A/B testing and this is the control group, so do
      // not set a userId or linkType
      ID5.userId = ID5.linkType = 0;
    } else {
      __WEBPACK_IMPORTED_MODULE_1__utils__["logError"]('Invalid stored response: ', JSON.stringify(storedResponse));
    }

    nb = __WEBPACK_IMPORTED_MODULE_4__clientStore__["g" /* incNb */](cfg.partnerId, nb);
    ID5.fromCache = true;

    if (typeof ID5.userId !== 'undefined') {
      this.fireCallBack(cfg);
    }

    __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('ID5 User ID available from cache:', {
      storedResponse: storedResponse,
      storedDateTime: storedDateTime,
      refreshNeeded: refreshInSecondsHasElapsed
    });
  } else if (storedResponse && pdHasChanged) {
    __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('PD value has changed, so ignoring User ID from cache');
  } else {
    __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('No ID5 User ID available from cache');
  }

  ID5.consent.requestConsent(cfg.debugBypassConsent, cfg.cmpApi, cfg.consentData, function (consentData) {
    // re-evaluate local storage access as consent is now available
    ID5.updateLocalStorageAllowed();

    if (ID5.localStorageAllowed !== false) {
      __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('Consent to access local storage is given: ', ID5.localStorageAllowed);
      storedResponse = __WEBPACK_IMPORTED_MODULE_4__clientStore__["e" /* getResponse */]() || __WEBPACK_IMPORTED_MODULE_4__clientStore__["f" /* getResponseFromLegacyCookie */](); // store hashed consent data and pd for future page loads

      var consentHasChanged = !__WEBPACK_IMPORTED_MODULE_4__clientStore__["n" /* storedConsentDataMatchesConsentData */](consentData);
      __WEBPACK_IMPORTED_MODULE_4__clientStore__["h" /* putHashedConsentData */](consentData);
      __WEBPACK_IMPORTED_MODULE_4__clientStore__["i" /* putHashedPd */](cfg.partnerId, cfg.pd); // make a call to fetch a new ID5 ID if:
      // - there is no valid universal_uid or no signature in cache
      // - the last refresh was longer than refreshInSeconds ago
      // - consent has changed since the last ID was fetched
      // - pd has changed since the last ID was fetched
      // - fetch is being forced (e.g. by refreshId())

      if (!storedResponse || !storedResponse.universal_uid || !storedResponse.signature || refreshInSecondsHasElapsed || consentHasChanged || pdHasChanged || forceFetch) {
        var url = "https://id5-sync.com/g/v2/".concat(cfg.partnerId, ".json");
        var gdprApplies = consentData && consentData.gdprApplies ? 1 : 0;
        var gdprConsentString = consentData && consentData.gdprApplies ? consentData.consentString : '';
        var signature = storedResponse && storedResponse.signature ? storedResponse.signature : '';
        var data = {
          'partner': cfg.partnerId,
          'v': ID5.version,
          'o': 'api',
          'gdpr': gdprApplies,
          'gdpr_consent': gdprConsentString,
          'rf': referer.referer,
          'u': referer.stack[0] || window.location.href,
          'top': referer.reachedTop ? 1 : 0,
          's': signature,
          'pd': cfg.pd,
          'nbPage': nb,
          'id5cdn': document.currentScript && document.currentScript.src && document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0
        };

        if (cfg.tpids && __WEBPACK_IMPORTED_MODULE_1__utils__["isArray"](cfg.tpids) && cfg.tpids.length > 0) {
          data.tpids = cfg.tpids;
        }

        __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('Fetching ID5 user ID from:', url, data);

        if (forceFetch) {
          __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('...with Force Fetch');
        }

        __WEBPACK_IMPORTED_MODULE_1__utils__["ajax"](url, {
          success: function success(response) {
            var responseObj;

            if (response) {
              try {
                responseObj = JSON.parse(response);
                __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('Response from ID5 received:', responseObj);

                if (responseObj.universal_uid) {
                  if (_this.exposeId()) {
                    ID5.userId = responseObj.universal_uid;
                    ID5.linkType = responseObj.link_type || 0;
                  } else {
                    // we're in A/B testing and this is the control group, so do
                    // not set a userId or linkType
                    ID5.userId = ID5.linkType = 0;
                  } // privacy has to be stored first so we can use it when storing other values


                  ID5.consent.setStoredPrivacy(responseObj.privacy); // re-evaluate local storage access as geo is now available

                  ID5.updateLocalStorageAllowed(); // @TODO: typeof responseObj.privacy === 'undefined' is only needed until fetch endpoint is updated and always returns a privacy object
                  // once it does, I don't see a reason to keep that part of the if clause

                  if (ID5.localStorageAllowed === true || typeof responseObj.privacy === 'undefined') {
                    __WEBPACK_IMPORTED_MODULE_4__clientStore__["j" /* putResponse */](response);
                    __WEBPACK_IMPORTED_MODULE_4__clientStore__["l" /* setDateTime */](Date.now());
                    __WEBPACK_IMPORTED_MODULE_4__clientStore__["m" /* setNb */](cfg.partnerId, ID5.fromCache ? 0 : 1);
                  } else {
                    __WEBPACK_IMPORTED_MODULE_4__clientStore__["a" /* clearAll */](cfg.partnerId);
                  } // TEMPORARY until all clients have upgraded past v1.0.0
                  // remove cookies that were previously set


                  __WEBPACK_IMPORTED_MODULE_4__clientStore__["k" /* removeLegacyCookies */](cfg.partnerId); // this must come after storing Nb or it will store the wrong value

                  ID5.fromCache = false;

                  if (responseObj.cascade_needed === true && ID5.localStorageAllowed === true) {
                    var isSync = cfg.partnerUserId && cfg.partnerUserId.length > 0;
                    var syncUrl = "https://id5-sync.com/".concat(isSync ? 's' : 'i', "/").concat(cfg.partnerId, "/8.gif?id5id=").concat(ID5.userId, "&fs=").concat(__WEBPACK_IMPORTED_MODULE_4__clientStore__["b" /* forceSync */](), "&o=api&").concat(isSync ? 'puid=' + cfg.partnerUserId + '&' : '', "gdpr_consent=").concat(gdprConsentString, "&gdpr=").concat(gdprApplies);
                    __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('Opportunities to cascade available:', syncUrl);
                    __WEBPACK_IMPORTED_MODULE_1__utils__["deferPixelFire"](syncUrl, undefined, __WEBPACK_IMPORTED_MODULE_4__clientStore__["p" /* syncCallback */]);
                  }

                  _this.fireCallBack(cfg);
                } else {
                  __WEBPACK_IMPORTED_MODULE_1__utils__["logError"]('Invalid response from ID5 servers:', response);
                }
              } catch (error) {
                __WEBPACK_IMPORTED_MODULE_1__utils__["logError"](error);
              }
            } else {
              __WEBPACK_IMPORTED_MODULE_1__utils__["logError"]('Empty response from ID5 servers:', response);
            }
          },
          error: function error(_error) {
            __WEBPACK_IMPORTED_MODULE_1__utils__["logError"](_error);
          }
        }, JSON.stringify(data), {
          method: 'POST',
          withCredentials: true
        });
      }
    } else {
      __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('No legal basis to use ID5', consentData);
    }
  });
};
/**
 * This function fire the callback of the provided config
 * @param {Id5Config} options
 */


ID5.fireCallBack = function (options) {
  if (!this.callbackFired && __WEBPACK_IMPORTED_MODULE_1__utils__["isFn"](options.callback)) {
    __WEBPACK_IMPORTED_MODULE_1__utils__["logInfo"]('Scheduling callback');
    setTimeout(function () {
      return options.callback(ID5);
    }, 0);
    ID5.callbackFired = true;
  }
};

/* harmony default export */ __webpack_exports__["default"] = (ID5);

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = {"STORAGE_CONFIG":{"ID5":{"name":"id5id","expiresDays":90},"LAST":{"name":"id5id_last","expiresDays":90},"CONSENT_DATA":{"name":"id5id_cached_consent_data","expiresDays":30},"PD":{"name":"id5id_cached_pd","expiresDays":30},"FS":{"name":"id5id_fs","expiresDays":7},"PRIVACY":{"name":"id5id_privacy","expiresDays":30}},"LEGACY_COOKIE_NAMES":["id5.1st","id5id.1st"],"PRIVACY":{"JURISDICTIONS":{"gdpr":true,"ccpa":false,"lgpd":true,"other":false}}}

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export Config */
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Module for getting and setting ID5 API configuration.
 */
var utils = __webpack_require__(0);
/**
 * @typedef {Object} Id5Config
 * @property {number} [partnerId] - ID5 Publisher ID, mandatory
 * @property {boolean|false} [debug] - enable verbose debug mode (defaulting to id5_debug query string param if present, or false)
 * @property {boolean|false} [debugBypassConsent] - Bypass consent API et local storage consent for testing purpose only
 * @property {boolean|false} [allowLocalStorageWithoutConsentApi] - Tell ID5 that consent has been given to read local storage
 * => and allowLocalStorageWithoutConsent (if enabled, then for everyone in the page), platform should not set
 * @property {number} [refreshInSeconds] - Refresh period of first-party cookie (defaulting to 7200s)
 * => Keep the lowest until now, platform should not set
 * @property {string} [partnerUserId] - User ID for the platform deploying the API, to be stored by ID5 for further cookie matching if provided
 * => per partner /!\ do sync even if no fetch
 * @property {string} [cmpApi] - API to use CMP. As of today, either 'iab' or 'static'
 * => use cached consentData, supposed to be one per page
 * @property {object} [consentData] - Consent data if cmpApi is 'static'
 * @property {function} [callback] - Function to call back when User ID is available. if callbackTimeoutInMs is not provided, will be fired only if a User ID is available.
 * => Documentation => use the provided parameter and not ID5.xxxxx
 * => setting for multiple callback ?
 * @property {number} [callbackTimeoutInMs] - Delay in ms after which the callback is guaranteed to be fired. A User ID may not yet be available at this time.
 * @property {string} [pd] - Publisher data that can be passed to help with cross-domain reconciliation of the ID5 ID, more details here: https://wiki.id5.io/x/BIAZ
 * @property {array} [tpids] - An array of third party IDs that can be passed to usersync with ID5. Contact your ID5 representative to enable this
 * @property {AbTestConfig} [abTesting] - An object defining if and how A/B testing should be enabled
 * => per partner
 *
 * => multiple instance with same partner and different PD ?
 * => multiple callback
 *
 * myID5 = ID5.init(*config);
 * myID5.refresh(consent, pd, callback, callbackTimeoutInMs);
 */

/**
 * @typedef {Object} AbTestConfig
 * @property {boolean|false} [enabled] - Enable control group
 * @property {number} [controlGroupPct] - Ratio of users in control group [0,1]
 */


var Config = /*#__PURE__*/function () {
  /** @type {Id5Config} */

  /** @type {Id5Config} */

  /**
   * Create configuration instance from an object containing key-value pairs
   * @param {Id5Config} options
   */
  function Config(options) {
    _classCallCheck(this, Config);

    _defineProperty(this, "config", void 0);

    _defineProperty(this, "providedConfig", void 0);

    this.config = {
      debug: utils.getParameterByName('id5_debug').toUpperCase() === 'TRUE',
      debugBypassConsent: false,
      allowLocalStorageWithoutConsentApi: false,
      cmpApi: 'iab',
      consentData: {
        getConsentData: {
          consentData: undefined,
          gdprApplies: undefined
        },
        getVendorConsents: {}
      },
      refreshInSeconds: 7200,
      partnerId: undefined,
      partnerUserId: undefined,
      callback: undefined,
      callbackTimeoutInMs: undefined,
      pd: '',
      tpids: undefined,
      abTesting: {
        enabled: false,
        controlGroupPct: 0
      }
    };
    this.providedConfig = {};
    this.updConfig(options);
  }
  /**
   * Return current configuration
   * @returns {Id5Config} options
   */


  _createClass(Config, [{
    key: "getConfig",
    value: function getConfig() {
      return this.config;
    }
    /**
     * Return configuration set by user
     * @returns {Id5Config} options
     */

  }, {
    key: "getProvidedConfig",
    value: function getProvidedConfig() {
      return this.providedConfig;
    }
    /**
     * Override the configuration with an object containing key-value pairs
     * @param {Id5Config} options
     */

  }, {
    key: "updConfig",
    value: function updConfig(options) {
      var _this = this;

      if (_typeof(options) !== 'object') {
        utils.logError('Config options must be an object');
      }

      Object.keys(options).forEach(function (topic) {
        if (utils.isA(options[topic], Config.configTypes[topic])) {
          _this.config[topic] = options[topic];
          _this.providedConfig[topic] = options[topic];
        } else {
          utils.logError("setConfig options ".concat(topic, " must be of type ").concat(Config.configTypes[topic], " but was ").concat(toString.call(options[topic])));
        }
      });
    }
  }]);

  return Config;
}();

_defineProperty(Config, "configTypes", {
  debug: 'Boolean',
  debugBypassConsent: 'Boolean',
  allowLocalStorageWithoutConsentApi: 'Boolean',
  cmpApi: 'String',
  consentData: 'Object',
  refreshInSeconds: 'Number',
  partnerId: 'Number',
  partnerUserId: 'String',
  callback: 'Function',
  callbackTimeoutInMs: 'Number',
  pd: 'String',
  tpids: 'Array',
  abTesting: 'Object'
});

/* harmony default export */ __webpack_exports__["a"] = (Config);

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export detectReferer */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getRefererInfo; });
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/**
 * The referer detection module attempts to gather referer information from the current page that id5-api.js resides in.
 * The information that it tries to collect includes:
 * The detected top url in the nav bar,
 * Whether it was able to reach the top most window (if for example it was embedded in several iframes),
 * The number of iframes it was embedded in if applicable,
 * A list of the domains of each embedded window if applicable.
 * Canonical URL which refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
 */
function detectReferer(win) {
  /**
   * Returns number of frames to reach top from current frame
   * @returns {Array} levels
   */
  function getLevels() {
    var levels = walkUpWindows();
    var ancestors = getAncestorOrigins();

    if (ancestors) {
      for (var i = 0, l = ancestors.length; i < l; i++) {
        levels[i].ancestor = ancestors[i];
      }
    }

    return levels;
  }
  /**
   * This function would return a read-only array of hostnames for all the parent frames.
   * win.location.ancestorOrigins is only supported in webkit browsers. For non-webkit browsers it will return undefined.
   * @returns {(undefined|Array)} Ancestor origins or undefined
   */


  function getAncestorOrigins() {
    try {
      if (!win.location.ancestorOrigins) {
        return;
      }

      return win.location.ancestorOrigins;
    } catch (e) {// Ignore error
    }
  }
  /**
   * This function would try to get referer and urls for all parent frames in case of win.location.ancestorOrigins undefined.
   * @param {Array} levels
   * @returns {Object} urls for all parent frames and top most detected referer url
   */


  function getPubUrlStack(levels) {
    var stack = [];
    var defUrl = null;
    var frameLocation = null;
    var prevFrame = null;
    var prevRef = null;
    var ancestor = null;
    var detectedRefererUrl = null;
    var i;

    for (i = levels.length - 1; i >= 0; i--) {
      try {
        frameLocation = levels[i].location;
      } catch (e) {// Ignore error
      }

      if (frameLocation) {
        stack.push(frameLocation);

        if (!detectedRefererUrl) {
          detectedRefererUrl = frameLocation;
        }
      } else if (i !== 0) {
        prevFrame = levels[i - 1];

        try {
          prevRef = prevFrame.referrer;
          ancestor = prevFrame.ancestor;
        } catch (e) {// Ignore error
        }

        if (prevRef) {
          stack.push(prevRef);

          if (!detectedRefererUrl) {
            detectedRefererUrl = prevRef;
          }
        } else if (ancestor) {
          stack.push(ancestor);

          if (!detectedRefererUrl) {
            detectedRefererUrl = ancestor;
          }
        } else {
          stack.push(defUrl);
        }
      } else {
        stack.push(defUrl);
      }
    }

    return {
      stack: stack,
      detectedRefererUrl: detectedRefererUrl
    };
  }
  /**
   * This function returns canonical URL which refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
   * @param {Object} doc document
   */


  function getCanonicalUrl(doc) {
    try {
      var element = doc.querySelector("link[rel='canonical']");

      if (element !== null) {
        return element.href;
      }
    } catch (e) {}

    return null;
  }
  /**
   * Walk up to the top of the window to detect origin, number of iframes, ancestor origins and canonical url
   */


  function walkUpWindows() {
    var acc = [];
    var currentWindow;

    do {
      try {
        currentWindow = currentWindow ? currentWindow.parent : win;

        try {
          var isTop = currentWindow === win.top;
          var refData = {
            referrer: currentWindow.document.referrer || null,
            location: currentWindow.location.href || null,
            isTop: isTop
          };

          if (isTop) {
            refData = _extends(refData, {
              canonicalUrl: getCanonicalUrl(currentWindow.document)
            });
          }

          acc.push(refData);
        } catch (e) {
          acc.push({
            referrer: null,
            location: null,
            isTop: currentWindow === win.top
          });
        }
      } catch (e) {
        acc.push({
          referrer: null,
          location: null,
          isTop: false
        });
        return acc;
      }
    } while (currentWindow !== win.top);

    return acc;
  }
  /**
   * Referer info
   * @typedef {Object} refererInfo
   * @property {string} referer detected top url
   * @property {boolean} reachedTop whether it was possible to walk upto top window or not
   * @property {number} numIframes number of iframes
   * @property {string} stack comma separated urls of all origins
   * @property {string} canonicalUrl canonical URL refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
   */

  /**
   * Get referer info
   * @returns {refererInfo}
   */


  function refererInfo() {
    try {
      var levels = getLevels();
      var numIframes = levels.length - 1;
      var reachedTop = levels[numIframes].location !== null || numIframes > 0 && levels[numIframes - 1].referrer !== null;
      var stackInfo = getPubUrlStack(levels);
      var canonicalUrl;

      if (levels[levels.length - 1].canonicalUrl) {
        canonicalUrl = levels[levels.length - 1].canonicalUrl;
      }

      return {
        referer: stackInfo.detectedRefererUrl,
        reachedTop: reachedTop,
        numIframes: numIframes,
        stack: stackInfo.stack,
        canonicalUrl: canonicalUrl
      };
    } catch (e) {// Ignore error
    }
  }

  return refererInfo;
}
var getRefererInfo = detectReferer(window);

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export isInControlGroup */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(0);
/*
 * Module for managing A/B Testing
 */

var ABTEST_RESOLUTION = 10000;
/**
 * Return a consistant random number between 0 and ABTEST_RESOLUTION-1 for this user
 * Falls back to plain random if no user provided
 * @param {string} [userId]
 * @returns {number}
 */

function abTestBucket(userId) {
  if (userId) {
    return (Object(__WEBPACK_IMPORTED_MODULE_0__utils__["cyrb53Hash"])(userId) % ABTEST_RESOLUTION + ABTEST_RESOLUTION) % ABTEST_RESOLUTION;
  } else {
    return Math.floor(Math.random() * ABTEST_RESOLUTION);
  }
}
/**
 * Return a consistant boolean if this user is within the control group ratio provided
 * @param {string} [userId]
 * @param {number} controlGroupRatio - Ratio [0,1] of users expected to be in the control group
 * @returns {boolean}
 */


function isInControlGroup(userId, controlGroupRatio) {
  if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils__["isNumber"])(controlGroupRatio) || controlGroupRatio < 0 || controlGroupRatio > 1) {
    throw new Error('A/B Testing controlGroupRatio must be a number >= 0 and <= 1');
  }

  return abTestBucket(userId) < controlGroupRatio * ABTEST_RESOLUTION;
}
/* harmony default export */ __webpack_exports__["a"] = (isInControlGroup);

/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["f"] = getResponseFromLegacyCookie;
/* harmony export (immutable) */ __webpack_exports__["e"] = getResponse;
/* unused harmony export clearResponse */
/* harmony export (immutable) */ __webpack_exports__["j"] = putResponse;
/* unused harmony export clearHashedConsentData */
/* harmony export (immutable) */ __webpack_exports__["h"] = putHashedConsentData;
/* harmony export (immutable) */ __webpack_exports__["o"] = storedPdMatchesPd;
/* unused harmony export clearHashedPd */
/* harmony export (immutable) */ __webpack_exports__["i"] = putHashedPd;
/* harmony export (immutable) */ __webpack_exports__["c"] = getDateTime;
/* unused harmony export clearDateTime */
/* harmony export (immutable) */ __webpack_exports__["l"] = setDateTime;
/* harmony export (immutable) */ __webpack_exports__["d"] = getNb;
/* harmony export (immutable) */ __webpack_exports__["m"] = setNb;
/* harmony export (immutable) */ __webpack_exports__["g"] = incNb;
/* harmony export (immutable) */ __webpack_exports__["p"] = syncCallback;
/* harmony export (immutable) */ __webpack_exports__["b"] = forceSync;
/* harmony export (immutable) */ __webpack_exports__["a"] = clearAll;
/* harmony export (immutable) */ __webpack_exports__["k"] = removeLegacyCookies;
/* harmony export (immutable) */ __webpack_exports__["n"] = storedConsentDataMatchesConsentData;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__constants_json__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__id5_api__ = __webpack_require__(1);
/*
 * Module for managing storage of information in browser Local Storage and/or cookies
 */



/**
 * Get stored data from local storage, if any, after checking if local storage is allowed
 * @param {StoreItem} cacheConfig
 * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no consent or no access to localStorage
 */

function get(cacheConfig) {
  try {
    if (__WEBPACK_IMPORTED_MODULE_2__id5_api__["default"].localStorageAllowed === true) {
      return __WEBPACK_IMPORTED_MODULE_0__utils__["getFromLocalStorage"](cacheConfig);
    } else {
      __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]('clientStore.get() has been called without localStorageAllowed');
    }
  } catch (e) {
    __WEBPACK_IMPORTED_MODULE_0__utils__["logError"](e);
  }
}
/**
 * clear stored data from local storage, if any
 * @param {StoreItem} cacheConfig
 */


function clear(cacheConfig) {
  try {
    __WEBPACK_IMPORTED_MODULE_0__utils__["removeFromLocalStorage"](cacheConfig);
  } catch (e) {
    __WEBPACK_IMPORTED_MODULE_0__utils__["logError"](e);
  }
}
/**
 * puts the current data into local storage, after checking for local storage access
 * @param {StoreItem} cacheConfig
 * @param {string} data
 */


function put(cacheConfig, data) {
  try {
    if (__WEBPACK_IMPORTED_MODULE_2__id5_api__["default"].localStorageAllowed === true) {
      __WEBPACK_IMPORTED_MODULE_0__utils__["setInLocalStorage"](cacheConfig, data);
    } else {
      __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]('clientStore.get() has been called without localStorageAllowed');
    }
  } catch (e) {
    __WEBPACK_IMPORTED_MODULE_0__utils__["logError"](e);
  }
}

function getResponseFromLegacyCookie() {
  var legacyStoredValue;
  __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
    if (__WEBPACK_IMPORTED_MODULE_0__utils__["getCookie"](cookie)) {
      legacyStoredValue = __WEBPACK_IMPORTED_MODULE_0__utils__["getCookie"](cookie);
    }
  });

  if (legacyStoredValue) {
    return JSON.parse(legacyStoredValue);
  } else {
    return null;
  }
}
function getResponse() {
  var storedValue = get(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5);

  if (storedValue) {
    return JSON.parse(storedValue);
  } else {
    return storedValue;
  }
}
function clearResponse() {
  clear(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5);
}
function putResponse(response) {
  put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5, response);
}

function getHashedConsentData() {
  return get(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.CONSENT_DATA);
}

function clearHashedConsentData() {
  clear(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.CONSENT_DATA);
}
function putHashedConsentData(consentData) {
  put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.CONSENT_DATA, makeStoredConsentDataHash(consentData));
}
/**
 * Get current hash PD for this partner
 * @param {number} partnerId
 */

function getHashedPd(partnerId) {
  return get(pdCacheConfig(partnerId));
}
/**
 * Check current hash PD for this partner against the one in cache
 * @param {number} partnerId
 * @param {string} pd
 */


function storedPdMatchesPd(partnerId, pd) {
  return storedDataMatchesCurrentData(getHashedPd(partnerId), makeStoredPdHash(pd));
}
/**
 * Clear the hash PD for this partner
 * @param {number} partnerId
 */

function clearHashedPd(partnerId) {
  clear(pdCacheConfig(partnerId));
}
/**
 * Hash and store the PD for this partner
 * @param {number} partnerId
 * @param {string} [pd]
 */

function putHashedPd(partnerId, pd) {
  put(pdCacheConfig(partnerId), makeStoredPdHash(pd));
}
/**
 * Generate local storage config for PD of a given partner
 * @param {number} partnerId
 * @return {StoreItem}
 */

function pdCacheConfig(partnerId) {
  return {
    name: "".concat(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.PD.name, "_").concat(partnerId),
    expiresDays: __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.PD.expiresDays
  };
}
/**
 * creates a hash of pd for storage
 * @param {string} pd
 * @returns {string}
 */


function makeStoredPdHash(pd) {
  return __WEBPACK_IMPORTED_MODULE_0__utils__["cyrb53Hash"](typeof pd === 'string' ? pd : '');
}

function getDateTime() {
  return new Date(+get(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.LAST)).getTime();
}
function clearDateTime() {
  clear(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.LAST);
}
function setDateTime(timestamp) {
  put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.LAST, timestamp);
}

function nbCacheConfig(partnerId) {
  return {
    name: "".concat(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5.name, "_").concat(partnerId, "_nb"),
    expiresDays: __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5.expiresDays
  };
}

function getNb(partnerId) {
  var cachedNb = get(nbCacheConfig(partnerId));
  return cachedNb ? parseInt(cachedNb) : 0;
}

function clearNb(partnerId) {
  clear(nbCacheConfig(partnerId));
}

function setNb(partnerId, nb) {
  put(nbCacheConfig(partnerId), nb);
}
function incNb(partnerId, nb) {
  nb++;
  setNb(partnerId, nb);
  return nb;
}
function syncCallback() {
  put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.FS, '1');
}
function forceSync() {
  var cachedFs = get(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.FS); // Force cascade if we have access to Local Storage and we never cascaded

  return typeof cachedFs === 'undefined' || cachedFs === '1' ? 0 : 1;
}
function clearAll(partnerId) {
  clearResponse();
  clearDateTime();
  clearNb(partnerId);
  clearHashedPd(partnerId);
  clearHashedConsentData();
}
function removeLegacyCookies(partnerId) {
  var expired = new Date(Date.now() - 1000).toUTCString();
  __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
    __WEBPACK_IMPORTED_MODULE_0__utils__["setCookie"]("".concat(cookie), '', expired);
    __WEBPACK_IMPORTED_MODULE_0__utils__["setCookie"]("".concat(cookie, "_nb"), '', expired);
    __WEBPACK_IMPORTED_MODULE_0__utils__["setCookie"]("".concat(cookie, "_").concat(partnerId, "_nb"), '', expired);
    __WEBPACK_IMPORTED_MODULE_0__utils__["setCookie"]("".concat(cookie, "_last"), '', expired);
    __WEBPACK_IMPORTED_MODULE_0__utils__["setCookie"]("".concat(cookie, ".cached_pd"), '', expired);
    __WEBPACK_IMPORTED_MODULE_0__utils__["setCookie"]("".concat(cookie, ".cached_consent_data"), '', expired);
  });
}
/**
 * test if the data stored locally matches the current data.
 * if there is nothing in storage, return true and we'll do an actual comparison next time.
 * this way, we don't force a refresh for every user when this code rolls out
 * @param storedData
 * @param currentData
 * @returns {boolean}
 */

function storedDataMatchesCurrentData(storedData, currentData) {
  return typeof storedData === 'undefined' || storedData === null || storedData === currentData;
}

function storedConsentDataMatchesConsentData(consentData) {
  return storedDataMatchesCurrentData(getHashedConsentData(), makeStoredConsentDataHash(consentData));
}
/**
 * makes an object that can be stored with only the keys we need to check.
 * excluding the vendorConsents object since the consentString is enough to know
 * if consent has changed without needing to have all the details in an object
 * @param consentData
 * @returns string
 */

function makeStoredConsentDataHash(consentData) {
  var storedConsentData = {
    consentString: '',
    gdprApplies: false,
    apiVersion: 0
  };

  if (consentData) {
    storedConsentData.consentString = consentData.consentString;
    storedConsentData.gdprApplies = consentData.gdprApplies;
    storedConsentData.apiVersion = consentData.apiVersion;
  }

  return __WEBPACK_IMPORTED_MODULE_0__utils__["cyrb53Hash"](JSON.stringify(storedConsentData));
}

/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ConsentManagement; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_src_constants_json__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_src_constants_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_src_constants_json__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var ConsentManagement = /*#__PURE__*/function () {
  function ConsentManagement() {
    _classCallCheck(this, ConsentManagement);

    _defineProperty(this, "consentData", void 0);

    _defineProperty(this, "staticConsentData", void 0);

    _defineProperty(this, "storedPrivacyData", void 0);

    _defineProperty(this, "cmpVersion", 0);

    _defineProperty(this, "cmpCallMap", {
      'iab': this.lookupIabConsent,
      'static': this.lookupStaticConsentData
    });
  }

  _createClass(ConsentManagement, [{
    key: "lookupStaticConsentData",

    /**
     * This function reads the consent string from the config to obtain the consent information of the user.
     * @param {function(ConsentManagement, string, function(object))} cmpSuccess acts as a success callback when the value is read from config; pass along consentObject (string) from CMP
     * @param {function(object)} finalCallback acts as an error callback while interacting with the config string; pass along an error message (string)
     */
    value: function lookupStaticConsentData(cmpSuccess, finalCallback) {
      this.cmpVersion = this.staticConsentData.getConsentData ? 1 : this.staticConsentData.getTCData ? 2 : 0; // remove extra layer in static v2 data object so it matches normal v2 CMP object for processing step

      if (this.cmpVersion === 2) {
        cmpSuccess(this, this.staticConsentData.getTCData, finalCallback);
      } else {
        cmpSuccess(this, this.staticConsentData, finalCallback);
      }
    }
    /**
     * @typedef {Object} CMPDetails
     * @property {number} cmpVersion - Version of CMP Found, 0 if not found
     * @property {function} [cmpFrame] -
     * @property {function} [cmpFunction] -
     *
     * This function tries to find the CMP in page.
     * @return {CMPDetails}
     */

  }, {
    key: "lookupIabConsent",

    /**
     * This function handles async interacting with an IAB compliant CMP to obtain the consent information of the user.
     * @param {function(ConsentManagement, string, function(object))} cmpSuccess acts as a success callback when CMP returns a value; pass along consentObject (string) from CMP
     * @param {function(object)} finalCallback required;
     */
    value: function lookupIabConsent(cmpSuccess, finalCallback) {
      var consentThis = this;

      function v2CmpResponseCallback(tcfData, success) {
        __WEBPACK_IMPORTED_MODULE_0__utils__["logInfo"]('Received a response from CMP', tcfData);

        if (success) {
          if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
            cmpSuccess(consentThis, tcfData, finalCallback);
          }
        } else {
          __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("CMP unable to register callback function.  Please check CMP setup.");
          cmpSuccess(consentThis, undefined, finalCallback); // TODO cmpError('CMP unable to register callback function.  Please check CMP setup.', hookConfig);
        }
      }

      function handleV1CmpResponseCallbacks() {
        var cmpResponse = {};

        function afterEach() {
          if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
            cmpSuccess(consentThis, cmpResponse, finalCallback);
          }
        }

        return {
          consentDataCallback: function consentDataCallback(consentResponse) {
            __WEBPACK_IMPORTED_MODULE_0__utils__["logInfo"]("cmpApi: consentDataCallback");
            cmpResponse.getConsentData = consentResponse;
            afterEach();
          },
          vendorConsentsCallback: function vendorConsentsCallback(consentResponse) {
            __WEBPACK_IMPORTED_MODULE_0__utils__["logInfo"]("cmpApi: vendorConsentsCallback");
            cmpResponse.getVendorConsents = consentResponse;
            afterEach();
          }
        };
      }

      var v1CallbackHandler = handleV1CmpResponseCallbacks();

      var _ConsentManagement$fi = ConsentManagement.findCMP(),
          cmpVersion = _ConsentManagement$fi.cmpVersion,
          cmpFrame = _ConsentManagement$fi.cmpFrame,
          cmpFunction = _ConsentManagement$fi.cmpFunction;

      this.cmpVersion = cmpVersion;

      if (!cmpFrame) {
        // TODO implement cmpError
        // return cmpError('CMP not found.', hookConfig);
        __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("CMP not found");
        cmpSuccess(consentThis, undefined, finalCallback);
        return;
      }

      if (__WEBPACK_IMPORTED_MODULE_0__utils__["isFn"](cmpFunction)) {
        __WEBPACK_IMPORTED_MODULE_0__utils__["logInfo"]("cmpApi: calling getConsentData & getVendorConsents");

        if (cmpVersion === 1) {
          cmpFunction('getConsentData', null, v1CallbackHandler.consentDataCallback);
          cmpFunction('getVendorConsents', null, v1CallbackHandler.vendorConsentsCallback);
        } else if (cmpVersion === 2) {
          cmpFunction('addEventListener', cmpVersion, v2CmpResponseCallback);
        }
      } else {
        cmpSuccess(consentThis, undefined, finalCallback);
      }
    }
    /**
     * Try to fetch consent from CMP
     * @param {boolean} debugBypassConsent
     * @param {string} cmpApi - CMP Api to use
     * @param {object} [providedConsentData] - static consent data provided to ID5 API
     * @param {function(object)} finalCallback required; final callback
     */

  }, {
    key: "requestConsent",
    value: function requestConsent(debugBypassConsent, cmpApi, providedConsentData, finalCallback) {
      if (debugBypassConsent) {
        __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]('ID5 is operating in forced consent mode');
        finalCallback(this.consentData);
      } else if (!this.cmpCallMap[cmpApi]) {
        __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("Unknown consent API: ".concat(cmpApi));
        this.resetConsentData();
        finalCallback(this.consentData);
      } else if (!this.consentData) {
        if (cmpApi === 'static') {
          if (__WEBPACK_IMPORTED_MODULE_0__utils__["isPlainObject"](providedConsentData)) {
            this.staticConsentData = providedConsentData;
          } else {
            __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("cmpApi: 'static' did not specify consentData.");
          }
        }

        this.cmpCallMap[cmpApi].call(this, ConsentManagement.cmpSuccess, finalCallback);
      } else {
        finalCallback(this.consentData);
      }
    }
    /**
     * This function checks the consent data provided by CMP to ensure it's in an expected state.
     * @param {ConsentManagement} consentThis
     * @param {object} consentObject required; object returned by CMP that contains user's consent choices
     * @param {function(object)} finalCallback required; final callback receiving the consent
     */

  }, {
    key: "resetConsentData",

    /**
     * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
     */
    value: function resetConsentData() {
      this.consentData = undefined;
      this.storedPrivacyData = undefined;
    }
    /**
     * Stores CMP data locally in module
     * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
     */

  }, {
    key: "storeConsentData",
    value: function storeConsentData(cmpConsentObject) {
      if (this.cmpVersion === 1) {
        this.consentData = {
          consentString: cmpConsentObject ? cmpConsentObject.getConsentData.consentData : undefined,
          vendorData: cmpConsentObject ? cmpConsentObject.getVendorConsents : undefined,
          gdprApplies: cmpConsentObject ? cmpConsentObject.getConsentData.gdprApplies : undefined,
          apiVersion: 1
        };
      } else if (this.cmpVersion === 2) {
        this.consentData = {
          consentString: cmpConsentObject ? cmpConsentObject.tcString : undefined,
          vendorData: cmpConsentObject || undefined,
          gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : undefined,
          apiVersion: 2
        };
      } else {
        this.consentData = {
          apiVersion: 0
        };
      }
    }
    /**
     * test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
     * @param {boolean} allowLocalStorageWithoutConsentApi
     * @param {boolean} debugBypassConsent
     * @returns {boolean}
     */

  }, {
    key: "isLocalStorageAllowed",
    value: function isLocalStorageAllowed(allowLocalStorageWithoutConsentApi, debugBypassConsent) {
      if (allowLocalStorageWithoutConsentApi === true || debugBypassConsent === true) {
        return true;
      } else if (!this.consentData) {
        // no cmp on page, so check if provisional access is allowed
        return this.isProvisionalLocalStorageAllowed();
      } else if (typeof this.consentData.gdprApplies === 'boolean' && this.consentData.gdprApplies) {
        // gdpr applies
        if (!this.consentData.consentString || this.consentData.apiVersion === 0) {
          return false;
        } else if (this.consentData.apiVersion === 1 && this.consentData.vendorData && this.consentData.vendorData.purposeConsents && this.consentData.vendorData.purposeConsents['1'] === false) {
          return false;
        } else if (this.consentData.apiVersion === 2 && this.consentData.vendorData && this.consentData.vendorData.purpose && this.consentData.vendorData.purpose.consents && this.consentData.vendorData.purpose.consents['1'] === false) {
          return false;
        } else {
          return true;
        }
      } else {
        // we have consent data and it tells us gdpr doesn't apply
        return true;
      }
    }
    /**
     * if there is no CMP on page, consentData will be undefined, so we will check if we had stored
     * privacy data from a previous request to determine if we are allowed to access local storage.
     * if so, we use the previous authorization as a legal basis before calling our servers to confirm.
     * if we do not have any stored privacy data, we will need to call our servers to know if we
     * are in a jurisdiction that requires consent or not before accessing local storage.
     *
     * if there is no stored privacy data or jurisdiction wasn't set, will return undefined so the
     * caller can decide what to do with in that case
     *
     * @return boolean|undefined
     */

  }, {
    key: "isProvisionalLocalStorageAllowed",
    value: function isProvisionalLocalStorageAllowed() {
      if (!__WEBPACK_IMPORTED_MODULE_0__utils__["isPlainObject"](this.storedPrivacyData)) {
        this.storedPrivacyData = JSON.parse(__WEBPACK_IMPORTED_MODULE_0__utils__["getFromLocalStorage"](__WEBPACK_IMPORTED_MODULE_1_src_constants_json___default.a.STORAGE_CONFIG.PRIVACY));
      }

      if (this.storedPrivacyData && this.storedPrivacyData.id5_consent === true) {
        return true;
      } else if (!this.storedPrivacyData || typeof this.storedPrivacyData.jurisdiction === 'undefined') {
        return undefined;
      } else {
        var jurisdictionRequiresConsent = typeof __WEBPACK_IMPORTED_MODULE_1_src_constants_json___default.a.PRIVACY.JURISDICTIONS[this.storedPrivacyData.jurisdiction] !== 'undefined' ? __WEBPACK_IMPORTED_MODULE_1_src_constants_json___default.a.PRIVACY.JURISDICTIONS[this.storedPrivacyData.jurisdiction] : false;
        return jurisdictionRequiresConsent === false || this.storedPrivacyData.id5_consent === true;
      }
    }
  }, {
    key: "setStoredPrivacy",
    value: function setStoredPrivacy(privacy) {
      try {
        if (__WEBPACK_IMPORTED_MODULE_0__utils__["isPlainObject"](privacy)) {
          this.storedPrivacyData = privacy;
          __WEBPACK_IMPORTED_MODULE_0__utils__["setInLocalStorage"](__WEBPACK_IMPORTED_MODULE_1_src_constants_json___default.a.STORAGE_CONFIG.PRIVACY, JSON.stringify(privacy));
        } else {
          __WEBPACK_IMPORTED_MODULE_0__utils__["logInfo"]('Cannot store privacy if it is not an object: ', privacy);
        }
      } catch (e) {
        __WEBPACK_IMPORTED_MODULE_0__utils__["logError"](e);
      }
    }
  }], [{
    key: "findCMP",
    value: function findCMP() {
      var cmpVersion = 0;
      var f = window;
      var cmpFrame;
      var cmpFunction;

      while (!cmpFrame) {
        try {
          if (typeof f.__tcfapi === 'function' || typeof f.__cmp === 'function') {
            if (typeof f.__tcfapi === 'function') {
              cmpVersion = 2;
              cmpFunction = f.__tcfapi;
            } else {
              cmpVersion = 1;
              cmpFunction = f.__cmp;
            }

            cmpFrame = f;
            break;
          }
        } catch (e) {} // need separate try/catch blocks due to the exception errors thrown when trying to check for a frame that doesn't exist in 3rd party env


        try {
          if (f.frames['__tcfapiLocator']) {
            cmpVersion = 2;
            cmpFrame = f;
            break;
          }
        } catch (e) {}

        try {
          if (f.frames['__cmpLocator']) {
            cmpVersion = 1;
            cmpFrame = f;
            break;
          }
        } catch (e) {}

        if (f === window.top) break;
        f = f.parent;
      }

      return {
        cmpVersion: cmpVersion,
        cmpFrame: cmpFrame,
        cmpFunction: cmpFunction
      };
    }
  }, {
    key: "cmpSuccess",
    value: function cmpSuccess(consentThis, consentObject, finalCallback) {
      function checkV1Data(consentObject) {
        var gdprApplies = consentObject && consentObject.getConsentData && consentObject.getConsentData.gdprApplies;
        return !!(typeof gdprApplies !== 'boolean' || gdprApplies === true && !(__WEBPACK_IMPORTED_MODULE_0__utils__["isStr"](consentObject.getConsentData.consentData) && __WEBPACK_IMPORTED_MODULE_0__utils__["isPlainObject"](consentObject.getVendorConsents) && Object.keys(consentObject.getVendorConsents).length > 1));
      }

      function checkV2Data() {
        var gdprApplies = consentObject && typeof consentObject.gdprApplies === 'boolean' ? consentObject.gdprApplies : undefined;
        var tcString = consentObject && consentObject.tcString;
        return !!(typeof gdprApplies !== 'boolean' || gdprApplies === true && !__WEBPACK_IMPORTED_MODULE_0__utils__["isStr"](tcString));
      } // determine which set of checks to run based on cmpVersion


      var checkFn = consentThis.cmpVersion === 1 ? checkV1Data : consentThis.cmpVersion === 2 ? checkV2Data : null;
      __WEBPACK_IMPORTED_MODULE_0__utils__["logInfo"]('CMP Success callback for version', consentThis.cmpVersion, checkFn);

      if (__WEBPACK_IMPORTED_MODULE_0__utils__["isFn"](checkFn)) {
        if (checkFn(consentObject)) {
          consentThis.resetConsentData();
          __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("CMP returned unexpected value during lookup process.", consentObject);
        } else {
          consentThis.storeConsentData(consentObject);
        }
      } else {// TODO: Log unhandled CMP version
      }

      finalCallback(consentThis.consentData);
    }
  }]);

  return ConsentManagement;
}();



/***/ })
/******/ ]);
//# sourceMappingURL=id5-api.js.map
ID5.version='0.9.7-pre';
ID5.versions[ID5.version]=true;
