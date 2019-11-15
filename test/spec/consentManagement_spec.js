import { resetConsentData, requestConsent, consentData, isLocalStorageAllowed } from 'src/consentManagement';
import * as utils from 'src/utils';
import { config } from 'src/config';

let expect = require('chai').expect;

describe('consentManagement', function () {
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
        sinon.stub(utils, 'logWarn');
        sinon.stub(utils, 'logError');
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
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
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
        expect(isLocalStorageAllowed()).to.be.false;
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
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
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
        expect(isLocalStorageAllowed()).to.be.false;
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
