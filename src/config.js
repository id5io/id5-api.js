/*
 * Module for getting and setting ID5 API configuration.
 */

const utils = require('./utils');

/**
 * @typedef {Object} Id5Config
 * @property {boolean|false} debug - enable verbose debug mode (defaulting to id5_debug query string param if present, or false)
 * @property {boolean|false} allowID5WithoutConsentApi - Allow ID5 to fetch user id even if no consent API
 * @property {(string|undefined)} cookieName - ID5 1st party cookie name (defaulting to ID5First)
 * @property {(number|undefined)} refreshInSeconds - Refresh period of first-party cookie (defaulting to 7200s)
 * @property {(number|undefined)} cookieExpirationInSeconds - Expiration of 1st party cookie (defaulting to 90 days)
 * @property {(number)} partnerId - ID5 Publisher ID, mandatory
 * @property {(string|undefined)} partnerUserId - User ID for the publisher, to be stored by ID5 for further matching if provided
 * @property {(string|undefined)} cmpApi - API to use CMP. As of today, either 'iab' or 'static'
 * @property {(object|undefined)} consentData - Consent data if cmpApi is 'static'
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
    cookieName: 'String',
    refreshInSeconds: 'Number',
    cookieExpirationInSeconds: 'Number',
    partnerId: 'Number',
    partnerUserId: 'String',
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
