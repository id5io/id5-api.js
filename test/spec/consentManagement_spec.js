import { resetConsentData, requestConsent, consentData, isLocalStorageAllowed, isProvisionalLocalStorageAllowed } from 'src/consentManagement';
import * as utils from 'src/utils';
import { config } from 'src/config';

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
    let callbackCalled = false;
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

    beforeEach(function () {
      callbackCalled = false;
    });

    afterEach(function () {
      resetConsentData();
    });

    describe('error checks:', function () {
      beforeEach(function () {
        sinon.spy(utils, 'logWarn');
        sinon.spy(utils, 'logError');
      });

      afterEach(function () {
        utils.logWarn.restore();
        utils.logError.restore();
        resetConsentData();
      });

      it('should throw a warning and return to callback function when an unknown CMP framework ID is used', function () {
        config.setConfig({ cmpApi: 'bad' });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
      });

      it('should throw proper errors when CMP is not found', function () {
        config.setConfig({ cmpApi: 'iab' });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
      });
    });

    describe('Static Consent flow:', function () {
      beforeEach(function () {
        callbackCalled = false;
        sinon.spy(utils, 'logError');
        sinon.spy(utils, 'logWarn');
      });

      afterEach(function () {
        config.resetConfig();
        utils.logError.restore();
        utils.logWarn.restore();
        resetConsentData();
      });

      it('normal cmp static call, callback should be called', function () {
        config.setConfig({ cmpApi: 'static', consentData: testConsentData });
        requestConsent(function (consentData) { callbackCalled = true; });

        expect(callbackCalled).to.be.true;
        expect(consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consentData.gdprApplies).to.be.true;
        expect(isLocalStorageAllowed()).to.be.true;
      });

      it('throws an error when requestConsent check failed while config had allowID5WithoutConsentApi set to false', function () {
        config.setConfig({ cmpApi: 'static', consentData: { getConsentData: {}, getVendorConsents: {} } });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.undefined;
      });

      it('throws an error + calls callback when processCmpData check failed while config had allowID5WithoutConsentApi set to true', function () {
        config.setConfig({ cmpApi: 'static', allowID5WithoutConsentApi: true, consentData: { getConsentData: {}, getVendorConsents: {} } });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.true;
      });
    });

    describe('IAB Consent flow:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        callbackCalled = false;
        sinon.spy(utils, 'logError');
        sinon.spy(utils, 'logWarn');
        window.__cmp = function() {};
      });

      afterEach(function () {
        config.resetConfig();
        cmpStub.restore();
        utils.logError.restore();
        utils.logWarn.restore();
        delete window.__cmp;
        resetConsentData();
      });

      it('normal first call then second call should bypass CMP and simply use previously stored consentData', function () {
        config.setConfig({ cmpApi: 'iab' });
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData[args[0]]);
        });
        requestConsent(function (consentData) { callbackCalled = true; });

        expect(callbackCalled).to.be.true;
        expect(consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consentData.gdprApplies).to.be.true;

        // we expect the cmp stub to be called TWICE because in v1, we call the cmp function
        // once for consent data and once for vendor data, so twice total.
        sinon.assert.calledTwice(cmpStub);

        cmpStub.restore();
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {});
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData.consentString).to.equal(testConsentData.getConsentData.consentData);
        expect(consentData.vendorData.metadata).to.equal(testConsentData.getVendorConsents.metadata);
        expect(consentData.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
        expect(isLocalStorageAllowed()).to.be.true;
      });

      it('throws an error when requestConsent check failed while config had allowID5WithoutConsentApi=false', function () {
        config.setConfig({ cmpApi: 'iab' });
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => { args[2]({}); });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.undefined;
      });

      it('throws an error + calls callback when processCmpData check failed while config had allowID5WithoutConsentApi=true', function () {
        config.setConfig({ cmpApi: 'iab', allowID5WithoutConsentApi: true });
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => { args[2]({}); });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.true;
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
    let callbackCalled = false;
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

    beforeEach(function () {
      callbackCalled = false;
    });

    describe('error checks:', function () {
      beforeEach(function () {
        sinon.spy(utils, 'logWarn');
        sinon.spy(utils, 'logError');
      });

      afterEach(function () {
        utils.logWarn.restore();
        utils.logError.restore();
      });

      it('should throw a warning and return to callback function when an unknown CMP framework ID is used', function () {
        config.setConfig({ cmpApi: 'bad' });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
      });

      it('should throw proper errors when CMP is not found', function () {
        config.setConfig({ cmpApi: 'iab' });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
      });
    });

    describe('Static Consent flow:', function () {
      beforeEach(function () {
        callbackCalled = false;
        sinon.spy(utils, 'logError');
        sinon.spy(utils, 'logWarn');
      });

      afterEach(function () {
        config.resetConfig();
        utils.logError.restore();
        utils.logWarn.restore();
      });

      it('normal cmp static call, callback should be called', function () {
        config.setConfig({ cmpApi: 'static', consentData: testConsentData });
        requestConsent(function (consentData) { callbackCalled = true; });

        expect(callbackCalled).to.be.true;
        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consentData.gdprApplies).to.be.true;
        expect(isLocalStorageAllowed()).to.be.true;
      });

      it('throws an error when requestConsent check failed while config had allowID5WithoutConsentApi set to false', function () {
        config.setConfig({ cmpApi: 'static', consentData: { getConsentData: {}, getVendorConsents: {} } });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.undefined;
      });

      it('throws an error + calls callback when processCmpData check failed while config had allowID5WithoutConsentApi set to true', function () {
        config.setConfig({ cmpApi: 'static', allowID5WithoutConsentApi: true, consentData: { getConsentData: {}, getVendorConsents: {} } });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.true;
      });
    });

    describe('IAB Consent flow:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        callbackCalled = false;
        sinon.spy(utils, 'logError');
        sinon.spy(utils, 'logWarn');
        window.__tcfapi = function() {};
      });

      afterEach(function () {
        config.resetConfig();
        cmpStub.restore();
        utils.logError.restore();
        utils.logWarn.restore();
        delete window.__tcfapi;
      });

      it('normal first call then second call should bypass CMP and simply use previously stored consentData', function () {
        config.setConfig({ cmpApi: 'iab' });
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
          args[2](testConsentData.getTCData, true);
        });
        requestConsent(function (consentData) { callbackCalled = true; });

        expect(callbackCalled).to.be.true;
        expect(consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consentData.gdprApplies).to.be.true;
        expect(consentData.apiVersion).to.equal(2);

        // we expect the cmp stub to be called ONCE because in v2, we set an event listener
        // that gets called once when consent data is available
        sinon.assert.calledOnce(cmpStub);

        cmpStub.restore();
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {}, true);
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData.consentString).to.equal(testConsentData.getTCData.tcString);
        expect(consentData.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
        expect(isLocalStorageAllowed()).to.be.true;
      });

      it('throws an error when requestConsent check failed while config had allowID5WithoutConsentApi=false', function () {
        config.setConfig({ cmpApi: 'iab' });
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => { args[2]({}, false); });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledTwice(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.undefined;
      });

      it('throws an error + calls callback when processCmpData check failed while config had allowID5WithoutConsentApi=true', function () {
        config.setConfig({ cmpApi: 'iab', allowID5WithoutConsentApi: true });
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => { args[2]({}, true); });
        requestConsent(function (consentData) { callbackCalled = true; });

        sinon.assert.calledOnce(utils.logError);
        expect(callbackCalled).to.be.true;
        expect(consentData).to.be.undefined;
        expect(isLocalStorageAllowed()).to.be.true;
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
