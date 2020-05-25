/**
 * id5-api.js - The ID5 API is designed to make accessing the ID5 Universal ID simple for publishers and their ad tech vendors. The ID5 Universal ID is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. For more information, visit https://id5.io/universal-id.
 * @version v0.9.0
 * @link https://id5.io/
 * @license Apache-2.0
 */
!function(t){var o={};function r(n){if(o[n])return o[n].exports;var e=o[n]={i:n,l:!1,exports:{}};return t[n].call(e.exports,e,e.exports,r),e.l=!0,e.exports}r.m=t,r.c=o,r.d=function(n,e,t){r.o(n,e)||Object.defineProperty(n,e,{configurable:!1,enumerable:!0,get:t})},r.n=function(n){var e=n&&n.__esModule?function(){return n.default}:function(){return n};return r.d(e,"a",e),e},r.o=function(n,e){return Object.prototype.hasOwnProperty.call(n,e)},r.p="",r(r.s=2)}([function(n,e,t){"use strict";function r(n){return(r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n})(n)}t.d(e,"a",function(){return o});var i=t(1);var o=function(){var t,o={debug:"Boolean",allowID5WithoutConsentApi:"Boolean",cmpApi:"String",consentData:"Object",cookieName:"String",refreshInSeconds:"Number",cookieExpirationInSeconds:"Number",partnerId:"Number",partnerUserId:"String",pd:"String"};function n(){t={debug:"TRUE"===i.getParameterByName("id5_debug").toUpperCase(),allowID5WithoutConsentApi:!1,cmpApi:"iab",consentData:{getConsentData:{consentData:void 0,gdprApplies:void 0},getVendorConsents:{}},cookieName:"id5.1st",refreshInSeconds:7200,cookieExpirationInSeconds:7776e3,partnerId:void 0,partnerUserId:void 0,pd:""}}return n(),{getConfig:function(){return t},setConfig:function(e){if("object"===r(e))return Object.keys(e).forEach(function(n){i.isA(e[n],o[n])?t[n]=e[n]:i.logError("setConfig options ".concat(n," must be of type ").concat(o[n]," but was ").concat(toString.call(e[n])))}),t;i.logError("setConfig options must be an object")},resetConfig:n}}()},function(n,e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),t.d(e,"bind",function(){return I}),e.replaceTokenInString=function(r,n,i){return x(n,function(n,e){n=void 0===n?"":n;var t=i+e.toUpperCase()+i,o=new RegExp(t,"g");r=r.replace(o,n)}),r},e.logMessage=C,e.logInfo=function(){S()&&m&&console.info.apply(console,D(arguments,"INFO:"))},e.logWarn=function(){S()&&y&&console.warn.apply(console,D(arguments,"WARNING:"))},e.logError=w,e.debugTurnedOn=S,e.getParameterByName=function(n){var e=new RegExp("[\\?&]"+n+"=([^&#]*)").exec(window.location.search);return null!==e?decodeURIComponent(e[1].replace(/\+/g," ")):""},e.isA=k,e.isFn=A,e.isStr=O,e.isArray=j,e.isNumber=function(n){return k(n,s)},e.isPlainObject=function(n){return k(n,f)},e.isBoolean=function(n){return k(n,p)},e.isEmpty=E,e._each=x,e._map=function(t,o){if(E(t))return[];if(A(t.map))return t.map(o);var r=[];return x(t,function(n,e){r.push(o(n,e,t))}),r},e.isSafariBrowser=function(){return/^((?!chrome|android).)*safari/i.test(navigator.userAgent)},e.checkCookieSupport=function(){if(window.navigator.cookieEnabled||document.cookie.length)return!0},e.cookiesAreEnabled=function(){return window.document.cookie="id5.cookieTest",-1!==window.document.cookie.indexOf("id5.cookieTest")},e.getCookie=function(n){var e=window.document.cookie.match("(^|;)\\s*"+n+"\\s*=\\s*([^;]*)\\s*(;|$)");return e?decodeURIComponent(e[2]):null},e.setCookie=function(n,e,t){document.cookie="".concat(n,"=").concat(encodeURIComponent(e)).concat(""!==t?"; expires=".concat(t):"","; path=/")},e.parseQS=T,e.formatQS=U,e.parse=_,e.format=N,e.ajax=function(n,e,t){var o=3<arguments.length&&void 0!==arguments[3]?arguments[3]:{};try{var r,i=o.method||(t?"POST":"GET"),a=document.createElement("a");a.href=n;var c="object"===l(e)&&null!==e?e:{success:function(){C("xhr success")},error:function(n){w("xhr error",null,n)}};if("function"==typeof e&&(c.success=e),(r=new window.XMLHttpRequest).onreadystatechange=function(){if(r.readyState===R){var n=r.status;200<=n&&n<300||304===n?c.success(r.responseText,r):c.error(r.statusText,r)}},r.ontimeout=function(){w("  xhr timeout after ",r.timeout,"ms")},"GET"===i&&t){var s=_(n,o);u(s.search,t),n=N(s)}r.open(i,n,!0),o.withCredentials&&(r.withCredentials=!0),x(o.customHeaders,function(n,e){r.setRequestHeader(e,n)}),o.preflight&&r.setRequestHeader("X-Requested-With","XMLHttpRequest"),r.setRequestHeader("Content-Type",o.contentType||"text/plain"),"POST"===i&&t?r.send(t):r.send()}catch(n){w("xhr construction",n)}};var o=t(0);function u(){return(u=Object.assign||function(n){for(var e=1;e<arguments.length;e++){var t=arguments[e];for(var o in t)Object.prototype.hasOwnProperty.call(t,o)&&(n[o]=t[o])}return n}).apply(this,arguments)}function l(n){return(l="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n})(n)}function i(n,e){return function(n){if(Array.isArray(n))return n}(n)||function(n,e){if(!(Symbol.iterator in Object(n)||"[object Arguments]"===Object.prototype.toString.call(n)))return;var t=[],o=!0,r=!1,i=void 0;try{for(var a,c=n[Symbol.iterator]();!(o=(a=c.next()).done)&&(t.push(a.value),!e||t.length!==e);o=!0);}catch(n){r=!0,i=n}finally{try{o||null==c.return||c.return()}finally{if(r)throw i}}return t}(n,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}var r="Array",a="String",c="Function",s="Number",f="Object",p="Boolean",d=Object.prototype.toString,g=Boolean(window.console),h=Boolean(g&&window.console.log),m=Boolean(g&&window.console.info),y=Boolean(g&&window.console.warn),v=Boolean(g&&window.console.error),b={},I=function(n,e){return e}.bind(null,1,b)()===b?Function.prototype.bind:function(n){var e=this,t=Array.prototype.slice.call(arguments,1);return function(){return e.apply(n,t.concat(Array.prototype.slice.call(arguments)))}};function C(){S()&&h&&console.log.apply(console,D(arguments,"MESSAGE:"))}function w(){S()&&v&&console.error.apply(console,D(arguments,"ERROR:"))}function D(n,e){return n=[].slice.call(n),e&&n.unshift(e),n}function S(){return o.a.getConfig().debug}function k(n,e){return d.call(n)==="[object "+e+"]"}function A(n){return k(n,c)}function O(n){return k(n,a)}function j(n){return k(n,r)}function E(n){if(!n)return!0;if(j(n)||O(n))return!(0<n.length);for(var e in n)if(hasOwnProperty.call(n,e))return!1;return!0}function x(n,e){if(!E(n)){if(A(n.forEach))return n.forEach(e,this);var t=0,o=n.length;if(0<o)for(;t<o;t++)e(n[t],t,n);else for(t in n)hasOwnProperty.call(n,t)&&e.call(this,n[t],t)}}function T(n){return n?n.replace(/^\?/,"").split("&").reduce(function(n,e){var t=i(e.split("="),2),o=t[0],r=t[1];return/\[\]$/.test(o)?(n[o=o.replace("[]","")]=n[o]||[],n[o].push(r)):n[o]=r||"",n},{}):{}}function U(n){return Object.keys(n).map(function(e){return Array.isArray(n[e])?n[e].map(function(n){return"".concat(e,"[]=").concat(n)}).join("&"):"".concat(e,"=").concat(n[e])}).join("&")}function _(n,e){var t=document.createElement("a");e&&"noDecodeWholeURL"in e&&e.noDecodeWholeURL?t.href=n:t.href=decodeURIComponent(n);var o=e&&"decodeSearchAsString"in e&&e.decodeSearchAsString;return{href:t.href,protocol:(t.protocol||"").replace(/:$/,""),hostname:t.hostname,port:+t.port,pathname:t.pathname.replace(/^(?!\/)/,"/"),search:o?t.search:T(t.search||""),hash:(t.hash||"").replace(/^#/,""),host:t.host||window.location.host}}function N(n){return(n.protocol||"http")+"://"+(n.host||n.hostname+(n.port?":".concat(n.port):""))+(n.pathname||"")+(n.search?"?".concat(U(n.search||"")):"")+(n.hash?"#".concat(n.hash):"")}var R=4},function(n,e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),t.d(e,"ID5",function(){return m});var o=t(3),r=t(0),g=t(1),h=t(4),i=t(5),m=Object(o.a)();function y(n){return"".concat(n.cookieName,"_last")}function v(n){return"".concat(n.cookieName,"_nb")}m.loaded=!0,m.initialized=!1,m.init=function(n){try{g.logInfo("Invoking ID5.init",arguments);var c=r.a.setConfig(n);m.userConfig=n,m.config=c,m.initialized=!0,m.getConfig=r.a.getConfig;var s=Object(i.a)();g.logInfo("ID5 detected referer is ".concat(s.referer));var u=JSON.parse(g.getCookie(c.cookieName)),e=new Date(+g.getCookie(y(c))),l=0<e.getTime()&&Date.now()-e.getTime()>1e3*c.refreshInSeconds,f=new Date(Date.now()+1e3*c.cookieExpirationInSeconds).toUTCString(),p=function(n){var e=g.getCookie(v(n));return e?parseInt(e):0}(c),d=!1;u?(u.ID5ID?m.userId=u.ID5ID:u.universal_uid&&(m.userId=u.universal_uid,m.linkType=u.link_type||0),p=function(n,e,t){return t++,g.setCookie(v(n),t,e),t}(c,f,p),d=!0,g.logInfo("ID5 User ID available from cache:",u,e,l)):g.logInfo("No ID5 User ID available"),h.b(function(n){if(h.a()){if(g.logInfo("Consent to access local storage and cookies is given"),!u||!u.universal_uid||!u.signature||l){var r=n&&n.gdprApplies?1:0,i=n&&n.gdprApplies?n.consentString:"",e="https://id5-sync.com/g/v2/".concat(c.partnerId,".json?gdpr_consent=").concat(i,"&gdpr=").concat(r),t=u&&u.signature?u.signature:"",o=u&&u.ID5ID?u.ID5ID:"",a={partner:c.partnerId,"1puid":o,v:m.version||"",o:"api",rf:s.referer,u:s.stack[0]||window.location.href,top:s.reachedTop?1:0,s:t,pd:c.pd||"",nbPage:p};g.logInfo("Fetching ID5 user ID from:",e,a),g.ajax(e,function(n){var e;if(n)try{if((e=JSON.parse(n)).universal_uid){if(m.userId=e.universal_uid,g.setCookie(c.cookieName,n,f),g.setCookie(y(c),Date.now(),f),g.setCookie(v(c),d?0:1,f),e.cascade_needed){var t=c.partnerUserId&&0<c.partnerUserId.length,o="https://id5-sync.com/".concat(t?"s":"i","/").concat(c.partnerId,"/8.gif");g.logInfo("Opportunities to cascade available:",o,a),g.ajax(o,function(){},{puid:t?c.partnerUserId:null,gdpr:r,gdpr_consent:i},{method:"GET",withCredentials:!0})}}else g.logError("Invalid response from ID5 servers:",n)}catch(n){g.logError(n)}},JSON.stringify(a),{method:"POST",withCredentials:!0})}}else g.logInfo("No legal basis to use ID5",n)})}catch(n){g.logError("Exception catch",n)}},e.default=m},function(n,e,t){"use strict";e.a=function(){return window.ID5},window.ID5=window.ID5||{}},function(n,e,t){"use strict";e.b=function(n){var e=a.a.getConfig();e.allowID5WithoutConsentApi?(i.logError("ID5 is operating in forced consent mode"),n(o)):c[e.cmpApi]?o?n(o):("static"===e.cmpApi&&(i.isPlainObject(a.a.getConfig().consentData)?r=a.a.getConfig().consentData:i.logError("cmpApi: 'static' did not specify consentData.")),c[e.cmpApi].call(this,s,n)):(i.logError("Unknown consent API: ".concat(e.cmpApi)),u(),n(o))},e.a=function(){return!!a.a.getConfig().allowID5WithoutConsentApi||!!o&&("boolean"!=typeof o.gdprApplies||!o.gdprApplies||!!o.consentString&&(!o.vendorData||!o.vendorData.purposeConsents||!1!==o.vendorData.purposeConsents[1]))};var o,r,i=t(1),a=t(0),c={iab:function(n,o){var e,t=function(){var e={};function t(){e.getConsentData&&e.getVendorConsents&&n(e,o)}return{consentDataCallback:function(n){i.logInfo("cmpApi: consentDataCallback"),e.getConsentData=n,t()},vendorConsentsCallback:function(n){i.logInfo("cmpApi: vendorConsentsCallback"),e.getVendorConsents=n,t()}}}();try{e=window.__cmp||window.top.__cmp}catch(n){}i.isFn(e)?(i.logInfo("cmpApi: calling getConsentData & getVendorConsents"),e("getConsentData",null,t.consentDataCallback),e("getVendorConsents",null,t.vendorConsentsCallback)):n(void 0,o)},static:function(n,e){n(r,e)}};function s(n,e){var t=n&&n.getConsentData&&n.getConsentData.gdprApplies;"boolean"==typeof t&&(!0!==t||i.isStr(n.getConsentData.consentData)&&i.isPlainObject(n.getVendorConsents)&&1<Object.keys(n.getVendorConsents).length)?o={consentString:n?n.getConsentData.consentData:void 0,vendorData:n?n.getVendorConsents:void 0,gdprApplies:n?n.getConsentData.gdprApplies:void 0}:(u(),i.logError("CMP returned unexpected value during lookup process.",n)),e(o)}function u(){o=void 0}},function(n,e,t){"use strict";function c(){return(c=Object.assign||function(n){for(var e=1;e<arguments.length;e++){var t=arguments[e];for(var o in t)Object.prototype.hasOwnProperty.call(t,o)&&(n[o]=t[o])}return n}).apply(this,arguments)}t.d(e,"a",function(){return o});var o=function(r){function i(){var n=function(){var e,t=[];do{try{e=e?e.parent:r;try{var n=e===r.top,o={referrer:e.document.referrer||null,location:e.location.href||null,isTop:n};n&&(o=c(o,{canonicalUrl:a(e.document)})),t.push(o)}catch(n){t.push({referrer:null,location:null,isTop:e===r.top})}}catch(n){return t.push({referrer:null,location:null,isTop:!1}),t}}while(e!==r.top);return t}(),e=function(){try{if(!r.location.ancestorOrigins)return;return r.location.ancestorOrigins}catch(n){}}();if(e)for(var t=0,o=e.length;t<o;t++)n[t].ancestor=e[t];return n}function a(n){try{var e=n.querySelector("link[rel='canonical']");if(null!==e)return e.href}catch(n){}return null}return function(){try{var n,e=i(),t=e.length-1,o=null!==e[t].location||0<t&&null!==e[t-1].referrer,r=function(n){var e,t=[],o=null,r=null,i=null,a=null,c=null;for(e=n.length-1;0<=e;e--){try{o=n[e].location}catch(n){}if(o)t.push(o),c||(c=o);else if(0!==e){r=n[e-1];try{i=r.referrer,a=r.ancestor}catch(n){}i?(t.push(i),c||(c=i)):a?(t.push(a),c||(c=a)):t.push(null)}else t.push(null)}return{stack:t,detectedRefererUrl:c}}(e);return e[e.length-1].canonicalUrl&&(n=e[e.length-1].canonicalUrl),{referer:r.detectedRefererUrl,reachedTop:o,numIframes:t,stack:r.stack,canonicalUrl:n}}catch(n){}}}(window)}]),ID5.version="0.9.0";