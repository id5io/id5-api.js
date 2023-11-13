import {cyrb53Hash} from './utils.js';

const ID5_GVL_ID = '131';

export const API_TYPE = Object.freeze({
  NONE: 'none',
  TCF_V1: 'TCFv1',
  TCF_V2: 'TCFv2',
  USP_V1: 'USPv1',
  ID5_ALLOWED_VENDORS: 'ID5',
  PREBID: 'PBJS'
});

export class NoConsentError extends Error {
  /**
   * @type {ConsentData}
   */
  consentData;

  /**
   *
   * @param {ConsentData} consentData
   * @param {String} message
   */
  constructor(consentData, message) {
    super(message);
    this.consentData = consentData;
  }
}

export class ConsentData {
  /**
   * The API type which is used to determine consent to access local storage and call the ID5 back-end
   * @type {string}
   */
  api;

  /** @type {boolean} */
  gdprApplies;

  /**
   * The GDPR consent string
   * @type {string}
   */
  consentString;

  /**
   * Tells whether ID5 has consent from the user to use local storage
   * @type {boolean|undefined}
   */
  localStoragePurposeConsent;

  /**
   * List of allowed vendors either by IAB GVL ID or by ID5 partner ID
   * @type {Array<string>}
   */
  allowedVendors;

  /** @type {boolean} */
  hasCcpaString;

  /** @type {string} */
  ccpaString;

  /** @type {boolean} */
  forcedGrantByConfig;

  constructor(
    api = API_TYPE.NONE,
    gdprApplies = false,
    consentString = undefined,
    localStoragePurposeConsent = false,
    hasCcpaString = false,
    ccpaString = '',
    allowedVendors = undefined,
    forcedGrantByConfig = false
  ) {
    this.api = api;
    this.gdprApplies = gdprApplies;
    this.consentString = consentString;
    this.localStoragePurposeConsent = localStoragePurposeConsent;
    this.hasCcpaString = hasCcpaString;
    this.ccpaString = ccpaString;
    this.allowedVendors = allowedVendors;
    this.forcedGrantByConfig = forcedGrantByConfig;
  }

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
      case API_TYPE.PREBID:
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
   * @returns {string} a hash code of some properties of this object
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

/**
 * @interface
 */
export class ConsentManager {
  /**
   * @return {Promise<ConsentData>}
   */
  getConsentData() {

  }

  /**
   * @return {LocalStorageGrant}
   */
  localStorageGrant() {

  }

  /**
   * @param {Object} privacyData
   */
  setStoredPrivacy(privacyData) {

  }
}
