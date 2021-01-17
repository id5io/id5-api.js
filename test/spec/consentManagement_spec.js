import sinon from 'sinon';
import { resetConsentData, requestConsent, consentData, isLocalStorageAllowed, isProvisionalLocalStorageAllowed } from 'src/consentManagement';
import * as utils from 'src/utils';

let expect = require('chai').expect;

const TEST_PRIVACY_STORAGE_CONFIG = {
  name: 'id5id_privacy',
  expiresDays: 30
}

describe('Consent Management TCFv1', function () {
  before(function() {
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    resetConsentData();
  });
  afterEach(function() {
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    resetConsentData();
  });

  describe('requestConsent tests:', function () {
    let testConsentData = {
      getConsentData: {
        gdprApplies: true,
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
      resetConsentData();
    });

    describe('error checks:', function () {
      it('should throw a warning and return to callback function when an unknown CMP framework ID is used', function () {
        requestConsent(false, 'bad', {}, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
      });

      it('should throw proper errors when CMP is not found', function () {
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
      });
    });

    describe('Static Consent flow:', function () {
      it('normal cmp static call, callback should be called', function () {
        requestConsent(false, 'static', testConsentData, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        expect(consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consentData.gdprApplies).to.be.true;
        expect(isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        requestConsent(false, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed(false, false)).to.be.undefined;
        expect(isLocalStorageAllowed(true, false)).to.be.true;
      });

      it('throws an error + calls callback when processCmpData check failed while config had debugBypassConsent set to true', function () {
        requestConsent(true, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed(false, true)).to.be.true;
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
        resetConsentData();
      });

      it('normal first call then second call should bypass CMP and simply use previously stored consentData', function () {
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData[args[0]]);
        });
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        expect(consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consentData.gdprApplies).to.be.true;

        // we expect the cmp stub to be called TWICE because in v1, we call the cmp function
        // once for consent data and once for vendor data, so twice total.
        sinon.assert.calledTwice(cmpStub);

        cmpStub.restore();
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {});
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        sinon.assert.calledTwice(callbackSpy);
        expect(consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consentData.vendorData.metadata).to.equal(testConsentData.getVendorConsents.metadata);
        expect(consentData.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
        expect(isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => { args[2]({}); });
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed(false, false)).to.be.undefined;
      });

      it('throws an error + calls callback when processCmpData check failed while debugBypassConsent=true', function () {
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => { args[2]({}); });
        requestConsent(true, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed(false, true)).to.be.true;
      });
    });
  });
});

describe('Consent Management TCFv2', function () {
  before(function() {
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    resetConsentData();
  });
  afterEach(function() {
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    resetConsentData();
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
        requestConsent(false, 'bad', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logError);
        expect(consentData).to.be.undefined;
      });

      it('should throw proper errors when CMP is not found', function () {
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logError);
        expect(consentData).to.be.undefined;
      });
    });

    describe('Static Consent flow:', function () {
      it('normal cmp static call, callback should be called', function () {
        requestConsent(false, 'static', testConsentData, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consentData.gdprApplies).to.be.true;
        expect(isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        requestConsent(false, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logError);
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed(false, false)).to.be.undefined;
      });

      it('throws an error + calls callback when processCmpData check failed while config had debugBypassConsent set to true', function () {
        requestConsent(true, 'static', { getConsentData: {}, getVendorConsents: {} }, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledOnce(utils.logError);
        expect(consentData).to.be.undefined;
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
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(callbackSpy);
        expect(consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consentData.gdprApplies).to.be.true;
        expect(consentData.apiVersion).to.equal(2);

        // we expect the cmp stub to be called ONCE because in v2, we set an event listener
        // that gets called once when consent data is available
        sinon.assert.calledOnce(cmpStub);

        cmpStub.restore();
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {}, true);
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        sinon.assert.calledTwice(callbackSpy);
        expect(consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consentData.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
        expect(isLocalStorageAllowed(false, false)).to.be.true;
      });

      it('throws an error when requestConsent check failed', function () {
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => { args[2]({}, false); });
        requestConsent(false, 'iab', undefined, callbackSpy);

        sinon.assert.calledTwice(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed(false, false)).to.be.undefined;
      });

      it('throws an error + calls callback when processCmpData check failed while config had debugBypassConsent=true', function () {
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => { args[2]({}, true); });
        requestConsent(true, 'iab', undefined, callbackSpy);

        sinon.assert.calledOnce(utils.logError);
        sinon.assert.calledOnce(callbackSpy);
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed(false, true)).to.be.true;
      });
    });
  });
});

describe('Provisional Local Storage Access', function() {
  before(function() {
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    resetConsentData();
  });
  afterEach(function() {
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    resetConsentData();
  });

  it('should be true if privacy data is not set', function() {
    expect(isProvisionalLocalStorageAllowed()).to.be.undefined;
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
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, JSON.stringify(test.data));

      expect(isProvisionalLocalStorageAllowed()).to.equal(test.expected_result);
    });
  });
});
