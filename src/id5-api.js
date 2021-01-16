/** @module id5-api */

import { getGlobal } from './id5-apiGlobal';
import { config } from './config';
import * as utils from './utils';
import * as consent from './consentManagement';
import { getRefererInfo } from './refererDetection';
import AbTesting from './abTesting';
import * as clientStore from './clientStore';

export const ID5 = getGlobal();

ID5.loaded = true;
ID5.initialized = false;
ID5.callbackFired = false;

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
    ID5.getProvidedConfig = config.getProvidedConfig;
    ID5.abTesting = new AbTesting(options.abTesting);

    this.getId(options, false);
  } catch (e) {
    utils.logError('Exception caught from ID5.init', e);
  }
};

ID5.exposeId = function() {
  if (ID5.initialized !== true) {
    throw new Error('ID5.exposeId() cannot be called before ID5.init()!');
  }
  return ID5.abTesting.exposeId();
}

ID5.refreshId = function (forceFetch = false, options = {}) {
  if (ID5.initialized !== true) {
    throw new Error('ID5.refreshID() cannot be called before ID5.init()!');
  }

  try {
    utils.logInfo('Invoking ID5.refreshId', arguments);

    if (!utils.isBoolean(forceFetch)) {
      throw new Error('Invalid signature for ID5.refreshID: first parameter must be a boolean');
    }

    // consent may have changed, so we need to check it again
    consent.resetConsentData();

    this.getId(options, forceFetch);
  } catch (e) {
    utils.logError('Exception caught from ID5.refreshId', e);
  }
};

ID5.getId = function(options, forceFetch = false) {
  const cfg = config.setConfig(options);
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

  if (consent.isLocalStorageAllowed()) {
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

  consent.requestConsent((consentData) => {
    if (consent.isLocalStorageAllowed() !== false) {
      utils.logInfo('Consent to access local storage is given: ', consent.isLocalStorageAllowed());

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
                  consent.setStoredPrivacy(responseObj.privacy);

                  // @TODO: typeof responseObj.privacy === 'undefined' is only needed until fetch endpoint is updated and always returns a privacy object
                  // once it does, I don't see a reason to keep that part of the if clause
                  if (consent.isLocalStorageAllowed() === true || typeof responseObj.privacy === 'undefined') {
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

                  if (responseObj.cascade_needed === true && consent.isLocalStorageAllowed() === true) {
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
