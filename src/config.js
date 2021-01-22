/*
 * Module for getting and setting ID5 API configuration.
 */

const utils = require('./utils');

/**
 * @typedef {Object} Id5Options
 * @property {number} [partnerId] - ID5 Publisher ID, mandatory
 * @property {boolean|false} [debug] - enable verbose debug mode (defaulting to id5_debug query string param if present, or false)
 * @property {boolean|false} [debugBypassConsent] - Bypass consent API et local storage consent for testing purpose only
 * @property {boolean|false} [allowLocalStorageWithoutConsentApi] - Tell ID5 that consent has been given to read local storage
 * => and allowLocalStorageWithoutConsent (if enabled, then for everyone in the page), platform should not set
 * @property {number} [refreshInSeconds] - Refresh period of first-party cookie (defaulting to 7200s)
 * => Keep the lowest until now, platform should not set
 * @property {string} [partnerUserId] - User ID for the platform deploying the API, to be stored by ID5 for further cookie matching if provided
 * @property {string} [cmpApi] - API to use CMP. As of today, either 'iab' or 'static'
 * => use cached consentData, supposed to be one per page
 * @property {object} [consentData] - Consent data if cmpApi is 'static'
 * @property {function} [callbackOnAvailable] - Function to call back when User ID is available. if callbackTimeoutInMs is not provided, will be fired only if a User ID is available.
 * @property {function} [callbackOnUpdates] - Function to call back on further updates of User ID by changes in the page (consent, pd, refresh). Cannot be provided if `callbackOnAvailable` is not provided
 * @property {number} [callbackTimeoutInMs] - Delay in ms after which the callbackOnAvailable is guaranteed to be fired. A User ID may not yet be available at this time.
 * @property {string} [pd] - Publisher data that can be passed to help with cross-domain reconciliation of the ID5 ID, more details here: https://wiki.id5.io/x/BIAZ
 * @property {array} [tpids] - An array of third party IDs that can be passed to usersync with ID5. Contact your ID5 representative to enable this
 * @property {AbTestConfig} [abTesting] - An object defining if and how A/B testing should be enabled
 * => per partner
 *
 * => multiple instance with same partner and different PD ?
 */

/**
 * @typedef {Object} AbTestConfig
 * @property {boolean|false} [enabled] - Enable control group
 * @property {number} [controlGroupPct] - Ratio of users in control group [0,1]
 */

export default class Config {
  /** @type {Id5Options} */
  options;

  /** @type {Id5Options} */
  providedOptions;

  static configTypes = {
    debug: 'Boolean',
    debugBypassConsent: 'Boolean',
    allowLocalStorageWithoutConsentApi: 'Boolean',
    cmpApi: 'String',
    consentData: 'Object',
    refreshInSeconds: 'Number',
    partnerId: 'Number',
    partnerUserId: 'String',
    callbackOnAvailable: 'Function',
    callbackOnUpdates: 'Function',
    callbackTimeoutInMs: 'Number',
    pd: 'String',
    tpids: 'Array',
    abTesting: 'Object'
  };

  /**
   * Create configuration instance from an object containing key-value pairs
   * @param {Id5Options} options
   */
  constructor(options) {
    this.options = {
      debug: utils.getParameterByName('id5_debug').toUpperCase() === 'TRUE',
      debugBypassConsent: false,
      allowLocalStorageWithoutConsentApi: false,
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
      callbackOnAvailable: undefined,
      callbackOnUpdates: undefined,
      callbackTimeoutInMs: undefined,
      pd: '',
      tpids: undefined,
      abTesting: {
        enabled: false,
        controlGroupPct: 0
      }
    };
    this.providedOptions = {};

    if (!options.partnerId || typeof options.partnerId !== 'number') {
      throw new Error('partnerId is required and must be a number');
    }

    this.updOptions(options);
  }

  /**
   * Return current configuration
   * @returns {Id5Options} options
   */
  getOptions() {
    return this.options;
  }

  /**
   * Return configuration set by user
   * @returns {Id5Options} options
   */
  getProvidedOptions() {
    return this.providedOptions;
  }

  /**
   * Override the configuration with an object containing key-value pairs
   * @param {Id5Options} options
   */
  updOptions(options) {
    if (typeof options !== 'object') {
      utils.logError('Config options must be an object');
      return;
    }

    if (typeof this.options.partnerId === 'number' &&
      typeof options.partnerId === 'number' &&
      options.partnerId !== this.options.partnerId) {
      throw new Error('Cannot update config with a different partentId');
    }

    Object.keys(options).forEach(topic => {
      if (utils.isA(options[topic], Config.configTypes[topic])) {
        this.options[topic] = options[topic];
        this.providedOptions[topic] = options[topic];
      } else {
        utils.logError(`setConfig options ${topic} must be of type ${Config.configTypes[topic]} but was ${toString.call(options[topic])}`);
      }
    });
  }
}
