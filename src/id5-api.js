/** @module id5-api */

import { getGlobal } from './id5-apiGlobal';
import { config } from './config';
import * as utils from './utils';
import * as consent from './consentManagement';
import { getRefererInfo } from './refererDetection';

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
    const referer = getRefererInfo();
    if (cfg.debug) {
      utils.logInfo(`ID5 detected referer is ${referer.referer}`);
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
          const url = `https://id5-sync.com/g/v1/${cfg.partnerId}.json`;

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
                  if (responseObj.CASCADE_NEEDED) {
                    let syncUrl = `https://id5-sync.com/${cfg.partnerUserId ? 's' : 'i'}/${cfg.partnerId}/8.gif`;
                    utils.ajax(syncUrl, () => {}, {
                      puid: cfg.partnerUserId
                    }, {
                      method: 'GET',
                      withCredentials: true
                    });
                  }
                  // TODO: Server should use 1puid to override uid if not in 3rd party cookie
                } else {
                  utils.logError('Invalid response from ID5 servers:', response);
                }
              } catch (error) {
                utils.logError(error);
              }
            }
          }, {
            '1puid': ID5.userId || '',
            'gdpr': gdprApplies,
            'gdpr_consent': gdprConsentString,
            'rf': referer.referer,
            'top': referer.reachedTop ? 1 : 0,
            'v': ID5.version || ''
          }, {
            method: 'GET',
            withCredentials: true
          });
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
