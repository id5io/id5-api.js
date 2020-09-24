/** @module id5-api */

import { getGlobal } from './id5-apiGlobal';
import { config } from './config';
import * as utils from './utils';
import * as consent from './consentManagement';
import { getRefererInfo } from './refererDetection';

export const ID5 = getGlobal();

ID5.loaded = true;
ID5.initialized = false;
ID5.callbackFired = false;

/**
 * This function will initialize ID5, wait for consent then try to fetch or refresh ID5 user id if required
 * @param {Id5Config} options
 * @alias module:ID5.init
 */
// TODO: Use Async init by pushing setting in a queue
ID5.init = function (options) {
  if (typeof ID5.version === 'undefined') {
    throw new Error('ID5.version variable is missing! Make sure you build from source with "gulp build" from this project. Contact support@id5.io for help.');
  }

  try {
    utils.logInfo('Invoking ID5.init', arguments);
    const cfg = config.setConfig(options);
    ID5.userConfig = options;
    ID5.config = cfg;
    ID5.initialized = true;
    ID5.callbackFired = false;
    ID5.getConfig = config.getConfig;
    const referer = getRefererInfo();
    utils.logInfo(`ID5 detected referer is ${referer.referer}`);

    if (typeof cfg.partnerId !== 'number') {
      throw new Error('partnerId is required and must be a number');
    }

    const storedResponse = JSON.parse(utils.getCookie(cfg.cookieName));
    const storedDateTime = (new Date(+utils.getCookie(lastCookieName(cfg)))).getTime();
    const refreshNeeded = storedDateTime <= 0 || ((Date.now() - storedDateTime) > (cfg.refreshInSeconds * 1000));
    const expiresStr = (new Date(Date.now() + (cfg.cookieExpirationInSeconds * 1000))).toUTCString();
    let nb = getNbFromCookie(cfg);
    let idSetFromStoredResponse = false;

    // Callback watchdogs
    if (utils.isFn(this.config.callback) && this.config.callbackTimeoutInMs >= 0) {
      setTimeout(() => this.fireCallBack(), this.config.callbackTimeoutInMs);
    }

    // TEMPORARY until all clients have upgraded past v0.9.3
    // remove cookies that were previously set with the old cookie name
    if (cfg.cookieName !== 'id5.1st') {
      const expired = (new Date(Date.now() - 1000)).toUTCString();
      utils.setCookie('id5.1st', '', expired);
      utils.setCookie('id5.1st_last', '', expired);
      utils.setCookie('id5.1st_nb', '', expired);
    }

    if (storedResponse) {
      // this is needed to avoid losing the ID5ID from publishers that was
      // previously stored. Eventually we can remove this, once pubs have all
      // upgraded to this version of code
      if (storedResponse.ID5ID) { // TODO: remove this block when 1puid isn't needed
        ID5.userId = storedResponse.ID5ID;
      } else if (storedResponse.universal_uid) {
        ID5.userId = storedResponse.universal_uid;
        ID5.linkType = storedResponse.link_type || 0;
      }
      nb = incrementNb(cfg, expiresStr, nb);
      idSetFromStoredResponse = true;
      if (ID5.userId) {
        this.fireCallBack();
      }
      utils.logInfo('ID5 User ID available from cache:', { storedResponse, storedDateTime, refreshNeeded });
    } else {
      utils.logInfo('No ID5 User ID available from cache');
    }

    consent.requestConsent((consentData) => {
      if (consent.isLocalStorageAllowed()) {
        utils.logInfo('Consent to access local storage and cookies is given');

        if (!storedResponse || !storedResponse.universal_uid || !storedResponse.signature || refreshNeeded) {
          const gdprApplies = (consentData && consentData.gdprApplies) ? 1 : 0;
          const gdprConsentString = (consentData && consentData.gdprApplies) ? consentData.consentString : '';
          const url = `https://id5-sync.com/g/v2/${cfg.partnerId}.json?gdpr_consent=${gdprConsentString}&gdpr=${gdprApplies}`;
          const signature = (storedResponse && storedResponse.signature) ? storedResponse.signature : '';
          const pubId = (storedResponse && storedResponse.ID5ID) ? storedResponse.ID5ID : ''; // TODO: remove when 1puid isn't needed
          const data = {
            'partner': cfg.partnerId,
            '1puid': pubId, // TODO: remove when 1puid isn't needed
            'v': ID5.version,
            'o': 'api',
            'rf': referer.referer,
            'u': referer.stack[0] || window.location.href,
            'top': referer.reachedTop ? 1 : 0,
            's': signature,
            'pd': cfg.pd || '',
            'nbPage': nb
          };

          utils.logInfo('Fetching ID5 user ID from:', url, data);
          utils.ajax(url, {
            success: response => {
              utils.logInfo('Response from ID5 received:', response);
              let responseObj;
              if (response) {
                try {
                  responseObj = JSON.parse(response);
                  if (responseObj.universal_uid) {
                    ID5.userId = responseObj.universal_uid;
                    utils.setCookie(cfg.cookieName, response, expiresStr);
                    utils.setCookie(lastCookieName(cfg), Date.now(), expiresStr);
                    utils.setCookie(nbCookieName(cfg), (idSetFromStoredResponse ? 0 : 1), expiresStr);
                    if (responseObj.cascade_needed === true) {
                      const isSync = cfg.partnerUserId && cfg.partnerUserId.length > 0;
                      const syncUrl = `https://id5-sync.com/${isSync ? 's' : 'i'}/${cfg.partnerId}/8.gif?${isSync ? 'puid=' + cfg.partnerUserId + '&' : ''}gdpr_consent=${gdprConsentString}&gdpr=${gdprApplies}`;
                      utils.logInfo('Opportunities to cascade available:', syncUrl);
                      utils.deferPixelFire(syncUrl);
                    }
                    this.fireCallBack();
                    // TODO: Server should use 1puid to override uid if not in 3rd party cookie
                  } else {
                    utils.logError('Invalid response from ID5 servers:', response);
                  }
                } catch (error) {
                  utils.logError(error);
                }
              }
            },
            error: error => {
              utils.logError(error);
            }
          }, JSON.stringify(data), { method: 'POST', withCredentials: true });
        }
      } else {
        utils.logInfo('No legal basis to use ID5', consentData);
      }
    });
  } catch (e) {
    utils.logError('Exception catch', e);
  }
};

ID5.fireCallBack = function () {
  if (!this.callbackFired && utils.isFn(this.config.callback)) {
    this.callbackFired = true;
    utils.logInfo('Scheduling callback');
    setTimeout(() => this.config.callback(ID5), 0);
  }
}

function lastCookieName(cfg) {
  return `${cfg.cookieName}_last`;
}
function nbCookieName(cfg) {
  return `${cfg.cookieName}_${cfg.partnerId}_nb`;
}
function getNbFromCookie(cfg) {
  const cachedNb = utils.getCookie(nbCookieName(cfg));
  return (cachedNb) ? parseInt(cachedNb) : 0;
}
function incrementNb(cfg, expiresStr, nb) {
  nb++;
  utils.setCookie(nbCookieName(cfg), nb, expiresStr);
  return nb;
}

export default ID5;
