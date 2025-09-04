/*
 * Module for getting and setting ID5 API configuration.
 */
import {isDefined} from '@id5io/multiplexing/utils';
import {all, isA, isArray, isNumber, isPlainObject, isStr} from './utils.js';
import {NO_OP_LOGGER} from '@id5io/multiplexing/logger';

/**
 * @typedef {Object} Id5Options
 * @property {number} [partnerId] - ID5 Publisher ID, mandatory
 * @property {boolean} [debugBypassConsent] - Bypass consent API et local storage consent for testing purpose only
 * @property {boolean} [allowLocalStorageWithoutConsentApi] - Tell ID5 that consent has been given to read local storage
 * @property {number} [refreshInSeconds] - Refresh period of first-party cookie (defaulting to 7200s)
 * @property {string} [partnerUserId] - User ID for the platform deploying the API, to be stored by ID5 for further cookie matching if provided
 * @property {string} [cmpApi] - API to use CMP. As of today, either 'iab' or 'static'
 * @property {object} [consentData] - Consent data if cmpApi is 'static'
 * @property {function} [callbackOnAvailable] - Function to call back when User ID is available. if callbackTimeoutInMs is not provided, will be fired only if a User ID is available.
 * @property {function} [callbackOnUpdates] - Function to call back on further updates of User ID by changes in the page (consent, pd, refresh). Cannot be provided if `callbackOnAvailable` is not provided
 * @property {number} [callbackTimeoutInMs] - Delay in ms after which the callbackOnAvailable is guaranteed to be fired. A User ID may not yet be available at this time.
 * @property {string} [pd] - Partner Data that can be passed to help with cross-domain reconciliation of the ID5 ID, more details here: https://support.id5.io/portal/en/kb/articles/passing-partner-data-to-id5
 * @property {AbTestingConfig} [abTesting] - An object defining if and how A/B testing should be enabled
 * @property {string} [provider] - Defines who is deploying the API on behalf of the partner. A hard-coded value that will be provided by ID5 when applicable
 * @property {number} [maxCascades] - Defines the maximum number of cookie syncs that can occur when usersyncing for the user is required. A value of -1 will disable cookie syncing altogether. Defaults to 8
 * @property {boolean} [applyCreativeRestrictions] - When true some restrictions are applied, for example avoid writing to localStorage and avoid cookie syncing.
 * @property {boolean} [acr] - shortcut for applyCreativeRestrictions.
 * @property {Array<Segment>} [segments] - A list of segments to push to partners.
 * @property {boolean} [disableUaHints] - When true, look up of high entropy values through user agent hints is disabled.
 * @property {number} [storageExpirationDays] - Number of days that the ID5 ID and associated metadata will be stored in local storage before expiring (default 90 days).
 * @property {number} [att] - Indication of whether the event came from an Apple ATT event (value of 1 is yes)
 * @property {Diagnostics} [diagnostics] - API diagnostics configuration
 * @property {DynamicConfig} [dynamicConfig] - Dynamic configuration from prebid (not intended to be used directly)
 * @property {GCReclaimAllowed} [allowGCReclaim] - Determines if and/or on which stage `Id5Instance` object can be reclaimed by GC (only if there is no other external reference kept)
 * @property {GoogleSecureSignals} [gssProvider] - Google Secure Signals collection settings
 */

/**
 * @typedef {Object} Segment
 * @property {string} [destination] - GVL ID or ID5-XX Partner ID. Mandatory
 * @property {Array<string>} [ids] - The segment IDs to push. Must contain at least one segment ID.
 */

/**
 * @typedef {Object} AbTestingConfig
 * @property {boolean} [enabled] - Enable control group
 * @property {number} [controlGroupPct] - Ratio of users in control group [0,1]
 */

/**
 * @typedef {Object} Diagnostics
 * @property {boolean} [publishingDisabled] - Disable diagnostics publishing
 * @property {number} [publishAfterLoadInMsec] - Delay in ms after script load after which collected diagnostics are published
 * @property {boolean} [publishBeforeWindowUnload] - When true, diagnostics publishing is triggered on Window 'beforeunload' event
 * @property {number} [publishingSampleRatio] - Diagnostics publishing sample ratio
 */

/**
 * @typedef {Object} Multiplexing
 * @property {boolean} [disabled] - Disable multiplexing (instance will work in single mode)
 */

/**
 * @typedef {Object} FetchCallConfig
 * @property {string} [url] - Overrides the fetch URL to call (deprecated in multiplexing)
 * @property {Object} [overrides] - Overrides to apply to fetch parameters
 */

/**
 * @typedef {Object} ExtensionsCallConfig
 * @property {string} [url] - The URL for the extensions endpoint
 * @property {string} [method] - Overrides the HTTP method to use to make the call
 * @property {Object} [body] - Specifies a body to pass to the extensions endpoint
 */

/**
 * @typedef {Object} DynamicConfig
 * @property {FetchCallConfig} [fetchCall] - The fetch call configuration
 * @property {ExtensionsCallConfig} [extensionsCall] - The configuration for making the extensions call (deprecated in mutiplexing)
 */

/**
 * @typedef {Object} GoogleSecureSignals
 * @property {boolean} [enabled]
 * @property {string} [id]
 */

/**
 * @enum {GCReclaimAllowed}
 */
export const GCReclaimAllowed = Object.freeze({
  NEVER: 'never',
  AFTER_UID_SET: 'after-uid-set',
  ASAP: 'asap'
});

const ENUM_PROPERTIES = Object.freeze({
  allowGCReclaim: Object.values(GCReclaimAllowed)
});

export class Config {
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
    acr: 'Boolean',
    disableUaHints: 'Boolean',
    storageExpirationDays: 'Number',
    att: 'Number',
    diagnostics: 'Object',
    multiplexing: 'Object',
    dynamicConfig: 'Object',
    allowGCReclaim: 'String',
    gssProvider: 'Object'
  };

  /**
   * Create configuration instance from an object containing key-value pairs
   * @param {Id5Options} options
   * @param {Logger} logger
   */
  constructor(options, logger = NO_OP_LOGGER) {
    this._log = logger;
    this.options = {
      debugBypassConsent: false,
      allowLocalStorageWithoutConsentApi: false,
      cmpApi: 'iab',
      consentData: {},
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
      acr: false,
      segments: undefined,
      disableUaHints: false,
      storageExpirationDays: undefined,
      att: undefined,
      diagnostics: {
        publishingDisabled: false,
        publishAfterLoadInMsec: 30000,
        publishBeforeWindowUnload: true,
        publishingSampleRatio: 0.01
      },
      multiplexing: {
        _disabled: false
      },
      allowGCReclaim: GCReclaimAllowed.AFTER_UID_SET
    };
    this.providedOptions = {};

    if (!isNumber(options.partnerId) && !isStr(options.partnerId)) {
      throw new Error('partnerId is required and must be a number or a string');
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

  hasCreativeRestrictions() {
    return this.options.applyCreativeRestrictions || this.options.acr;
  }

  isForceAllowLocalStorageGrant() {
    const options = this.options
    return options.allowLocalStorageWithoutConsentApi || options.debugBypassConsent;
  }

  /**
   * Override the configuration with an object containing key-value pairs
   * @param {Id5Options} providedOptions
   */
  updOptions(providedOptions) {
    const self = this;
    const log = self._log;
    if (!isPlainObject(providedOptions)) {
      log.error('Config options must be an object');
      return;
    }

    this.setPartnerId(providedOptions.partnerId);

    const acceptOption = (topic, value) => {
      this.options[topic] = value;
      this.providedOptions[topic] = value;
    };

    Object.keys(providedOptions).forEach(topic => {
      if (topic === 'segments') {
        const segments = providedOptions[topic];
        const value = [];
        if (!isDefined(segments)) {
          return;
        }
        if (!isArray(segments)) {
          logTypeError(log, topic, 'Array', segments);
          return;
        }
        segments.forEach((segment, index) => {
          const locator = `segments[${index}]`;
          if (!isArray(segment['ids']) || !all(segment['ids'], isStr)) {
            logTypeError(log, `${locator}.ids`, 'Array of String', segment['ids']);
            self.invalidSegments += 1;
            return;
          }
          if (segment['ids'].length < 1) {
            log.error(`Config option ${locator}.ids should contain at least one segment ID`);
            self.invalidSegments += 1;
            return;
          }
          if (!isStr(segment['destination'])) {
            logTypeError(log, `${locator}.destination`, 'String', segment['destination']);
            self.invalidSegments += 1;
            return;
          }
          value.push(segment);
        });
        acceptOption(topic, value);
      } else if (topic === 'diagnostics') {
        const defaultDiagnostics = this.options.diagnostics;
        const providedDiagnostics = providedOptions.diagnostics;
        if (isA(providedDiagnostics, Config.configTypes.diagnostics)) {
          let mergedDiagnostics = {...defaultDiagnostics};
          Object.keys(providedDiagnostics).forEach(name => {
            if (defaultDiagnostics[name] !== undefined && (typeof defaultDiagnostics[name]) === (typeof providedDiagnostics[name])) {
              mergedDiagnostics[name] = providedDiagnostics[name];
            }
          });
          this.options[topic] = mergedDiagnostics;
        }

        this.providedOptions[topic] = providedOptions[topic];
      } else if (ENUM_PROPERTIES[topic] !== undefined) {
        const providedValue = providedOptions[topic];
        if (providedValue && ENUM_PROPERTIES[topic].includes(providedValue)) {
          acceptOption(topic, providedValue);
        }
      } else if (topic !== 'partnerId') { // Already dealt with
        const expectedType = Config.configTypes[topic];
        const value = providedOptions[topic];
        if (isDefined(value)) {
          if (isA(value, expectedType)) {
            acceptOption(topic, value);
          } else {
            logTypeError(log, topic, expectedType, value);
          }
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

function logTypeError(log, topic, expectedType, value) {
  log.error(`Config option ${topic} must be of type ${expectedType} but was ${toString.call(value)}. Ignoring...`);
}
