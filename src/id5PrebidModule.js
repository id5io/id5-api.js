import {delve, InvocationLogger, isDefined, isGlobalDebug, isGlobalTrace, setGlobalDebug} from '../lib/utils.js';
import {version as currentVersion} from '../generated/version.js';
import {Config} from '../lib/config.js';
import {createPublisher, Id5CommonMetrics, partnerTag, startTimeMeasurement} from '@id5io/diagnostics';
import multiplexing, {
  API_TYPE,
  ApiEvent,
  ConsentData,
  ConsentSource,
  GppConsentData,
  WindowStorage
} from '@id5io/multiplexing';
import {semanticVersionCompare} from '@id5io/multiplexing/src/utils.js';
import {UaHints} from '../lib/uaHints.js';
import {GPPClient} from '../lib/consentProvider.js';
import {TrueLinkAdapter} from '@id5io/multiplexing/src/trueLink.js';

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

/**
 * @typedef {Object} PrebidGppConsentData
 * @property {(string|undefined)} gppVersion
 * @property {(string|undefined)} gppString
 * @property {(array[number]|undefined)} applicableSections
 * @property {(Object|undefined)} parsedSections
 */

const SOURCE = 'id5-prebid-ext-module';

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
   * @param {string|undefined} [uspConsentData] - USP Consent information from Prebid
   * @param {PrebidGppConsentData|undefined} [gppConsentData] - GPP Consent information from Prebid
   * @returns {Promise<IdResponse>}
   */
  async fetchId5Id(dynamicConfig, prebidConfig, refererInfo, gdprConsentData, uspConsentData, gppConsentData) {
    this.invocationId += 1;
    const prebidVersion = isDefined(window.pbjs) ? window.pbjs.version : 'unknown';
    const log = new InvocationLogger(SOURCE, this.invocationId);
    log.info(`ID5 API Prebid  external module version ${this._version}. Invoking fetchId5Id()`, dynamicConfig, prebidConfig);
    const config = new Config({
      partnerId: prebidConfig.partner,
      pd: prebidConfig.pd,
      abTesting: prebidConfig.abTesting,
      multiplexing: prebidConfig.multiplexing,
      diagnostics: prebidConfig.diagnostics,
      segments: prebidConfig.segments,
      disableUaHints: prebidConfig.disableUaHints,
      dynamicConfig
    }, log);
    const options = config.getOptions();
    const metrics = this._configureDiagnostics(options.partnerId, options.diagnostics, refererInfo, log, prebidVersion);
    if (metrics) {
      metrics.loadDelayTimer().recordNow(); // records time elapsed since page visit
      metrics.invocationCountSummary().record(this.invocationId); // record invocation count
    }
    const storage = new WindowStorage(window);
    const instance = multiplexing.createInstance(window, log, metrics, storage, new TrueLinkAdapter());
    instance.updateConsent(this._buildConsentData(gdprConsentData, uspConsentData, gppConsentData));
    const userIdReadyTimer = startTimeMeasurement();
    const instancePromise = new Promise((resolve, reject) => {
      instance
        .on(ApiEvent.USER_ID_READY, (userIdData, notificationContext) => {
          try {
            const notificationContextTags = notificationContext?.tags ? {...notificationContext.tags} : {};
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

    const fetchIdData = await this._gatherFetchIdData(config, refererInfo, log, prebidVersion);
    instance.register({
      source: SOURCE,
      sourceVersion: currentVersion,
      sourceConfiguration: {
        options: config.getOptions()
      },
      fetchIdData,
      singletonMode: options?.multiplexing?._disabled === true,
      canDoCascade: false, // Disable cascading within prebid
      forceAllowLocalStorageGrant: false,
      storageExpirationDays: options.storageExpirationDays
    });

    return instancePromise;
  }

  /**
   * @private
   * @param {PrebidConsentData} gdprConsentData
   * @param {string|undefined} uspConsentData
   * @param {PrebidGppConsentData|undefined} [gppConsentData] - GPP Consent information from Prebid
   * @returns {ConsentData}
   */
  _buildConsentData(gdprConsentData, uspConsentData, gppConsentData) {
    const consentData = new ConsentData();
    consentData.source = ConsentSource.prebid;
    if (gdprConsentData) {
      consentData.apiTypes.push(API_TYPE.TCF_V2);
      consentData.gdprApplies = gdprConsentData.gdprApplies;
      consentData.consentString = gdprConsentData.consentString;
      consentData.localStoragePurposeConsent = delve(gdprConsentData.vendorData, 'purpose.consents.1');
    }
    if (uspConsentData) {
      consentData.apiTypes.push(API_TYPE.USP_V1);
      consentData.ccpaString = uspConsentData;
      consentData.localStoragePurposeConsent = true;
    }
    if (gppConsentData?.gppString) {
      let tcfData = GPPClient.getTcfData(gppConsentData.parsedSections);
      const localStoragePurposeConsent = tcfData ? GPPClient.tcfDataHasLocalStorageGrant(tcfData) : undefined;
      const gppVersion = this._translateGppVersion(gppConsentData.gppVersion);
      if (gppVersion) {
        consentData.apiTypes.push(gppVersion);
        consentData.gppData = new GppConsentData(gppVersion, localStoragePurposeConsent, gppConsentData.applicableSections, gppConsentData.gppString);
      }
    }
    return consentData;
  }

  /**
   * @return {undefined|API_TYPE}
   */
  _translateGppVersion(gppVersion) {
    switch (gppVersion) {
      case '1.0':
        return API_TYPE.GPP_V1_0;
      case '1.1':
        return API_TYPE.GPP_V1_1;
      default:
        return undefined;
    }
  }

  /**
   * @private
   * @param {number} partnerId
   * @param {Diagnostics} diagnosticsOptions
   * @param {Logger} log
   * @param {String} prebidVersion
   * @return {Id5CommonMetrics}
   */
  _configureDiagnostics(partnerId, diagnosticsOptions, refererInfo, log, prebidVersion) {
    try {
      let metrics = new Id5CommonMetrics(SOURCE, this._version);
      metrics.addCommonTags({
        ...partnerTag(partnerId),
        tml: refererInfo.topmostLocation,
        prebidVersion: prebidVersion
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
   * @param {Logger} log
   * @param {String} prebidVersion
   * @returns {FetchIdData} a JSON object to use to make the fetch request
   */
  async _gatherFetchIdData(config, refererInfo, log, prebidVersion) {
    const options = config.getOptions();
    const uaHints = await UaHints.gatherUaHints(options.disableUaHints, log);
    return {
      partnerId: options.partnerId,
      refererInfo: refererInfo,
      origin: 'pbjs',
      originVersion: prebidVersion,
      isUsingCdn: this._isUsingCdn,
      att: options.att,
      uaHints: uaHints,
      abTesting: options.abTesting,
      segments: options.segments,
      // TODO replace with diagnostic metric  there is prometheus graph lateJoinerData.invalidSegmentsCount == knownData.invalidSegmentsCount
      invalidSegmentsCount: config.getInvalidSegments(),
      provider: options.provider,
      pd: options.pd,
      partnerUserId: options.partnerUserId,
      refreshInSeconds: options.refreshInSeconds, // TODO do we need this ?
      providedRefreshInSeconds: config.getProvidedOptions().refreshInSeconds,
      trace: isGlobalTrace(),
      consentSource: ConsentSource.prebid,
      trueLink: new TrueLinkAdapter().getTrueLink(),
    };
  }
}

// Install the integration on the global object `id5Prebid`
if (!window.id5Prebid) {
  window.id5Prebid = {};
}

if (!window.id5Prebid.version || semanticVersionCompare(window.id5Prebid.version, currentVersion) <= 0) {
  // There is no previous API or it's an older one. We override with our code.
  window.id5Prebid.integration = new Id5PrebidIntegration();
  window.id5Prebid.version = currentVersion;
}
