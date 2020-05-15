/**
 * id5-api.js - The ID5 API is designed to make accessing the ID5 Universal ID simple for publishers and their ad tech vendors. The ID5 Universal ID is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. For more information, visit https://id5.io/universal-id.
 * @version v0.9.0-pre
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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export newConfig */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return config; });
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Module for getting and setting ID5 API configuration.
 */
var utils = __webpack_require__(1);
/**
 * @typedef {Object} Id5Config
 * @property {boolean|false} debug - enable verbose debug mode (defaulting to id5_debug query string param if present, or false)
 * @property {boolean|false} allowID5WithoutConsentApi - Allow ID5 to fetch user id even if no consent API
 * @property {(string|undefined)} cookieName - ID5 1st party cookie name (defaulting to id5.1st)
 * @property {(number|undefined)} refreshInSeconds - Refresh period of first-party cookie (defaulting to 7200s)
 * @property {(number|undefined)} cookieExpirationInSeconds - Expiration of 1st party cookie (defaulting to 90 days)
 * @property {(number)} partnerId - ID5 Publisher ID, mandatory
 * @property {(string|undefined)} partnerUserId - User ID for the publisher, to be stored by ID5 for further matching if provided
 * @property {(string|undefined)} cmpApi - API to use CMP. As of today, either 'iab' or 'static'
 * @property {(object|undefined)} consentData - Consent data if cmpApi is 'static'
 */


function newConfig() {
  /**
   * @property {Id5Config}
   */
  var config;
  var configTypes = {
    debug: 'Boolean',
    allowID5WithoutConsentApi: 'Boolean',
    cmpApi: 'String',
    consentData: 'Object',
    cookieName: 'String',
    refreshInSeconds: 'Number',
    cookieExpirationInSeconds: 'Number',
    partnerId: 'Number',
    partnerUserId: 'String',
    pd: 'String'
  };

  function resetConfig() {
    config = {
      debug: utils.getParameterByName('id5_debug').toUpperCase() === 'TRUE',
      allowID5WithoutConsentApi: false,
      cmpApi: 'iab',
      consentData: {
        getConsentData: {
          consentData: undefined,
          gdprApplies: undefined
        },
        getVendorConsents: {}
      },
      cookieName: 'id5.1st',
      refreshInSeconds: 7200,
      cookieExpirationInSeconds: 90 * 24 * 60 * 60,
      partnerId: undefined,
      partnerUserId: undefined,
      pd: ''
    };
  }
  /**
   * Return current configuration
   * @returns {Id5Config} options
   */


  function getConfig() {
    return config;
  }
  /**
   * Sets configuration given an object containing key-value pairs
   * @param {Id5Config} options
   * @returns {Id5Config} options
   */


  function setConfig(options) {
    if (_typeof(options) !== 'object') {
      utils.logError('setConfig options must be an object');
      return undefined;
    }

    Object.keys(options).forEach(function (topic) {
      if (utils.isA(options[topic], configTypes[topic])) {
        config[topic] = options[topic];
      } else {
        utils.logError("setConfig options ".concat(topic, " must be of type ").concat(configTypes[topic], " but was ").concat(toString.call(options[topic])));
      }
    });
    return config;
  }

  resetConfig();
  return {
    getConfig: getConfig,
    setConfig: setConfig,
    resetConfig: resetConfig
  };
}
var config = newConfig();

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "bind", function() { return bind; });
/* harmony export (immutable) */ __webpack_exports__["replaceTokenInString"] = replaceTokenInString;
/* harmony export (immutable) */ __webpack_exports__["logMessage"] = logMessage;
/* harmony export (immutable) */ __webpack_exports__["logInfo"] = logInfo;
/* harmony export (immutable) */ __webpack_exports__["logWarn"] = logWarn;
/* harmony export (immutable) */ __webpack_exports__["logError"] = logError;
/* harmony export (immutable) */ __webpack_exports__["debugTurnedOn"] = debugTurnedOn;
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
/* harmony export (immutable) */ __webpack_exports__["parseQS"] = parseQS;
/* harmony export (immutable) */ __webpack_exports__["formatQS"] = formatQS;
/* harmony export (immutable) */ __webpack_exports__["parse"] = parse;
/* harmony export (immutable) */ __webpack_exports__["format"] = format;
/* harmony export (immutable) */ __webpack_exports__["ajax"] = ajax;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__config__ = __webpack_require__(0);
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

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
  return args;
}

function debugTurnedOn() {
  return __WEBPACK_IMPORTED_MODULE_0__config__["a" /* config */].getConfig().debug;
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
 * @param {Function(value, key, object)} fn
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
 * @param {Function(value, key, object)} callback
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

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ID5", function() { return ID5; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__id5_apiGlobal__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__config__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__consentManagement__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__refererDetection__ = __webpack_require__(5);
/** @module id5-api */





var ID5 = Object(__WEBPACK_IMPORTED_MODULE_0__id5_apiGlobal__["a" /* getGlobal */])();
ID5.loaded = true;
ID5.initialized = false;
/**
 * This function will initialize ID5, wait for consent then try to fetch or refresh ID5 user id if required
 * @param {Id5Config} options
 * @alias module:ID5.init
 */
// TODO: Use Async init by pushing setting in a queue

ID5.init = function (options) {
  try {
    __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]('Invoking ID5.init', arguments);
    var cfg = __WEBPACK_IMPORTED_MODULE_1__config__["a" /* config */].setConfig(options);
    ID5.userConfig = options;
    ID5.config = cfg;
    ID5.initialized = true;
    ID5.getConfig = __WEBPACK_IMPORTED_MODULE_1__config__["a" /* config */].getConfig;
    var referer = Object(__WEBPACK_IMPORTED_MODULE_4__refererDetection__["a" /* getRefererInfo */])();
    __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]("ID5 detected referer is ".concat(referer.referer));
    var storedResponse = JSON.parse(__WEBPACK_IMPORTED_MODULE_2__utils__["getCookie"](cfg.cookieName));
    var storedDate = new Date(+__WEBPACK_IMPORTED_MODULE_2__utils__["getCookie"](lastCookieName(cfg)));
    var refreshNeeded = storedDate.getTime() > 0 && Date.now() - storedDate.getTime() > cfg.refreshInSeconds * 1000;
    var expiresStr = new Date(Date.now() + cfg.cookieExpirationInSeconds * 1000).toUTCString();
    var nb = getNbFromCookie(cfg);
    var idSetFromStoredResponse = false;

    if (storedResponse) {
      // this is needed to avoid losing the ID5ID from publishers that was
      // previously stored. Eventually we can remove this, once pubs have all
      // upgraded to this version of code
      if (storedResponse.ID5ID) {
        // TODO: remove this block when 1puid isn't needed
        ID5.userId = storedResponse.ID5ID;
      } else if (storedResponse.universal_uid) {
        ID5.userId = storedResponse.universal_uid;
        ID5.linkType = storedResponse.link_type || 0;
      }

      nb = incrementNb(cfg, expiresStr, nb);
      idSetFromStoredResponse = true;
      __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]('ID5 User ID available from cache:', storedResponse, storedDate, refreshNeeded);
    } else {
      __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]('No ID5 User ID available');
    }

    __WEBPACK_IMPORTED_MODULE_3__consentManagement__["b" /* requestConsent */](function (consentData) {
      if (__WEBPACK_IMPORTED_MODULE_3__consentManagement__["a" /* isLocalStorageAllowed */]()) {
        __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]('Consent to access local storage and cookies is given');

        if (!storedResponse || !storedResponse.universal_uid || !storedResponse.signature || refreshNeeded) {
          var gdprApplies = consentData && consentData.gdprApplies ? 1 : 0;
          var gdprConsentString = consentData && consentData.gdprApplies ? consentData.consentString : '';
          var url = "https://id5-sync.com/g/v2/".concat(cfg.partnerId, ".json?gdpr_consent=").concat(gdprConsentString, "&gdpr=").concat(gdprApplies);
          var signature = storedResponse && storedResponse.signature ? storedResponse.signature : '';
          var pubId = storedResponse && storedResponse.ID5ID ? storedResponse.ID5ID : ''; // TODO: remove when 1puid isn't needed

          var data = {
            '1puid': pubId,
            // TODO: remove when 1puid isn't needed
            'v': ID5.version || '',
            'o': 'api',
            'rf': referer.referer,
            'u': referer.stack[0] || window.location.href,
            'top': referer.reachedTop ? 1 : 0,
            's': signature,
            'pd': cfg.pd || '',
            'nb': nb
          };
          __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]('Fetching ID5 user ID from:', url, data);
          __WEBPACK_IMPORTED_MODULE_2__utils__["ajax"](url, function (response) {
            var responseObj;

            if (response) {
              try {
                responseObj = JSON.parse(response);

                if (responseObj.universal_uid) {
                  ID5.userId = responseObj.universal_uid;
                  __WEBPACK_IMPORTED_MODULE_2__utils__["setCookie"](cfg.cookieName, response, expiresStr);
                  __WEBPACK_IMPORTED_MODULE_2__utils__["setCookie"](lastCookieName(cfg), Date.now(), expiresStr);
                  __WEBPACK_IMPORTED_MODULE_2__utils__["setCookie"](nbCookieName(cfg), idSetFromStoredResponse ? 0 : 1, expiresStr);

                  if (responseObj.cascade_needed) {
                    // TODO: Should not use AJAX Call for cascades as some partners may not have CORS Headers
                    var isSync = cfg.partnerUserId && cfg.partnerUserId.length > 0;
                    var syncUrl = "https://id5-sync.com/".concat(isSync ? 's' : 'i', "/").concat(cfg.partnerId, "/8.gif");
                    __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]('Opportunities to cascade available:', syncUrl, data);
                    __WEBPACK_IMPORTED_MODULE_2__utils__["ajax"](syncUrl, function () {}, {
                      puid: isSync ? cfg.partnerUserId : null,
                      gdpr: gdprApplies,
                      gdpr_consent: gdprConsentString
                    }, {
                      method: 'GET',
                      withCredentials: true
                    });
                  } // TODO: Server should use 1puid to override uid if not in 3rd party cookie

                } else {
                  __WEBPACK_IMPORTED_MODULE_2__utils__["logError"]('Invalid response from ID5 servers:', response);
                }
              } catch (error) {
                __WEBPACK_IMPORTED_MODULE_2__utils__["logError"](error);
              }
            }
          }, JSON.stringify(data), {
            method: 'POST',
            withCredentials: true,
            contentType: 'application/json; charset=utf-8'
          });
        }
      } else {
        __WEBPACK_IMPORTED_MODULE_2__utils__["logInfo"]('No legal basis to use ID5', consentData);
      }
    });
  } catch (e) {
    __WEBPACK_IMPORTED_MODULE_2__utils__["logError"]('Exception catch', e);
  }
};

function lastCookieName(cfg) {
  return "".concat(cfg.cookieName, "_last");
}

function nbCookieName(cfg) {
  return "".concat(cfg.cookieName, "_nb");
}

function getNbFromCookie(cfg) {
  var cachedNb = __WEBPACK_IMPORTED_MODULE_2__utils__["getCookie"](nbCookieName(cfg));
  return cachedNb ? parseInt(cachedNb) : 0;
}

function incrementNb(cfg, expiresStr, nb) {
  nb++;
  __WEBPACK_IMPORTED_MODULE_2__utils__["setCookie"](nbCookieName(cfg), nb, expiresStr);
  return nb;
}

/* harmony default export */ __webpack_exports__["default"] = (ID5);

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = getGlobal;
window.ID5 = window.ID5 || {};
function getGlobal() {
  return window.ID5;
}

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export consentData */
/* unused harmony export staticConsentData */
/* harmony export (immutable) */ __webpack_exports__["b"] = requestConsent;
/* unused harmony export resetConsentData */
/* harmony export (immutable) */ __webpack_exports__["a"] = isLocalStorageAllowed;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__config__ = __webpack_require__(0);


/**
 * @typedef {Object} ConsentData
 * @property {String|undefined} consentString -
 * @property {Object|undefined} vendorData -
 * @property {(boolean|undefined)} gdprApplies - does GDPR apply for this user ?
 */

/**
 * @property {ConsentData}
 */

var consentData;
var staticConsentData;
var cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};
/**
 * This function reads the consent string from the config to obtain the consent information of the user.
 * @param {function(string, function(object))} cmpSuccess acts as a success callback when the value is read from config; pass along consentObject (string) from CMP
 * @param {function(object)} finalCallback acts as an error callback while interacting with the config string; pass along an error message (string)
 */

function lookupStaticConsentData(cmpSuccess, finalCallback) {
  cmpSuccess(staticConsentData, finalCallback);
}
/**
 * This function handles async interacting with an IAB compliant CMP to obtain the consent information of the user.
 * @param {function(string, function(object))} cmpSuccess acts as a success callback when CMP returns a value; pass along consentObject (string) from CMP
 * @param {function(object)} finalCallback required;
 */


function lookupIabConsent(cmpSuccess, finalCallback) {
  function handleCmpResponseCallbacks() {
    var cmpResponse = {};

    function afterEach() {
      if (cmpResponse.getConsentData && cmpResponse.getVendorConsents) {
        cmpSuccess(cmpResponse, finalCallback);
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

  var callbackHandler = handleCmpResponseCallbacks();
  var cmpFunction;

  try {
    cmpFunction = window.__cmp || window.top.__cmp;
  } catch (e) {}

  if (__WEBPACK_IMPORTED_MODULE_0__utils__["isFn"](cmpFunction)) {
    __WEBPACK_IMPORTED_MODULE_0__utils__["logInfo"]("cmpApi: calling getConsentData & getVendorConsents");
    cmpFunction('getConsentData', null, callbackHandler.consentDataCallback);
    cmpFunction('getVendorConsents', null, callbackHandler.vendorConsentsCallback);
  } else {
    cmpSuccess(undefined, finalCallback);
  }
}
/**
 * Try to fetch consent from CMP
 * @param {string} cmpApi - API to use to fetch consent. Either iab or static
 * @param {function(object)} finalCallback required; final callback
 */


function requestConsent(finalCallback) {
  var cfg = __WEBPACK_IMPORTED_MODULE_1__config__["a" /* config */].getConfig();

  if (cfg.allowID5WithoutConsentApi) {
    __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]('ID5 is operating in forced consent mode');
    finalCallback(consentData);
  } else if (!cmpCallMap[cfg.cmpApi]) {
    __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("Unknown consent API: ".concat(cfg.cmpApi));
    resetConsentData();
    finalCallback(consentData);
  } else if (!consentData) {
    if (cfg.cmpApi === 'static') {
      if (__WEBPACK_IMPORTED_MODULE_0__utils__["isPlainObject"](__WEBPACK_IMPORTED_MODULE_1__config__["a" /* config */].getConfig().consentData)) {
        staticConsentData = __WEBPACK_IMPORTED_MODULE_1__config__["a" /* config */].getConfig().consentData;
      } else {
        __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("cmpApi: 'static' did not specify consentData.");
      }
    }

    cmpCallMap[cfg.cmpApi].call(this, cmpSuccess, finalCallback);
  } else {
    finalCallback(consentData);
  }
}
/**
 * This function checks the consent data provided by CMP to ensure it's in an expected state.
 * @param {object} consentObject required; object returned by CMP that contains user's consent choices
 * @param {function(ConsentData)} finalCallback required; final callback receiving the consent
 */

function cmpSuccess(consentObject, finalCallback) {
  var gdprApplies = consentObject && consentObject.getConsentData && consentObject.getConsentData.gdprApplies;

  if (typeof gdprApplies !== 'boolean' || gdprApplies === true && !(__WEBPACK_IMPORTED_MODULE_0__utils__["isStr"](consentObject.getConsentData.consentData) && __WEBPACK_IMPORTED_MODULE_0__utils__["isPlainObject"](consentObject.getVendorConsents) && Object.keys(consentObject.getVendorConsents).length > 1)) {
    resetConsentData();
    __WEBPACK_IMPORTED_MODULE_0__utils__["logError"]("CMP returned unexpected value during lookup process.", consentObject);
  } else {
    consentData = {
      consentString: consentObject ? consentObject.getConsentData.consentData : undefined,
      vendorData: consentObject ? consentObject.getVendorConsents : undefined,
      gdprApplies: consentObject ? consentObject.getConsentData.gdprApplies : undefined
    };
  }

  finalCallback(consentData);
}
/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */


function resetConsentData() {
  consentData = undefined;
}
/**
 * test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
 * @returns {boolean}
 */

function isLocalStorageAllowed() {
  if (__WEBPACK_IMPORTED_MODULE_1__config__["a" /* config */].getConfig().allowID5WithoutConsentApi) {
    return true;
  } else if (!consentData) {
    return false;
  } else if (typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
    if (!consentData.consentString) {
      return false;
    } else if (consentData.vendorData && consentData.vendorData.purposeConsents && consentData.vendorData.purposeConsents['1'] === false) {
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
}

/***/ }),
/* 5 */
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

/***/ })
/******/ ]);
//# sourceMappingURL=id5-api.js.map
ID5.version = '0.9.0-pre';
