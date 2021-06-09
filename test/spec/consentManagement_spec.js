import sinon from 'sinon';
import ConsentManagement from '../../lib/consentManagement';
import LocalStorage from '../../lib/localStorage.js';
import * as utils from '../../lib/utils';

let expect = require('chai').expect;

const TEST_PRIVACY_STORAGE_CONFIG = {
  name: 'id5id_privacy',
  expiresDays: 30
}

const localStorage = new LocalStorage(window);

describe('Consent Management TCFv1', function () {
  before(function() {
    localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  });
  afterEach(function() {
    localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  });

  describe('requestConsent tests:', function () {
    let testConsentData = {
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

    let callbackSpy
    beforeEach(function () {
      callbackSpy = sinon.spy();
      sinon.spy(utils, 'logError');
      sinon.spy(utils, 'logWarn');
    });
    afterEach(function () {
      callbackSpy.resetHistory();
      utils.logWarn.restore();
      utils.logError.restore();
    });

    describe('error checks:', function () {
      it('should throw a warning and return to callback function when an unknown CMP framework ID is used', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'bad', {}, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
      });

      it('should throw proper errors when CMP is not found', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
      });
    });

    describe('Static Consent flow:', function () {
      it('normal cmp static call, callback should be called', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'static', testConsentData, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consent.consentData.gdprApplies).to.be.true;
        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
        expect(consent.isLocalStorageAllowed(false, false)).to.be.undefined;
        expect(consent.isLocalStorageAllowed(true, false)).to.be.true;
      });

      it('throws a warning + calls callback when processCmpData check failed while config had debugBypassConsent set to true', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(true, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(utils.logWarn);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
        expect(consent.isLocalStorageAllowed(false, true)).to.be.true;
      });
    });

    describe('IAB Consent flow:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        window.__cmp = function() {};
      });

      afterEach(function () {
        cmpStub.restore();
        delete window.__cmp;
      });

      it('normal first call then second call should bypass CMP and simply use previously stored consentData', function () {
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData[args[0]]);
        });
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consent.consentData.gdprApplies).to.be.true;

        // we expect the cmp stub to be called TWICE because in v1, we call the cmp function
        // once for consent data and once for vendor data, so twice total.
        sinon.assert.calledTwice(cmpStub);

        cmpStub.restore();
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {});
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        sinon.assert.calledTwice(callbackSpy);
        expect(consent.consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consent.consentData.vendorData.metadata).to.equal(testConsentData.getVendorConsents.metadata);
        expect(consent.consentData.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => { args[2]({}); });
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
        expect(consent.isLocalStorageAllowed(false, false)).to.be.undefined;
      });

      it('throws a warning + calls callback when processCmpData check failed while debugBypassConsent=true', function () {
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => { args[2]({}); });
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(true, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logWarn);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
        expect(consent.isLocalStorageAllowed(false, true)).to.be.true;
      });
    });
  });
});

describe('Consent Management TCFv2', function () {
  before(function() {
    localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  });
  afterEach(function() {
    localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  });

  describe('requestConsent tests:', function () {
    let testConsentData = {
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

    let callbackSpy
    beforeEach(function () {
      callbackSpy = sinon.spy();
      sinon.spy(utils, 'logWarn');
      sinon.spy(utils, 'logError');
    });
    afterEach(function () {
      callbackSpy.resetHistory();
      utils.logWarn.restore();
      utils.logError.restore();
    });

    describe('error checks:', function () {
      it('should throw a warning and return to callback function when an unknown CMP framework ID is used', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'bad', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logError);
        expect(consent.consentData).to.be.undefined;
      });

      it('should throw proper errors when CMP is not found', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logError);
        expect(consent.consentData).to.be.undefined;
      });
    });

    describe('Static Consent flow:', function () {
      it('normal cmp static call, callback should be called', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'static', testConsentData, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(consent.consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consent.consentData.gdprApplies).to.be.true;
        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logError);
        expect(consent.consentData).to.be.undefined;
        expect(consent.isLocalStorageAllowed(false, false)).to.be.undefined;
      });

      it('throws a warning + calls callback when processCmpData check failed while config had debugBypassConsent set to true', function () {
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(true, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logWarn);
        expect(consent.consentData).to.be.undefined;
      });
    });

    describe('IAB Consent flow:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        window.__tcfapi = function() {};
      });

      afterEach(function () {
        cmpStub.restore();
        delete window.__tcfapi;
      });

      it('normal first call then second call should bypass CMP and simply use previously stored consentData', function () {
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
          args[2](testConsentData.getTCData, true);
        });
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consent.consentData.gdprApplies).to.be.true;
        expect(consent.consentData.apiVersion).to.equal(2);

        // we expect the cmp stub to be called ONCE because in v2, we set an event listener
        // that gets called once when consent data is available
        sinon.assert.calledOnce(cmpStub);

        cmpStub.restore();
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {}, true);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        sinon.assert.calledTwice(callbackSpy);
        expect(consent.consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consent.consentData.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
        expect(consent.isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => { args[2]({}, false); });
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledTwice(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
        expect(consent.isLocalStorageAllowed(false, false)).to.be.undefined;
      });

      it('throws a warning + calls callback when processCmpData check failed while config had debugBypassConsent=true', function () {
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => { args[2]({}, true); });
        const consent = new ConsentManagement(localStorage);
        consent.requestConsent(true, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logWarn);
        sinon.assert.calledOnce(callbackSpy);
        expect(consent.consentData).to.be.undefined;
        expect(consent.isLocalStorageAllowed(false, true)).to.be.true;
      });
    });
  });
});

describe('Provisional Local Storage Access', function() {
  before(function() {
    localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  });
  afterEach(function() {
    localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  });

  it('should be true if privacy data is not set', function() {
    const consent = new ConsentManagement(localStorage);
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
      localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, JSON.stringify(test.data));
      const consent = new ConsentManagement(localStorage);
      expect(consent.isProvisionalLocalStorageAllowed()).to.equal(test.expected_result);
    });
  });
});
