/** @module id5-api */

import { getGlobal } from './id5-apiGlobal';
import { config } from './config';
import * as utils from './utils';
import * as consent from './consentManagement';
import { getRefererInfo } from './refererDetection';

export const ID5 = getGlobal();

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
    utils.logInfo('Invoking ID5.init', arguments);
    const cfg = config.setConfig(options);
    ID5.userConfig = options;
    ID5.config = cfg;
    ID5.initialized = true;
    const referer = getRefererInfo();
    utils.logInfo(`ID5 detected referer is ${referer.referer}`);

    const storedId = JSON.parse(utils.getCookie(cfg.cookieName));
    const storedDate = new Date(+utils.getCookie(`${cfg.cookieName}_last`));
    const refreshNeeded = storedDate.getTime() > 0 && (Date.now() - storedDate.getTime() > cfg.refreshInSeconds * 1000);
    if (storedId) {
      ID5.userId = storedId.ID5ID;
      utils.logInfo('ID5 User ID already available:', storedId, storedDate, refreshNeeded);
    } else {
      utils.logInfo('No ID5 User ID available');
    }

    consent.requestConsent((consentData) => {
      if (consent.isLocalStorageAllowed()) {
        utils.logInfo('Consent to access local storage and cookies is given');

        if (!storedId || refreshNeeded) {
          const gdprApplies = (consentData && consentData.gdprApplies) ? 1 : 0;
          const gdprConsentString = (consentData && consentData.gdprApplies) ? consentData.consentString : '';
          const url = `https://id5-sync.com/g/v1/${cfg.partnerId}.json`;
          const data = { '1puid': ID5.userId || '',
            'gdpr': gdprApplies,
            'gdpr_consent': gdprConsentString,
            'rf': encodeURIComponent(referer.referer),
            'top': referer.reachedTop ? 1 : 0,
            'o': 'api',
            'v': ID5.version || '' };
          if (cfg.debug) {
            utils.logInfo('Fetching ID5 user ID from:', url, data);
          }
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
                    // TODO: Should not use AJAX Call for cascades as some partners may not have CORS Headers
                    const isSync = cfg.partnerUserId && cfg.partnerUserId.length > 0;
                    const syncUrl = `https://id5-sync.com/${isSync ? 's' : 'i'}/${cfg.partnerId}/8.gif`;
                    utils.logInfo('Opportunities of cascades available:', syncUrl, data);
                    utils.ajax(syncUrl, () => {}, {
                      puid: isSync ? cfg.partnerUserId : null,
                      gdpr: gdprApplies,
                      gdpr_consent: gdprConsentString
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
          }, data, { method: 'GET', withCredentials: true });
        }
      } else {
        utils.logInfo('No legitimate consent to use ID5', consentData);
      }
    });
  } catch (e) {
    utils.logError('Exception catch', e);
  }
};

export default ID5;
