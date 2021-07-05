import { spy, stub, assert } from 'sinon';
import { expect } from 'chai';
import { ConsentManagement } from '../../lib/consentManagement.js';
import clone from 'clone';
import * as utils from '../../lib/utils.js';
import CONSTANTS from '../../lib/constants.json';

const TEST_PRIVACY_STORAGE_CONFIG = {
  name: 'id5id_privacy',
  expiresDays: 30
}

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

describe('Consent Management', function () {
  let localStorageMock, callbackSpy;

  beforeEach(function() {
    callbackSpy = spy();

    spy(utils, 'logError');
    spy(utils, 'logWarn');

    localStorageMock = {
      getItemWithExpiration: stub(),
      setItemWithExpiration: stub()
    };
  });

  afterEach(function () {
    callbackSpy.resetHistory();
    utils.logWarn.restore();
    utils.logError.restore();
  });

  it('should print an error and return to callback function when an unknown CMP framework ID is used', function () {
    const consent = new ConsentManagement(localStorageMock);
    consent.requestConsent(false, 'bad', {}, callbackSpy);

    assert.calledOnce(utils.logError);
    assert.calledOnce(callbackSpy);
    expect(consent.consentData).to.be.undefined;
  });

  describe('with static consent data', function () {
    it('should print an error when static CPM has the wrong structure', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', { test: 'test' }, callbackSpy);

      assert.calledOnce(utils.logError);
      assert.calledOnce(callbackSpy);
      expect(consent.consentData).to.be.undefined;
    });

    it('should print an error when static CPM has undefined data', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', undefined, callbackSpy);

      assert.calledOnce(utils.logError);
      assert.calledOnce(callbackSpy);
      expect(consent.consentData).to.be.undefined;
    });

    it('should parse correctly TCFv1 static data', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', TEST_CONSENT_DATA_V1, callbackSpy);

      assert.calledOnce(callbackSpy);
      expect(consent.consentData.consentString).to.equal(TEST_CONSENT_DATA_V1.getConsentData.consentData);
      expect(consent.consentData.gdprApplies).to.be.true;
      expect(consent.consentData.hasCcpaString).to.be.false;
      expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
    });

    it('prints an error if static TCFv1 data is invalid', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

      assert.calledOnce(utils.logError);
      assert.calledOnce(callbackSpy);
      expect(consent.consentData).to.be.undefined;
      expect(consent.isLocalStorageAllowed(false, false)).to.be.undefined;
      expect(consent.isLocalStorageAllowed(true, false)).to.be.true;
    });

    it('prints a warning debugBypassConsent set to true', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(true, 'static', undefined, callbackSpy);

      assert.calledOnce(utils.logWarn);
      assert.calledOnce(callbackSpy);
      expect(consent.consentData).to.be.undefined;
      expect(consent.isLocalStorageAllowed(false, true)).to.be.true;
    });

    it('should parse correctly TCFv2 static data', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', TEST_CONSENT_DATA_V2, callbackSpy);

      assert.calledOnce(callbackSpy);
      assert.notCalled(utils.logWarn);
      assert.notCalled(utils.logError);
      expect(consent.consentData.consentString).to.equal(TEST_CONSENT_DATA_V2.getTCData.tcString);
      expect(consent.consentData.gdprApplies).to.be.true;
      expect(consent.consentData.hasCcpaString).to.be.false;
      expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
    });

    it('prints an error if static TCFv2 data is invalid', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', { getTCData: {} }, callbackSpy);

      assert.calledOnce(utils.logError);
      assert.calledOnce(callbackSpy);
      expect(consent.consentData).to.be.undefined;
      expect(consent.isLocalStorageAllowed(false, false)).to.be.undefined;
      expect(consent.isLocalStorageAllowed(true, false)).to.be.true;
    });

    it('should parse correctly USPv1 static data', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', { getUSPData: { uspString: '1YNN' } }, callbackSpy);

      assert.calledOnce(callbackSpy);
      assert.notCalled(utils.logWarn);
      assert.notCalled(utils.logError);
      expect(consent.consentData.gdprApplies).to.be.false;
      expect(consent.consentData.hasCcpaString).to.be.true;
      expect(consent.consentData.ccpaString).to.equal('1YNN');
      expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
    });

    it('prints an error if static USPv1 data is invalid', function () {
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'static', { getUSPData: {} }, callbackSpy);

      assert.calledOnce(utils.logError);
      assert.calledOnce(callbackSpy);
      expect(consent.consentData).to.be.undefined;
      expect(consent.isLocalStorageAllowed(false, false)).to.be.undefined;
      expect(consent.isLocalStorageAllowed(true, false)).to.be.true;
    });
  });

  describe('framework detection', function() {
    it('should print a warning when no TCF is found (but CCPA is found)', function () {
      window.__uspapi = spy();
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'iab', undefined, callbackSpy);

      assert.calledOnce(utils.logWarn);
      delete window.__uspapi;
    });

    it('should print a warning when no CCPA is found (but TCF is found)', function () {
      window.__tcfapi = spy();
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'iab', undefined, callbackSpy);

      assert.calledOnce(utils.logWarn);
      delete window.__tcfapi;
    });
  });

  describe('with TCFv1 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function() {
      window.__cmp = cmpStub = stub();
    });

    afterEach(function () {
      delete window.__cmp;
    });

    it('can receive the data in a normal call flow', function () {
      cmpStub.callsFake((command, param, callback) => {
        callback(TEST_CONSENT_DATA_V1[command], true);
      });
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'iab', undefined, callbackSpy);

      assert.calledOnce(callbackSpy);
      expect(consent.consentData.consentString).to.equal(TEST_CONSENT_DATA_V1.getConsentData.consentData);
      expect(consent.consentData.vendorData.metadata).to.equal(TEST_CONSENT_DATA_V1.getVendorConsents.metadata);
      expect(consent.consentData.gdprApplies).to.be.true;
      expect(consent.consentData.apiVersion).to.equal(1);
      expect(consent.consentData.hasCcpaString).to.be.false;

      // two calls: getConsentData, getVendorConsents
      assert.calledTwice(cmpStub);
    });

    it('should bypass CMP and return stored consentData when calling twice', function() {
      cmpStub.callsFake((command, param, callback) => {
        callback(TEST_CONSENT_DATA_V1[command], true);
      });

      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'iab', undefined, callbackSpy);
      cmpStub.reset();

      consent.requestConsent(false, 'iab', undefined, callbackSpy);
      assert.calledTwice(callbackSpy);
      expect(callbackSpy.firstCall.firstArg).to.equal(callbackSpy.secondCall.firstArg)
      assert.notCalled(cmpStub);
    });

    it('should reset the status correctly', function() {
      cmpStub.callsFake((command, param, callback) => {
        callback(TEST_CONSENT_DATA_V1[command]);
      });

      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'iab', undefined, callbackSpy);
      consent.resetConsentData();

      consent.requestConsent(false, 'iab', undefined, callbackSpy);
      assert.calledTwice(callbackSpy);
      expect(cmpStub.callCount).to.equal(4);
    });

    [
      {
        getConsentData: null,
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: { getConsentData: {} },
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: { getConsentData: { gdprApplies: '' } },
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: { getConsentData: { gdprApplies: true, consentData: null } },
        getVendorConsents: TEST_CONSENT_DATA_V1.getVendorConsents
      },
      {
        getConsentData: TEST_CONSENT_DATA_V1.getConsentData,
        getVendorConsents: null
      },
      {
        getConsentData: TEST_CONSENT_DATA_V1.getConsentData,
        getVendorConsents: { getVendorConsents: {} }
      }
    ].forEach((dataObj) =>
      it('prints an error when TCF data is invalid', function () {
        cmpStub.callsFake((command, param, callback) => {
            callback(dataObj[command], true);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        assert.calledOnce(utils.logError);
        assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
      })
    );

    it('prints an error when TCF callback unsuccesful', function () {
      cmpStub.callsFake((command, param, callback) => {
        callback(null, false);
      });
      const consent = new ConsentManagement(localStorageMock);
      consent.requestConsent(false, 'iab', undefined, callbackSpy);

      assert.calledThrice(utils.logError);
      assert.calledOnce(callbackSpy);
      expect(consent.consentData).to.be.undefined;
    });
  });

  describe('with TCFv2 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function() {
      window.__tcfapi = cmpStub = stub();
    });

    afterEach(function () {
      delete window.__tcfapi;
    });

    describe('with valid data', function() {
      beforeEach(function() {
        cmpStub.callsFake((command, version, callback) => {
          expect(command).to.equal('addEventListener');
          expect(version).to.equal(2);
          callback(TEST_CONSENT_DATA_V2.getTCData, true);
        });
      });

      it('can receive the data in a normal call flow', function () {
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        assert.calledOnce(callbackSpy);
        assert.calledOnce(cmpStub);
        expect(consent.consentData.consentString).to.equal(TEST_CONSENT_DATA_V2.getTCData.tcString);
        expect(consent.consentData.vendorData.metadata).to.equal(TEST_CONSENT_DATA_V2.getTCData.metadata);
        expect(consent.consentData.gdprApplies).to.be.true;
      });

      it('should bypass CMP and return stored consentData when calling twice', function() {
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);
        cmpStub.reset();

        consent.requestConsent(false, 'iab', undefined, callbackSpy);
        assert.calledTwice(callbackSpy);
        expect(callbackSpy.firstCall.firstArg).to.equal(callbackSpy.secondCall.firstArg)
        assert.notCalled(cmpStub);
      });
    });


    describe('with invalid data', function() {
      [
        { eventStatus: 'tcloaded' },
        { eventStatus: 'tcloaded', gdprApplies: 'a string' },
        { eventStatus: 'tcloaded', gdprApplies: true, tcString: null }
      ].forEach((dataObj) =>
        it('prints an error when TCF data is invalid', function () {
          cmpStub.callsFake((command, version, callback) => {
            callback(dataObj, true);
          });
          const consent = new ConsentManagement(localStorageMock);
          consent.requestConsent(false, 'iab', undefined, callbackSpy);

          assert.calledOnce(utils.logError);
          assert.calledOnce(callbackSpy);
          expect(consent.consentData).to.be.undefined;
        })
      );

      it('prints an error when TCF callback unsuccesful', function () {
        cmpStub.callsFake((command, param, callback) => {
          callback(null, false);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        assert.calledOnce(utils.logError);
        assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
      });
    });
  });


  describe('with USPv1 IAB compliant CMP', function () {
    let cmpStub;

    beforeEach(function() {
      window.__uspapi = cmpStub = stub();
    });

    afterEach(function () {
      delete window.__uspapi;
    });

    describe('with valid data', function() {
      beforeEach(function() {
        cmpStub.callsFake((command, version, callback) => {
          expect(command).to.equal('getUSPData');
          expect(version).to.equal(1);
          callback({ uspString: '1YYN' }, true);
        });
      });

      it('can receive the data in a normal call flow', function () {
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        assert.calledOnce(callbackSpy);
        assert.calledOnce(cmpStub);
        expect(consent.consentData.gdprApplies).to.be.false;
        expect(consent.consentData.hasCcpaString).to.be.true;
        expect(consent.consentData.ccpaString).to.equal('1YYN');
      });

      it('should bypass CMP and return stored consentData when calling twice', function() {
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);
        cmpStub.reset();

        consent.requestConsent(false, 'iab', undefined, callbackSpy);
        assert.calledTwice(callbackSpy);
        expect(callbackSpy.firstCall.firstArg).to.equal(callbackSpy.secondCall.firstArg)
        assert.notCalled(cmpStub);
      });
    });

    describe('with invalid data', function() {
      [
        {},
        { uspString: null },
      ].forEach((dataObj) =>
        it('prints an error when USP data is invalid', function () {
          cmpStub.callsFake((command, version, callback) => {
            callback(dataObj, true);
          });
          const consent = new ConsentManagement(localStorageMock);
          consent.requestConsent(false, 'iab', undefined, callbackSpy);

          assert.calledOnce(utils.logError);
          assert.calledOnce(callbackSpy);
          expect(consent.consentData).to.be.undefined;
        })
      );

      it('prints an error when USP callback unsuccesful', function () {
        cmpStub.callsFake((command, param, callback) => {
          callback(null, false);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        assert.calledOnce(utils.logError);
        assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
      });
    });
  });

  describe('Provisional Local Storage Access', function() {
    it('should be undefined if privacy data is not set', function() {
      const consent = new ConsentManagement(localStorageMock);
      expect(consent.isProvisionalLocalStorageAllowed()).to.be.undefined;
    });

    const tests = [
      { expected_result: undefined, data: { } },
      { expected_result: true, data: { id5_consent: true } },
      { expected_result: false, data: { jurisdiction: 'gdpr' } },
      { expected_result: true, data: { jurisdiction: 'other' } },
      { expected_result: false, data: { jurisdiction: 'gdpr', id5_consent: false } },
      { expected_result: true, data: { jurisdiction: 'gdpr', id5_consent: true } },
      { expected_result: true, data: { jurisdiction: 'other', id5_consent: true } },
      { expected_result: true, data: { jurisdiction: 'other', id5_consent: false } }
    ];
    tests.forEach((test) => {
      it(`should be ${test.expected_result} with stored privacy data ${JSON.stringify(test.data)}`, function() {
        localStorageMock.getItemWithExpiration.callsFake((config) => {
          expect(config).to.equal(CONSTANTS.STORAGE_CONFIG.PRIVACY);
          return JSON.stringify(test.data);
        });
        const consent = new ConsentManagement(localStorageMock);
        expect(consent.isProvisionalLocalStorageAllowed()).to.equal(test.expected_result);
      });
    });
  });

  describe('Local Storage Access', function() {
    it('allows local storage whenever one of the flags is true', function() {
      const consent = new ConsentManagement(localStorageMock);
      expect(consent.isLocalStorageAllowed(true, false)).to.be.true;
      expect(consent.isLocalStorageAllowed(false, true)).to.be.true;
      expect(consent.isLocalStorageAllowed(true, true)).to.be.true;
    });

    describe('with TCFv2', function() {
      let cmpStub;

      beforeEach(function() {
        window.__tcfapi = cmpStub = stub();
      });

      afterEach(function () {
        delete window.__tcfapi;
      });

      it('allows local storage when vendor data allows purpose 1', function() {
        cmpStub.callsFake((command, version, callback) => {
          callback(TEST_CONSENT_DATA_V2.getTCData, true);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('disallows local storage when vendor data disallows purpose 1', function() {
        const cloneTestData = clone(TEST_CONSENT_DATA_V2);
        cloneTestData.getTCData.purpose.consents['1'] = false;
        cmpStub.callsFake((command, version, callback) => {
          callback(cloneTestData.getTCData, true);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        expect(consent.isLocalStorageAllowed(false, false)).to.be.false;
      });

      it('allows local storage when not in GDPR jurisdiction', function() {
        const cloneTestData = clone(TEST_CONSENT_DATA_V2);
        cloneTestData.getTCData.gdprApplies = false;
        cmpStub.callsFake((command, version, callback) => {
          callback(cloneTestData.getTCData, true);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });
    });

    describe('with TCFv1', function() {
      let cmpStub;

      beforeEach(function() {
        window.__cmp = cmpStub = stub();
      });

      afterEach(function () {
        delete window.__cmp;
      });

      it('allows local storage when vendor data allows purpose 1', function() {
        cmpStub.callsFake((command, param, callback) => {
          callback(TEST_CONSENT_DATA_V1[command], true);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('disallows local storage when vendor data disallows purpose 1', function() {
        const cloneTestData = clone(TEST_CONSENT_DATA_V1);
        cloneTestData.getVendorConsents.purposeConsents['1'] = false;
        cmpStub.callsFake((command, param, callback) => {
          callback(cloneTestData[command], true);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        expect(consent.isLocalStorageAllowed(false, false)).to.be.false;
      });

      it('allows local storage when not in GDPR jurisdiction', function() {
        const cloneTestData = clone(TEST_CONSENT_DATA_V1);
        cloneTestData.getVendorConsents.gdprApplies = false;
        cmpStub.callsFake((command, param, callback) => {
          callback(cloneTestData[command], true);
        });
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });
    });
  });

  describe('when API is running in iframe and TCF in top frame', function() {
    describe('with TCFv1', function() {
      let eventListener;
      beforeEach(function() {
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

      it('can receive the data', function(done) {
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, (consentData) => {
          expect(consentData.consentString).to.equal(TEST_CONSENT_DATA_V1.getConsentData.consentData);
          expect(consentData.vendorData.metadata).to.equal(TEST_CONSENT_DATA_V1.getVendorConsents.metadata);
          expect(consentData.gdprApplies).to.be.true;
          expect(consentData.apiVersion).to.equal(1);
          done();
        });
      });
    });

    describe('with TCFv2', function() {
      let eventListener;
      beforeEach(function() {
        eventListener = (event) => {
          if (event.data.__tcfapiCall) {
            const command = event.data.__tcfapiCall.command;
            expect(command).to.equal('addEventListener');
            expect(event.data.__tcfapiCall.version).to.equal(2);
            const returnMessage = {
              __tcfapiReturn: {
                returnValue: TEST_CONSENT_DATA_V2.getTCData,
                success: true,
                callId: event.data.__tcfapiCall.callId
              }
            }
            event.source.postMessage(returnMessage, '*');
          }
        };
        window.frames['__tcfapiLocator'] = {};
        window.addEventListener('message', eventListener);
      });

      afterEach(function () {
        delete window.frames['__tcfapiLocator'];
        window.removeEventListener('message', eventListener);
      });

      it('can receive the data', function(done) {
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, (consentData) => {
          expect(consentData.consentString).to.equal(TEST_CONSENT_DATA_V2.getTCData.tcString);
          expect(consentData.vendorData.metadata).to.equal(TEST_CONSENT_DATA_V2.getTCData.metadata);
          expect(consentData.gdprApplies).to.be.true;
          expect(consentData.apiVersion).to.equal(2);
          done();
        });
      });
    });

    describe('with USPv2', function() {
      let eventListener;
      beforeEach(function() {
        eventListener = (event) => {
          if (event.data.__uspapiCall) {
            expect(event.data.__uspapiCall.version).to.equal(1);
            expect(event.data.__uspapiCall.command).to.equal('getUSPData');
            const returnMessage = {
              __uspapiReturn: {
                returnValue: { uspString: '1YYN' },
                success: true,
                callId: event.data.__uspapiCall.callId
              }
            }
            event.source.postMessage(returnMessage, '*');
          }
        };
        window.frames['__uspapiLocator'] = {};
        window.addEventListener('message', eventListener);
      });

      afterEach(function () {
        delete window.frames['__uspapiLocator'];
        window.removeEventListener('message', eventListener);
      });

      it('can receive the data', function(done) {
        const consent = new ConsentManagement(localStorageMock);
        consent.requestConsent(false, 'iab', undefined, (consentData) => {
          expect(consentData.hasCcpaString).to.be.true;
          expect(consentData.ccpaString).to.equal('1YYN');
          expect(consentData.gdprApplies).to.be.false;
          expect(consentData.apiVersion).to.equal(0);
          done();
        });
      });
    });
  });
});
