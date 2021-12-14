/*
 * Module for getting and setting ID5 API configuration.
 */
import { logError, isA, isPlainObject, isNumber, isArray, isStr, all } from './utils';

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
 * @property {boolean} [applyCreativeRestrictions] - When true some restrictions are applied, for example avoid writing to localStorage and avoid cookie syncing.
 * @property {Array<Segment>} [segments] - A list of segments to push to partners.

 * @typedef {Object} Segment
 * @property {string} [destination] - GVL ID or ID5-XX Partner ID. Mandatory
 * @property {Array<string>} [ids] - The segment IDs to push. Must contain at least one segment ID.
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

  /** @type {Number} */
  invalidSegments;

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
    maxCascades: 'Number',
    applyCreativeRestrictions: 'Boolean'
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
      maxCascades: 8,
      applyCreativeRestrictions: false,
      segments: undefined
    };
    this.providedOptions = {};

    if (!options.partnerId || typeof options.partnerId !== 'number') {
      throw new Error('partnerId is required and must be a number');
    }

    this.invalidSegments = 0;
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
   * Return how many invalid segments we got in the options
   * @returns {number} invalidSegments
   */
  getInvalidSegments() {
    return this.invalidSegments;
  }

  /**
   * Override the configuration with an object containing key-value pairs
   * @param {Id5Options} options
   */
  updOptions(options) {
    const self = this;
    if (!isPlainObject(options)) {
      logError('Config options must be an object');
      return;
    }

    if (isNumber(this.options.partnerId) && // Might be undefined
        isNumber(options.partnerId) &&
        options.partnerId !== this.options.partnerId
    ) {
      throw new Error('Cannot update config with a different partnerId');
    }

    const acceptOption = (topic, value) => {
      this.options[topic] = value;
      this.providedOptions[topic] = value;
    };

    Object.keys(options).forEach(topic => {
      if (topic === 'segments') {
        const segments = options[topic];
        const value = [];
        if (!isArray(segments)) {
          logTypeError(topic, 'Array', segments);
          return;
        }
        segments.forEach((segment, index) => {
          const locator = `segments[${index}]`;
          if (!isArray(segment['ids']) || !all(segment['ids'], isStr)) {
            logTypeError(`${locator}.ids`, 'Array of String', segment['ids']);
            self.invalidSegments += 1;
            return;
          }
          if (segment['ids'].length < 1) {
            logError(`Config option ${locator}.ids should contain at least one segment ID`);
            self.invalidSegments += 1;
            return;
          }
          if (!isStr(segment['destination'])) {
            logTypeError(`${locator}.destination`, 'String', segment['destination']);
            self.invalidSegments += 1;
            return;
          }
          value.push(segment);
        });
        acceptOption(topic, value);
      } else {
        const expectedType = Config.configTypes[topic];
        const value = options[topic];
        if (isA(value, expectedType)) {
          acceptOption(topic, value);
        } else {
          logTypeError(topic, expectedType, value);
        }
      }
    });
  }
}

function logTypeError(topic, expectedType, value) {
  logError(`Config option ${topic} must be of type ${expectedType} but was ${toString.call(value)}. Ignoring...`);
}
