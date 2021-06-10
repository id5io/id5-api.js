/*
 * Module for getting and setting ID5 API configuration.
 */
import { logError, isA } from './utils';

/**
 * @typedef {Object} Id5Options
 * @property {number} [partnerId] - ID5 Publisher ID, mandatory
 * @property {boolean|false} [debugBypassConsent] - Bypass consent API et local storage consent for testing purpose only
 * @property {boolean|false} [allowLocalStorageWithoutConsentApi] - Tell ID5 that consent has been given to read local storage
 * @property {number} [refreshInSeconds] - Refresh period of first-party cookie (defaulting to 7200s)
 * @property {string} [partnerUserId] - User ID for the platform deploying the API, to be stored by ID5 for further cookie matching if provided
 * @property {string} [cmpApi] - API to use CMP. As of today, either 'iab' or 'static'
 * @property {object} [consentData] - Consent data if cmpApi is 'static'
 * @property {function} [callbackOnAvailable] - Function to call back when User ID is available. if callbackTimeoutInMs is not provided, will be fired only if a User ID is available.
 * @property {function} [callbackOnUpdates] - Function to call back on further updates of User ID by changes in the page (consent, pd, refresh). Cannot be provided if `callbackOnAvailable` is not provided
 * @property {number} [callbackTimeoutInMs] - Delay in ms after which the callbackOnAvailable is guaranteed to be fired. A User ID may not yet be available at this time.
 * @property {string} [pd] - Partner Data that can be passed to help with cross-domain reconciliation of the ID5 ID, more details here: https://support.id5.io/portal/en/kb/articles/passing-partner-data-to-id5
 * @property {AbTestConfig} [abTesting] - An object defining if and how A/B testing should be enabled
 * @property {string} [provider] - Defines who is deploying the API on behalf of the partner. A hard-coded value that will be provided by ID5 when applicable
 * @property {number} [maxCascades] - Defines the maximum number of cookie syncs that can occur when usersyncing for the user is required. A value of -1 will disable cookie syncing altogether. Defaults to 8
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
    abTesting: 'Object',
    provider: 'String',
    maxCascades: 'Number'
  };

  /**
   * Create configuration instance from an object containing key-value pairs
   * @param {Id5Options} options
   */
  constructor(options) {
    this.options = {
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
      pd: undefined,
      abTesting: {
        enabled: false,
        controlGroupPct: 0
      },
      provider: undefined,
      maxCascades: 8
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
      logError('Config options must be an object');
      return;
    }

    if (typeof this.options.partnerId === 'number' && // Might be undefined
      typeof options.partnerId === 'number' &&
      options.partnerId !== this.options.partnerId) {
      throw new Error('Cannot update config with a different partnerId');
    }

    Object.keys(options).forEach(topic => {
      if (isA(options[topic], Config.configTypes[topic])) {
        this.options[topic] = options[topic];
        this.providedOptions[topic] = options[topic];
      } else {
        logError(`updOptions options ${topic} must be of type ${Config.configTypes[topic]} but was ${toString.call(options[topic])}`);
      }
    });
  }
}
