/**
 * @id5io/id5-api.js
 * @version v1.0.13
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
/******/ 	return __webpack_require__(__webpack_require__.s = 6);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export replaceTokenInString */
/* harmony export (immutable) */ __webpack_exports__["b"] = all;
/* unused harmony export logMessage */
/* harmony export (immutable) */ __webpack_exports__["q"] = logInfo;
/* harmony export (immutable) */ __webpack_exports__["r"] = logWarn;
/* harmony export (immutable) */ __webpack_exports__["p"] = logError;
/* harmony export (immutable) */ __webpack_exports__["t"] = setGlobalDebug;
/* harmony export (immutable) */ __webpack_exports__["l"] = isGlobalDebug;
/* unused harmony export getParameterByName */
/* harmony export (immutable) */ __webpack_exports__["g"] = isA;
/* harmony export (immutable) */ __webpack_exports__["k"] = isFn;
/* harmony export (immutable) */ __webpack_exports__["o"] = isStr;
/* harmony export (immutable) */ __webpack_exports__["h"] = isArray;
/* harmony export (immutable) */ __webpack_exports__["m"] = isNumber;
/* harmony export (immutable) */ __webpack_exports__["n"] = isPlainObject;
/* harmony export (immutable) */ __webpack_exports__["i"] = isBoolean;
/* harmony export (immutable) */ __webpack_exports__["j"] = isDefined;
/* unused harmony export isEmpty */
/* harmony export (immutable) */ __webpack_exports__["f"] = getCookie;
/* harmony export (immutable) */ __webpack_exports__["s"] = setCookie;
/* unused harmony export parseQS */
/* unused harmony export formatQS */
/* unused harmony export parse */
/* unused harmony export format */
/* harmony export (immutable) */ __webpack_exports__["a"] = ajax;
/* unused harmony export fireAsyncPixel */
/* harmony export (immutable) */ __webpack_exports__["d"] = deferPixelFire;
/* harmony export (immutable) */ __webpack_exports__["c"] = cyrb53Hash;
/* harmony export (immutable) */ __webpack_exports__["e"] = delve;
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr && (typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]); if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var tArr = 'Array';
var tStr = 'String';
var tFn = 'Function';
var tNumb = 'Number';
var tObject = 'Object';
var tBoolean = 'Boolean';
var toString = Object.prototype.toString;
var isParamDebug = getParameterByName('id5_debug').toUpperCase() === 'TRUE';
var consoleExists = Boolean(window.console);
var consoleLogExists = Boolean(consoleExists && window.console.log);
var consoleInfoExists = Boolean(consoleExists && window.console.info);
var consoleWarnExists = Boolean(consoleExists && window.console.warn);
var consoleErrorExists = Boolean(consoleExists && window.console.error);
var isDebug = false;
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
function all(array, fn) {
  var result = true;

  _each(array, function (value) {
    return result = result && fn(value);
  });

  return result;
}
/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */

function logMessage() {
  if (isGlobalDebug() && consoleLogExists) {
    console.log.apply(console, decorateLog(arguments, 'MESSAGE:'));
  }
}
function logInfo() {
  if (isGlobalDebug() && consoleInfoExists) {
    console.info.apply(console, decorateLog(arguments, 'INFO:'));
  }
}
function logWarn() {
  if (isGlobalDebug() && consoleWarnExists) {
    console.warn.apply(console, decorateLog(arguments, 'WARNING:'));
  }
}
function logError() {
  if (isGlobalDebug() && consoleErrorExists) {
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

function setGlobalDebug(value) {
  isDebug = !!value;
}
function isGlobalDebug() {
  return isParamDebug || isDebug;
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
function isDefined(object) {
  return typeof object !== 'undefined';
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

function getCookie(name) {
  var m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? decodeURIComponent(m[2]) : null;
}
function setCookie(key, value, expires) {
  document.cookie = "".concat(key, "=").concat(encodeURIComponent(value)).concat(expires !== '' ? "; expires=".concat(expires) : '', "; path=/");
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
/**
 * License for dlv: https://github.com/developit/dlv
 * Copyright (c) 2021 Jason Miller
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function delve(obj, key, def, p, undef) {
  key = key.split ? key.split('.') : key;

  for (p = 0; p < key.length; p++) {
    obj = obj ? obj[key[p]] : undef;
  }

  return obj === undef ? def : obj;
}

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = {"STORAGE_CONFIG":{"ID5":{"name":"id5id","expiresDays":90},"LAST":{"name":"id5id_last","expiresDays":90},"CONSENT_DATA":{"name":"id5id_cached_consent_data","expiresDays":30},"PD":{"name":"id5id_cached_pd","expiresDays":30},"PRIVACY":{"name":"id5id_privacy","expiresDays":30}},"LEGACY_COOKIE_NAMES":["id5.1st","id5id.1st"],"PRIVACY":{"JURISDICTIONS":{"gdpr":true,"ccpa":false,"lgpd":true,"other":false}},"ID5_EIDS_SOURCE":"id5-sync.com"}

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ClientStore; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__constants_json__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Module for managing storage of information in browser Local Storage and/or cookies
 */



var ClientStore = /*#__PURE__*/function () {
  /** @type {function} */

  /** @type {LocalStorage} */

  /**
   * @param {function} localStorageAllowedCallback
   * @param {LocalStorage} localStorage the localStorage abstraction object to use
   */
  function ClientStore(localStorageAllowedCallback, localStorage) {
    _classCallCheck(this, ClientStore);

    _defineProperty(this, "localStorageAllowedCallback", void 0);

    _defineProperty(this, "localStorage", void 0);

    this.localStorageAllowedCallback = localStorageAllowedCallback;
    this.localStorage = localStorage;
  }
  /**
   * Get stored data from local storage, if any, after checking if local storage is allowed
   * @param {StoreItem} cacheConfig
   * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no consent or no access to localStorage
   */


  _createClass(ClientStore, [{
    key: "get",
    value: function get(cacheConfig) {
      try {
        if (this.localStorageAllowedCallback() === true) {
          return this.localStorage.getItemWithExpiration(cacheConfig);
        } else {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('clientStore.get() has been called without localStorageAllowed');
        }
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])(e);
      }
    }
    /**
     * clear stored data from local storage, if any
     * @param {StoreItem} cacheConfig
     */

  }, {
    key: "clear",
    value: function clear(cacheConfig) {
      try {
        this.localStorage.removeItemWithExpiration(cacheConfig);
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])(e);
      }
    }
    /**
     * puts the current data into local storage, after checking for local storage access
     * @param {StoreItem} cacheConfig
     * @param {string} data
     */

  }, {
    key: "put",
    value: function put(cacheConfig, data) {
      try {
        if (this.localStorageAllowedCallback() === true) {
          this.localStorage.setItemWithExpiration(cacheConfig, data);
        } else {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('clientStore.put() has been called without localStorageAllowed');
        }
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])(e);
      }
    }
    /**
     * @returns {boolean|undefined} see {ConsentManagement.isLocalStorageAllowed()}
     */

  }, {
    key: "localStorageAllowed",
    value: function localStorageAllowed() {
      return this.localStorageAllowedCallback();
    }
    /**
     * @returns {boolean} true if localStorage is available
     */

  }, {
    key: "isLocalStorageAvailable",
    value: function isLocalStorageAvailable() {
      return this.localStorage.isAvailable();
    }
  }, {
    key: "getResponseFromLegacyCookie",
    value: function getResponseFromLegacyCookie() {
      var legacyStoredValue;
      __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
        if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["f" /* getCookie */])(cookie)) {
          legacyStoredValue = Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["f" /* getCookie */])(cookie);
        }
      });

      if (legacyStoredValue) {
        return JSON.parse(legacyStoredValue);
      } else {
        return null;
      }
    }
  }, {
    key: "getResponse",
    value: function getResponse() {
      var storedValue = this.get(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5);

      if (storedValue) {
        return JSON.parse(decodeURIComponent(storedValue));
      } else {
        return storedValue;
      }
    }
  }, {
    key: "clearResponse",
    value: function clearResponse() {
      this.clear(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5);
    }
  }, {
    key: "putResponse",
    value: function putResponse(response) {
      this.put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5, encodeURIComponent(response));
    }
  }, {
    key: "getHashedConsentData",
    value: function getHashedConsentData() {
      return this.get(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.CONSENT_DATA);
    }
  }, {
    key: "clearHashedConsentData",
    value: function clearHashedConsentData() {
      this.clear(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.CONSENT_DATA);
    }
    /**
     * Stores a hash of the consent data for alter comparison
     * @param {ConsentData} consentData
     */

  }, {
    key: "putHashedConsentData",
    value: function putHashedConsentData(consentData) {
      this.put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.CONSENT_DATA, consentData.hashCode());
    }
    /**
     * Get current hash PD for this partner
     * @param {number} partnerId
     */

  }, {
    key: "getHashedPd",
    value: function getHashedPd(partnerId) {
      return this.get(ClientStore.pdCacheConfig(partnerId));
    }
    /**
     * Check current hash PD for this partner against the one in cache
     * @param {number} partnerId
     * @param {string} pd
     */

  }, {
    key: "storedPdMatchesPd",
    value: function storedPdMatchesPd(partnerId, pd) {
      return ClientStore.storedDataMatchesCurrentData(this.getHashedPd(partnerId), ClientStore.makeStoredHash(pd));
    }
    /**
     * Clear the hash PD for this partner
     * @param {number} partnerId
     */

  }, {
    key: "clearHashedPd",
    value: function clearHashedPd(partnerId) {
      this.clear(ClientStore.pdCacheConfig(partnerId));
    }
    /**
     * Hash and store the PD for this partner
     * @param {number} partnerId
     * @param {string} [pd]
     */

  }, {
    key: "putHashedPd",
    value: function putHashedPd(partnerId, pd) {
      this.put(ClientStore.pdCacheConfig(partnerId), ClientStore.makeStoredHash(pd));
    }
    /**
     * Generate local storage config for PD of a given partner
     * @param {number} partnerId
     * @return {StoreItem}
     */

  }, {
    key: "getDateTime",
    value: function getDateTime() {
      return new Date(this.get(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.LAST)).getTime();
    }
  }, {
    key: "clearDateTime",
    value: function clearDateTime() {
      this.clear(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.LAST);
    }
  }, {
    key: "setDateTime",
    value: function setDateTime(timestamp) {
      this.put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.LAST, timestamp);
    }
  }, {
    key: "getNb",
    value: function getNb(partnerId) {
      var cachedNb = this.get(ClientStore.nbCacheConfig(partnerId));
      return cachedNb ? parseInt(cachedNb) : 0;
    }
  }, {
    key: "clearNb",
    value: function clearNb(partnerId) {
      this.clear(ClientStore.nbCacheConfig(partnerId));
    }
  }, {
    key: "setNb",
    value: function setNb(partnerId, nb) {
      this.put(ClientStore.nbCacheConfig(partnerId), nb);
    }
  }, {
    key: "incNb",
    value: function incNb(partnerId, nb) {
      nb++;
      this.setNb(partnerId, nb);
      return nb;
    }
  }, {
    key: "clearAll",
    value: function clearAll(partnerId) {
      this.clearResponse();
      this.clearDateTime();
      this.clearNb(partnerId);
      this.clearHashedPd(partnerId);
      this.clearHashedConsentData();
    }
  }, {
    key: "removeLegacyCookies",
    value: function removeLegacyCookies(partnerId) {
      var expired = new Date(Date.now() - 1000).toUTCString();
      __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["s" /* setCookie */])("".concat(cookie), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["s" /* setCookie */])("".concat(cookie, "_nb"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["s" /* setCookie */])("".concat(cookie, "_").concat(partnerId, "_nb"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["s" /* setCookie */])("".concat(cookie, "_last"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["s" /* setCookie */])("".concat(cookie, ".cached_pd"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["s" /* setCookie */])("".concat(cookie, ".cached_consent_data"), '', expired);
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

  }, {
    key: "storedConsentDataMatchesConsentData",
    value:
    /**
     * Checks whether current consent data matches stored consent data
     * @param {ConsentData} consentData current consent data
     * @returns true if it matches
     */
    function storedConsentDataMatchesConsentData(consentData) {
      return ClientStore.storedDataMatchesCurrentData(this.getHashedConsentData(), consentData.hashCode());
    }
  }], [{
    key: "pdCacheConfig",
    value: function pdCacheConfig(partnerId) {
      return {
        name: "".concat(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.PD.name, "_").concat(partnerId),
        expiresDays: __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.PD.expiresDays
      };
    }
    /**
     * creates a hash of a user identifier for storage
     * @param {string} userId
     * @returns {string}
     */

  }, {
    key: "makeStoredHash",
    value: function makeStoredHash(userId) {
      return Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["c" /* cyrb53Hash */])(typeof userId === 'string' ? userId : '');
    }
  }, {
    key: "nbCacheConfig",
    value: function nbCacheConfig(partnerId) {
      return {
        name: "".concat(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5.name, "_").concat(partnerId, "_nb"),
        expiresDays: __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.ID5.expiresDays
      };
    }
  }, {
    key: "storedDataMatchesCurrentData",
    value: function storedDataMatchesCurrentData(storedData, currentData) {
      return typeof storedData === 'undefined' || storedData === null || storedData === currentData;
    }
  }]);

  return ClientStore;
}();



/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export API_TYPE */
/* unused harmony export ConsentData */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ConsentManagement; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__constants_json__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__localStorage_js__ = __webpack_require__(4);
var _excluded = ["vendorData", "ccpaString"];

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



/* eslint-disable no-unused-vars */


/* eslint-enable no-unused-vars */

var ID5_GVL_ID = '131';
var USPAPI_VERSION = 1;
var SURROGATE_CONFIG = {
  tcfv1: {
    objName: '__cmpCall',
    objKeys: ['command', 'parameter'],
    returnObjName: '__cmpReturn'
  },
  tcfv2: {
    objName: '__tcfapiCall',
    objKeys: ['command', 'version'],
    returnObjName: '__tcfapiReturn'
  },
  uspv1: {
    objName: '__uspapiCall',
    objKeys: ['command', 'version'],
    returnObjName: '__uspapiReturn'
  }
};
var API_TYPE = Object.freeze({
  NONE: 'none',
  TCF_V1: 'TCFv1',
  TCF_V2: 'TCFv2',
  USP_V1: 'USPv1',
  ID5_ALLOWED_VENDORS: 'ID5'
});
var ConsentData = /*#__PURE__*/function () {
  function ConsentData() {
    _classCallCheck(this, ConsentData);

    _defineProperty(this, "api", API_TYPE.NONE);

    _defineProperty(this, "consentString", void 0);

    _defineProperty(this, "gdprApplies", false);

    _defineProperty(this, "vendorData", {});

    _defineProperty(this, "allowedVendors", void 0);

    _defineProperty(this, "hasCcpaString", false);

    _defineProperty(this, "ccpaString", '');
  }

  _createClass(ConsentData, [{
    key: "canIUseLocalStorage",
    value: function canIUseLocalStorage() {
      switch (this.api) {
        case API_TYPE.NONE:
          // By default (so no indication from the owner of the page
          // and no consent framework detected on page) we assume that we can use local storage
          return true;

        case API_TYPE.TCF_V1:
          return !this.gdprApplies || Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["e" /* delve */])(this, 'vendorData.purposeConsents.1') === true;

        case API_TYPE.TCF_V2:
          return !this.gdprApplies || Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["e" /* delve */])(this, 'vendorData.purpose.consents.1') === true;

        case API_TYPE.ID5_ALLOWED_VENDORS:
          return this.allowedVendors.includes(ID5_GVL_ID);

        case API_TYPE.USP_V1:
          // CCPA never disallows local storage
          return true;
      }
    }
    /**
     * Note this is not a generic hash code but rather a hash code
     * used to check whether or not consent has changed across invocations
     * @returns a hash code of some properties of this object
     */

  }, {
    key: "hashCode",
    value: function hashCode() {
      /*
      * We hash every properties except:
      *   - vendorConsents object since the consentString is enough to know.
      *   - ccpaString as it doesn't contribute to the local storage decision.
      */
      var vendorData = this.vendorData,
          ccpaString = this.ccpaString,
          others = _objectWithoutProperties(this, _excluded);

      return Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["c" /* cyrb53Hash */])(JSON.stringify(others));
    }
  }]);

  return ConsentData;
}();
var ConsentManagement = /*#__PURE__*/function () {
  /** @type {ConsentData} */

  /**
   * The ID5 privacy object stored in localStorage
   * @type {Object}
   */

  /**
   * The interface to the browser local storage
   * @type {LocalStorage}
   */

  /**
   * Used to avoid requesting consent too often when not required
   * @type {boolean}
   */

  /**
   * @param {LocalStorage} localStorage the localStorage object to use
   */
  function ConsentManagement(localStorage) {
    _classCallCheck(this, ConsentManagement);

    _defineProperty(this, "consentData", void 0);

    _defineProperty(this, "storedPrivacyData", void 0);

    _defineProperty(this, "localStorage", void 0);

    _defineProperty(this, "_consentRequested", false);

    this.localStorage = localStorage;
    this.resetConsentData();
  }
  /**
   * Try to fetch consent from CMP. Main entry point to retrieve consent data.
   * @param {boolean} debugBypassConsent
   * @param {string} cmpApi - CMP Api to use
   * @param {object} [providedConsentData] - static consent data provided to ID5 API at init() time
   * @param {function(ConsentData)} finalCallback required; final callback
   */


  _createClass(ConsentManagement, [{
    key: "requestConsent",
    value: function requestConsent(debugBypassConsent, cmpApi, providedConsentData, finalCallback) {
      if (debugBypassConsent) {
        this.consentData = new ConsentData();
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["r" /* logWarn */])('cmpApi: ID5 is operating in forced consent mode and will not retrieve any consent signals from the CMP');
        finalCallback(this.consentData);
      } else if (!this._consentRequested) {
        this.consentData = new ConsentData();
        this._consentRequested = true;

        switch (cmpApi) {
          case 'static':
            this.parseStaticConsentData(providedConsentData, finalCallback);
            break;

          case 'iab':
            this.lookupIabConsent(finalCallback);
            break;

          default:
            Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])("cmpApi: Unknown consent API: ".concat(cmpApi));
            this.resetConsentData();
            finalCallback(this.consentData);
            break;
        }
      } else {
        finalCallback(this.consentData);
      }
    }
  }, {
    key: "getOrCreateConsentData",
    value: function getOrCreateConsentData() {
      if (!this.consentData) {
        this.consentData = new ConsentData();
      }

      return this.consentData;
    }
    /**
     * This function reads the consent string from the config to obtain the consent
     * information of the user.
     * @param {Object} data the data passed in the static configuration
     * @param {function(ConsentData)} finalCallback required; final callback
     */

  }, {
    key: "parseStaticConsentData",
    value: function parseStaticConsentData(data, finalCallback) {
      data = data || {}; // Try to detect the API from the static object structure

      var mergeData = {};

      if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(data.getConsentData)) {
        mergeData = ConsentManagement.parseTcfData(data, 1);
      } else if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(data.getTCData)) {
        mergeData = ConsentManagement.parseTcfData(data.getTCData, 2);
      } else if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["h" /* isArray */])(data.allowedVendors)) {
        mergeData = {
          api: API_TYPE.ID5_ALLOWED_VENDORS,
          allowedVendors: data.allowedVendors.map(function (item) {
            return String(item);
          }),
          gdprApplies: true
        };
      } else if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(data.getUSPData)) {
        mergeData = ConsentManagement.parseUspData(data.getUSPData);
      } else {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["r" /* logWarn */])('cmpApi: No static consent data detected! Using defaults.');
      }

      _extends(this.consentData, mergeData);

      Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])("cmpApi: Detected API '".concat(this.consentData.api, "' from static consent data"), data);
      finalCallback(this.consentData);
    }
    /**
     * This function handles async interacting with an IAB compliant CMP
     * to obtain the consent information of the user.
     * @param {function(ConsentData)} finalCallback required; final callback
     */

  }, {
    key: "lookupIabConsent",
    value: function lookupIabConsent(finalCallback) {
      var self = this;
      var done = []; // Builds callbacks for the various APIs. It does debouncing and groups
      // the result from all callbacks. It assumes all callbacks are created
      // before any of them fires.

      var makeCallback = function makeCallback(callbackPos) {
        done[callbackPos] = false;
        return function (result) {
          if (!done[callbackPos]) {
            done[callbackPos] = true;

            if (result) {
              _extends(self.consentData, result);
            }

            if (done.every(function (d) {
              return d;
            })) {
              finalCallback(self.consentData);
            }
          }
        };
      };

      var callbackTcf = makeCallback(0);
      var callbackUsp = makeCallback(1);
      this.lookupTcf(callbackTcf);
      this.lookupUsp(callbackUsp);
    }
  }, {
    key: "lookupUsp",
    value: function lookupUsp(callback) {
      var _ConsentManagement$fi = ConsentManagement.findUsp(),
          uspapiFrame = _ConsentManagement$fi.uspapiFrame,
          uspapiFunction = _ConsentManagement$fi.uspapiFunction;

      var uspFn;

      if (!uspapiFrame) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["r" /* logWarn */])('cmpApi: USP not found! Using defaults for CCPA.');
        callback();
        return;
      }

      if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* isFn */])(uspapiFunction)) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('cmpApi: Detected USP is directly accessible, calling it now.');
        uspFn = uspapiFunction;
      } else {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('cmpApi: Detected USP is outside the current iframe. Using message passing.');
        uspFn = ConsentManagement.buildCmpSurrogate('uspv1', uspapiFrame);
      }

      var uspCallback = function uspCallback(consentResponse, success) {
        if (success) {
          callback(ConsentManagement.parseUspData(consentResponse));
        } else {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('cmpApi: USP callback not succesful. Using defaults for CCPA.');
          callback();
        }
      };

      uspFn('getUSPData', USPAPI_VERSION, uspCallback);
    }
    /**
     * This function builds a surrogate CMP function which behaves as the original
     * except it uses message passing to communicate to the CMP function of choice
     * @param {string} typeOfCall decides how to build the function based on the CMP type
     * @param {Object} apiFrame the frame where the API is located. Discovered by detection.
     * @returns {function} the function to call
     */

  }, {
    key: "lookupTcf",
    value: function lookupTcf(callback) {
      var _ConsentManagement$fi2 = ConsentManagement.findTCF(),
          cmpVersion = _ConsentManagement$fi2.cmpVersion,
          cmpFrame = _ConsentManagement$fi2.cmpFrame,
          cmpFunction = _ConsentManagement$fi2.cmpFunction;

      if (!cmpFrame) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["r" /* logWarn */])('cmpApi: TCF not found! Using defaults for GDPR.');
        callback();
        return;
      }

      if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* isFn */])(cmpFunction)) {
        this.lookupDirectTcf(cmpVersion, cmpFunction, callback);
      } else {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('cmpApi: Detected TCF is outside the current iframe. Using message passing.');
        this.lookupMessageTcf(cmpVersion, cmpFrame, callback);
      }
    }
  }, {
    key: "lookupMessageTcf",
    value: function lookupMessageTcf(cmpVersion, cmpFrame, callback) {
      var cmpFunction = ConsentManagement.buildCmpSurrogate(cmpVersion === 1 ? 'tcfv1' : 'tcfv2', cmpFrame);
      this.lookupDirectTcf(cmpVersion, cmpFunction, callback);
    }
  }, {
    key: "lookupDirectTcf",
    value: function lookupDirectTcf(cmpVersion, cmpFunction, callback) {
      // TCF V1 callbacks
      var cmpResponse = {};
      var done = {};

      var logcb = function logcb(version, callback, data) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])("cmpApi: TCFv".concat(version, " - Received a call back: ").concat(callback), data);
      };

      var logNoSuccess = function logNoSuccess(version, callback) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])("cmpApi: TCFv".concat(version, " - Received insuccess: ").concat(callback, ". Please check your CMP setup. Using defaults for GDPR."));
      };

      var makeV1Callback = function makeV1Callback(verb) {
        done[verb] = false;
        return function (data, success) {
          done[verb] = true;

          if (!success) {
            logNoSuccess(1, verb);
          } else {
            logcb(1, verb, data);
            cmpResponse[verb] = data;
          }

          if (Object.values(done).every(function (d) {
            return d;
          })) {
            callback(ConsentManagement.parseTcfData(cmpResponse, 1));
          }
        };
      }; // TCF V2 callback


      var v2CmpResponseCallback = function v2CmpResponseCallback(tcfData, success) {
        logcb(2, 'event', tcfData);

        if (!success) {
          logNoSuccess(2, 'addEventListener');
          callback();
          return;
        }

        if (tcfData && (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete')) {
          callback(ConsentManagement.parseTcfData(tcfData, 2));
        }
      };

      if (cmpVersion === 1) {
        var consentDataCallback = makeV1Callback('getConsentData');
        var vendorConsentsCallback = makeV1Callback('getVendorConsents');
        cmpFunction('getConsentData', null, consentDataCallback);
        cmpFunction('getVendorConsents', null, vendorConsentsCallback);
      } else if (cmpVersion === 2) {
        cmpFunction('addEventListener', cmpVersion, v2CmpResponseCallback);
      }
    }
    /**
     * This function checks the consent data provided by USP to ensure it's in an expected state.
     * @param {object} consentObject required; object returned by CMP that contains user's consent choices
     * @param {number} cmpVersion the version reported by the CMP framework
     * @returns {Object} the parsed consent data
     */

  }, {
    key: "resetConsentData",
    value:
    /**
     * Simply resets the module's consentData.
     */
    function resetConsentData() {
      this.consentData = undefined;
      this.storedPrivacyData = undefined;
      this._consentRequested = false;
    }
    /**
     * Test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
     * @param {boolean} allowLocalStorageWithoutConsentApi
     * @param {boolean} debugBypassConsent
     * @returns {boolean|undefined} undefined in case there's not yet any consent data from a
     * vaild CMP call and no stored privacy info is available
     */

  }, {
    key: "isLocalStorageAllowed",
    value: function isLocalStorageAllowed(allowLocalStorageWithoutConsentApi, debugBypassConsent) {
      if (allowLocalStorageWithoutConsentApi === true || debugBypassConsent === true) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["r" /* logWarn */])('cmpApi: Local storage access granted by configuration override, consent will not be checked');
        return true;
      }

      if (!this.consentData || this.consentData.api === API_TYPE.NONE) {
        // no cmp detected, so check if provisional access is allowed
        return this.isProvisionalLocalStorageAllowed();
      }

      return this.consentData.canIUseLocalStorage();
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
     * @return {boolean|undefined}
     */

  }, {
    key: "isProvisionalLocalStorageAllowed",
    value: function isProvisionalLocalStorageAllowed() {
      if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(this.storedPrivacyData)) {
        var privacyData = this.localStorage.getItemWithExpiration(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.PRIVACY);
        this.storedPrivacyData = privacyData && JSON.parse(privacyData);
      }

      if (this.storedPrivacyData && this.storedPrivacyData.id5_consent === true) {
        return true;
      } else if (!this.storedPrivacyData || typeof this.storedPrivacyData.jurisdiction === 'undefined') {
        return undefined;
      } else {
        var jurisdictionRequiresConsent = typeof __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.PRIVACY.JURISDICTIONS[this.storedPrivacyData.jurisdiction] !== 'undefined' ? __WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.PRIVACY.JURISDICTIONS[this.storedPrivacyData.jurisdiction] : false;
        return jurisdictionRequiresConsent === false || this.storedPrivacyData.id5_consent === true;
      }
    }
  }, {
    key: "setStoredPrivacy",
    value: function setStoredPrivacy(privacy) {
      try {
        if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(privacy)) {
          this.storedPrivacyData = privacy;
          this.localStorage.setItemWithExpiration(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.PRIVACY, JSON.stringify(privacy));
        } else {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('cmpApi: Cannot store privacy if it is not an object: ', privacy);
        }
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])(e);
      }
    }
    /**
     * @typedef {Object} CMPDetails
     * @property {number} cmpVersion - Version of CMP Found, 0 if not found
     * @property {Object} cmpFrame - The frame where the CPM function is declared
     * @property {function} cmpFunction - the CMP function to invoke
     *
     * This function tries to find the CMP in page.
     * @return {CMPDetails}
     */

  }], [{
    key: "buildCmpSurrogate",
    value: function buildCmpSurrogate(typeOfCall, apiFrame) {
      return function (param0, param1, messageCallback) {
        var callId = Math.random() + '';
        var config = SURROGATE_CONFIG[typeOfCall];
        var msg = {};
        var requestObj = {};
        requestObj[config.objKeys[0]] = param0;
        requestObj[config.objKeys[1]] = param1;
        requestObj.callId = callId;
        msg[config.objName] = requestObj;

        var eventHandler = function eventHandler(event) {
          var result = Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["e" /* delve */])(event, "data.".concat(config.returnObjName));

          if (result && result.callId === callId) {
            window.removeEventListener('message', eventHandler);
            messageCallback(result.returnValue, result.success);
          }
        };

        window.addEventListener('message', eventHandler, false);
        apiFrame.postMessage(msg, '*');
      };
    }
  }, {
    key: "parseUspData",
    value: function parseUspData(consentObject) {
      if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(consentObject) || !Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["o" /* isStr */])(consentObject.uspString)) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('cmpApi: No or malformed USP data. Using defaults for CCPA.');
        return;
      }

      return {
        api: API_TYPE.USP_V1,
        hasCcpaString: true,
        ccpaString: consentObject.uspString
      };
    }
    /**
     * This function checks the consent data provided by CMP to ensure it's in an expected state.
     * @param {object} consentObject required; object returned by CMP that contains user's consent choices
     * @param {number} cmpVersion the version reported by the CMP framework
     * @returns {Object} the parsed consent data
     */

  }, {
    key: "parseTcfData",
    value: function parseTcfData(consentObject, cmpVersion) {
      var isValid, normalizeFn;

      if (cmpVersion === 1) {
        isValid = ConsentManagement.isValidV1ConsentObject;
        normalizeFn = ConsentManagement.normalizeV1Data;
      } else if (cmpVersion === 2) {
        isValid = ConsentManagement.isValidV2ConsentObject;
        normalizeFn = ConsentManagement.normalizeV2Data;
      } else {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('cmpApi: No or malformed CMP data. Using defaults for GDPR.');
        return;
      }

      if (!isValid(consentObject)) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('cmpApi: Invalid CMP data. Using defaults for GDPR.', consentObject);
        return;
      }

      return normalizeFn(consentObject);
    }
  }, {
    key: "isValidV1ConsentObject",
    value: function isValidV1ConsentObject(consentObject) {
      var gdprApplies = Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["e" /* delve */])(consentObject, 'getConsentData.gdprApplies');

      if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["i" /* isBoolean */])(gdprApplies)) {
        return false;
      }

      if (gdprApplies === false) {
        return true;
      }

      return Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["o" /* isStr */])(consentObject.getConsentData.consentData) && Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(consentObject.getVendorConsents) && Object.keys(consentObject.getVendorConsents).length > 1;
    }
  }, {
    key: "isValidV2ConsentObject",
    value: function isValidV2ConsentObject(consentObject) {
      var gdprApplies = consentObject && consentObject.gdprApplies;
      var tcString = consentObject && consentObject.tcString;

      if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["i" /* isBoolean */])(gdprApplies)) {
        return false;
      }

      if (gdprApplies === false) {
        return true;
      }

      return Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["o" /* isStr */])(tcString);
    }
  }, {
    key: "normalizeV1Data",
    value: function normalizeV1Data(cmpConsentObject) {
      return {
        consentString: cmpConsentObject.getConsentData.consentData,
        vendorData: cmpConsentObject.getVendorConsents,
        gdprApplies: cmpConsentObject.getConsentData.gdprApplies,
        api: API_TYPE.TCF_V1
      };
    }
  }, {
    key: "normalizeV2Data",
    value: function normalizeV2Data(cmpConsentObject) {
      return {
        consentString: cmpConsentObject.tcString,
        vendorData: cmpConsentObject,
        gdprApplies: cmpConsentObject.gdprApplies,
        api: API_TYPE.TCF_V2
      };
    }
  }, {
    key: "findTCF",
    value: function findTCF() {
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
        } catch (e) {} // need separate try/catch blocks due to the exception errors
        // thrown when trying to check for a frame that doesn't exist
        // in 3rd party env


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
    /**
     * @typedef {Object} UspDetails
     * @property {Object} uspapiFrame - The frame where the CPM function is declared
     * @property {function} uspapiFunction - the CMP function to invoke
     *
     * This function tries to find the CMP in page.
     * @return {UspDetails}
     */

  }, {
    key: "findUsp",
    value: function findUsp() {
      var f = window;
      var uspapiFrame;
      var uspapiFunction;

      while (!uspapiFrame) {
        try {
          if (typeof f.__uspapi === 'function') {
            uspapiFunction = f.__uspapi;
            uspapiFrame = f;
            break;
          }
        } catch (e) {}

        try {
          if (f.frames['__uspapiLocator']) {
            uspapiFrame = f;
            break;
          }
        } catch (e) {}

        if (f === window.top) break;
        f = f.parent;
      }

      return {
        uspapiFrame: uspapiFrame,
        uspapiFunction: uspapiFunction
      };
    }
  }]);

  return ConsentManagement;
}();

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return LocalStorage; });
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * This class deals with the mechanics of accessing the local storage
 * on a certain window object
 */
var EXP_SUFFIX = '_exp';

var LocalStorage = /*#__PURE__*/function () {
  /** @type {boolean} */

  /** @type {Object} */

  /** @type {boolean} */

  /**
   * Builds a new abstraction of the localStorage associated with
   * the passed window object
   * @param {Object} win the window object to use
   */
  function LocalStorage(win) {
    var writingEnabled = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    _classCallCheck(this, LocalStorage);

    _defineProperty(this, "available", false);

    _defineProperty(this, "win", void 0);

    _defineProperty(this, "writingEnabled", void 0);

    this.win = win;
    this.writingEnabled = writingEnabled; // Test for availability

    var test = '__id5test';

    try {
      if (this.writingEnabled) {
        this.win.localStorage.setItem(test, test);
      }

      this.win.localStorage.removeItem(test);
      this.available = true;
    } catch (e) {// do nothing
    }
  }
  /**
   * @returns {boolean} true if the localStorage is available
   */


  _createClass(LocalStorage, [{
    key: "isAvailable",
    value: function isAvailable() {
      return this.available;
    }
    /**
     * Gets a stored string from local storage
     *
     * @param {string} key
     * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no localStorage
     */

  }, {
    key: "getItem",
    value: function getItem(key) {
      if (this.available) {
        return this.win.localStorage.getItem(key);
      }
    }
    /**
     * Puts a string in local storage
     *
     * @param {string} key the key of the item
     * @param {string} value the vaule to store
     * @returns {undefined}
     */

  }, {
    key: "setItem",
    value: function setItem(key, value) {
      if (this.available && this.writingEnabled) {
        this.win.localStorage.setItem(key, value);
      }
    }
    /**
     * Removes a string from local storage
     * @param {string} key the key of the item
     */

  }, {
    key: "removeItem",
    value: function removeItem(key) {
      if (this.available) {
        this.win.localStorage.removeItem(key);
      }
    }
    /**
     * Gets a stored item from local storage dealing with expiration policy.
     * @param {Object} config The item configuration
     * @param {string} config.name The item name
     * @returns {string|null} the stored value, null if no value, expired or no localStorage
     */

  }, {
    key: "getItemWithExpiration",
    value: function getItemWithExpiration(_ref) {
      var name = _ref.name;
      var storedValueExp = this.getItem(name + EXP_SUFFIX);

      if (storedValueExp && !isExpired(storedValueExp)) {
        return this.getItem(name);
      } else {
        this.removeItemWithExpiration({
          name: name
        });
        return null;
      }
    }
    /**
     * Stores an item in local storage dealing with expiration policy.
     * @param {Object} config The item configuration
     * @param {string} config.name The item name
     * @param {number} config.expiresDays The expiration in days
     * @returns {undefined}
     */

  }, {
    key: "setItemWithExpiration",
    value: function setItemWithExpiration(_ref2, value) {
      var name = _ref2.name,
          expiresDays = _ref2.expiresDays;
      var expirationInMs = Date.now() + expiresDays * (60 * 60 * 24 * 1000);
      var expiresStr = new Date(expirationInMs).toUTCString();
      this.setItem(name + EXP_SUFFIX, expiresStr);
      this.setItem(name, value);
    }
    /**
     * Removes an item from local storage dealing with expiration policy.
     */

  }, {
    key: "removeItemWithExpiration",
    value: function removeItemWithExpiration(_ref3) {
      var name = _ref3.name;
      this.removeItem(name);
      this.removeItem(name + EXP_SUFFIX);
    }
  }]);

  return LocalStorage;
}();
/**
 * Tells whether a stored expiration date has passed
 * @param {string} dateValue the .toUTCString() representation of the expiration date
 */




function isExpired(dateValue) {
  return new Date(dateValue).getTime() - Date.now() <= 0;
}

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Config; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils_js__ = __webpack_require__(0);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Module for getting and setting ID5 API configuration.
 */

/**
 * @typedef {Object} Id5Options
 * @property {number} [partnerId] - ID5 Publisher ID, mandatory
 * @property {boolean|false} [debugBypassConsent] - Bypass consent API et local storage consent for testing purpose only
 * @property {boolean|false} [allowLocalStorageWithoutConsentApi] - Tell ID5 that consent has been given to read local storage
 * @property {number} [refreshInSeconds] - Refresh period of first-party cookie (defaulting to 7200s)
 * @property {string} [partnerUserId] - User ID for the platform deploying the API, to be stored by ID5 for further cookie matching if provided
 * @property {string} [cmpApi] - API to use CMP. As of today, either 'iab' or 'static'
 * @property {object} [consentData] - Consent data if cmpApi is 'static'
 * @property {function} [callbackOnAvailable] - Function to call back when User ID is available. if callbackTimeoutInMs is not provided, will be fired only if a User ID is available.
 * @property {function} [callbackOnUpdates] - Function to call back on further updates of User ID by changes in the page (consent, pd, refresh). Cannot be provided if `callbackOnAvailable` is not provided
 * @property {number} [callbackTimeoutInMs] - Delay in ms after which the callbackOnAvailable is guaranteed to be fired. A User ID may not yet be available at this time.
 * @property {string} [pd] - Partner Data that can be passed to help with cross-domain reconciliation of the ID5 ID, more details here: https://support.id5.io/portal/en/kb/articles/passing-partner-data-to-id5
 * @property {AbTestConfig} [abTesting] - An object defining if and how A/B testing should be enabled
 * @property {string} [provider] - Defines who is deploying the API on behalf of the partner. A hard-coded value that will be provided by ID5 when applicable
 * @property {number} [maxCascades] - Defines the maximum number of cookie syncs that can occur when usersyncing for the user is required. A value of -1 will disable cookie syncing altogether. Defaults to 8
 * @property {boolean} [applyCreativeRestrictions] - When true some restrictions are applied, for example avoid writing to localStorage and avoid cookie syncing.
 * @property {Array<Segment>} [segments] - A list of segments to push to partners.

 * @typedef {Object} Segment
 * @property {string} [destination] - GVL ID or ID5-XX Partner ID. Mandatory
 * @property {Array<string>} [ids] - The segment IDs to push. Must contain at least one segment ID.
*/

/**
 * @typedef {Object} AbTestConfig
 * @property {boolean|false} [enabled] - Enable control group
 * @property {number} [controlGroupPct] - Ratio of users in control group [0,1]
 */

var Config = /*#__PURE__*/function () {
  /** @type {Id5Options} */

  /** @type {Id5Options} */

  /** @type {Number} */

  /**
   * Create configuration instance from an object containing key-value pairs
   * @param {Id5Options} options
   */
  function Config(options) {
    _classCallCheck(this, Config);

    _defineProperty(this, "options", void 0);

    _defineProperty(this, "providedOptions", void 0);

    _defineProperty(this, "invalidSegments", void 0);

    this.options = {
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
      callbackOnAvailable: undefined,
      callbackOnUpdates: undefined,
      callbackTimeoutInMs: undefined,
      pd: undefined,
      abTesting: {
        enabled: false,
        controlGroupPct: 0
      },
      provider: undefined,
      maxCascades: 8,
      applyCreativeRestrictions: false,
      segments: undefined
    };
    this.providedOptions = {};

    if (!options.partnerId || typeof options.partnerId !== 'number') {
      throw new Error('partnerId is required and must be a number');
    }

    this.invalidSegments = 0;
    this.updOptions(options);
  }
  /**
   * Return current configuration
   * @returns {Id5Options} options
   */


  _createClass(Config, [{
    key: "getOptions",
    value: function getOptions() {
      return this.options;
    }
    /**
     * Return configuration set by user
     * @returns {Id5Options} options
     */

  }, {
    key: "getProvidedOptions",
    value: function getProvidedOptions() {
      return this.providedOptions;
    }
    /**
     * Return how many invalid segments we got in the options
     * @returns {number} invalidSegments
     */

  }, {
    key: "getInvalidSegments",
    value: function getInvalidSegments() {
      return this.invalidSegments;
    }
    /**
     * Override the configuration with an object containing key-value pairs
     * @param {Id5Options} options
     */

  }, {
    key: "updOptions",
    value: function updOptions(options) {
      var _this = this;

      var self = this;

      if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* isPlainObject */])(options)) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('Config options must be an object');
        return;
      }

      if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["m" /* isNumber */])(this.options.partnerId) && // Might be undefined
      Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["m" /* isNumber */])(options.partnerId) && options.partnerId !== this.options.partnerId) {
        throw new Error('Cannot update config with a different partnerId');
      }

      var acceptOption = function acceptOption(topic, value) {
        _this.options[topic] = value;
        _this.providedOptions[topic] = value;
      };

      Object.keys(options).forEach(function (topic) {
        if (topic === 'segments') {
          var segments = options[topic];
          var value = [];

          if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["h" /* isArray */])(segments)) {
            logTypeError(topic, 'Array', segments);
            return;
          }

          segments.forEach(function (segment, index) {
            var locator = "segments[".concat(index, "]");

            if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["h" /* isArray */])(segment['ids']) || !Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["b" /* all */])(segment['ids'], __WEBPACK_IMPORTED_MODULE_0__utils_js__["o" /* isStr */])) {
              logTypeError("".concat(locator, ".ids"), 'Array of String', segment['ids']);
              self.invalidSegments += 1;
              return;
            }

            if (segment['ids'].length < 1) {
              Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])("Config option ".concat(locator, ".ids should contain at least one segment ID"));
              self.invalidSegments += 1;
              return;
            }

            if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["o" /* isStr */])(segment['destination'])) {
              logTypeError("".concat(locator, ".destination"), 'String', segment['destination']);
              self.invalidSegments += 1;
              return;
            }

            value.push(segment);
          });
          acceptOption(topic, value);
        } else {
          var expectedType = Config.configTypes[topic];
          var _value = options[topic];

          if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["g" /* isA */])(_value, expectedType)) {
            acceptOption(topic, _value);
          } else {
            logTypeError(topic, expectedType, _value);
          }
        }
      });
    }
  }]);

  return Config;
}();

_defineProperty(Config, "configTypes", {
  debugBypassConsent: 'Boolean',
  allowLocalStorageWithoutConsentApi: 'Boolean',
  cmpApi: 'String',
  consentData: 'Object',
  refreshInSeconds: 'Number',
  partnerId: 'Number',
  partnerUserId: 'String',
  callbackOnAvailable: 'Function',
  callbackOnUpdates: 'Function',
  callbackTimeoutInMs: 'Number',
  pd: 'String',
  abTesting: 'Object',
  provider: 'String',
  maxCascades: 'Number',
  applyCreativeRestrictions: 'Boolean'
});



function logTypeError(topic, expectedType, value) {
  Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])("Config option ".concat(topic, " must be of type ").concat(expectedType, " but was ").concat(toString.call(value), ". Ignoring..."));
}

/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_id5_api__ = __webpack_require__(7);


if (!window.ID5) {
  window.ID5 = __WEBPACK_IMPORTED_MODULE_0__lib_id5_api__["a" /* default */];
} else {// TODO: Check for different versions in the same page at init
}

/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__refererDetection_js__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__clientStore_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__consentManagement_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__id5Status_js__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__generated_version_js__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__localStorage_js__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__config_js__ = __webpack_require__(5);
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr && (typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]); if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/** @module id5-api */








/**
 * Singleton which represents the entry point of the API.
 * In the ID5's id5-api.js bundle this is installed under window.ID5.
 */

var Id5Api = /*#__PURE__*/function () {
  function Id5Api() {
    _classCallCheck(this, Id5Api);

    _defineProperty(this, "loaded", false);

    _defineProperty(this, "_isUsingCdn", false);

    _defineProperty(this, "_referer", false);

    _defineProperty(this, "_version", __WEBPACK_IMPORTED_MODULE_5__generated_version_js__["a" /* version */]);

    _defineProperty(this, "versions", {});

    this.loaded = true;
    this._isUsingCdn = !!(document && document.currentScript && document.currentScript.src && document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0);
    this._referer = Object(__WEBPACK_IMPORTED_MODULE_1__refererDetection_js__["a" /* getRefererInfo */])();
    this.versions[__WEBPACK_IMPORTED_MODULE_5__generated_version_js__["a" /* version */]] = true;
  }
  /**
   * This function will initialize ID5, wait for consent then try to fetch or refresh ID5 user id if required
   * @param {Id5Options} passedOptions
   * @return {Id5Status} Status of the ID5 API for this caller, for further interactions
   */


  _createClass(Id5Api, [{
    key: "debug",
    get: function get() {
      return Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* isGlobalDebug */])();
    }
    /** @type {boolean} */
    ,
    set:
    /** @type {boolean} */

    /** @type {boolean} */
    function set(isDebug) {
      Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["t" /* setGlobalDebug */])(isDebug);
    }
  }, {
    key: "init",
    value: function init(passedOptions) {
      try {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('Invoking Id5Api.init', arguments);
        var config = new __WEBPACK_IMPORTED_MODULE_7__config_js__["a" /* default */](passedOptions);
        var options = config.getOptions(); // By using window.top we say we want to use storage only if we're in a first-party context

        var localStorage = new __WEBPACK_IMPORTED_MODULE_6__localStorage_js__["a" /* default */](window.top, !options.applyCreativeRestrictions);
        var consentManagement = new __WEBPACK_IMPORTED_MODULE_3__consentManagement_js__["a" /* ConsentManagement */](localStorage);
        var clientStore = new __WEBPACK_IMPORTED_MODULE_2__clientStore_js__["a" /* default */](function () {
          return consentManagement.isLocalStorageAllowed(options.allowLocalStorageWithoutConsentApi, options.debugBypassConsent);
        }, localStorage);
        var partnerStatus = new __WEBPACK_IMPORTED_MODULE_4__id5Status_js__["a" /* default */](config, clientStore, consentManagement);
        this.getId(partnerStatus, false);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])("ID5 initialized for partner ".concat(options.partnerId, " with referer ").concat(this._referer.referer, " and options"), passedOptions);
        return partnerStatus;
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('Exception caught from Id5Api.init', e);
      }
    }
  }, {
    key: "refreshId",
    value:
    /**
     * @param {Id5Status} id5Status - Initializes id5Status returned by `init()`
     * @param {boolean} forceFetch
     * @param {Id5Options} [options] - Options to update
     * @return {Id5Status} provided id5Status for chaining
     */
    function refreshId(id5Status) {
      var forceFetch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["i" /* isBoolean */])(forceFetch)) {
        throw new Error('Invalid signature for Id5Api.refreshId: second parameter must be a boolean');
      }

      try {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('Invoking Id5Api.refreshId', arguments);
        id5Status.startRefresh(forceFetch);
        id5Status.updateOptions(options);
        id5Status.consentManagement.resetConsentData();
        this.getId(id5Status, forceFetch);
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('Exception caught from Id5Api.refreshId', e);
      }

      return id5Status;
    }
  }, {
    key: "getId",
    value:
    /**
     * This function get the user ID for the given config
     * @param {Id5Status} id5Status
     * @param {boolean} forceFetch - Force a call to server
     */
    function getId(id5Status) {
      var _this = this;

      var forceFetch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var options = id5Status.getOptions();
      var storedResponse;
      var storedDateTime;
      var nb = 0;
      var refreshInSecondsHasElapsed = false;
      var pdHasChanged = false;
      var cachedResponseUsed = false;

      if (id5Status.localStorageAllowed()) {
        storedResponse = id5Status.clientStore.getResponse();
        storedDateTime = id5Status.clientStore.getDateTime();
        refreshInSecondsHasElapsed = storedDateTime <= 0 || Date.now() - storedDateTime > options.refreshInSeconds * 1000;
        nb = id5Status.clientStore.getNb(options.partnerId);
        pdHasChanged = !id5Status.clientStore.storedPdMatchesPd(options.partnerId, options.pd);
      }

      if (!storedResponse) {
        storedResponse = id5Status.clientStore.getResponseFromLegacyCookie();
        refreshInSecondsHasElapsed = true; // Force a refresh if we have legacy cookie
      }

      if (storedResponse && storedResponse.universal_uid && !pdHasChanged) {
        // we have a valid stored response and pd is not different, so
        // use the stored response to make the ID available right away
        id5Status.setUserId(storedResponse, true);
        nb = id5Status.clientStore.incNb(options.partnerId, nb);
        cachedResponseUsed = true;
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('ID5 User ID available from cache:', {
          storedResponse: storedResponse,
          storedDateTime: storedDateTime,
          refreshNeeded: refreshInSecondsHasElapsed
        });
      } else if (storedResponse && storedResponse.universal_uid && pdHasChanged) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('PD value has changed, so ignoring User ID from cache');
      } else if (storedResponse && !storedResponse.universal_uid) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('Invalid stored response: ', storedResponse);
      } else {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('No ID5 User ID available from cache');
      }

      id5Status.consentManagement.requestConsent(options.debugBypassConsent, options.cmpApi, options.consentData, function (consentData) {
        if (id5Status.localStorageAllowed() === false) {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('No legal basis to use ID5', consentData);
          return;
        }

        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('Consent to access local storage is: ' + id5Status.localStorageAllowed());
        storedResponse = id5Status.clientStore.getResponse() || id5Status.clientStore.getResponseFromLegacyCookie(); // store hashed consent data and pd for future page loads

        var consentHasChanged = !id5Status.clientStore.storedConsentDataMatchesConsentData(consentData);
        id5Status.clientStore.putHashedConsentData(consentData);
        id5Status.clientStore.putHashedPd(options.partnerId, options.pd); // make a call to fetch a new ID5 ID if:
        // - there is no valid universal_uid or no signature in cache
        // - the last refresh was longer than refreshInSeconds ago
        // - consent has changed since the last ID was fetched
        // - pd has changed since the last ID was fetched
        // - fetch is being forced (e.g. by refreshId())

        if (!storedResponse || !storedResponse.universal_uid || !storedResponse.signature || refreshInSecondsHasElapsed || consentHasChanged || pdHasChanged || forceFetch) {
          var url = "https://id5-sync.com/g/v2/".concat(options.partnerId, ".json");
          var gdprApplies = consentData.gdprApplies ? 1 : 0;
          var data = {
            'partner': options.partnerId,
            'v': _this._version,
            'o': 'api',
            'gdpr': gdprApplies,
            'rf': _this._referer.referer,
            'u': _this._referer.stack[0] || window.location.href,
            'top': _this._referer.reachedTop ? 1 : 0,
            'localStorage': id5Status.clientStore.isLocalStorageAvailable() ? 1 : 0,
            'nbPage': nb,
            'id5cdn': _this._isUsingCdn
          }; // pass in optional data, but only if populated

          var gdprConsentString = consentData.gdprApplies ? consentData.consentString : undefined;

          if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["j" /* isDefined */])(gdprConsentString)) {
            data.gdpr_consent = gdprConsentString;
          }

          if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["j" /* isDefined */])(consentData.allowedVendors)) {
            data.allowed_vendors = consentData.allowedVendors;
          }

          var signature = storedResponse && storedResponse.signature ? storedResponse.signature : undefined;

          if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["j" /* isDefined */])(signature)) {
            data.s = signature;
          }

          if (consentData.hasCcpaString) {
            data.us_privacy = consentData.ccpaString;
          }

          Object.entries({
            pd: 'pd',
            partnerUserId: 'puid',
            provider: 'provider',
            segments: 'segments'
          }).forEach(function (entry) {
            var _entry = _slicedToArray(entry, 2),
                optKey = _entry[0],
                dataKey = _entry[1];

            if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["j" /* isDefined */])(options[optKey])) {
              data[dataKey] = options[optKey];
            }
          }); // pass in A/B Testing configuration, if applicable

          if (options.abTesting.enabled === true) {
            data.ab_testing = {
              enabled: true,
              control_group_pct: id5Status.getOptions().abTesting.controlGroupPct
            };
          } // Monitoring server side for excluded invalid segments


          if (id5Status.getInvalidSegments() > 0) {
            data._invalid_segments = id5Status.getInvalidSegments();
          }

          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('Fetching ID5 user ID from:', url, data);

          if (forceFetch) {
            Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('...with Force Fetch');
          }

          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["a" /* ajax */])(url, {
            success: function success(response) {
              Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('Response from ID5 received:', response);
              var responseObj;

              if (response) {
                try {
                  responseObj = JSON.parse(response);
                  Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('Valid json response from ID5 received:', responseObj);

                  if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["o" /* isStr */])(responseObj.universal_uid)) {
                    id5Status.setUserId(responseObj, false); // privacy has to be stored first so we can use it when storing other values

                    id5Status.consentManagement.setStoredPrivacy(responseObj.privacy); // @TODO: !isDefined(responseObj.privacy) is only needed until fetch endpoint is updated and always returns a privacy object
                    // once it does, I don't see a reason to keep that part of the if clause

                    if (id5Status.localStorageAllowed() === true || !Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["j" /* isDefined */])(responseObj.privacy)) {
                      id5Status.clientStore.putResponse(response);
                      id5Status.clientStore.setDateTime(new Date().toUTCString());
                      id5Status.clientStore.setNb(options.partnerId, cachedResponseUsed ? 0 : 1);
                    } else {
                      id5Status.clientStore.clearAll(options.partnerId);
                    } // TEMPORARY until all clients have upgraded past v1.0.0
                    // remove cookies that were previously set


                    id5Status.clientStore.removeLegacyCookies(options.partnerId);

                    if (responseObj.cascade_needed === true && id5Status.localStorageAllowed() === true && options.maxCascades >= 0 && !options.applyCreativeRestrictions) {
                      var isSync = options.partnerUserId && options.partnerUserId.length > 0;
                      var syncUrl = "https://id5-sync.com/".concat(isSync ? 's' : 'i', "/").concat(options.partnerId, "/").concat(options.maxCascades, ".gif?id5id=").concat(id5Status._userId, "&o=api&").concat(isSync ? 'puid=' + options.partnerUserId + '&' : '', "gdpr_consent=").concat(gdprConsentString, "&gdpr=").concat(gdprApplies);
                      Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["q" /* logInfo */])('Opportunities to cascade available:', syncUrl);
                      Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["d" /* deferPixelFire */])(syncUrl);
                    }
                  } else {
                    Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('Invalid response from ID5 servers:', response);
                  }
                } catch (error) {
                  Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])(error);
                }
              } else {
                Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])('Empty response from ID5 servers:', response);
              }
            },
            error: function error(_error) {
              Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["p" /* logError */])(_error);
            }
          }, JSON.stringify(data), {
            method: 'POST',
            withCredentials: true
          });
        }
      });
    }
  }]);

  return Id5Api;
}();

var ID5 = new Id5Api();
/* harmony default export */ __webpack_exports__["a"] = (ID5);

/***/ }),
/* 8 */
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
   * @property {string} referer - detected top url
   * @property {boolean} reachedTop - whether it was possible to walk upto top window or not
   * @property {number} numIframes - number of iframes
   * @property {string} stack - comma separated urls of all origins
   * @property {string} canonicalUrl - canonical URL refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
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
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Id5Status; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__constants_json__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__constants_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__constants_json__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__config_js__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__clientStore_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__consentManagement_js__ = __webpack_require__(3);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Class containing the status of the API for a partner
 */


/* eslint-disable no-unused-vars */




/* eslint-enable no-unused-vars */

var Id5Status = /*#__PURE__*/function () {
  /** timerId of the onAvailable watchdog */

  /** @type {boolean} */

  /** @type {function} */

  /** @type {function} */

  /** timerId of the onRefresh watchdog */

  /** @type {boolean} */

  /** @type {function} */

  /** @type {boolean} */

  /** @type {boolean} */

  /** @type {boolean} */

  /** @type {boolean} */

  /** @type {string} */

  /** @type {number} */

  /** @type {boolean} */

  /** @type {Config} */

  /** @type {ClientStore} */

  /** @type {ConsentManagement} */

  /**
   * @param {Config} config
   * @param {ClientStore} clientStore
   * @param {ConsentManagement} consentManagement
   */
  function Id5Status(config, clientStore, consentManagement) {
    _classCallCheck(this, Id5Status);

    _defineProperty(this, "_availableCallbackTimerId", void 0);

    _defineProperty(this, "_availableCallbackFired", false);

    _defineProperty(this, "_availableCallback", void 0);

    _defineProperty(this, "_updateCallback", void 0);

    _defineProperty(this, "_refreshCallbackTimerId", void 0);

    _defineProperty(this, "_refreshCallbackFired", false);

    _defineProperty(this, "_refreshCallback", void 0);

    _defineProperty(this, "_isExposed", void 0);

    _defineProperty(this, "_fromCache", void 0);

    _defineProperty(this, "_isRefreshing", false);

    _defineProperty(this, "_isRefreshingWithFetch", false);

    _defineProperty(this, "_userId", void 0);

    _defineProperty(this, "_linkType", void 0);

    _defineProperty(this, "_userIdAvailable", false);

    _defineProperty(this, "config", void 0);

    _defineProperty(this, "clientStore", void 0);

    _defineProperty(this, "consentManagement", void 0);

    this.config = config;
    this.clientStore = clientStore;
    this.consentManagement = consentManagement;
  }
  /** @returns {Id5Options} options - Current options for this partner */


  _createClass(Id5Status, [{
    key: "getOptions",
    value: function getOptions() {
      return this.config.getOptions();
    }
    /**
     * Return how many invalid segments we got in the options
     * @returns {number} invalidSegments
     */

  }, {
    key: "getInvalidSegments",
    value: function getInvalidSegments() {
      return this.config.getInvalidSegments();
    }
    /** @param {Id5Options} options */

  }, {
    key: "updateOptions",
    value: function updateOptions(options) {
      return this.config.updOptions(options);
    }
    /**
     * Notify status that a refresh is in progress
     * @param {boolean} forceFetch – server response required
     */

  }, {
    key: "startRefresh",
    value: function startRefresh(forceFetch) {
      this._isRefreshing = true;
      this._isRefreshingWithFetch = forceFetch;
    }
    /**
     * Set the user Id for this Id5Status
     * @param {Object} response
      * @param {boolean} fromCache
     */

  }, {
    key: "setUserId",
    value: function setUserId(response, fromCache) {
      var _this = this;

      var userId = response.universal_uid;
      var linkType = response.link_type || 0;
      this._isExposed = true;

      if (__WEBPACK_IMPORTED_MODULE_1__utils_js__["n" /* isPlainObject */](response.ab_testing)) {
        switch (response.ab_testing.result) {
          case 'normal':
            // nothing to do
            break;

          default: // falls through

          case 'error':
            __WEBPACK_IMPORTED_MODULE_1__utils_js__["p" /* logError */]('There was an error with A/B Testing. Make sure controlGroupRatio is a number >= 0 and <= 1');
            break;

          case 'control':
            this._isExposed = false;
            __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]('User is in control group!');
            break;
        }
      }

      var hasChanged = this._userId !== userId || this._linkType !== linkType;
      this._userIdAvailable = true;
      this._userId = userId;
      this._linkType = linkType;
      this._fromCache = fromCache;
      __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]("Id5Status.setUserId: user id updated, hasChanged: ".concat(hasChanged)); // Fire onAvailable if not yet fired

      if (__WEBPACK_IMPORTED_MODULE_1__utils_js__["k" /* isFn */](this._availableCallback) && this._availableCallbackFired === false) {
        // Cancel pending watchdog
        if (this._availableCallbackTimerId) {
          __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]("Cancelling pending onAvailableCallback watchdog");
          clearTimeout(this._availableCallbackTimerId);
          this._availableCallbackTimerId = undefined;
        }

        this._availableCallbackTimerId = setTimeout(function () {
          return Id5Status.doFireOnAvailableCallBack(_this);
        }, 0);
      } // Fire onRefresh if not yet fired and not from cache


      if (this._isRefreshing && __WEBPACK_IMPORTED_MODULE_1__utils_js__["k" /* isFn */](this._refreshCallback) && this._refreshCallbackFired === false) {
        if (fromCache === false || this._isRefreshingWithFetch === false) {
          // Cancel pending watchdog
          if (this._refreshCallbackTimerId) {
            __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]("Cancelling pending onRefreshCallback watchdog");
            clearTimeout(this._refreshCallbackTimerId);
            this._refreshCallbackTimerId = undefined;
          }

          this._refreshCallbackTimerId = setTimeout(function () {
            return Id5Status.doFireOnRefreshCallBack(_this);
          }, 0);
        }
      } // Always fire onUpdate if any change


      if (hasChanged && __WEBPACK_IMPORTED_MODULE_1__utils_js__["k" /* isFn */](this._updateCallback)) {
        setTimeout(function () {
          return Id5Status.doFireOnUpdateCallBack(_this);
        }, 0);
      }
    }
    /**
     * Return the current userId if available and not in control group
     * @return {string} userId
     */

  }, {
    key: "getUserId",
    value: function getUserId() {
      return this._isExposed === false ? '0' : this._userId;
    }
    /**
     * Return the current linkType if available and not in control group
     * @return {number} linkType
     */

  }, {
    key: "getLinkType",
    value: function getLinkType() {
      return this._isExposed === false ? 0 : this._linkType;
    }
    /**
     * Return true if the userId provided is from cache
     * @return {boolean}
     */

  }, {
    key: "isFromCache",
    value: function isFromCache() {
      return this._fromCache;
    }
    /**
     * Return true if we should expose this user Id within AB Test
     * @return {boolean}
     */

  }, {
    key: "exposeUserId",
    value: function exposeUserId() {
      return this._isExposed;
    }
    /**
     * Return the current userId in an object that can be added to the
     * eids array of an OpenRTB bid request
     * @return {object}
     */

  }, {
    key: "getUserIdAsEid",
    value: function getUserIdAsEid() {
      return {
        source: __WEBPACK_IMPORTED_MODULE_0__constants_json___default.a.ID5_EIDS_SOURCE,
        uids: [{
          atype: 1,
          id: this.getUserId(),
          ext: {
            linkType: this.getLinkType(),
            abTestingControlGroup: !this.exposeUserId()
          }
        }]
      };
    }
    /**
     * Fire the provided callback when (and exactly once) a user id is available
     * if a timeout is provided, fire the callback at timeout even if user id is not yet available
     * @param {function(Id5Status)} fn - callback function, receiving the current Id5Status as first param
     * @param {number} [timeout] - watchdog timeout in ms
     * @return {Id5Status} the current Id5Status for chaining
     */

  }, {
    key: "onAvailable",
    value: function onAvailable(fn, timeout) {
      if (!__WEBPACK_IMPORTED_MODULE_1__utils_js__["k" /* isFn */](fn)) {
        throw new Error('onAvailable expect a function');
      }

      if (__WEBPACK_IMPORTED_MODULE_1__utils_js__["k" /* isFn */](this._availableCallback)) {
        __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]('onAvailable was already called, ignoring');
      } else {
        this._availableCallback = fn;
        var currentThis = this; // Preserve this within callback

        if (this._userIdAvailable) {
          __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]('Id5Status.onAvailable: User id already available firing callback immediately');
          this._availableCallbackTimerId = setTimeout(function () {
            return Id5Status.doFireOnAvailableCallBack(currentThis);
          }, 0);
        } else if (timeout > 0) {
          this._availableCallbackTimerId = setTimeout(function () {
            return Id5Status.doFireOnAvailableCallBack(currentThis);
          }, timeout);
        }
      }

      return this;
    }
    /**
     * Fire the provided callback each time a user id is available or updated.
     * Will be fired after onAvailable or onRefresh if both are provided
     * @param {function(Id5Status)} fn - callback function, receiving the current Id5Status as first param
     * @return {Id5Status} the current Id5Status for chaining
     */

  }, {
    key: "onUpdate",
    value: function onUpdate(fn) {
      if (!__WEBPACK_IMPORTED_MODULE_1__utils_js__["k" /* isFn */](fn)) {
        throw new Error('onUpdate expect a function');
      }

      this._updateCallback = fn;
      var currentThis = this; // Preserve this within callback

      if (this._userIdAvailable) {
        setTimeout(function () {
          return Id5Status.doFireOnUpdateCallBack(currentThis);
        }, 0);
      }

      return this;
    }
    /**
     * Fire the provided callback when (and exactly once) a user id is returned by refreshId()
     * if a timeout is provided, fire the callback at timeout even refersh is not done
     * @param {function(Id5Status)} fn - callback function, receiving the current Id5Status as first param
     * @param {number} [timeout] - watchdog timeout in ms
     * @return {Id5Status} the current Id5Status for chaining
     */

  }, {
    key: "onRefresh",
    value: function onRefresh(fn, timeout) {
      if (!__WEBPACK_IMPORTED_MODULE_1__utils_js__["k" /* isFn */](fn)) {
        throw new Error('onRefresh expect a function');
      } // We have a pending onRefresh, cancel it.


      if (this._refreshCallbackTimerId) {
        clearTimeout(this._refreshCallbackTimerId);
        this._refreshCallbackTimerId = undefined;
      }

      this._refreshCallback = fn;
      var currentThis = this; // Preserve this within callback
      // If we are already after a non-forced refreshId and we already have a user id, then callback immediately

      if (this._isRefreshing === true && this._isRefreshingWithFetch === false && this._userIdAvailable) {
        this._refreshCallbackTimerId = setTimeout(function () {
          return Id5Status.doFireOnRefreshCallBack(currentThis);
        }, 0);
      } else if (timeout > 0) {
        this._refreshCallbackTimerId = setTimeout(function () {
          return Id5Status.doFireOnRefreshCallBack(currentThis);
        }, timeout);
      }

      return this;
    }
    /**
     * @return {boolean|undefined} see {ClientStore.isLocalStorageAllowed}
     */

  }, {
    key: "localStorageAllowed",
    value: function localStorageAllowed() {
      return this.clientStore.localStorageAllowed();
    }
    /**
     * This function fire the onAvailable callback of the passed Id5Status
     * @param {Id5Status} currentId5Status
     */

  }], [{
    key: "doFireOnAvailableCallBack",
    value: function doFireOnAvailableCallBack(currentId5Status) {
      __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]("Id5Status.doFireOnAvailableCallBack");
      currentId5Status._availableCallbackFired = true;
      currentId5Status._availableCallbackTimerId = undefined;

      currentId5Status._availableCallback(currentId5Status);
    }
    /**
     * This function fire the onUpdate callback of the passed Id5Status
     * @param {Id5Status} currentId5Status
     */

  }, {
    key: "doFireOnUpdateCallBack",
    value: function doFireOnUpdateCallBack(currentId5Status) {
      __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]("Id5Status.doFireOnUpdateCallBack");

      currentId5Status._updateCallback(currentId5Status);
    }
    /**
     * This function fire the onRefresh callback of the passed Id5Status
     * @param {Id5Status} currentId5Status
     */

  }, {
    key: "doFireOnRefreshCallBack",
    value: function doFireOnRefreshCallBack(currentId5Status) {
      __WEBPACK_IMPORTED_MODULE_1__utils_js__["q" /* logInfo */]("Id5Status.doFireOnRefreshCallBack");
      currentId5Status._refreshCallbackFired = true;
      currentId5Status._refreshCallbackTimerId = undefined;
      currentId5Status._isRefreshing = false;
      currentId5Status._isRefreshingWithFetch = false;

      currentId5Status._refreshCallback(currentId5Status);
    }
  }]);

  return Id5Status;
}();



/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return version; });
// generated by genversion
var version = '1.0.13';

/***/ })
/******/ ]);
//# sourceMappingURL=id5-api.js.map