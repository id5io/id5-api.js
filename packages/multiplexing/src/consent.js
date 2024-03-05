import {cyrb53Hash, isDefined, isPlainObject} from './utils.js';

export const ID5_GVL_ID = '131';

/** @enum {API_TYPE} */
export const API_TYPE = Object.freeze({
  NONE: 'none',
  TCF_V1: 'TCFv1',
  TCF_V2: 'TCFv2',
  USP_V1: 'USPv1',
  ID5_ALLOWED_VENDORS: 'ID5',
  PREBID: 'PBJS', // @deprecated, can be removed when 99.9% of multiplexing versions used with pb.js are greater than v1.0.23
  GPP_V1_0: 'GPPv1.0',
  GPP_V1_1: 'GPPv1.1'
});

export class GppConsentData {
  /** Version of gpp specification, reusing API_TYPE values for consistency
   * @type {string}
   * */
  version;

  /**
   * Tells whether ID5 has consent from the user to use local storage
   * @type {boolean}
   */
  localStoragePurposeConsent;

  /** @type {number[]}   */
  applicableSections;

  /** @type {string}   */
  gppString;

  /**
   *
   * @param {string} version
   * @param {boolean} localStoragePurposeConsent
   * @param {number[]} applicableSections
   * @param {string} gppString
   */
  constructor(version = undefined,
              localStoragePurposeConsent = undefined,
              applicableSections = undefined,
              gppString = undefined) {
    this.version = version;
    this.localStoragePurposeConsent = localStoragePurposeConsent;
    this.applicableSections = applicableSections;
    this.gppString = gppString;
  }

  // section mapping from https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/main/Sections/Section%20Information.md
  isGranted() {
    if (this.applicableSections.includes(2)) {
      return this.localStoragePurposeConsent === true;
    } else if (this.applicableSections.includes(6)) {
      return true;
    } else if (this.applicableSections.includes(0) || this.applicableSections.includes(-1) || this.applicableSections.length === 0) {
      return this.localStoragePurposeConsent !== undefined ? this.localStoragePurposeConsent : true;
    } else {
      return false;
    }
  }
}

/**
 * @property {ConsentData} oldVersionData
 * @return {array<API_TYPE>}
 */
function _getApiTypesFormOldVersion(oldVersionData) {
  // to be compatible with older consentData
  const api = oldVersionData.api;
  if (api === API_TYPE.NONE) {
    return [];
  } else if (api === API_TYPE.PREBID) {
    const apis = [];
    if (isDefined(oldVersionData.gdprApplies) || isDefined(oldVersionData.consentString)) {
      apis.push(API_TYPE.TCF_V2);
    }
    if (isDefined(oldVersionData.ccpaString)) {
      apis.push(API_TYPE.USP_V1);
    }
    return apis;
  }
  return [api];
}

export class ConsentData {
  /**
   * The API types which are used to determine consent to access local storage and call the ID5 back-end
   * @type {array<API_TYPE>} */
  apiTypes;

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

  /** @type {string} */
  ccpaString;

  /** @type {boolean} */
  forcedGrantByConfig;

  /** @type {GppConsentData} */
  gppData;

  /** @type {ConsentSource} */
  source;

  constructor() {
    this.apiTypes = [];
    this.gdprApplies = false;
    this.consentString = undefined;
    this.localStoragePurposeConsent = false;
    this.ccpaString = undefined;
    this.allowedVendors = undefined;
    this.forcedGrantByConfig = false;
    this.gppData = undefined;
  }

  localStorageGrant() {
    if (this.forcedGrantByConfig === true) {
      return new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG);
    }
    if (this.apiTypes.length === 0) {
      return new LocalStorageGrant(true, GRANT_TYPE.PROVISIONAL);
    }
    return this._getLocalStorageGrantFromApi();
  }

  _getLocalStorageGrantFromApi() {
    const apiTypes = this.apiTypes;
    const apiGrants = {};
    if (apiTypes.includes(API_TYPE.TCF_V1)) {
      apiGrants[API_TYPE.TCF_V1] = !this.gdprApplies || this.localStoragePurposeConsent === true;
    }
    if (apiTypes.includes(API_TYPE.TCF_V2)) {
      apiGrants[API_TYPE.TCF_V2] = this.gdprApplies === false || this.localStoragePurposeConsent === true;
    }
    if (apiTypes.includes(API_TYPE.ID5_ALLOWED_VENDORS)) {
      apiGrants[API_TYPE.ID5_ALLOWED_VENDORS] = this.allowedVendors.includes(ID5_GVL_ID);
    }
    if (apiTypes.includes(API_TYPE.USP_V1)) {
      // CCPA never disallows local storage
      apiGrants[API_TYPE.USP_V1] = true;
    }
    if (apiTypes.includes(API_TYPE.GPP_V1_0)) {
      apiGrants[API_TYPE.GPP_V1_0] = this.gppData.isGranted();
    }
    if (apiTypes.includes(API_TYPE.GPP_V1_1)) {
      apiGrants[API_TYPE.GPP_V1_1] = this.gppData.isGranted();
    }
    const isGranted = Object.keys(apiGrants).map((api) => apiGrants[api]).reduce((prev, current) => prev && current, true);
    return new LocalStorageGrant(isGranted, GRANT_TYPE.CONSENT_API, apiGrants);
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
    //eslint-disable-next-line no-unused-vars
    const {localStoragePurposeConsent, ccpaString, ...others} = this;
    return cyrb53Hash(JSON.stringify(others));
  }

  static createFrom(object) {
    const consentData = Object.assign(new ConsentData(), object);

    if (isDefined(consentData.api)) {
      // old version data
      // let's convert to new version
      consentData.apiTypes = _getApiTypesFormOldVersion(object);
      consentData.api = undefined;
    }

    if (isPlainObject(consentData.gppData)) {
      consentData.gppData = Object.assign(new GppConsentData(), consentData.gppData);
    }
    return consentData;
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
   * The consent API types which were used to determine consent to access local storage
   * api[API_TYPE] === true - given API allows
   * api[API_TYPE] === false - given API disallows
   * api[API_TYPE] === undefined - given API was not used
   * @type {Object}
   */
  api = {};

  constructor(allowed, grantType, api = {}) {
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
  setStoredPrivacy() {

  }
}
