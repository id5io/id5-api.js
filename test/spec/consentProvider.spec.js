import sinon from 'sinon';
import {ConsentDataProvider} from '../../lib/consentProvider.js';
import {API_TYPE, GRANT_TYPE, ID5_GVL_ID, NO_OP_LOGGER} from "@id5io/multiplexing";
import {Id5CommonMetrics} from "@id5io/diagnostics";

chai.should();

const TEST_CONSENT_DATA_V1 = {
  getConsentData: {
    'gdprApplies': true,
    'hasGlobalScope': false,
    'consentData': 'BOOgjO9OOgjO9APABAENAi-AAAAWd7_______9____7_9uz_Gv_r_ff_3nW0739P1A_r_Oz_rm_-zzV44_lpQQRCEA'
  },
  getVendorConsents: {
    'metadata': 'BOOgjO9OOgjO9APABAENAi-AAAAWd7_______9____7_9uz_Gv_r_ff_3nW0739P1A_r_Oz_rm_-zzV44_lpQQRCEA',
    'gdprApplies': true,
    'hasGlobalScope': false,
    'isEU': true,
    'cookieVersion': 1,
    'created': '2018-05-29T07:45:48.522Z',
    'lastUpdated': '2018-05-29T07:45:48.522Z',
    'cmpId': 15,
    'cmpVersion': 1,
    'consentLanguage': 'EN',
    'vendorListVersion': 34,
    'maxVendorId': 10,
    'purposeConsents': {
      '1': true, // Cookies/local storage access
      '2': true,
      '3': true,
      '4': true,
      '5': true
    },
    'vendorConsents': {
      '1': true,
      '2': true
    }
  }
};

const TEST_CONSENT_DATA_V2 = {
  getTCData: {
    'tcString': 'COuqj-POu90rDBcBkBENAZCgAPzAAAPAACiQFwwBAABAA1ADEAbQC4YAYAAgAxAG0A',
    'cmpId': 92,
    'cmpVersion': 100,
    'tcfPolicyVersion': 2,
    'gdprApplies': true,
    'isServiceSpecific': true,
    'useNonStandardStacks': false,
    'purposeOneTreatment': false,
    'publisherCC': 'US',
    'cmpStatus': 'loaded',
    'eventStatus': 'tcloaded',
    'outOfBand': {
      'allowedVendors': {},
      'discloseVendors': {}
    },
    'purpose': {
      'consents': {
        '1': true,
        '2': true,
        '3': true
      },
      'legitimateInterests': {
        '1': false,
        '2': false,
        '3': false
      }
    },
    'vendor': {
      'consents': {
        '1': true,
        '2': true,
        '3': false
      },
      'legitimateInterests': {
        '1': false,
        '2': true,
        '3': false,
        '4': false,
        '5': false
      }
    },
    'specialFeatureOptins': {
      '1': false,
      '2': false
    },
    'restrictions': {},
    'publisher': {
      'consents': {
        '1': false,
        '2': false,
        '3': false
      },
      'legitimateInterests': {
        '1': false,
        '2': false,
        '3': false
      },
      'customPurpose': {
        'consents': {},
        'legitimateInterests': {}
      }
    }
  }
};

const TCF_V2_STRING_WITHOUT_STORAGE_ACCESS_CONSENT = 'CPh8d-2Ph8d-2NRAAAENCZCAABoAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A';
const TCF_V2_STRING_WITH_STORAGE_ACCESS_CONSENT = 'CPh8dhYPh8dhYJjAAAENCZCAAJHAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A';

describe('Consent Data Provider', function () {
  let consentProvider, logger, logErrorSpy, logWarnSpy, metrics;

  beforeEach(function () {
    logger = NO_OP_LOGGER; // `= console;` for debug purposes
    metrics = new Id5CommonMetrics('api', '1')
    consentProvider = new ConsentDataProvider(metrics, logger);
    logErrorSpy = sinon.spy(logger, 'error');
    logWarnSpy = sinon.spy(logger, 'warn');
  });

  afterEach(function () {
    logErrorSpy.restore();
    logWarnSpy.restore();
    metrics.reset();
  });

  it('should print an error and return rejected promise when an unknown CMP framework ID is used', async () => {

    // when
    let consentDataPromise = consentProvider.refreshConsentData(false, 'bad', {});

    // then
    return consentDataPromise.catch(exception => {
      expect(logErrorSpy).to.be.called;
      expect(exception.message).to.be.eql('Unknown consent API: bad')
    });
  });

  describe('with static consent data', function () {

    [
      undefined,
      {},
      {
        gdprApplies: true
      },
      {
        purpose: {},
        gdprApplies: true
      },
      {
        purpose: {something: 'wrong'},
        gdprApplies: true
      }
    ].forEach((tcData) => {
      it('should grant localStorage access when not fully decoded tcf v2 data received but consent encoded in tcstring', async () => {
        // given
        let tcStringWithStorageConsent = TCF_V2_STRING_WITH_STORAGE_ACCESS_CONSENT;

        // when
        let consentDataPromise = consentProvider.refreshConsentData(false, 'static', {
          getTCData: {
            tcString: tcStringWithStorageConsent,
            ...tcData
          }
        });

        // then
        return consentDataPromise.then(consentData => {
          expect(consentData.api).to.equal(API_TYPE.TCF_V2);
          expect(consentData.gdprApplies).is.eq(tcData && tcData.gdprApplies);
          expect(consentData.consentString).is.eq(tcStringWithStorageConsent);
          expect(consentData.localStoragePurposeConsent).is.eq(true);
          expect(consentData.isGranted()).to.be.true;
          const localStorageGrant = consentData.localStorageGrant();
          expect(localStorageGrant.allowed).is.eq(true);
          expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.CONSENT_API);
          expect(localStorageGrant.api).is.eq(API_TYPE.TCF_V2);
        });
      });

      it('should not grant localStorage access when not fully decoded tcf v2 data received and consent not given in encoded tcstring', async () => {
        // given
        let tcStringWithStorageConsent = TCF_V2_STRING_WITHOUT_STORAGE_ACCESS_CONSENT;

        // when
        let consentDataPromise = consentProvider.refreshConsentData(false, 'static', {
          getTCData: {
            tcString: tcStringWithStorageConsent,
            ...tcData
          }
        });

        // then
        return consentDataPromise.then(consentData => {
          expect(consentData.api).to.equal(API_TYPE.TCF_V2);
          expect(consentData.gdprApplies).is.eq(tcData && tcData.gdprApplies);
          expect(consentData.consentString).is.eq(tcStringWithStorageConsent);
          expect(consentData.localStoragePurposeConsent).is.eq(false);
          expect(consentData.isGranted()).to.be.false;
          const localStorageGrant = consentData.localStorageGrant();
          expect(localStorageGrant.allowed).is.eq(false);
          expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.CONSENT_API);
          expect(localStorageGrant.api).is.eq(API_TYPE.TCF_V2);

        });
      });
    });

    it('should print a warning when static consentData has the wrong structure and return default consent', async () => {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', {wrong: 'structure'});

      // then
      return consentDataPromise.then(consentData => {
        expect(logWarnSpy).to.be.called;
        expect(consentData.api).to.equal(API_TYPE.NONE);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.PROVISIONAL);
        expect(localStorageGrant.api).is.eq(API_TYPE.NONE);
      });
    });

    it('should print a warning when static consentData has undefined data and return default consent', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', undefined);

      // then
      return consentDataPromise.then(consentData => {
        expect(logWarnSpy).to.be.called;
        expect(consentData.api).to.equal(API_TYPE.NONE);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.PROVISIONAL);
        expect(localStorageGrant.api).is.eq(API_TYPE.NONE);
      });
    });

    it('should parse correctly TCFv1 static data', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', TEST_CONSENT_DATA_V1);

      // then
      return consentDataPromise.then(consentData => {
        expect(consentData.api).to.equal(API_TYPE.TCF_V1);
        expect(consentData.consentString).to.equal(TEST_CONSENT_DATA_V1.getConsentData.consentData);
        expect(consentData.gdprApplies).to.be.true;
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.CONSENT_API);
        expect(localStorageGrant.api).is.eq(API_TYPE.TCF_V1);
      });
    });

    it('prints an error if static TCFv1 data is invalid', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', {
        getConsentData: {},
        getVendorConsents: {}
      });

      // then
      return consentDataPromise.then(consentData => {
        expect(logErrorSpy).to.be.called;
        expect(consentData.api).to.equal(API_TYPE.NONE);
        expect(consentData.consentString).to.equal(undefined);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.PROVISIONAL);
        expect(localStorageGrant.api).is.eq(API_TYPE.NONE);
      });
    });

    it('prints warnings when debugBypassConsent set to true', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(true, 'static', undefined);

      // then
      return consentDataPromise.then(consentData => {
        expect(logWarnSpy).to.be.called;
        expect(consentData.api).to.equal(API_TYPE.NONE);
        expect(consentData.consentString).to.equal(undefined);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG);
        expect(localStorageGrant.api).is.eq(API_TYPE.NONE);
      });
    });

    it('should parse correctly TCFv2 static data', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', TEST_CONSENT_DATA_V2);

      // then
      return consentDataPromise.then(consentData => {
        expect(logWarnSpy).to.not.be.called;
        expect(logErrorSpy).to.not.be.called;
        expect(consentData.api).to.equal(API_TYPE.TCF_V2);
        expect(consentData.consentString).to.equal(TEST_CONSENT_DATA_V2.getTCData.tcString);
        expect(consentData.gdprApplies).to.be.true;
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.CONSENT_API);
        expect(localStorageGrant.api).is.eq(API_TYPE.TCF_V2);
      });
    });

    it('prints an error if static TCFv2 data is invalid', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', {getTCData: {}});

      // then
      return consentDataPromise.then(consentData => {
        expect(logErrorSpy).to.be.called;
        expect(consentData.api).to.equal(API_TYPE.NONE);
        expect(consentData.consentString).to.equal(undefined);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.PROVISIONAL);
        expect(localStorageGrant.api).is.eq(API_TYPE.NONE);
      });
    });

    it('should parse correctly USPv1 static data', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', {getUSPData: {uspString: '1YNN'}});

      // then
      return consentDataPromise.then(consentData => {
        expect(consentData.api).to.equal(API_TYPE.USP_V1);
        expect(consentData.consentString).to.equal(undefined);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.ccpaString).to.be.equal('1YNN');
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.CONSENT_API);
        expect(localStorageGrant.api).is.eq(API_TYPE.USP_V1);
      });
    });

    it('prints an error if static USPv1 data is invalid', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', {getUSPData: {}});

      // then
      return consentDataPromise.then(consentData => {
        expect(logErrorSpy).to.be.called;
        expect(consentData.api).to.equal(API_TYPE.NONE);
        expect(consentData.consentString).to.equal(undefined);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.ccpaString).to.equal(undefined);
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.PROVISIONAL);
        expect(localStorageGrant.api).is.eq(API_TYPE.NONE);
      });
    });

    it('should parse correctly allowedVendors static data', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', {allowedVendors: [131]});

      // then
      return consentDataPromise.then(consentData => {
        expect(logErrorSpy).to.not.be.called;
        expect(logWarnSpy).to.not.be.called;
        expect(consentData.api).to.equal(API_TYPE.ID5_ALLOWED_VENDORS);
        expect(consentData.consentString).to.be.undefined;
        expect(consentData.gdprApplies).to.be.true;
        expect(consentData.allowedVendors).to.deep.equal(['131']);
        expect(consentData.isGranted()).to.be.true;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(true);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.CONSENT_API);
        expect(localStorageGrant.api).is.eq(API_TYPE.ID5_ALLOWED_VENDORS);
      });
    });

    it('should not allow local storage if ID5 is not in the list of allowed vendors', function () {
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'static', {allowedVendors: [66]});

      // then
      return consentDataPromise.then(consentData => {
        expect(logErrorSpy).to.not.be.called;
        expect(logWarnSpy).to.not.be.called;
        expect(consentData.api).to.equal(API_TYPE.ID5_ALLOWED_VENDORS);
        expect(consentData.consentString).to.be.undefined;
        expect(consentData.gdprApplies).to.be.true;
        expect(consentData.allowedVendors).to.deep.equal(['66']);
        expect(consentData.isGranted()).to.be.false;
        const localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.allowed).is.eq(false);
        expect(localStorageGrant.grantType).is.eq(GRANT_TYPE.CONSENT_API);
        expect(localStorageGrant.api).is.eq(API_TYPE.ID5_ALLOWED_VENDORS);
      });
    });
  });

  describe('framework detection', function () {
    it('should print a warning when no TCF is found (but CCPA is found)', function () {
      // given
      window.__uspapi = sinon.spy();

      // when
      consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      expect(logWarnSpy).to.be.calledWith('cmpApi: TCF not found! Using defaults for GDPR.');
      delete window.__uspapi;
    });

    it('should print a warning when no CCPA is found (but TCF is found)', function () {
      window.__tcfapi = sinon.spy();
      // when
      consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      expect(logWarnSpy).to.be.calledWith('cmpApi: USP not found! Using defaults for CCPA.');
      delete window.__tcfapi;
    });

    it('should print a warning when no GPP is found', async function () {
      // when
      let consentData = await consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      expect(consentData.api).to.eq(API_TYPE.NONE);
      expect(logWarnSpy).to.be.calledWith('cmpApi: GPP not found! Using defaults.');
      let measurements = metrics.getAllMeasurements();
      expect(measurements.find(m => m.name === 'id5.api.gpp.failure')).is.undefined

    });
  });
  describe('with TCFv1 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function () {
      window.__cmp = cmpStub = sinon.stub();
    });

    afterEach(function () {
      delete window.__cmp;
    });

    it('can receive the data in a normal call flow', async () => {
      // given
      cmpStub.callsFake((command, param, callback) => {
        callback(TEST_CONSENT_DATA_V1[command], true);
      });

      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      return consentDataPromise.then(consentData => {
        expect(cmpStub).to.be.calledWith('getConsentData');
        expect(cmpStub).to.be.calledWith('getVendorConsents');
        expect(consentData.consentString).to.equal(TEST_CONSENT_DATA_V1.getConsentData.consentData);
        expect(consentData.localStoragePurposeConsent).to.equal(TEST_CONSENT_DATA_V1.getVendorConsents.purposeConsents['1']);
        expect(consentData.gdprApplies).to.be.true;
        expect(consentData.api).to.equal(API_TYPE.TCF_V1);
        let localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
        expect(localStorageGrant.api).to.be.eq(API_TYPE.TCF_V1);
        expect(localStorageGrant.allowed).to.be.eq(true);
      });
    });

    [false, null, undefined, "xxx"].forEach(value => {
      it(`disallows local storage when vendor purpose 1 has value ${value}`, async () => {
        const cloneTestData = clone(TEST_CONSENT_DATA_V1);
        cloneTestData.getVendorConsents.purposeConsents['1'] = value;
        cmpStub.callsFake((command, param, callback) => {
          callback(cloneTestData[command], true);
        });
        // when
        const consentDataPromise = consentProvider.refreshConsentData(false, 'iab', undefined);

        // then
        return consentDataPromise.then(consentData => {
          expect(cmpStub).to.be.calledWith('getConsentData');
          expect(cmpStub).to.be.calledWith('getVendorConsents');
          expect(consentData.consentString).to.equal(cloneTestData.getConsentData.consentData);
          expect(consentData.localStoragePurposeConsent).to.equal(value);
          expect(consentData.gdprApplies).to.be.true;
          expect(consentData.api).to.equal(API_TYPE.TCF_V1);
          let localStorageGrant = consentData.localStorageGrant();
          expect(localStorageGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
          expect(localStorageGrant.api).to.be.eq(API_TYPE.TCF_V1);
          expect(localStorageGrant.allowed).to.be.eq(false);
        });
      });
    });

    it('allows local storage when not in GDPR jurisdiction', function () {
      const cloneTestData = clone(TEST_CONSENT_DATA_V1);
      cloneTestData.getConsentData.gdprApplies = false;
      cloneTestData.getVendorConsents.purposeConsents['1'] = false;
      cmpStub.callsFake((command, param, callback) => {
        callback(cloneTestData[command], true);
      });
      // when
      const consentDataPromise = consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      return consentDataPromise.then(consentData => {
        expect(cmpStub).to.be.calledWith('getConsentData');
        expect(cmpStub).to.be.calledWith('getVendorConsents');
        expect(consentData.consentString).to.equal(cloneTestData.getConsentData.consentData);
        expect(consentData.localStoragePurposeConsent).to.equal(false);
        expect(consentData.gdprApplies).to.be.false;
        expect(consentData.api).to.equal(API_TYPE.TCF_V1);
        let localStorageGrant = consentData.localStorageGrant();
        expect(localStorageGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
        expect(localStorageGrant.api).to.be.eq(API_TYPE.TCF_V1);
        expect(localStorageGrant.allowed).to.be.eq(true);
      });
    });

    it('should bypass CMP when calling 2nd time while 1st is in progress and return stored result', async () => {
      // given
      let providerCallbacks = {};
      cmpStub.callsFake((command, param, callback) => {
        providerCallbacks[command] = callback;
      });

      // when
      const firstCallPromise = consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      expect(cmpStub).to.be.calledWith('getConsentData');
      expect(cmpStub).to.be.calledWith('getVendorConsents');

      // when
      cmpStub.resetHistory();
      const secondCallPromise = consentProvider.refreshConsentData(false, 'iab', undefined);
      for (const command of ['getConsentData', 'getVendorConsents']) {
        providerCallbacks[command](TEST_CONSENT_DATA_V1[command], true)
      }

      return Promise.all([firstCallPromise, secondCallPromise]).then(() => {
        expect(firstCallPromise).to.be.eq(secondCallPromise);
        expect(cmpStub).to.not.be.called;
      })
    });

    it('should refresh consent data', async () => {
      // given
      cmpStub.callsFake((command, param, callback) => {
        callback(TEST_CONSENT_DATA_V1[command]);
      });


      // when
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(() => {
          expect(cmpStub).to.be.calledWith('getConsentData');
          expect(cmpStub).to.be.calledWith('getVendorConsents');
          cmpStub.resetHistory();
          // second call
          return consentProvider.refreshConsentData(false, 'iab', undefined);
        }).then(() => {
          // second call cmp
          expect(cmpStub).to.be.calledWith('getConsentData');
          expect(cmpStub).to.be.calledWith('getVendorConsents');
        });
    });

    [
      {
        getConsentData: null,
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: {getConsentData: {}},
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: {getConsentData: {gdprApplies: ''}},
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: {getConsentData: {gdprApplies: true, consentData: null}},
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: TEST_CONSENT_DATA_V1.getConsentData,
        getVendorConsents: null
      },
      {
        getConsentData: TEST_CONSENT_DATA_V1.getConsentData,
        getVendorConsents: {getVendorConsents: {}}
      }
    ].forEach((dataObj) => {
        it('prints an error when TCF data is invalid', async () => {
          cmpStub.callsFake((command, param, callback) => {
            callback(dataObj[command], true);
          });
          return consentProvider.refreshConsentData(false, 'iab', undefined)
            .then(consent => {
              expect(logErrorSpy).to.be.calledWith('cmpApi: Invalid CMP data. Using defaults for GDPR.');
              expect(consent.api).to.equal(API_TYPE.NONE);
            });
        });
      }
    );

    it('prints an error when TCF callback unsuccesful', async () => {
      cmpStub.callsFake((command, param, callback) => {
        callback(null, false);
      });
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(logErrorSpy).to.be.calledWith('cmpApi: Invalid CMP data. Using defaults for GDPR.');
          expect(consent.api).to.equal(API_TYPE.NONE);
        });
    });
  });

  describe('with TCFv2 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function () {
      window.__tcfapi = cmpStub = sinon.stub();
    });

    afterEach(function () {
      delete window.__tcfapi;
    });


    it('can receive the data in a normal call flow', async () => {
      cmpStub.callsFake((command, version, callback) => {
        expect(command).to.equal('addEventListener');
        expect(version).to.equal(2);
        callback(TEST_CONSENT_DATA_V2.getTCData, true);
      });
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(cmpStub).to.be.calledWith('addEventListener', 2);
          expect(consent.api).to.be.eq(API_TYPE.TCF_V2);
          expect(consent.consentString).to.equal(TEST_CONSENT_DATA_V2.getTCData.tcString);
          expect(consent.localStoragePurposeConsent).to.equal(TEST_CONSENT_DATA_V2.getTCData.purpose.consents['1']);
          expect(consent.gdprApplies).to.be.true;
          expect(consent.isGranted()).to.be.true;
          let lsGrant = consent.localStorageGrant();
          expect(lsGrant.allowed).to.be.true;
          expect(lsGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
          expect(lsGrant.api).to.be.eq(API_TYPE.TCF_V2);
        });
    });

    it('should bypass CMP and return started consentData promise when calling twice while 1st in progress', async () => {
      // given
      let providerCallback;
      cmpStub.callsFake((command, param, callback) => {
        providerCallback = callback;
      });

      // when
      const firstCallPromise = consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      expect(cmpStub).to.be.calledWith('addEventListener', 2);

      // when
      const secondCallPromise = consentProvider.refreshConsentData(false, 'iab', undefined);
      providerCallback(TEST_CONSENT_DATA_V2.getTCData, true);

      // then
      return Promise.all([firstCallPromise, secondCallPromise]).then(() => {
        expect(firstCallPromise).to.be.eq(secondCallPromise);
        expect(cmpStub).to.be.calledOnce;
      });
    });

    [false, null, undefined, "xxx"].forEach(value => {
      it(`disallows local storage when vendor purpose 1 has value ${value} and no given consent in encoded string`, async () => {
        const cloneTestData = clone(TEST_CONSENT_DATA_V2);
        cloneTestData.getTCData.tcString = TCF_V2_STRING_WITHOUT_STORAGE_ACCESS_CONSENT
        cloneTestData.getTCData.purpose.consents['1'] = value;

        cmpStub.callsFake((command, version, callback) => {
          expect(command).to.equal('addEventListener');
          expect(version).to.equal(2);
          callback(cloneTestData.getTCData, true);
        });
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.TCF_V2);
            expect(consent.consentString).to.equal(cloneTestData.getTCData.tcString);
            expect(consent.localStoragePurposeConsent).to.equal(false);
            expect(consent.gdprApplies).to.be.true;
            expect(consent.isGranted()).to.be.false;
            let lsGrant = consent.localStorageGrant();
            expect(lsGrant.allowed).to.be.false;
            expect(lsGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
            expect(lsGrant.api).to.be.eq(API_TYPE.TCF_V2);
          });
      });
    });
    [null, undefined, "xxx"].forEach(value => {
      it(`allows local storage when vendor purpose 1 is undefined or invalid but given consent is in encoded string`, async () => {
        const cloneTestData = clone(TEST_CONSENT_DATA_V2);
        cloneTestData.getTCData.tcString = TCF_V2_STRING_WITH_STORAGE_ACCESS_CONSENT;
        cloneTestData.getTCData.purpose.consents['1'] = value;
        cmpStub.callsFake((command, version, callback) => {
          expect(command).to.equal('addEventListener');
          expect(version).to.equal(2);
          callback(cloneTestData.getTCData, true);
        });
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.TCF_V2);
            expect(consent.consentString).to.equal(cloneTestData.getTCData.tcString);
            expect(consent.localStoragePurposeConsent).to.equal(true);
            expect(consent.gdprApplies).to.be.true;
            let lsGrant = consent.localStorageGrant();
            expect(lsGrant.allowed).to.be.true;
            expect(lsGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
            expect(lsGrant.api).to.be.eq(API_TYPE.TCF_V2);
          });
      });
    });

    it('allows local storage when not in GDPR jurisdiction', async () => {
      const cloneTestData = clone(TEST_CONSENT_DATA_V2);
      cloneTestData.getTCData.gdprApplies = false;
      cloneTestData.getTCData.purpose.consents['1'] = false;
      cmpStub.callsFake((command, version, callback) => {
        callback(cloneTestData.getTCData, true);
      });
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(consent.api).to.be.eq(API_TYPE.TCF_V2);
          expect(consent.consentString).to.equal(cloneTestData.getTCData.tcString);
          expect(consent.localStoragePurposeConsent).to.equal(cloneTestData.getTCData.purpose.consents['1']);
          expect(consent.gdprApplies).to.be.false
          expect(consent.isGranted()).to.be.true;
          let lsGrant = consent.localStorageGrant();
          expect(lsGrant.allowed).to.be.true;
          expect(lsGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
          expect(lsGrant.api).to.be.eq(API_TYPE.TCF_V2);
        });
    });

    describe('with invalid data', function () {
      [
        {eventStatus: 'tcloaded'},
        {eventStatus: 'tcloaded', gdprApplies: 'a string'},
        {eventStatus: 'tcloaded', gdprApplies: true, tcString: null}
      ].forEach((dataObj) =>
        it('prints an error when TCF data is invalid', async () => {
          // given
          cmpStub.callsFake((command, version, callback) => {
            callback(dataObj, true);
          });
          // when
          return consentProvider.refreshConsentData(false, 'iab', undefined)
            .then(consent => {
              // then
              expect(consent.api).to.equal(API_TYPE.NONE);
              expect(logErrorSpy).to.be.calledWith('cmpApi: Invalid CMP data. Using defaults for GDPR.');
            });
        })
      );

      it('prints an error when TCF callback unsuccessful', async () => {
        cmpStub.callsFake((command, param, callback) => {
          callback(null, false);
        });
        // when
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            // then
            expect(consent.api).to.equal(API_TYPE.NONE);
            expect(logErrorSpy).to.be.calledWith('cmpApi: TCFv2 - Received insuccess: addEventListener. Please check your CMP setup. Using defaults for GDPR.');
          });
      });
    });
  });

  describe('with USPv1 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function () {
      window.__uspapi = cmpStub = sinon.stub();
    });

    afterEach(function () {
      delete window.__uspapi;
    });


    it('can receive the data in a normal call flow', async () => {
      cmpStub.callsFake((command, version, callback) => {
        expect(command).to.equal('getUSPData');
        expect(version).to.equal(1);
        callback({uspString: '1YYN'}, true);
      });
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(cmpStub).to.be.calledWith('getUSPData', 1);
          expect(consent.gdprApplies).to.be.false;
          expect(consent.ccpaString).to.equal('1YYN');
          expect(consent.api).to.be.eq(API_TYPE.USP_V1);
          expect(consent.isGranted()).to.be.true;
          let lsGrant = consent.localStorageGrant();
          expect(lsGrant.allowed).to.be.true;
          expect(lsGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
          expect(lsGrant.api).to.be.eq(API_TYPE.USP_V1);
        });
    });

    it('should bypass CMP and return started consentData promise when calling twice while 1st in progress', async () => {

      // given
      let providerCallback;
      cmpStub.callsFake((command, param, callback) => {
        providerCallback = callback;
      });

      // when
      const firstCallPromise = consentProvider.refreshConsentData(false, 'iab', undefined);

      // then
      expect(cmpStub).to.be.calledWith('getUSPData', 1);

      // when
      const secondCallPromise = consentProvider.refreshConsentData(false, 'iab', undefined);
      providerCallback({uspString: '1YYN'}, true);

      // then
      return Promise.all([firstCallPromise, secondCallPromise]).then(() => {
        expect(firstCallPromise).to.be.eq(secondCallPromise);
        expect(cmpStub).to.be.calledOnce;
      });
    });

    describe('with invalid data', function () {
      [
        {},
        {uspString: null}
      ].forEach((dataObj) =>
        it('prints an error when USP data is invalid', async () => {
          cmpStub.callsFake((command, version, callback) => {
            callback(dataObj, true);
          });
          return consentProvider.refreshConsentData(false, 'iab', undefined)
            .then(consent => {
              expect(logErrorSpy).to.be.calledWith('cmpApi: No or malformed USP data. Using defaults for CCPA.');
              expect(consent.api).to.equal(API_TYPE.NONE);
            });
        })
      );

      it('prints an error when USP callback unsuccessful', function () {
        cmpStub.callsFake((command, param, callback) => {
          callback(null, false);
        });
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(logErrorSpy).to.be.calledWith('cmpApi: USP callback not successful. Using defaults for CCPA.');
            expect(consent.api).to.equal(API_TYPE.NONE);
          });
      });
    });
  });

  function createGppV10Flow() {
    return {
      ping: {
        gppVersion: "1.0",
        cmpStatus: "loading",
        cmpDisplayStatus: "hidden"
      },
      firstEvent: {
        eventName: 'cmpStatus',
        pingData: {
          cmpStatus: "loaded",
          cmpDisplayStatus: "visible"
        }
      },
      secondEvent: {
        eventName: 'cmpStatus',
        pingData: {
          cmpStatus: "loaded",
          cmpDisplayStatus: "hidden"
        }
      },
      gppData: {
        gppString: "GPP_STRING",
        applicableSections: [2] //tcfv2
      },
      tcfData: {
        PurposeConsent: [true],
        VendorConsent: [ID5_GVL_ID]
      }
    };
  }

  function createGppV10Stub(modify = (flow) => flow, responses = createGppV10Flow()) {
    modify(responses);
    return (command, callback, parameter) => {
      expect(command).to.be.oneOf(['addEventListener', 'ping', 'getGPPData', 'getSection']);
      if (command === 'ping') {
        callback(responses.ping);
      } else if (command === 'addEventListener') {
        callback(responses.firstEvent);
        callback(responses.secondEvent);
      } else if (command === 'getGPPData') {
        callback(responses.gppData);
      } else if (command === 'getSection' && parameter === 'tcfeuv2') {
        callback(responses.tcfData);
      }
    };
  }

  describe('with GPPv1.0 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function () {
      window.__gpp = cmpStub = sinon.stub();
    });

    afterEach(function () {
      delete window.__gpp;
    });

    it('can receive the data in a normal call flow', async () => {
      cmpStub.callsFake(createGppV10Stub());
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(cmpStub).to.be.callCount(4);
          expect(consent.api).to.be.eq(API_TYPE.GPP_V1_0);
          expect(consent.isGranted()).to.be.true;
          expect(consent.gppData.gppString).is.eq("GPP_STRING");
          expect(consent.gppData.applicableSections).deep.equal([2]);
          expect(consent.gppData.version).is.eq(API_TYPE.GPP_V1_0);
          expect(consent.gppData.localStoragePurposeConsent).is.true;
          let lsGrant = consent.localStorageGrant();
          expect(lsGrant.allowed).to.be.true;
          expect(lsGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
          expect(lsGrant.api).to.be.eq(API_TYPE.GPP_V1_0);

        });
    });

    [false, null, undefined, "xxx"].forEach(value => {
      it(`disallows local storage when vendor purpose 1 has value ${value}`, async () => {
        cmpStub.callsFake(createGppV10Stub((responses) => responses.tcfData = {
          PurposeConsent: [value],
          VendorConsent: [ID5_GVL_ID]
        }));
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.GPP_V1_0);
            expect(consent.localStoragePurposeConsent).to.equal(false);
          });
      });
    });

    it('allows local storage when not in GDPR jurisdiction', async () => {
      cmpStub.callsFake(createGppV10Stub((responses) => {
        responses.gppData.applicableSections = [6];
        responses.tcfData.PurposeConsent = [false];
      }));
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(consent.api).to.be.eq(API_TYPE.GPP_V1_0);
          expect(consent.isGranted()).to.equal(true);
        });
    });

    describe('with invalid data', function () {
      it('prints an error when gpp version is invalid', async () => {
        cmpStub.callsFake(createGppV10Stub((responses) => {
          responses.ping.gppVersion = 2;
        }));
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.NONE);
            expect(consent.gppData).to.be.undefined
            expect(logErrorSpy).to.be.calledWith('cmpApi: creating GPP client not successful. Using defaults for Gpp.')
          });
      })
      it('prints an error when no gpp data', async () => {
        cmpStub.callsFake(createGppV10Stub((responses) => {
          responses.gppData = undefined;
        }));
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.NONE);
            expect(consent.gppData).to.be.undefined
            expect(logErrorSpy).to.be.calledWith('cmpApi: getting GPP consent not successful. Using defaults for Gpp.')
          });
      })
    });
  });

  function createGppV11Flow() {
    return {
      ping: {
        gppVersion: "1.1",
        signalStatus: "not ready"
      },
      firstEvent: {
        eventName: 'signalStatus',
        pingData: {
          signalStatus: "not ready"
        }
      },
      secondEvent: {
        eventName: 'signalStatus',
        pingData: {
          signalStatus: "ready",
          gppString: "GPP_STRING_V1_1",
          applicableSections: [1, 2],
          parsedSections: {
            tcfeuv2: [{
              PurposeConsent: [true],
              VendorConsent: [ID5_GVL_ID]
            }]
          }
        }
      }
    };
  }

  function createGppV11Stub(modify = (flow) => flow, responses = createGppV11Flow()) {
    modify(responses);
    return (command, callback) => {
      expect(command).to.be.oneOf(['addEventListener', 'ping']);
      if (command === 'ping') {
        callback(responses.ping);
      } else if (command === 'addEventListener') {
        callback(responses.firstEvent);
        callback(responses.secondEvent);
      }
    };
  }

  describe('with GPPv1.1 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function () {
      window.__gpp = cmpStub = sinon.stub();
    });

    afterEach(function () {
      delete window.__gpp;
    });

    it('can receive the data in a normal call flow', async () => {
      cmpStub.callsFake(createGppV11Stub());
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(cmpStub).to.be.callCount(2);
          expect(consent.api).to.be.eq(API_TYPE.GPP_V1_1);
          expect(consent.isGranted()).to.be.true;
          expect(consent.gppData.gppString).is.eq("GPP_STRING_V1_1");
          expect(consent.gppData.applicableSections).deep.equal([1, 2]);
          expect(consent.gppData.version).is.eq(API_TYPE.GPP_V1_1);
          expect(consent.gppData.localStoragePurposeConsent).is.true;
          let lsGrant = consent.localStorageGrant();
          expect(lsGrant.allowed).to.be.true;
          expect(lsGrant.grantType).to.be.eq(GRANT_TYPE.CONSENT_API);
          expect(lsGrant.api).to.be.eq(API_TYPE.GPP_V1_1);

        });
    });

    [false, null, undefined, "xxx"].forEach(value => {
      it(`disallows local storage when vendor purpose 1 has value ${value}`, async () => {
        cmpStub.callsFake(createGppV11Stub((responses) => responses.secondEvent.pingData.parsedSections.tcfeuv2[0].PurposeConsent = [value]));
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.GPP_V1_1);
            expect(consent.localStoragePurposeConsent).to.equal(false);
          });
      });
    });

    it('allows local storage when not in GDPR jurisdiction', async () => {
      cmpStub.callsFake(createGppV11Stub((responses) => {
        responses.secondEvent.pingData.applicableSections = [6];
        responses.secondEvent.pingData.parsedSections.tcfeuv2[0].PurposeConsent = [false];
      }));
      return consentProvider.refreshConsentData(false, 'iab', undefined)
        .then(consent => {
          expect(consent.api).to.be.eq(API_TYPE.GPP_V1_1);
          expect(consent.isGranted()).to.equal(true);
        });
    });

    describe('with invalid data', function () {
      it('prints an error when gpp version is invalid', async () => {
        cmpStub.callsFake(createGppV11Stub((responses) => {
          responses.ping.gppVersion = 2;
        }));
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.NONE);
            expect(consent.gppData).to.be.undefined
            expect(logErrorSpy).to.be.calledWith('cmpApi: creating GPP client not successful. Using defaults for Gpp.')
          });
      })
      it('prints an error when no gpp data', async () => {
        cmpStub.callsFake(createGppV11Stub((responses) => {
          responses.secondEvent.pingData = undefined;
        }));
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consent => {
            expect(consent.api).to.be.eq(API_TYPE.NONE);
            expect(consent.gppData).to.be.undefined
            expect(logErrorSpy).to.be.calledWith('cmpApi: getting GPP consent not successful. Using defaults for Gpp.')
          });
      })
    });
  })

  describe('when API is running in iframe and CMP in top frame', function () {
    describe('with TCFv1', function () {
      let eventListener;
      beforeEach(function () {
        eventListener = (event) => {
          if (event.data.__cmpCall) {
            const command = event.data.__cmpCall.command;
            expect(command).to.be.oneOf(['getConsentData', 'getVendorConsents']);
            const returnMessage = {
              __cmpReturn: {
                returnValue: TEST_CONSENT_DATA_V1[command],
                success: true,
                callId: event.data.__cmpCall.callId
              }
            }
            event.source.postMessage(returnMessage, '*');
          }
        };
        window.frames['__cmpLocator'] = {};
        window.addEventListener('message', eventListener);
      });

      afterEach(function () {
        delete window.frames['__cmpLocator'];
        window.removeEventListener('message', eventListener);
      });

      it('can receive the data', async () => {
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consentData => {
            expect(consentData.consentString).to.equal(TEST_CONSENT_DATA_V1.getConsentData.consentData);
            expect(consentData.localStoragePurposeConsent).to.equal(TEST_CONSENT_DATA_V1.getVendorConsents.purposeConsents['1']);
            expect(consentData.gdprApplies).to.be.true;
            expect(consentData.api).to.equal(API_TYPE.TCF_V1);
          });
      });
    });

    function uspApiMessageResponse(event) {
      if (event.data.__uspapiCall) {
        expect(event.data.__uspapiCall.version).to.equal(1);
        expect(event.data.__uspapiCall.command).to.equal('getUSPData');
        const returnMessage = {
          __uspapiReturn: {
            returnValue: {uspString: '1YYN'},
            success: true,
            callId: event.data.__uspapiCall.callId
          }
        }
        event.source.postMessage(returnMessage, '*');
      }
    }

    describe('with USPv2', function () {
      let eventListener;
      beforeEach(function () {
        eventListener = (event) => {
          uspApiMessageResponse(event);
        };
        window.frames['__uspapiLocator'] = {};
        window.addEventListener('message', eventListener);
      });

      afterEach(function () {
        delete window.frames['__uspapiLocator'];
        window.removeEventListener('message', eventListener);
      });

      it('can receive the data', async () => {
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consentData => {
            expect(consentData.ccpaString).to.equal('1YYN');
            expect(consentData.gdprApplies).to.be.false;
            expect(consentData.api).to.equal(API_TYPE.USP_V1);
          });
      });
    });

    function wrapReturnData(returnData, event) {
      return {
        __gppReturn: {
          returnValue: returnData,
          success: true,
          callId: event.data.__gppCall.callId
        }
      };
    }

    function postResponse(event, returnData) {
      event.source.postMessage(wrapReturnData(returnData, event), '*');
    }

    describe('with GPP v1_0', function () {

      let gpp10NormalFlow = createGppV10Flow()
      let eventListener;
      beforeEach(function () {
        eventListener = (event) => {
          if (event.data.__gppCall) {
            expect(event.data.__gppCall.command).to.be.oneOf(['addEventListener', 'ping', 'getGPPData', 'getSection']);
            if (event.data.__gppCall.command === 'ping') {
              postResponse(event, gpp10NormalFlow.ping);
            } else if (event.data.__gppCall.command === 'addEventListener') {
              postResponse(event, gpp10NormalFlow.firstEvent);
              postResponse(event, gpp10NormalFlow.secondEvent);
            } else if (event.data.__gppCall.command === 'getGPPData') {
              postResponse(event, gpp10NormalFlow.gppData);
            } else if (event.data.__gppCall.command === 'getSection' && event.data.__gppCall.parameter === 'tcfeuv2') {
              postResponse(event, gpp10NormalFlow.tcfData);
            }
          }
        };
        window.frames['__gppLocator'] = {};
        window.addEventListener('message', eventListener);
      });

      afterEach(function () {
        delete window.frames['__gppLocator'];
        window.removeEventListener('message', eventListener);
      });

      it('returns consent data', async () => {
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consentData => {
            expect(consentData.gppData.gppString).is.eq("GPP_STRING");
            expect(consentData.gppData.applicableSections).deep.equal([2]);
            expect(consentData.gppData.version).is.eq(API_TYPE.GPP_V1_0);
            expect(consentData.gppData.localStoragePurposeConsent).is.true;
            let measurements = metrics.getAllMeasurements();
            expect(measurements.length).is.eq(1);
            expect(measurements.find(m => m.name === 'id5.api.gpp.delay')).is.not.undefined
          });
      });
    })

    describe('with GPP v1_1', function () {
      let eventListener;
      let gpp11NormalFlow = createGppV11Flow()
      beforeEach(function () {
        eventListener = (event) => {
          if (event.data.__gppCall) {
            expect(event.data.__gppCall.command).to.be.oneOf(['addEventListener', 'ping']);
            if (event.data.__gppCall.command === 'ping') {
              postResponse(event, gpp11NormalFlow.ping);
            } else if (event.data.__gppCall.command === 'addEventListener') {
              postResponse(event, gpp11NormalFlow.firstEvent);
              postResponse(event, gpp11NormalFlow.secondEvent);
            }
          }
        };
        window.frames['__gppLocator'] = {};
        window.addEventListener('message', eventListener);
      });

      afterEach(function () {
        delete window.frames['__gppLocator'];
        window.removeEventListener('message', eventListener);
      });

      it('returns consent data', async () => {
        return consentProvider.refreshConsentData(false, 'iab', undefined)
          .then(consentData => {
            expect(consentData.gppData.gppString).is.eq("GPP_STRING_V1_1");
            expect(consentData.gppData.applicableSections).deep.equal([1, 2]);
            expect(consentData.gppData.version).is.eq(API_TYPE.GPP_V1_1);
            expect(consentData.gppData.localStoragePurposeConsent).is.true;
            let measurements = metrics.getAllMeasurements();
            expect(measurements.length).is.eq(1);
            expect(measurements.find(m => m.name === 'id5.api.gpp.delay')).is.not.undefined
          });
      });
    })
  });
});
