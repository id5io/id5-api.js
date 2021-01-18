/** @module id5-api */

import Config from './config';
import * as utils from './utils';
import { getRefererInfo } from './refererDetection';
import isInControlGroup from 'src/abTesting';
import * as clientStore from './clientStore';
import ConsentManagement from './consentManagement';

// This syntax allows multiple injection of id5-api.js while resetting only the attributes we need
window.ID5 = (window.ID5 || {
  loaded: true,
  debug: false,
  versions: {},
  localStorageAllowed: undefined,
  initialized: false,
  callbackFired: false
});
export const ID5 = window.ID5;

// TODO: Check for different versions in the same page at init

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
    utils.logInfo('Invoking ID5.init', arguments);
    ID5.initialized = true;
    ID5.config = new Config(options);
    ID5.debug = /* ID5.debug || */ ID5.config.getConfig().debug;
    ID5.consent = new ConsentManagement();
    this.getId(ID5.config.getConfig(), false);
  } catch (e) {
    utils.logError('Exception caught from ID5.init', e);
  }
};

ID5.updateLocalStorageAllowed = function() {
  const cfg = ID5.config.getConfig();
  ID5.localStorageAllowed = ID5.consent.isLocalStorageAllowed(cfg.allowLocalStorageWithoutConsentApi, cfg.debugBypassConsent)
}

ID5.exposeId = function() {
  if (ID5.initialized !== true) {
    throw new Error('ID5.exposeId() cannot be called before ID5.init()!');
  }
  const cfg = ID5.config.getConfig();
  if (cfg.abTesting.enabled === true) {
    return !isInControlGroup(ID5.userId, cfg.abTesting.controlGroupPct);
  } else {
    return true;
  }
}

ID5.refreshId = function (forceFetch = false, options = {}) {
  if (ID5.initialized !== true) {
    throw new Error('ID5.refreshID() cannot be called before ID5.init()!');
  }

  if (!utils.isBoolean(forceFetch)) {
    throw new Error('Invalid signature for ID5.refreshId: first parameter must be a boolean');
  }

  try {
    utils.logInfo('Invoking ID5.refreshId', arguments);
    ID5.config.updConfig(options);

    // consent may have changed, so we need to check it again
    ID5.consent.resetConsentData();

    this.getId(ID5.config.getConfig(), forceFetch);
  } catch (e) {
    utils.logError('Exception caught from ID5.refreshId', e);
  }
};

/**
 * This function get the user ID for the given config
 * @param {Id5Config} cfg
 * @param {boolean} forceFetch - Force a call to server
 */

ID5.getId = function(cfg, forceFetch = false) {
  ID5.callbackFired = false;

  const referer = getRefererInfo();
  utils.logInfo(`ID5 detected referer is ${referer.referer}`);

  if (!cfg.partnerId || typeof cfg.partnerId !== 'number') {
    throw new Error('partnerId is required and must be a number');
  }

  let storedResponse;
  let storedDateTime;
  let nb = 0;
  let refreshInSecondsHasElapsed = false;
  let pdHasChanged = false;

  ID5.updateLocalStorageAllowed();
  if (ID5.localStorageAllowed) {
    storedResponse = clientStore.getResponse();
    storedDateTime = clientStore.getDateTime();
    refreshInSecondsHasElapsed = storedDateTime <= 0 || ((Date.now() - storedDateTime) > (cfg.refreshInSeconds * 1000));
    nb = clientStore.getNb(cfg.partnerId);
    pdHasChanged = !clientStore.storedPdMatchesPd(cfg.partnerId, cfg.pd);
  }

  if (!storedResponse) {
    storedResponse = clientStore.getResponseFromLegacyCookie();
    refreshInSecondsHasElapsed = true; // Force a refresh if we have legacy cookie
  }

  // @FIXME: on a refresh call, we should not reset, as partner may have passed pd on refresh
  ID5.fromCache = false;

  // Callback watchdogs
  if (utils.isFn(cfg.callback) && cfg.callbackTimeoutInMs >= 0) {
    setTimeout(() => this.fireCallBack(cfg), cfg.callbackTimeoutInMs);
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
      utils.logError('Invalid stored response: ', JSON.stringify(storedResponse));
    }

    nb = clientStore.incNb(cfg.partnerId, nb);
    ID5.fromCache = true;
    if (typeof ID5.userId !== 'undefined') {
      this.fireCallBack(cfg);
    }

    utils.logInfo('ID5 User ID available from cache:', { storedResponse, storedDateTime, refreshNeeded: refreshInSecondsHasElapsed });
  } else if (storedResponse && pdHasChanged) {
    utils.logInfo('PD value has changed, so ignoring User ID from cache');
  } else {
    utils.logInfo('No ID5 User ID available from cache');
  }

  ID5.consent.requestConsent(cfg.debugBypassConsent, cfg.cmpApi, cfg.consentData, (consentData) => {
    // re-evaluate local storage access as consent is now available
    ID5.updateLocalStorageAllowed();
    if (ID5.localStorageAllowed !== false) {
      utils.logInfo('Consent to access local storage is given: ', ID5.localStorageAllowed);

      storedResponse = clientStore.getResponse() || clientStore.getResponseFromLegacyCookie();

      // store hashed consent data and pd for future page loads
      const consentHasChanged = !clientStore.storedConsentDataMatchesConsentData(consentData);
      clientStore.putHashedConsentData(consentData);
      clientStore.putHashedPd(cfg.partnerId, cfg.pd);

      // make a call to fetch a new ID5 ID if:
      // - there is no valid universal_uid or no signature in cache
      // - the last refresh was longer than refreshInSeconds ago
      // - consent has changed since the last ID was fetched
      // - pd has changed since the last ID was fetched
      // - fetch is being forced (e.g. by refreshId())
      if (
        !storedResponse || !storedResponse.universal_uid || !storedResponse.signature ||
        refreshInSecondsHasElapsed ||
        consentHasChanged ||
        pdHasChanged ||
        forceFetch
      ) {
        const url = `https://id5-sync.com/g/v2/${cfg.partnerId}.json`;
        const gdprApplies = (consentData && consentData.gdprApplies) ? 1 : 0;
        const gdprConsentString = (consentData && consentData.gdprApplies) ? consentData.consentString : '';
        const signature = (storedResponse && storedResponse.signature) ? storedResponse.signature : '';
        const data = {
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
          'id5cdn': (document.currentScript && document.currentScript.src && document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0)
        };
        if (cfg.tpids && utils.isArray(cfg.tpids) && cfg.tpids.length > 0) {
          data.tpids = cfg.tpids;
        }

        utils.logInfo('Fetching ID5 user ID from:', url, data);
        if (forceFetch) {
          utils.logInfo('...with Force Fetch');
        }
        utils.ajax(url, {
          success: response => {
            let responseObj;
            if (response) {
              try {
                responseObj = JSON.parse(response);
                utils.logInfo('Response from ID5 received:', responseObj);
                if (responseObj.universal_uid) {
                  if (this.exposeId()) {
                    ID5.userId = responseObj.universal_uid;
                    ID5.linkType = responseObj.link_type || 0
                  } else {
                    // we're in A/B testing and this is the control group, so do
                    // not set a userId or linkType
                    ID5.userId = ID5.linkType = 0;
                  }

                  // privacy has to be stored first so we can use it when storing other values
                  ID5.consent.setStoredPrivacy(responseObj.privacy);
                  // re-evaluate local storage access as geo is now available
                  ID5.updateLocalStorageAllowed();

                  // @TODO: typeof responseObj.privacy === 'undefined' is only needed until fetch endpoint is updated and always returns a privacy object
                  // once it does, I don't see a reason to keep that part of the if clause
                  if (ID5.localStorageAllowed === true || typeof responseObj.privacy === 'undefined') {
                    clientStore.putResponse(response);
                    clientStore.setDateTime(Date.now());
                    clientStore.setNb(cfg.partnerId, (ID5.fromCache ? 0 : 1));
                  } else {
                    clientStore.clearAll(cfg.partnerId);
                  }
                  // TEMPORARY until all clients have upgraded past v1.0.0
                  // remove cookies that were previously set
                  clientStore.removeLegacyCookies(cfg.partnerId);

                  // this must come after storing Nb or it will store the wrong value
                  ID5.fromCache = false;

                  if (responseObj.cascade_needed === true && ID5.localStorageAllowed === true) {
                    const isSync = cfg.partnerUserId && cfg.partnerUserId.length > 0;
                    const syncUrl = `https://id5-sync.com/${isSync ? 's' : 'i'}/${cfg.partnerId}/8.gif?id5id=${ID5.userId}&fs=${clientStore.forceSync()}&o=api&${isSync ? 'puid=' + cfg.partnerUserId + '&' : ''}gdpr_consent=${gdprConsentString}&gdpr=${gdprApplies}`;
                    utils.logInfo('Opportunities to cascade available:', syncUrl);
                    utils.deferPixelFire(syncUrl, undefined, clientStore.syncCallback);
                  }
                  this.fireCallBack(cfg);
                } else {
                  utils.logError('Invalid response from ID5 servers:', response);
                }
              } catch (error) {
                utils.logError(error);
              }
            } else {
              utils.logError('Empty response from ID5 servers:', response);
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
}

/**
 * This function fire the callback of the provided config
 * @param {Id5Config} options
 */
ID5.fireCallBack = function (options) {
  if (!this.callbackFired && utils.isFn(options.callback)) {
    utils.logInfo('Scheduling callback');
    setTimeout(() => options.callback(ID5), 0);
    ID5.callbackFired = true;
  }
}

export default ID5;
