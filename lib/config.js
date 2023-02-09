/*
 * Module for getting and setting ID5 API configuration.
 */
import {logError, isA, isPlainObject, isNumber, isArray, isStr, all} from './utils.js';
import {STORAGE_CONFIG} from './constants.json';

export class StoreItemConfig {
  constructor(name, expiresDays) {
    this.name = name;
    this.expiresDays = expiresDays;
  }

  withNameSuffixed(...suffixes) {
    let name = this.name;
    for (const suffix of suffixes) {
      name += `_${suffix}`;
    }
    return new StoreItemConfig(name, this.expiresDays);
  }
}

export class StorageConfig {
  constructor(storageExpirationDays = undefined) {
    let defaultStorageConfig = STORAGE_CONFIG;
    let createConfig = function (defaultConfig) {
      let expiresDays = storageExpirationDays !== undefined ? Math.max(1, storageExpirationDays) : defaultConfig.expiresDays;
      return new StoreItemConfig(defaultConfig.name, expiresDays);
    };

    this.ID5 = createConfig(defaultStorageConfig.ID5);
    this.LAST = createConfig(defaultStorageConfig.LAST);
    this.CONSENT_DATA = createConfig(defaultStorageConfig.CONSENT_DATA);
    this.PD = createConfig(defaultStorageConfig.PD);
    this.PRIVACY = createConfig(defaultStorageConfig.PRIVACY);
    this.SEGMENTS = createConfig(defaultStorageConfig.SEGMENTS);
    this.LIVE_INTENT = createConfig(defaultStorageConfig.LIVE_INTENT);
  }
}

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
 * @property {boolean} [disableUaHints] - When true, look up of high entropy values through user agent hints is disabled.
 * @property {number} [storageExpirationDays] - Number of days that the ID5 ID and associated metadata will be stored in local storage before expiring (default 90 days).
 *
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
  /** @type {number} */
  invocationId;

  /** @type {Id5Options} */
  options;

  /** @type {Id5Options} */
  providedOptions;

  /** @type {number} */
  invalidSegments;

  static configTypes = {
    debugBypassConsent: 'Boolean',
    allowLocalStorageWithoutConsentApi: 'Boolean',
    cmpApi: 'String',
    consentData: 'Object',
    refreshInSeconds: 'Number',
    partnerUserId: 'String',
    callbackOnAvailable: 'Function',
    callbackOnUpdates: 'Function',
    callbackTimeoutInMs: 'Number',
    pd: 'String',
    abTesting: 'Object',
    provider: 'String',
    maxCascades: 'Number',
    applyCreativeRestrictions: 'Boolean',
    disableUaHints: 'Boolean',
    disableLiveIntentIntegration: 'Boolean',
    storageExpirationDays: 'Number'
  };

  /**
   * Create configuration instance from an object containing key-value pairs
   * @param {number} invocationId
   * @param {Id5Options} options
   */
  constructor(invocationId, options) {
    this.invocationId = invocationId;
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
      segments: undefined,
      disableUaHints: false,
      disableLiveIntentIntegration: false,
      storageExpirationDays: undefined
    };
    this.providedOptions = {};

    if (!isNumber(options.partnerId) && !isStr(options.partnerId)) {
      throw new Error('partnerId is required and must be a number or a string');
    }

    this.invalidSegments = 0;
    this.updOptions(options);
    this.storageConfig = new StorageConfig(options.storageExpirationDays);
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
      logError(this.invocationId, 'Config options must be an object');
      return;
    }

    this.setPartnerId(options.partnerId);

    const acceptOption = (topic, value) => {
      this.options[topic] = value;
      this.providedOptions[topic] = value;
    };

    Object.keys(options).forEach(topic => {
      if (topic === 'segments') {
        const segments = options[topic];
        const value = [];
        if (!isArray(segments)) {
          logTypeError(self.invocationId, topic, 'Array', segments);
          return;
        }
        segments.forEach((segment, index) => {
          const locator = `segments[${index}]`;
          if (!isArray(segment['ids']) || !all(segment['ids'], isStr)) {
            logTypeError(self.invocationId, `${locator}.ids`, 'Array of String', segment['ids']);
            self.invalidSegments += 1;
            return;
          }
          if (segment['ids'].length < 1) {
            logError(self.invocationId, `Config option ${locator}.ids should contain at least one segment ID`);
            self.invalidSegments += 1;
            return;
          }
          if (!isStr(segment['destination'])) {
            logTypeError(self.invocationId, `${locator}.destination`, 'String', segment['destination']);
            self.invalidSegments += 1;
            return;
          }
          value.push(segment);
        });
        acceptOption(topic, value);
      } else if (topic !== 'partnerId') { // Already dealt with
        const expectedType = Config.configTypes[topic];
        const value = options[topic];
        if (isA(value, expectedType)) {
          acceptOption(topic, value);
        } else {
          logTypeError(self.invocationId, topic, expectedType, value);
        }
      }
    });
  }

  setPartnerId(partnerId) {
    let parsed;
    if (isStr(partnerId)) {
      parsed = parseInt(partnerId);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error('partnerId is required and must parse to a positive integer');
      }
    } else if (isNumber(partnerId)) {
      parsed = partnerId;
    }

    if (isNumber(parsed)) {
      if (isNumber(this.options.partnerId) && // Might be undefined
      parsed !== this.options.partnerId
      ) {
        throw new Error('Cannot update config with a different partnerId');
      } else {
        this.options.partnerId = parsed;
        this.providedOptions.partnerId = partnerId;
      }
    }
  }
}

function logTypeError(invocationId, topic, expectedType, value) {
  logError(invocationId, `Config option ${topic} must be of type ${expectedType} but was ${toString.call(value)}. Ignoring...`);
}
