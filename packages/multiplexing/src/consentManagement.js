import {
  isDefined,
  isPlainObject
} from './utils.js';
import CONSTANTS from './constants.js';
import {LazyValue} from './promise.js';
import {GRANT_TYPE, LocalStorageGrant, ConsentManager, ConsentData} from './consent.js';

export class ConsentManagement extends ConsentManager {
  /** @type {LazyValue<ConsentData>} */
  _consentDataHolder;

  /**
   * The ID5 privacy object stored in localStorage
   * @type {Object}
   */
  storedPrivacyData;

  /**
   * The interface to the browser local storage
   * @type {LocalStorage}
   */
  localStorage;

  /**
   * @type boolean
   * @private
   */
  _forceAllowLocalStorageGrant;

  /**
   * @param {LocalStorage} localStorage the localStorage object to use
   * @param {StorageConfig} storageConfig local storage config
   * @param {boolean} forceAllowLocalStorageGrant
   * @param {Logger} logger
   * @param {Id5CommonMetrics} metrics
   */
  constructor(localStorage, storageConfig, forceAllowLocalStorageGrant, logger, metrics) {
    super();
    this._log = logger;
    this.localStorage = localStorage;
    this.storageConfig = storageConfig;
    this._consentDataHolder = new LazyValue();
    this._forceAllowLocalStorageGrant = forceAllowLocalStorageGrant;
    this._metrics = metrics;
  }

  isForceAllowLocalStorageGrant() {
    return this._forceAllowLocalStorageGrant;
  }

  /**
   * Simply resets the module's consentData.
   */
  resetConsentData(forceAllowLocalStorageGrant) {
    this._consentDataHolder.reset();
    this.storedPrivacyData = undefined;
    this._forceAllowLocalStorageGrant = forceAllowLocalStorageGrant;
  }

  /**
   * Test if consent module is present, applies, and is valid for local storage or cookies (purpose 1)
   * @returns {LocalStorageGrant} the result of checking the grant
   * @param {string} usageContext
   */
  localStorageGrant(usageContext = 'unknown') {
    const lsg = this._getLocalStorageGrant();
    this._metrics?.localStorageGrantCounter({
      allowed: lsg.allowed,
      grantType: lsg.grantType,
      lsgContext: usageContext,
      consentSet: this._consentDataHolder?.hasValue(),
      ...lsg.api
    })?.inc();
    return lsg;
  }

  _getLocalStorageGrant() {
    const log = this._log;
    if (this._forceAllowLocalStorageGrant === true) {
      log.warn('cmpApi: Local storage access granted by configuration override, consent will not be checked');
      return new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG);
    }
    if (!this._consentDataHolder.hasValue() || this._consentDataHolder.getValue().apiTypes.length === 0) {
      // Either no CMP on page or too early to say, so we check if we had stored
      // privacy data from a previous request.
      if (!isPlainObject(this.storedPrivacyData)) {
        const privacyData = this.localStorage.getItemWithExpiration(this.storageConfig.PRIVACY);
        this.storedPrivacyData = privacyData && JSON.parse(privacyData);
        log.info('cmpApi: Loaded stored privacy data from local storage', this.storedPrivacyData);
      }

      if (this.storedPrivacyData && this.storedPrivacyData.id5_consent === true) {
        return new LocalStorageGrant(true, GRANT_TYPE.ID5_CONSENT);
      }

      if (!this.storedPrivacyData || !isDefined(this.storedPrivacyData.jurisdiction)) {
        // No stored privacy data (or jurisdiction) and no consent data. We grant provisional use.
        return new LocalStorageGrant(true, GRANT_TYPE.PROVISIONAL);
      }
      // We had no id5_consent but depending on the jurisdiction, we may still grant local storage.
      const jurisdiction = this.storedPrivacyData.jurisdiction;
      const jurisdictionRequiresConsent = (jurisdiction in CONSTANTS.PRIVACY.JURISDICTIONS)
        ? CONSTANTS.PRIVACY.JURISDICTIONS[jurisdiction] : false;
      return new LocalStorageGrant(jurisdictionRequiresConsent === false, GRANT_TYPE.JURISDICTION);
    }

    return this._consentDataHolder.getValue().localStorageGrant();
  }

  setStoredPrivacy(privacy) {
    const log = this._log;
    try {
      if (isPlainObject(privacy)) {
        this.storedPrivacyData = privacy;
        this.localStorage.setItemWithExpiration(this.storageConfig.PRIVACY,
          JSON.stringify(privacy));
      } else {
        log.error('cmpApi: Cannot store privacy data if it is not an object', privacy);
      }
    } catch (e) {
      log.error('cmpApi: Error while storing privacy data', e);
    }
  }

  setConsentData(consentData) {
    this._log.debug('Set consent data', consentData);
    let consent = ConsentData.createFrom(consentData); // this may be delivered by remote follower serialized , so need to reassign
    this._consentDataHolder.set(consent);
  }

  getConsentData() {
    return this._consentDataHolder.getValuePromise();
  }

  hasConsentSet() {
    return this._consentDataHolder.hasValue();
  }
}
