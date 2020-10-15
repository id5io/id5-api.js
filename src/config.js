/*
 * Module for getting and setting ID5 API configuration.
 */

const utils = require('./utils');

/**
 * @typedef {Object} Id5Config
 * @property {boolean|false} debug - enable verbose debug mode (defaulting to id5_debug query string param if present, or false)
 * @property {boolean|false} allowID5WithoutConsentApi - Allow ID5 to fetch user id even if no consent API
 * @property {(string|undefined)} cookieName - ID5 1st party cookie name (defaulting to id5.1st)
 * @property {(number|undefined)} refreshInSeconds - Refresh period of first-party cookie (defaulting to 7200s)
 * @property {(number|undefined)} cookieExpirationInSeconds - Expiration of 1st party cookie (defaulting to 90 days)
 * @property {(number)} partnerId - ID5 Publisher ID, mandatory
 * @property {(string|undefined)} partnerUserId - User ID for the platform deploying the API, to be stored by ID5 for further cookie matching if provided
 * @property {(string|undefined)} cmpApi - API to use CMP. As of today, either 'iab' or 'static'
 * @property {(object|undefined)} consentData - Consent data if cmpApi is 'static'
 * @property {(function|undefined)} callback - Function to call back when User ID is available. if callbackTimeoutInMs is not provided, will be fired only if a User ID is available.
 * @property {(number|undefined)} callbackTimeoutInMs - Delay in ms after which the callback is guaranteed to be fired. A User ID may not yet be available at this time.
 * @property {(string)} pd - Publisher data that can be passed to help with cross-domain reconciliation of the ID5 ID, more details here: https://wiki.id5.io/x/BIAZ
 * @property {(array|undefined)} tpids - An array of third party IDs that can be passed to usersync with ID5. Contact your ID5 representative to enable this
 */

export function newConfig() {
  /**
   * @property {Id5Config}
   */
  let config;

  const configTypes = {
    debug: 'Boolean',
    allowID5WithoutConsentApi: 'Boolean',
    cmpApi: 'String',
    consentData: 'Object',
    refreshInSeconds: 'Number',
    partnerId: 'Number',
    partnerUserId: 'String',
    callback: 'Function',
    callbackTimeoutInMs: 'Number',
    pd: 'String',
    tpids: 'Array'
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
      refreshInSeconds: 7200,
      partnerId: undefined,
      partnerUserId: undefined,
      callback: undefined,
      callbackTimeoutInMs: undefined,
      pd: '',
      tpids: undefined
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
    if (typeof options !== 'object') {
      utils.logError('setConfig options must be an object');
      return undefined;
    }

    Object.keys(options).forEach(topic => {
      if (utils.isA(options[topic], configTypes[topic])) {
        config[topic] = options[topic];
      } else {
        utils.logError(`setConfig options ${topic} must be of type ${configTypes[topic]} but was ${toString.call(options[topic])}`);
      }
    });
    return config
  }

  resetConfig();

  return {
    getConfig,
    setConfig,
    resetConfig
  };
}

export const config = newConfig();
