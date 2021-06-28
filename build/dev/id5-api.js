/**
 * @id5io/id5-api.js
 * @version v1.0.7
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
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export replaceTokenInString */
/* unused harmony export logMessage */
/* harmony export (immutable) */ __webpack_exports__["l"] = logInfo;
/* harmony export (immutable) */ __webpack_exports__["m"] = logWarn;
/* harmony export (immutable) */ __webpack_exports__["k"] = logError;
/* harmony export (immutable) */ __webpack_exports__["o"] = setGlobalDebug;
/* harmony export (immutable) */ __webpack_exports__["h"] = isGlobalDebug;
/* unused harmony export getParameterByName */
/* harmony export (immutable) */ __webpack_exports__["e"] = isA;
/* harmony export (immutable) */ __webpack_exports__["g"] = isFn;
/* harmony export (immutable) */ __webpack_exports__["j"] = isStr;
/* unused harmony export isArray */
/* unused harmony export isNumber */
/* harmony export (immutable) */ __webpack_exports__["i"] = isPlainObject;
/* harmony export (immutable) */ __webpack_exports__["f"] = isBoolean;
/* unused harmony export isEmpty */
/* harmony export (immutable) */ __webpack_exports__["d"] = getCookie;
/* harmony export (immutable) */ __webpack_exports__["n"] = setCookie;
/* unused harmony export parseQS */
/* unused harmony export formatQS */
/* unused harmony export parse */
/* unused harmony export format */
/* harmony export (immutable) */ __webpack_exports__["a"] = ajax;
/* unused harmony export fireAsyncPixel */
/* harmony export (immutable) */ __webpack_exports__["c"] = deferPixelFire;
/* harmony export (immutable) */ __webpack_exports__["b"] = cyrb53Hash;
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
          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */])('clientStore.get() has been called without localStorageAllowed');
        }
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */])(e);
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
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */])(e);
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
          Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */])('clientStore.put() has been called without localStorageAllowed');
        }
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */])(e);
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
        if (Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["d" /* getCookie */])(cookie)) {
          legacyStoredValue = Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["d" /* getCookie */])(cookie);
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
  }, {
    key: "putHashedConsentData",
    value: function putHashedConsentData(consentData) {
      this.put(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.CONSENT_DATA, ClientStore.makeStoredConsentDataHash(consentData));
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
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* setCookie */])("".concat(cookie), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* setCookie */])("".concat(cookie, "_nb"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* setCookie */])("".concat(cookie, "_").concat(partnerId, "_nb"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* setCookie */])("".concat(cookie, "_last"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* setCookie */])("".concat(cookie, ".cached_pd"), '', expired);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["n" /* setCookie */])("".concat(cookie, ".cached_consent_data"), '', expired);
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
    value: function storedConsentDataMatchesConsentData(consentData) {
      return ClientStore.storedDataMatchesCurrentData(this.getHashedConsentData(), ClientStore.makeStoredConsentDataHash(consentData));
    }
    /**
     * makes an object that can be stored with only the keys we need to check.
     * excluding the vendorConsents object since the consentString is enough to know
     * if consent has changed without needing to have all the details in an object
     * @param consentData
     * @returns string
     */

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
      return Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["b" /* cyrb53Hash */])(typeof userId === 'string' ? userId : '');
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
  }, {
    key: "makeStoredConsentDataHash",
    value: function makeStoredConsentDataHash(consentData) {
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

      return Object(__WEBPACK_IMPORTED_MODULE_0__utils_js__["b" /* cyrb53Hash */])(JSON.stringify(storedConsentData));
    }
  }]);

  return ClientStore;
}();



/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return ConsentManagement; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__constants_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__constants_json__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




var ConsentManagement = /*#__PURE__*/function () {
  /** @type {LocalStorage} */

  /**
   * @param {LocalStorage} localStorage the localStorage object to use
   */
  function ConsentManagement(localStorage) {
    _classCallCheck(this, ConsentManagement);

    _defineProperty(this, "consentData", void 0);

    _defineProperty(this, "staticConsentData", void 0);

    _defineProperty(this, "storedPrivacyData", void 0);

    _defineProperty(this, "cmpVersion", 0);

    _defineProperty(this, "localStorage", void 0);

    _defineProperty(this, "cmpCallMap", {
      'iab': this.lookupIabConsent,
      'static': this.lookupStaticConsentData
    });

    this.localStorage = localStorage;
  }
  /**
   * This function reads the consent string from the config to obtain the consent information of the user.
   * @param {function(ConsentManagement, string, function(object))} cmpSuccess acts as a success callback when the value is read from config; pass along consentObject (string) from CMP
   * @param {function(object)} finalCallback acts as an error callback while interacting with the config string; pass along an error message (string)
   */


  _createClass(ConsentManagement, [{
    key: "lookupStaticConsentData",
    value: function lookupStaticConsentData(cmpSuccess, finalCallback) {
      this.cmpVersion = this.staticConsentData.getConsentData ? 1 : this.staticConsentData.getTCData ? 2 : 0;
      __WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* logInfo */]("Using static consent data from config for TCF v".concat(this.cmpVersion), this.staticConsentData);

      if (this.cmpVersion === 2) {
        // remove extra layer in static v2 data object so it matches normal v2 CMP object for processing step
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
    value:
    /**
     * This function handles async interacting with an IAB compliant CMP to obtain the consent information of the user.
     * @param {function(ConsentManagement, string, function(object))} cmpSuccess acts as a success callback when CMP returns a value; pass along consentObject (string) from CMP
     * @param {function(object)} finalCallback required;
     */
    function lookupIabConsent(cmpSuccess, finalCallback) {
      var consentThis = this;

      function v2CmpResponseCallback(tcfData, success) {
        __WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* logInfo */]('Received a response from CMP', tcfData);

        if (success) {
          if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
            cmpSuccess(consentThis, tcfData, finalCallback);
          }
        } else {
          __WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */]("CMP unable to register callback function.  Please check CMP setup.");
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
            __WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* logInfo */]("cmpApi: consentDataCallback");
            cmpResponse.getConsentData = consentResponse;
            afterEach();
          },
          vendorConsentsCallback: function vendorConsentsCallback(consentResponse) {
            __WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* logInfo */]("cmpApi: vendorConsentsCallback");
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
        __WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */]("CMP not found");
        cmpSuccess(consentThis, undefined, finalCallback);
        return;
      }

      if (__WEBPACK_IMPORTED_MODULE_0__utils_js__["g" /* isFn */](cmpFunction)) {
        __WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* logInfo */]("cmpApi: calling getConsentData & getVendorConsents");

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
        __WEBPACK_IMPORTED_MODULE_0__utils_js__["m" /* logWarn */]('ID5 is operating in forced consent mode and will not retrieve any consent signals from the CMP');
        finalCallback(this.consentData);
      } else if (!this.cmpCallMap[cmpApi]) {
        __WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */]("Unknown consent API: ".concat(cmpApi));
        this.resetConsentData();
        finalCallback(this.consentData);
      } else if (!this.consentData) {
        if (cmpApi === 'static') {
          if (__WEBPACK_IMPORTED_MODULE_0__utils_js__["i" /* isPlainObject */](providedConsentData)) {
            this.staticConsentData = providedConsentData;
          } else {
            __WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */]("cmpApi: 'static' did not specify consent data.");
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
    value:
    /**
     * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
     */
    function resetConsentData() {
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
     * @returns {boolean|undefined} undefined in case no consent data and no stored privacy info is available
     */

  }, {
    key: "isLocalStorageAllowed",
    value: function isLocalStorageAllowed(allowLocalStorageWithoutConsentApi, debugBypassConsent) {
      if (allowLocalStorageWithoutConsentApi === true || debugBypassConsent === true) {
        __WEBPACK_IMPORTED_MODULE_0__utils_js__["m" /* logWarn */]('Local storage access granted by configuration override, consent will not be checked');
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
     * @return {boolean|undefined}
     */

  }, {
    key: "isProvisionalLocalStorageAllowed",
    value: function isProvisionalLocalStorageAllowed() {
      if (!__WEBPACK_IMPORTED_MODULE_0__utils_js__["i" /* isPlainObject */](this.storedPrivacyData)) {
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
        if (__WEBPACK_IMPORTED_MODULE_0__utils_js__["i" /* isPlainObject */](privacy)) {
          this.storedPrivacyData = privacy;
          this.localStorage.setItemWithExpiration(__WEBPACK_IMPORTED_MODULE_1__constants_json___default.a.STORAGE_CONFIG.PRIVACY, JSON.stringify(privacy));
        } else {
          __WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* logInfo */]('Cannot store privacy if it is not an object: ', privacy);
        }
      } catch (e) {
        __WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */](e);
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
        return !!(typeof gdprApplies !== 'boolean' || gdprApplies === true && !(__WEBPACK_IMPORTED_MODULE_0__utils_js__["j" /* isStr */](consentObject.getConsentData.consentData) && __WEBPACK_IMPORTED_MODULE_0__utils_js__["i" /* isPlainObject */](consentObject.getVendorConsents) && Object.keys(consentObject.getVendorConsents).length > 1));
      }

      function checkV2Data() {
        var gdprApplies = consentObject && typeof consentObject.gdprApplies === 'boolean' ? consentObject.gdprApplies : undefined;
        var tcString = consentObject && consentObject.tcString;
        return !!(typeof gdprApplies !== 'boolean' || gdprApplies === true && !__WEBPACK_IMPORTED_MODULE_0__utils_js__["j" /* isStr */](tcString));
      } // determine which set of checks to run based on cmpVersion


      var checkFn = consentThis.cmpVersion === 1 ? checkV1Data : consentThis.cmpVersion === 2 ? checkV2Data : null;
      __WEBPACK_IMPORTED_MODULE_0__utils_js__["l" /* logInfo */]('CMP Success callback for version', consentThis.cmpVersion, checkFn);

      if (__WEBPACK_IMPORTED_MODULE_0__utils_js__["g" /* isFn */](checkFn)) {
        if (checkFn(consentObject)) {
          consentThis.resetConsentData();
          __WEBPACK_IMPORTED_MODULE_0__utils_js__["k" /* logError */]("CMP returned unexpected value during lookup process.", consentObject);
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



/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Config; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(0);
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
 */

/**
 * @typedef {Object} AbTestConfig
 * @property {boolean|false} [enabled] - Enable control group
 * @property {number} [controlGroupPct] - Ratio of users in control group [0,1]
 */

var Config = /*#__PURE__*/function () {
  /** @type {Id5Options} */

  /** @type {Id5Options} */

  /**
   * Create configuration instance from an object containing key-value pairs
   * @param {Id5Options} options
   */
  function Config(options) {
    _classCallCheck(this, Config);

    _defineProperty(this, "options", void 0);

    _defineProperty(this, "providedOptions", void 0);

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
      applyCreativeRestrictions: false
    };
    this.providedOptions = {};

    if (!options.partnerId || typeof options.partnerId !== 'number') {
      throw new Error('partnerId is required and must be a number');
    }

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
     * Override the configuration with an object containing key-value pairs
     * @param {Id5Options} options
     */

  }, {
    key: "updOptions",
    value: function updOptions(options) {
      var _this = this;

      if (_typeof(options) !== 'object') {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])('Config options must be an object');
        return;
      }

      if (typeof this.options.partnerId === 'number' && // Might be undefined
      typeof options.partnerId === 'number' && options.partnerId !== this.options.partnerId) {
        throw new Error('Cannot update config with a different partnerId');
      }

      Object.keys(options).forEach(function (topic) {
        if (Object(__WEBPACK_IMPORTED_MODULE_0__utils__["e" /* isA */])(options[topic], Config.configTypes[topic])) {
          _this.options[topic] = options[topic];
          _this.providedOptions[topic] = options[topic];
        } else {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])("updOptions options ".concat(topic, " must be of type ").concat(Config.configTypes[topic], " but was ").concat(toString.call(options[topic])));
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



/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__lib_id5_api__ = __webpack_require__(6);


if (!window.ID5) {
  window.ID5 = __WEBPACK_IMPORTED_MODULE_0__lib_id5_api__["a" /* default */];
} else {// TODO: Check for different versions in the same page at init
}

/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__refererDetection__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__clientStore__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__consentManagement__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__id5Status__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__generated_version_js__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__localStorage_js__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__config__ = __webpack_require__(4);
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
    this._referer = Object(__WEBPACK_IMPORTED_MODULE_1__refererDetection__["a" /* getRefererInfo */])();
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
      return Object(__WEBPACK_IMPORTED_MODULE_0__utils__["h" /* isGlobalDebug */])();
    }
    /** @type {boolean} */
    ,
    set:
    /** @type {boolean} */

    /** @type {boolean} */
    function set(isDebug) {
      Object(__WEBPACK_IMPORTED_MODULE_0__utils__["o" /* setGlobalDebug */])(isDebug);
    }
  }, {
    key: "init",
    value: function init(passedOptions) {
      try {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('Invoking Id5Api.init', arguments);
        var config = new __WEBPACK_IMPORTED_MODULE_7__config__["a" /* default */](passedOptions);
        var options = config.getOptions(); // By using window.top we say we want to use storage only if we're in a first-party context

        var localStorage = new __WEBPACK_IMPORTED_MODULE_6__localStorage_js__["a" /* default */](window.top, !options.applyCreativeRestrictions);
        var consentManagement = new __WEBPACK_IMPORTED_MODULE_3__consentManagement__["a" /* default */](localStorage);
        var clientStore = new __WEBPACK_IMPORTED_MODULE_2__clientStore__["a" /* default */](function () {
          return consentManagement.isLocalStorageAllowed(options.allowLocalStorageWithoutConsentApi, options.debugBypassConsent);
        }, localStorage);
        var partnerStatus = new __WEBPACK_IMPORTED_MODULE_4__id5Status__["a" /* default */](config, clientStore, consentManagement);
        this.getId(partnerStatus, false);
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])("ID5 initialized for partner ".concat(options.partnerId, " with referer ").concat(this._referer.referer, " and options"), passedOptions);
        return partnerStatus;
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])('Exception caught from Id5Api.init', e);
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

      if (!Object(__WEBPACK_IMPORTED_MODULE_0__utils__["f" /* isBoolean */])(forceFetch)) {
        throw new Error('Invalid signature for Id5Api.refreshId: second parameter must be a boolean');
      }

      try {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('Invoking Id5Api.refreshId', arguments);
        id5Status.startRefresh(forceFetch);
        id5Status.updateOptions(options);
        id5Status.consentManagement.resetConsentData();
        this.getId(id5Status, forceFetch);
      } catch (e) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])('Exception caught from Id5Api.refreshId', e);
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
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('ID5 User ID available from cache:', {
          storedResponse: storedResponse,
          storedDateTime: storedDateTime,
          refreshNeeded: refreshInSecondsHasElapsed
        });
      } else if (storedResponse && storedResponse.universal_uid && pdHasChanged) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('PD value has changed, so ignoring User ID from cache');
      } else if (storedResponse && !storedResponse.universal_uid) {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])('Invalid stored response: ', storedResponse);
      } else {
        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('No ID5 User ID available from cache');
      }

      id5Status.consentManagement.requestConsent(options.debugBypassConsent, options.cmpApi, options.consentData, function (consentData) {
        if (id5Status.localStorageAllowed() !== false) {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('Consent to access local storage is: ' + id5Status.localStorageAllowed());
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
            var gdprApplies = consentData && consentData.gdprApplies ? 1 : 0;
            var gdprConsentString = consentData && consentData.gdprApplies ? consentData.consentString : undefined;
            var signature = storedResponse && storedResponse.signature ? storedResponse.signature : undefined;
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

            if (typeof gdprConsentString !== 'undefined') {
              data.gdpr_consent = gdprConsentString;
            }

            if (typeof signature !== 'undefined') {
              data.s = signature;
            }

            if (typeof options.pd !== 'undefined') {
              data.pd = options.pd;
            }

            if (typeof options.partnerUserId !== 'undefined') {
              data.puid = options.partnerUserId;
            }

            if (typeof options.provider !== 'undefined') {
              data.provider = options.provider;
            } // pass in A/B Testing configuration, if applicable


            if (options.abTesting.enabled === true) {
              data.ab_testing = {
                enabled: true,
                control_group_pct: id5Status.getOptions().abTesting.controlGroupPct
              };
            }

            Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('Fetching ID5 user ID from:', url, data);

            if (forceFetch) {
              Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('...with Force Fetch');
            }

            Object(__WEBPACK_IMPORTED_MODULE_0__utils__["a" /* ajax */])(url, {
              success: function success(response) {
                Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('Response from ID5 received:', response);
                var responseObj;

                if (response) {
                  try {
                    responseObj = JSON.parse(response);
                    Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('Valid json response from ID5 received:', responseObj);

                    if (Object(__WEBPACK_IMPORTED_MODULE_0__utils__["j" /* isStr */])(responseObj.universal_uid)) {
                      id5Status.setUserId(responseObj, false); // privacy has to be stored first so we can use it when storing other values

                      id5Status.consentManagement.setStoredPrivacy(responseObj.privacy); // @TODO: typeof responseObj.privacy === 'undefined' is only needed until fetch endpoint is updated and always returns a privacy object
                      // once it does, I don't see a reason to keep that part of the if clause

                      if (id5Status.localStorageAllowed() === true || typeof responseObj.privacy === 'undefined') {
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
                        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('Opportunities to cascade available:', syncUrl);
                        Object(__WEBPACK_IMPORTED_MODULE_0__utils__["c" /* deferPixelFire */])(syncUrl);
                      }
                    } else {
                      Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])('Invalid response from ID5 servers:', response);
                    }
                  } catch (error) {
                    Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])(error);
                  }
                } else {
                  Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])('Empty response from ID5 servers:', response);
                }
              },
              error: function error(_error) {
                Object(__WEBPACK_IMPORTED_MODULE_0__utils__["k" /* logError */])(_error);
              }
            }, JSON.stringify(data), {
              method: 'POST',
              withCredentials: true
            });
          }
        } else {
          Object(__WEBPACK_IMPORTED_MODULE_0__utils__["l" /* logInfo */])('No legal basis to use ID5', consentData);
        }
      });
    }
  }]);

  return Id5Api;
}();

var ID5 = new Id5Api();
/* harmony default export */ __webpack_exports__["a"] = (ID5);

/***/ }),
/* 7 */
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
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Id5Status; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__constants_json__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__constants_json___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__constants_json__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__config__ = __webpack_require__(4);
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

      if (__WEBPACK_IMPORTED_MODULE_1__utils__["i" /* isPlainObject */](response.ab_testing)) {
        switch (response.ab_testing.result) {
          case 'normal':
            // nothing to do
            break;

          default: // falls through

          case 'error':
            __WEBPACK_IMPORTED_MODULE_1__utils__["k" /* logError */]('There was an error with A/B Testing. Make sure controlGroupRatio is a number >= 0 and <= 1');
            break;

          case 'control':
            this._isExposed = false;
            __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]('User is in control group!');
            break;
        }
      }

      var hasChanged = this._userId !== userId || this._linkType !== linkType;
      this._userIdAvailable = true;
      this._userId = userId;
      this._linkType = linkType;
      this._fromCache = fromCache;
      __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]("Id5Status.setUserId: user id updated, hasChanged: ".concat(hasChanged)); // Fire onAvailable if not yet fired

      if (__WEBPACK_IMPORTED_MODULE_1__utils__["g" /* isFn */](this._availableCallback) && this._availableCallbackFired === false) {
        // Cancel pending watchdog
        if (this._availableCallbackTimerId) {
          __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]("Cancelling pending onAvailableCallback watchdog");
          clearTimeout(this._availableCallbackTimerId);
          this._availableCallbackTimerId = undefined;
        }

        this._availableCallbackTimerId = setTimeout(function () {
          return Id5Status.doFireOnAvailableCallBack(_this);
        }, 0);
      } // Fire onRefresh if not yet fired and not from cache


      if (this._isRefreshing && __WEBPACK_IMPORTED_MODULE_1__utils__["g" /* isFn */](this._refreshCallback) && this._refreshCallbackFired === false) {
        if (fromCache === false || this._isRefreshingWithFetch === false) {
          // Cancel pending watchdog
          if (this._refreshCallbackTimerId) {
            __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]("Cancelling pending onRefreshCallback watchdog");
            clearTimeout(this._refreshCallbackTimerId);
            this._refreshCallbackTimerId = undefined;
          }

          this._refreshCallbackTimerId = setTimeout(function () {
            return Id5Status.doFireOnRefreshCallBack(_this);
          }, 0);
        }
      } // Always fire onUpdate if any change


      if (hasChanged && __WEBPACK_IMPORTED_MODULE_1__utils__["g" /* isFn */](this._updateCallback)) {
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
      if (!__WEBPACK_IMPORTED_MODULE_1__utils__["g" /* isFn */](fn)) {
        throw new Error('onAvailable expect a function');
      }

      if (__WEBPACK_IMPORTED_MODULE_1__utils__["g" /* isFn */](this._availableCallback)) {
        __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]('onAvailable was already called, ignoring');
      } else {
        this._availableCallback = fn;
        var currentThis = this; // Preserve this within callback

        if (this._userIdAvailable) {
          __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]('Id5Status.onAvailable: User id already available firing callback immediately');
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
      if (!__WEBPACK_IMPORTED_MODULE_1__utils__["g" /* isFn */](fn)) {
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
      if (!__WEBPACK_IMPORTED_MODULE_1__utils__["g" /* isFn */](fn)) {
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
      __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]("Id5Status.doFireOnAvailableCallBack");
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
      __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]("Id5Status.doFireOnUpdateCallBack");

      currentId5Status._updateCallback(currentId5Status);
    }
    /**
     * This function fire the onRefresh callback of the passed Id5Status
     * @param {Id5Status} currentId5Status
     */

  }, {
    key: "doFireOnRefreshCallBack",
    value: function doFireOnRefreshCallBack(currentId5Status) {
      __WEBPACK_IMPORTED_MODULE_1__utils__["l" /* logInfo */]("Id5Status.doFireOnRefreshCallBack");
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
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return version; });
// generated by genversion
var version = '1.0.7';

/***/ }),
/* 10 */
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

/***/ })
/******/ ]);
//# sourceMappingURL=id5-api.js.map