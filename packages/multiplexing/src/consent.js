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

/**
 * @enum {ConsentSource}
 */
export const ConsentSource = Object.freeze({
  cmp: 'cmp',
  partner: 'partner',
  prebid: 'prebid',
  none: 'none'
});

// partial section mapping from https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/main/Sections/Section%20Information.md
export const GPP_SECTIONS = Object.freeze({
  TCFEUV2: 2,
  TCFCAV1: 5
});

export class GppTcfData {
  /**
   * Whether user gave consent to use local storage
   * @type {boolean}
   */
  localStoragePurposeConsent;

  /**
   *  Whether ID5 vendor has consent from user
   *  @type {boolean}
   */
  vendorsConsentForId5Granted;


  constructor(localStoragePurposeConsent, vendorsConsentForId5Granted) {
    this.localStoragePurposeConsent = localStoragePurposeConsent;
    this.vendorsConsentForId5Granted = vendorsConsentForId5Granted;
  }

  /**
   *
   * @return {boolean}
   */
  isGranted() {
    return this.localStoragePurposeConsent !== false &&
      this.vendorsConsentForId5Granted !== false
  }

  getDebugInfo(version, prefix) {
    const debugInfo= {}
    if(this.localStoragePurposeConsent !== undefined) {
      debugInfo[version+'-'+prefix+'-localStoragePurposeConsent'] = this.localStoragePurposeConsent;
    }
    if(this.vendorsConsentForId5Granted !== undefined) {
      debugInfo[version+'-'+prefix+'-vendorsConsentForId5Granted'] = this.vendorsConsentForId5Granted;
    }
    return debugInfo;
  }
}

export class GppConsentData {
  /** Version of gpp specification, reusing API_TYPE values for consistency
   * @type {string}
   * */
  version;

  /** @type {number[]}   */
  applicableSections;

  /** @type {string}   */
  gppString;

  /** @type {GppTcfData} */
  euTcfSection;

  /** @type {GppTcfData} */
  canadaTcfSection;


  /**
   *
   * @param {string} version
   * @param {number[]} applicableSections
   * @param {string} gppString
   * @param {GppTcfData} euTcfSection consent from eu tcf (only when in applicable sections)
   * @param {GppTcfData} canadaTcfSection consent for canada tcf (only when in applicable sections)
   */
  constructor(version = undefined,
              applicableSections = undefined,
              gppString = undefined,
              euTcfSection = undefined,
              canadaTcfSection = undefined) {
    this.version = version;
    this.applicableSections = applicableSections;
    this.gppString = gppString;
    this.euTcfSection = euTcfSection;
    this.canadaTcfSection = canadaTcfSection;
  }

  /**
   * @return {undefined|boolean}
   */
  isGranted() {
    if (this.applicableSections.includes(GPP_SECTIONS.TCFEUV2)) {
      return this.euTcfSection?.isGranted();
    } else if(this.applicableSections.includes(GPP_SECTIONS.TCFCAV1)) {
      return true;  //allowed temporarily to first collect information
    } else {
      return true;
    }
  }

  getDebugInfo() {
    const debugInfo = {}
    if(this.euTcfSection !== undefined) {
      Object.assign(debugInfo, this.euTcfSection.getDebugInfo(this.version, 'tcfeuv2'))
    }
    if(this.canadaTcfSection !== undefined) {
      Object.assign(debugInfo, this.canadaTcfSection.getDebugInfo(this.version, 'tcfcav1'))
    }
    return debugInfo;
  }

  static createFrom(serializedObject) {
    const gppData = Object.assign(new GppConsentData(), serializedObject);
    if (isDefined(gppData.euTcfSection)) {
      gppData.euTcfSection = Object.assign(new GppTcfData(), gppData.euTcfSection);
    } else if(gppData.localStoragePurposeConsent !== undefined || gppData.vendorsConsentForId5Granted !== undefined) {
      // fallback for older consent data
      gppData.euTcfSection = new GppTcfData(serializedObject.localStoragePurposeConsent, serializedObject.vendorsConsentForId5Granted);
      delete gppData.localStoragePurposeConsent;
      delete gppData.vendorsConsentForId5Granted;
    }
    if (isDefined(gppData.canadaTcfSection)) {
      gppData.canadaTcfSection = Object.assign(new GppTcfData(), gppData.canadaTcfSection);
    }

    return gppData;
  }
}

/**
 * @property {ConsentData} oldVersionData
 * @return {array<API_TYPE>}
 */
function _getApiTypesFromOldVersion(oldVersionData) {
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
    if (isDefined(oldVersionData.gppData) && isDefined(oldVersionData.gppData.version)) {
      apis.push(oldVersionData.gppData.version);
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

  /** @type {boolean} */
  vendorsConsentForId5Granted;

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
    const debugInfo = {};
    if (apiTypes.includes(API_TYPE.TCF_V1)) {
      apiGrants[API_TYPE.TCF_V1] = this._isGranted();
      this._addToDebugInfo(API_TYPE.TCF_V1, this, debugInfo);
    }
    if (apiTypes.includes(API_TYPE.TCF_V2)) {
      apiGrants[API_TYPE.TCF_V2] = this._isGranted();
      this._addToDebugInfo(API_TYPE.TCF_V2, this, debugInfo);
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
      Object.assign(debugInfo, this.gppData.getDebugInfo());
    }
    if (apiTypes.includes(API_TYPE.GPP_V1_1)) {
      apiGrants[API_TYPE.GPP_V1_1] = this.gppData.isGranted();
      Object.assign(debugInfo, this.gppData.getDebugInfo());
    }
    const isGranted = Object.keys(apiGrants).map((api) => apiGrants[api]).reduce((prev, current) => prev && current, true);
    return new LocalStorageGrant(isGranted, GRANT_TYPE.CONSENT_API, apiGrants, debugInfo);
  }

  _addToDebugInfo(apiType, dataSource, debugInfo) {
    if (dataSource.localStoragePurposeConsent !== undefined) {
      debugInfo[apiType + '-localStoragePurposeConsent'] = dataSource.localStoragePurposeConsent;
    }
    if (dataSource.vendorsConsentForId5Granted !== undefined) {
      debugInfo[apiType + '-vendorsConsentForId5Granted'] = dataSource.vendorsConsentForId5Granted;
    }
    return debugInfo;
  }

  _isGranted() {
    return this.gdprApplies === false || (this.localStoragePurposeConsent === true &&
      this.vendorsConsentForId5Granted !== false /*vendorConsentExplicitlyDenied*/);
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
      consentData.apiTypes = _getApiTypesFromOldVersion(object);
      consentData.api = undefined;
    }

    if (isPlainObject(consentData.gppData)) {
      consentData.gppData = GppConsentData.createFrom(consentData.gppData);
    }
    return consentData;
  }

  getApiTypeData(apiType) {
    if (this.apiTypes.includes(apiType)) {
      if (apiType === API_TYPE.USP_V1) {
        return {
          ccpaString: this.ccpaString
        };
      } else if (apiType === API_TYPE.TCF_V2) {
        return {
          consentString: this.consentString,
          gdprApplies: this.gdprApplies,
          localStoragePurposeConsent: this.localStoragePurposeConsent
        };
      } else if (apiType === API_TYPE.GPP_V1_1 || apiType === API_TYPE.GPP_V1_0) {
        return this.gppData;
      } else if (apiType === API_TYPE.ID5_ALLOWED_VENDORS) {
        return {
          allowedVendors: this.allowedVendors
        };
      }
    }
    return undefined;
  }

  /**
   *
   * @returns {Consents}
   */
  toConsents() {
    /** @type {Consents} */
    let consents = {};

    if (isDefined(this.gdprApplies)) {
      consents.gdpr = this.gdprApplies;
    }

    if (isDefined(this.consentString)) {
      consents.gdpr_consent = this.consentString;
    }

    if (isDefined(this.ccpaString)) {
      consents.us_privacy = this.ccpaString;
    }

    if (isDefined(this.gppData)) {
      consents.gpp = this.gppData.gppString;
      consents.gpp_sid = this.gppData.applicableSections.join(',');
    }
    return consents;

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
  /**
   * Debug info used for metrics
   * @type {Object}
   */
  _debugInfo = {};

  constructor(allowed, grantType, api = {}, _debugInfo = {}) {
    this.allowed = allowed;
    this.grantType = grantType;
    this.api = api;
    this._debugInfo = _debugInfo;
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
