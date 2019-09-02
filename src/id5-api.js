/** @module id5-api */

import { getGlobal } from './id5-apiGlobal';
import { config } from './config';
import * as utils from './utils';
import * as consent from './consentManagement';

export const ID5 = getGlobal();

ID5.loaded = true;

/**
 * This function will initialize ID5, wait for consent then try to fetch or refresh ID5 user id if required
 * @param {Id5Config} options
 * @alias module:ID5.init
 */

ID5.init = function (options) {
  try {
    utils.logInfo('Invoking ID5.init', arguments);
    const cfg = config.setConfig(options);
    if (cfg.debug) {
      utils.logInfo('ID5 is operating in debug mode');
    }
    consent.requestConsent((consentData) => {
      if (consent.isLocalStorageAllowed()) {
        utils.logInfo('Consent to access local storage and cookies is given');

        const storedId = JSON.parse(utils.getCookie(cfg.cookieName));
        const storedDate = new Date(+utils.getCookie(`${cfg.cookieName}_last`));
        const refreshNeeded = storedDate.getTime() > 0 && (Date.now() - storedDate.getTime() > cfg.refreshInSeconds * 1000);
        utils.logInfo('ready', storedId, storedDate, refreshNeeded);

        if (storedId) {
          ID5.userId = storedId.ID5ID;
        }
        if (!storedId || refreshNeeded) {
          const gdprApplies = (consentData && consentData.gdprApplies) ? 1 : 0;
          const gdprConsentString = (consentData && consentData.gdprApplies) ? consentData.consentString : '';
          const url = `https://id5-sync.com/g/v1/${cfg.partnerId}.json?1puid=${ID5.userId || ''}&gdpr=${gdprApplies}&gdpr_consent=${gdprConsentString}`;

          utils.ajax(url, response => {
            let responseObj;
            if (response) {
              try {
                responseObj = JSON.parse(response);
                if (responseObj.ID5ID) {
                  ID5.userId = responseObj.ID5ID;
                  const expiresStr = (new Date(Date.now() + (cfg.cookieExpirationInSeconds * 1000))).toUTCString();
                  utils.setCookie(cfg.cookieName, response, expiresStr);
                  utils.setCookie(`${cfg.cookieName}_last`, Date.now(), expiresStr);
                  // TODO: /g/ endpoint should receive and log version.
                  // TODO: /g/ endpoint should reply by saying if cascading is necessary
                  // TODO: initiate call/sync if required
                  // TODO: pass location and (top window location != location) to /g/ endpoint
                } else {
                  utils.logError('Invalid response from ID5 servers:', response);
                }
              } catch (error) {
                utils.logError(error);
              }
            }
          }, undefined, {method: 'GET', withCredentials: true});
        }
      } else {
        utils.logInfo('No legitimate consent to use ID5', consentData);
      }
    });
  } catch (e) {
    utils.logError(e);
  }
};

export default ID5;
