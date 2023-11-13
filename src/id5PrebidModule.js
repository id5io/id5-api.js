import {
  delve,
  isGlobalDebug,
  setGlobalDebug,
  InvocationLogger,
  isStr,
  isGlobalTrace,
  isDefined,
  filterUaHints
} from '../lib/utils.js';
import { version as currentVersion } from '../generated/version.js';
import { Config } from '../lib/config.js';
import { createPublisher, Id5CommonMetrics, partnerTag, startTimeMeasurement } from '@id5io/diagnostics';
import multiplexing, { API_TYPE, ConsentData, ApiEvent, WindowStorage } from '@id5io/multiplexing';
import { semanticVersionCompare } from '@id5io/multiplexing/src/utils.js';

/**
 * @typedef {Object} IdResponse
 * @property {string} [universal_uid] - The encrypted ID5 ID to pass to bidders
 * @property {Object} [ext] - The extensions object to pass to bidders
 * @property {Object} [ab_testing] - A/B testing configuration
*/

/**
 * @typedef {Object} FetchCallConfig
 * @property {string} [url] - The URL for the fetch endpoint
 * @property {Object} [overrides] - Overrides to apply to fetch parameters
*/

/**
 * @typedef {Object} ABTestingConfig
 * @property {boolean} enabled - Tells whether A/B testing is enabled for this instance
 * @property {number} controlGroupPct - A/B testing proabaility
 */

/**
 * @typedef {Object} Id5PrebidConfig
 * @property {number} partner - The ID5 partner ID
 * @property {string} pd - The ID5 partner data string
 * @property {ABTestingConfig} abTesting - The A/B testing configuration
 * @property {boolean} disableExtensions - Disabled extensions call
 */

/**
 * @typedef {Object} PrebidRefererInfo
 * @property {string|null} location the browser's location, or null if not available (due to cross-origin restrictions)
 * @property {string|null} canonicalUrl the site's canonical URL as set by the publisher, through setConfig({pageUrl}) or <link rel="canonical" />
 * @property {string|null} page the best candidate for the current page URL: `canonicalUrl`, falling back to `location`
 * @property {string|null} domain the domain portion of `page`
 * @property {string|null} ref the referrer (document.referrer) to the current page, or null if not available (due to cross-origin restrictions)
 * @property {string} topmostLocation of the top-most frame for which we could guess the location. Outside of cross-origin scenarios, this is equivalent to `location`.
 * @property {number} numIframes number of steps between window.self and window.top
 * @property {Array[string|null]} stack our best guess at the location for each frame, in the direction top -> self.
 */

/**
 * @typedef {Object} PrebidConsentData
 * @property {(string|undefined)} consentString
 * @property {(Object|undefined)} vendorData
 * @property {(boolean|undefined)} gdprApplies
 */

const ORIGIN = 'id5-prebid-ext-module';

class Id5PrebidIntegration {
  /** @type {boolean} */
  set debug(isDebug) {
    setGlobalDebug(isDebug);
  }

  get debug() {
    return isGlobalDebug();
  }

  /** @type {number} */
  invocationId = 0;

  /** @type {string} */
  _version = currentVersion;

  /** @type {boolean} */
  userIdReady = false;

  constructor() {
    this._isUsingCdn = !!(
      document &&
      document.currentScript &&
      document.currentScript.src &&
      document.currentScript.src.indexOf('https://cdn.id5-sync.com') === 0
    );
  }

  /**
   * @param {DynamicConfig} [dynamicConfig] - Dynamic configuration from ID5 Prebid config endpoint
   * @param {Id5PrebidConfig} [prebidConfig] - Static configuration from Prebid modue
   * @param {PrebidRefererInfo} [refererInfo] - Information about the page related URLs
   * @param {PrebidConsentData} [gdprConsentData] - GDPR Consent information from Prebid
   * @returns {Promise<IdResponse>}
   */
  async fetchId5Id(dynamicConfig, prebidConfig, refererInfo, gdprConsentData, uspConsentData) {
    this.invocationId += 1;
    const log = new InvocationLogger(ORIGIN, this.invocationId);
    log.info(`ID5 API Prebid  external module version ${this._version}. Invoking fetchId5Id()`, dynamicConfig, prebidConfig);
    const config = new Config({
      partnerId: prebidConfig.partner,
      pd: prebidConfig.pd,
      abTesting: prebidConfig.abTesting,
      multiplexing: prebidConfig.multiplexing,
      diagnostics: prebidConfig.diagnostics,
      segments: prebidConfig.segments,
      disableUaHints: prebidConfig.disableUaHints,
      dynamicConfig,
      maxCascades: 0 // Disable cascading within prebid
    }, log);
    const options = config.getOptions();
    const metrics = this._configureDiagnostics(options.partnerId, options.diagnostics, refererInfo, log);
    if (metrics) {
      metrics.loadDelayTimer().recordNow(); // records time elapsed since page visit
      metrics.invocationCountSummary().record(this.invocationId); // record invocation count
    }
    const storage = new WindowStorage(window);
    const instance = multiplexing.createInstance(window, log, metrics, storage);
    instance.updateConsent(this._buildConsentData(gdprConsentData, uspConsentData));
    const userIdReadyTimer = startTimeMeasurement();
    const instancePromise = new Promise((resolve, reject) => {
      instance
        .on(ApiEvent.USER_ID_READY, (userIdData, notificationContext) => {
          try {
            const notificationContextTags = notificationContext?.tags ? { ...notificationContext.tags } : {};
            if (notificationContext?.timestamp) {
              metrics.userIdNotificationDeliveryDelayTimer(notificationContextTags).record(Date.now() - notificationContext.timestamp);
            }
            userIdReadyTimer.record(metrics.userIdProvisioningDelayTimer(userIdData.isFromCache, {
              ...notificationContextTags,
              isUpdate: false
            }));
          } catch (e) {
            log.error('Failed to measure provisioning metrics', e);
          }
          const response = userIdData.responseObj;
          this.userIdReady = true;
          resolve({
            universal_uid: response.universal_uid,
            ext: response.ext,
            ab_testing: response.ab_testing
          });
        })
        .on(ApiEvent.USER_ID_FETCH_CANCELED, details => {
          log.info('ID5 User ID fetch canceled:', details.reason);
          reject(details.reason);
        });
    });

    const fetchIdData = await this._gatherFetchIdData(config, refererInfo, log);
    instance.register({
      source: ORIGIN,
      sourceVersion: currentVersion,
      sourceConfiguration: {
        options: config.getOptions()
      },
      fetchIdData,
      singletonMode: options?.multiplexing?._disabled === true,
      canDoCascade: false,
      forceAllowLocalStorageGrant: false,
      storageExpirationDays: options.storageExpirationDays
    });

    return instancePromise;
  }

  /**
   * @private
   * @param {PrebidConsentData} gdprConsentData
   * @param {string|undefined} uspConsentData
   * @returns
   */
  _buildConsentData(gdprConsentData, uspConsentData) {
    const consentData = new ConsentData(API_TYPE.PREBID);
    if (gdprConsentData) {
      consentData.gdprApplies = gdprConsentData.gdprApplies;
      consentData.consentString = gdprConsentData.consentString;
      consentData.localStoragePurposeConsent = delve(gdprConsentData.vendorData, 'purpose.consents.1');
    }
    if (uspConsentData) {
      consentData.hasCcpaString = isStr(uspConsentData);
      consentData.ccpaString = uspConsentData;
      consentData.localStoragePurposeConsent = true;
    }
    return consentData;
  }

  /**
   * @private
   * @param {number} partnerId
   * @param {Diagnostics} diagnosticsOptions
   * @param {Logger} log
   * @return {Id5CommonMetrics}
   */
  _configureDiagnostics(partnerId, diagnosticsOptions, refererInfo, log) {
    try {
      let metrics = new Id5CommonMetrics(ORIGIN, this._version);
      metrics.addCommonTags({
        ...partnerTag(partnerId),
        tml: refererInfo.topmostLocation
      });
      if (!diagnosticsOptions?.publishingDisabled) {
        let publisher = createPublisher(diagnosticsOptions.publishingSampleRatio);
        if (diagnosticsOptions?.publishAfterLoadInMsec && diagnosticsOptions.publishAfterLoadInMsec > 0) {
          metrics.schedulePublishAfterMsec(diagnosticsOptions.publishAfterLoadInMsec, publisher);
        }
        if (diagnosticsOptions?.publishBeforeWindowUnload) {
          metrics.schedulePublishBeforeUnload(publisher);
        }
      }
      return metrics;
    } catch (e) {
      log.error('Failed to configure diagnostics', e);
      return undefined;
    }
  }

  /**
   * @private
   * @param {Config} config
   * @param {PrebidRefererInfo} refererInfo
   * @returns
   */
  async _gatherFetchIdData(config, refererInfo, log) {
    const options = config.getOptions();
    const uaHints = await this._gatherUaHints(options, log);
    return {
      partnerId: options.partnerId,
      refererInfo: refererInfo,
      origin: ORIGIN,
      originVersion: this._version,
      isUsingCdn: this._isUsingCdn,
      att: options.att,
      uaHints: uaHints,
      abTesting: options.abTesting,
      segments: options.segments,
      // TODO replace with diagnostic metric  there is prometeus graph lateJoinerData.invalidSegmentsCount == knownData.invalidSegmentsCount
      invalidSegmentsCount: config.getInvalidSegments(),
      provider: options.provider,
      pd: options.pd,
      partnerUserId: options.partnerUserId,
      refreshInSeconds: options.refreshInSeconds, // TODO do we need this ?
      providedRefreshInSeconds: config.getProvidedOptions().refreshInSeconds,
      trace: isGlobalTrace()
    };
  }

  async _gatherUaHints(options, log) {
    if (!isDefined(window.navigator.userAgentData) || options.disableUaHints) {
      return undefined;
    }
    try {
      const hints = await window.navigator.userAgentData.getHighEntropyValues(['architecture', 'fullVersionList', 'model', 'platformVersion']);
      return filterUaHints(hints);
    } catch (error) {
      log.error('Error while calling navigator.userAgentData.getHighEntropyValues()', error);
      return undefined;
    }
  }
}

// Install the integration on the global object `id5Prebid`
if (!window.id5Prebid) {
  window.id5Prebid = {};
}

if (!window.id5Prebid.version || semanticVersionCompare(window.id5Prebid.version, currentVersion) <= 0) {
  // There is no previous API or it's an older one. We override with our code.
  window.id5Prebid.integration = new Id5PrebidIntegration();
}
