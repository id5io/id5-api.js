import {
  cyrb53Hash,
  isDefined,
  isPlainObject
} from './utils.js';
import {LazyValue} from './promise.js';
import CONSTANTS from './constants.json';

const ID5_GVL_ID = '131';

export const API_TYPE = Object.freeze({
  NONE: 'none',
  TCF_V1: 'TCFv1',
  TCF_V2: 'TCFv2',
  USP_V1: 'USPv1',
  ID5_ALLOWED_VENDORS: 'ID5'
});

/**
 * The GRANT_TYPE tells how the grant to local storage was computed
 * FORCE_ALLOWED_BY_CONFIG - when configuration forces to allow usage of local storage
 * ID5_CONSENT - when either in stored or in received privacy object,
 *               ID5 has consent to use local storage.
 * PROVISIONAL - We don't know yet whether we're granted access by consent.
 *               We allow access but restrictions apply. See isDefinitivelyAllowed().
 * JURISDICTION - The decision was based on the basis of the jurisdiction which
 *                is returned by the ID5 server (or stored from previous calls).
 * CONSENT_API - The decision was based on one of the various consent APIs we interact with.
 */
export const GRANT_TYPE = Object.freeze({
  FORCE_ALLOWED_BY_CONFIG: 'force_allowed_by_config',
  ID5_CONSENT: 'id5_consent',
  PROVISIONAL: 'provisional',
  JURISDICTION: 'jurisdiction',
  CONSENT_API: 'consent_api'
});

export class LocalStorageGrant {
  /**
   * Tells whether or not
   * @type {boolean}
   */
  allowed = false;

  /**
   * The type of grant we got for the current isLocalStorageAllowed() invocation
   * @type {string}
   */
  grantType = GRANT_TYPE.NONE;

  /**
   * The consent API type which is used to determine consent to access local storage
   * @type {string}
   */
  api = API_TYPE.NONE;

  constructor(allowed, grantType, api) {
    this.allowed = allowed;
    this.grantType = grantType;
    this.api = api;
  }

  isDefinitivelyAllowed() {
    return this.allowed && this.grantType !== GRANT_TYPE.PROVISIONAL;
  }
}

export class ConsentData {
  /**
   * The API type which is used to determine consent to access local storage and call the ID5 back-end
   * @type {string}
   */
  api = API_TYPE.NONE;

  /**
   * The GDPR consent string
   * @type {string}
   */
  consentString;

  /** @type {boolean} */
  gdprApplies = false;

  /**
   * @type {boolean|undefined}
   */
  localStoragePurposeConsent;

  /**
   * List of allowed vendors either by IAB GVL ID or by ID5 partner ID
   * @type {Array<string>}
   */
  allowedVendors;

  /** @type {boolean} */
  hasCcpaString = false;

  /** @type {string} */
  ccpaString = '';

  forcedGrantByConfig = false;

  localStorageGrant() {
    const grantType = (this.forcedGrantByConfig === true)
      ? GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG
      : ((this.api === undefined || this.api === API_TYPE.NONE) ? GRANT_TYPE.PROVISIONAL : GRANT_TYPE.CONSENT_API);
    return new LocalStorageGrant(this.isGranted(), grantType, this.api);
  }

  isGranted() {
    switch (this.api) {
      case API_TYPE.NONE:
        // By default (so no indication from the owner of the page
        // and no consent framework detected on page) we assume that we can use local storage
        return true;
      case API_TYPE.TCF_V1:
        return !this.gdprApplies || this.localStoragePurposeConsent === true;
      case API_TYPE.TCF_V2:
        return this.gdprApplies === false || this.localStoragePurposeConsent === true;
      case API_TYPE.ID5_ALLOWED_VENDORS:
        return this.allowedVendors.includes(ID5_GVL_ID);
      case API_TYPE.USP_V1:
        // CCPA never disallows local storage
        return true;
    }
  }

  /**
   * Note this is not a generic hash code but rather a hash code
   * used to check whether or not consent has changed across invocations
   * @returns a hash code of some properties of this object
   */
  hashCode() {
    /*
    * We hash every properties except:
    *   - localStoragePurposeConsent object since the consentString is enough to know.
    *   - ccpaString as it doesn't contribute to the local storage decision.
    */
    const {localStoragePurposeConsent, ccpaString, ...others} = this;
    return cyrb53Hash(JSON.stringify(others));
  }
}
// TODO this class should go to multiplexing - it's used in UidFetcher
export class ConsentManagement {
  /** @type LazyValue<ConsentData>} */
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
   */
  constructor(localStorage, storageConfig, forceAllowLocalStorageGrant, logger) {
    this._log = logger;
    this.localStorage = localStorage;
    this.storageConfig = storageConfig;
    this._consentDataHolder = new LazyValue();
    this._forceAllowLocalStorageGrant = forceAllowLocalStorageGrant;
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
   */
  localStorageGrant() {
    const log = this._log;
    if (this._forceAllowLocalStorageGrant === true) {
      log.warn('cmpApi: Local storage access granted by configuration override, consent will not be checked');
      return new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG, API_TYPE.NONE);
    }
    if (!this._consentDataHolder.hasValue() || this._consentDataHolder.getValue().api === API_TYPE.NONE) {
      // Either no CMP on page or too early to say, so we check if we had stored
      // privacy data from a previous request.
      if (!isPlainObject(this.storedPrivacyData)) {
        const privacyData = this.localStorage.getItemWithExpiration(this.storageConfig.PRIVACY);
        this.storedPrivacyData = privacyData && JSON.parse(privacyData);
        log.info('cmpApi: Loaded stored privacy data from local storage', this.storedPrivacyData);
      }

      if (this.storedPrivacyData && this.storedPrivacyData.id5_consent === true) {
        return new LocalStorageGrant(true, GRANT_TYPE.ID5_CONSENT, API_TYPE.NONE);
      }

      if (!this.storedPrivacyData || !isDefined(this.storedPrivacyData.jurisdiction)) {
        // No stored privacy data (or jurisdiction) and no consent data. We grant provisional use.
        return new LocalStorageGrant(true, GRANT_TYPE.PROVISIONAL, API_TYPE.NONE);
      }
      // We had no id5_consent but depending on the jurisdiction, we may still grant local storage.
      const jurisdiction = this.storedPrivacyData.jurisdiction;
      const jurisdictionRequiresConsent = (jurisdiction in CONSTANTS.PRIVACY.JURISDICTIONS)
        ? CONSTANTS.PRIVACY.JURISDICTIONS[jurisdiction] : false;
      return new LocalStorageGrant(jurisdictionRequiresConsent === false, GRANT_TYPE.JURISDICTION, API_TYPE.NONE);
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
    this._consentDataHolder.set(consentData);
  }

  getConsentData() {
    return this._consentDataHolder.getValuePromise();
  }
}
