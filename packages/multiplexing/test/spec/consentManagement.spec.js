import sinon, {spy, stub} from 'sinon';
import {ConsentManagement} from '../../src/consentManagement.js';
import {CONSTANTS} from '../../src/constants.js';
import {ConsentData, API_TYPE, GRANT_TYPE, LocalStorageGrant} from '../../src/consent.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {StorageConfig} from '../../src/store.js';
import {MeterRegistry} from '@id5io/diagnostics';

const STORAGE_CONFIG = new StorageConfig();
const API_TYPE_NONE = {};

function newConsentManagement(localStorageMock, forceGrant = false) {
  return new ConsentManagement(localStorageMock, STORAGE_CONFIG, forceGrant, NO_OP_LOGGER, sinon.createStubInstance(MeterRegistry));
}

describe('Consent Management', function () {
  let localStorageMock, callbackSpy;

  beforeEach(function () {
    callbackSpy = spy();
    localStorageMock = {
      getItemWithExpiration: stub(),
      setItemWithExpiration: stub()
    };
  });

  afterEach(function () {
    callbackSpy.resetHistory();
  });

  it('should provide consent data when settled', async () => {
    const consentManagement = newConsentManagement(localStorageMock);

    // when
    let consentDataPromise = consentManagement.getConsentData();
    let consentData = new ConsentData();
    consentManagement.setConsentData(consentData);
    // then
    return consentDataPromise.then(consent => {
      expect(consent).to.be.eql(consentData);
    });
  });

  it('should allow reset and provide new consent when settled', async () => {
    const consentManagement = newConsentManagement(localStorageMock);

    // when
    let consentDataPromise = consentManagement.getConsentData();
    let consentData = new ConsentData();
    consentData.apiTypes = [API_TYPE.USP_V1];
    let anotherConsentData = new ConsentData();
    anotherConsentData.apiTypes = [API_TYPE.ID5_ALLOWED_VENDORS];

    consentManagement.setConsentData(consentData);
    // then
    return consentDataPromise.then(consent => {
      expect(consent).to.be.eql(consentData);
      consentManagement.resetConsentData(false);
      let promiseAfterReset = consentManagement.getConsentData();
      consentManagement.setConsentData(anotherConsentData);
      return promiseAfterReset;
    }).then(consent => {
      expect(consent).to.be.eql(anotherConsentData);
    });
  });

  it('should convert old data to new format and assign to ConsentData class when set plain object', () => {
    const consentManagement = newConsentManagement(localStorageMock);

    // when
    let consentData = {
      api: API_TYPE.TCF_V2,
      consentString: 'consnetString',
      ccpaString: 'ccpaString'
    };
    let consentDataPromise = consentManagement.getConsentData();
    consentManagement.setConsentData(consentData);

    // then
    return consentDataPromise.then(consent => {
      expect(consent).to.be.eql(ConsentData.createFrom(consentData));
      expect(consent.apiTypes).to.be.eql([API_TYPE.TCF_V2]);
      expect(consent.api).to.be.eql(undefined);
    });
  });

  it('should assign to ConsentData class when set plain object', () => {
    const consentManagement = newConsentManagement(localStorageMock);

    // when
    let consentData = {
      apiTypes: [API_TYPE.TCF_V2, API_TYPE.USP_V1],
      consentString: 'consnetString',
      ccpaString: 'ccpaString'
    };
    let consentDataPromise = consentManagement.getConsentData();
    consentManagement.setConsentData(consentData);

    // then
    return consentDataPromise.then(consent => {
      expect(consent).to.be.eql(ConsentData.createFrom(consentData));
      expect(consent.apiTypes).to.be.eql([API_TYPE.TCF_V2, API_TYPE.USP_V1]);
    });
  });

  describe('Provisional local storage access grant', function () {
    it('should be allowed provisionally if privacy data is not set', function () {
      const consent = newConsentManagement(localStorageMock);
      const localStorageGrant = consent.localStorageGrant();
      expect(localStorageGrant.allowed).to.be.true;
      expect(localStorageGrant.grantType).to.equal(GRANT_TYPE.PROVISIONAL);
      expect(localStorageGrant.api).to.eql(API_TYPE_NONE);
    });

    const tests = [
      {expected_result: {allowed: true, grantType: GRANT_TYPE.PROVISIONAL, api: API_TYPE_NONE}, data: {}},
      {
        expected_result: {allowed: true, grantType: GRANT_TYPE.ID5_CONSENT, api: API_TYPE_NONE},
        data: {id5_consent: true}
      },
      {
        expected_result: {allowed: false, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE_NONE},
        data: {jurisdiction: 'gdpr'}
      },
      {
        expected_result: {allowed: true, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE_NONE},
        data: {jurisdiction: 'other'}
      },
      {
        expected_result: {allowed: false, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE_NONE},
        data: {jurisdiction: 'gdpr', id5_consent: false}
      },
      {
        expected_result: {allowed: true, grantType: GRANT_TYPE.ID5_CONSENT, api: API_TYPE_NONE},
        data: {jurisdiction: 'gdpr', id5_consent: true}
      },
      {
        expected_result: {allowed: true, grantType: GRANT_TYPE.ID5_CONSENT, api: API_TYPE_NONE},
        data: {jurisdiction: 'other', id5_consent: true}
      },
      {
        expected_result: {allowed: true, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE_NONE},
        data: {jurisdiction: 'other', id5_consent: false}
      }
    ];
    tests.forEach((test) => {
      it(`should be allowed:${test.expected_result.allowed}, grantType:${test.expected_result.grantType} with stored privacy data ${JSON.stringify(test.data)}`, function () {
        localStorageMock.getItemWithExpiration.callsFake((config) => {
          expect(config.name).to.equal(CONSTANTS.STORAGE_CONFIG.PRIVACY.name);
          expect(config.expiresDays).to.equal(CONSTANTS.STORAGE_CONFIG.PRIVACY.expiresDays);
          return JSON.stringify(test.data);
        });
        const consent = newConsentManagement(localStorageMock);
        const localStorageGrant = consent.localStorageGrant();
        expect(localStorageGrant.allowed).to.equal(test.expected_result.allowed);
        expect(localStorageGrant.grantType).to.equal(test.expected_result.grantType);
        expect(localStorageGrant.api).to.eql(test.expected_result.api);
      });
    });
  });

  describe('Local storage access grant', function () {
    it(`allows local storage forced by config`, async () => {
      const consent = newConsentManagement(localStorageMock, true);
      const localStorageGrant = consent.localStorageGrant();
      expect(localStorageGrant.allowed).to.be.true;
      expect(localStorageGrant.grantType).to.equal(GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG);
      expect(localStorageGrant.api).to.eql(API_TYPE_NONE);
    });

    it('returns consent based local grant when consent set and has determined API', async () => {
      // given
      const consentManagement = newConsentManagement(localStorageMock);
      let consentData = new ConsentData();
      consentData.apiTypes = [API_TYPE.USP_V1];
      let localStorageGrant = new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {'USPv1': true});
      consentManagement.setConsentData(consentData);

      //when
      const result = consentManagement.localStorageGrant();

      // then
      expect(result).to.be.eql(localStorageGrant);
    });

    it('returns consent based local grant when consent set and has determined API - single API backward compatible', async () => {
      // given
      const consentManagement = newConsentManagement(localStorageMock);
      let consentData = new ConsentData();
      consentData.api = API_TYPE.USP_V1;
      consentData.apiTypes = undefined;
      let localStorageGrant = new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {'USPv1': true});
      consentManagement.setConsentData(consentData);

      //when
      const result = consentManagement.localStorageGrant();

      // then
      expect(result).to.be.eql(localStorageGrant);
    });
    it(`allows local storage forced by config after reset`, function () {
      // given
      const consentManagement = newConsentManagement(localStorageMock, false);
      let consentData = new ConsentData();
      consentData.apiTypes = [API_TYPE.USP_V1];
      let localStorageGrant = new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {'USPv1': true});
      consentManagement.setConsentData(consentData);

      //when
      const result = consentManagement.localStorageGrant();

      // then
      expect(result).to.be.eql(localStorageGrant);

      // when
      consentManagement.resetConsentData(true);
      const newResult = consentManagement.localStorageGrant();
      expect(newResult.allowed).to.be.true;
      expect(newResult.grantType).to.equal(GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG);
      expect(newResult.api).to.eql(API_TYPE_NONE);
    });
  });
});
