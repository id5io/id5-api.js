import { config } from 'src/config';
import * as utils from 'src/utils';
import { resetConsentData } from 'src/consentManagement';
import { LEGACY_COOKIE_NAMES } from 'src/id5-api.js';

require('src/id5-api.js');

// need to manually set version since the test process doesn't set it like gulp build does
ID5.version = 'TESTING';

let expect = require('chai').expect;

describe('ID5 JS API', function () {
  const TEST_ID5_PARTNER_ID = 99;
  const ID5_FETCH_ENDPOINT = `https://id5-sync.com/g/v2/${TEST_ID5_PARTNER_ID}.json`;
  const ID5_CALL_ENDPOINT = `https://id5-sync.com/i/${TEST_ID5_PARTNER_ID}/8.gif`;
  const ID5_SYNC_ENDPOINT = `https://id5-sync.com/s/${TEST_ID5_PARTNER_ID}/8.gif`;
  const TEST_ID5ID_STORAGE_CONFIG = {
    name: 'id5id',
    expiresDays: 90
  };
  const TEST_ID5ID_STORAGE_CONFIG_EXPIRED = {
    name: 'id5id',
    expiresDays: -5
  };
  const TEST_LAST_STORAGE_CONFIG = {
    name: 'id5id_last',
    expiresDays: 90
  };
  const TEST_CONSENT_DATA_STORAGE_CONFIG = {
    name: 'id5id_cached_consent_data',
    expiresDays: 30
  };
  const TEST_PD_STORAGE_CONFIG = {
    name: 'id5id_cached_pd',
    expiresDays: 30
  };
  const TEST_NB_STORAGE_CONFIG = {
    name: `id5id_${TEST_ID5_PARTNER_ID}_nb`,
    expiresDays: 90
  };
  const TEST_FS_STORAGE_CONFIG = {
    name: 'id5id_fs',
    expiresDays: 7
  };

  const TEST_STORED_ID5ID = 'teststoredid5id';
  const TEST_STORED_SIGNATURE = 'abcdef';
  const STORED_JSON = JSON.stringify({
    'universal_uid': TEST_STORED_ID5ID,
    'cascade_needed': false,
    'signature': TEST_STORED_SIGNATURE,
    'link_type': 0
  });
  const TEST_RESPONSE_ID5ID = 'testresponseid5id';
  const TEST_RESPONSE_SIGNATURE = 'uvwxyz';
  const JSON_RESPONSE = JSON.stringify({
    'universal_uid': TEST_RESPONSE_ID5ID,
    'cascade_needed': false,
    'signature': TEST_RESPONSE_SIGNATURE,
    'link_type': 0
  });
  const JSON_RESPONSE_CASCADE = JSON.stringify({
    'universal_uid': TEST_RESPONSE_ID5ID,
    'cascade_needed': true,
    'signature': TEST_RESPONSE_SIGNATURE,
    'link_type': 0
  });

  describe('Core API Availability', function () {
    afterEach(function () {
      config.resetConfig();
    });

    it('should have a global variable ID5', function () {
      expect(ID5).to.be.a('object');
    });
    it('should have function ID5.init', function () {
      expect(ID5.init).to.be.a('function');
    });
    it('should be loaded', function () {
      expect(ID5.loaded).to.be.a('boolean');
      expect(ID5.loaded).to.be.true;
      expect(ID5.initialized).to.be.a('boolean');
      expect(ID5.initialized).to.be.false;
      expect(ID5.callbackFired).to.be.a('boolean');
      expect(ID5.callbackFired).to.be.false;
    });
    it('should be initialized', function () {
      let ajaxStub;
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE);
      });

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
      expect(ID5.initialized).to.be.true;

      ajaxStub.restore();
    });
  });

  describe('Configuration and Parameters', function () {
    let ajaxStub;

    before(function () {
      ID5.userId = undefined;
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE);
      });
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      ID5.userId = undefined;
    });

    describe('Set and Get Config', function () {
      it('should have user-defined config and final config available', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

        expect(ID5.getUserConfig().partnerId).to.be.equal(TEST_ID5_PARTNER_ID);
        expect(ID5.config.partnerId).to.be.equal(TEST_ID5_PARTNER_ID);
        expect(ID5.getConfig().partnerId).to.be.equal(TEST_ID5_PARTNER_ID);

        expect(ID5.getUserConfig().pd).to.be.undefined;
        expect(ID5.config.pd).to.be.equal('');
        expect(ID5.getConfig().pd).to.be.equal('');

        expect(ID5.getUserConfig().refreshInSeconds).to.be.equal(10);
        expect(ID5.config.refreshInSeconds).to.be.equal(10);
        expect(ID5.getConfig().refreshInSeconds).to.be.equal(10);
      });

      it('should update userConfig and config with ID5.setConfig()', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        expect(ID5.getConfig().pd).to.be.equal('');

        ID5.setConfig({ pd: 'newpd' });

        expect(ID5.config.pd).to.be.equal('newpd');
        expect(ID5.getConfig().pd).to.be.equal('newpd');
        expect(ID5.getUserConfig().pd).to.be.equal('newpd');
      });
    });

    describe('Required Parameters', function () {
      afterEach(function () {
        config.resetConfig();
      });

      it('should fail if partnerId not set in config', function() {
        try {
          ID5.init({ allowID5WithoutConsentApi: true });
        } catch (e) { }

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
      });

      it('should fail if ID5.version is not set', function () {
        let version;
        try {
          version = ID5.version;
          ID5.version = undefined;

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        } catch (e) { }

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
        ID5.version = version;
      });
    });
  });

  describe('Standard Storage and Responses', function() {
    let ajaxStub;

    before(function() {
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      ID5.userId = undefined;
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE);
      });
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      ID5.userId = undefined;
    });

    describe('No Stored Value', function() {
      it('should request new value with default parameters when consent given', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.partner).to.be.equal(TEST_ID5_PARTNER_ID);
        expect(requestData.s).to.be.equal('');
        expect(requestData.o).to.be.equal('api');
        expect(requestData.v).to.be.equal('TESTING');
        expect(requestData.pd).to.be.equal('');
        expect(requestData.rf).to.include('http://localhost');
        expect(requestData.top).to.be.equal(1);
        expect(requestData.tpids).to.be.undefined;

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE);
      });

      it('should request new value with pd when pd config is set when consent given', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, pd: 'pubdata' });

        sinon.assert.calledOnce(ajaxStub);

        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.pd).to.be.equal('pubdata');
      });

      it('should not request new value without consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
      });

      describe('tpids', function() {
        it('should include valid tpids', function () {
          const testTpid = [
            {
              partnerId: 123,
              uid: 'ABC'
            }
          ];

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.eql(testTpid);
        });

        it('should not include tpids if an object', function () {
          const testTpid = { abc: 123 };

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
        });

        it('should not include tpids if an empty array', function () {
          const testTpid = [];

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
        });

        it('should not include tpids if a string', function () {
          const testTpid = 'string';

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
        });

        it('should not include tpids if not set', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
        });
      });
    });

    describe('Stored Value with No Refresh Needed', function() {
      beforeEach(function() {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      });

      it('should use stored value with consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000 });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
      });

      it('should use stored value without consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
      });
    });

    describe('Stored Value with Refresh Needed', function() {
      beforeEach(function() {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
      });

      it('should request new value with consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
      });

      it('should not request new value, instead use stored value without consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
      });
    });

    describe('Stored Value with Missing Last Stored Value', function() {
      beforeEach(function() {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      });

      it('should request new value with consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
      });

      it('should not request new value, instead use stored value without consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
      });
    });

    describe('Expired Stored Value with Refresh Not Needed', function() {
      beforeEach(function() {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      });

      it('should request new value with consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
      });

      it('should not request new value and not use stored value without consent', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
      });
    });

    describe('Stored Data Change Forces Refresh with Refresh Not Needed', function () {
      beforeEach(function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      });

      describe('Stored Consent Changes', function() {
        before(function() {
          utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
        });
        afterEach(function() {
          utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
        });

        describe('TCF v1', function() {
          const testConsentDataFromCmp = {
            gdprApplies: true,
            consentData: 'cmpconsentstring',
            apiVersion: 1
          };
          let cmpStub;

          beforeEach(function() {
            window.__cmp = function() {};
            cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
              args[2](testConsentDataFromCmp);
            });
          });

          afterEach(function() {
            cmpStub.restore();
            delete window.__cmp;
            resetConsentData();
          });

          it('should call id5 servers if empty stored consent data', function () {
            ID5.setStoredConsentData();

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should call id5 servers if stored consent data does not match current consent', function () {
            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'storedconsentstring',
              apiVersion: 1
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should not call id5 servers if stored consent data matches current consent', function () {
            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'cmpconsentstring',
              apiVersion: 1
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

            sinon.assert.notCalled(ajaxStub);
          });
        });

        describe('TCF v2', function() {
          let testConsentDataFromCmp = {
            getTCData: {
              gdprApplies: true,
              tcString: 'cmpconsentstring',
              eventStatus: 'tcloaded',
              apiVersion: 2
            }
          };
          let cmpStub;

          beforeEach(function() {
            window.__tcfapi = function() {};
            cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
              args[2](testConsentDataFromCmp.getTCData, true);
            });
          });

          afterEach(function() {
            cmpStub.restore();
            delete window.__tcfapi;
            resetConsentData();
          });

          it('should call id5 servers if empty stored consent data', function () {
            ID5.setStoredConsentData();

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should call id5 servers if stored consent data does not match current consent', function () {
            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'storedconsentstring',
              apiVersion: 2
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should not call id5 servers if stored consent data matches current consent', function () {
            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'cmpconsentstring',
              apiVersion: 2
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

            sinon.assert.notCalled(ajaxStub);
          });
        });
      });

      describe('Stored PD Changes', function() {
        before(function() {
          utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
        });
        afterEach(function() {
          utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
        });

        it('should call id5 servers if empty stored pd data', function () {
          ID5.setStoredPd();

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000, pd: 'requestpd' });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('should call id5 servers if stored pd data does not match current pd', function () {
          ID5.setStoredPd('storedpd');

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000, pd: 'requestpd' });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('should not call id5 servers if stored pd data matches current pd', function () {
          ID5.setStoredPd('storedpd');

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000, pd: 'storedpd' });

          sinon.assert.notCalled(ajaxStub);
        });
      });
    });

    describe('Handle Legacy Cookies', function() {
      const expStrFuture = (new Date(Date.now() + 5000).toUTCString());
      const expStrExpired = (new Date(Date.now() - 5000).toUTCString());

      it('should call id5 servers without existing legacy value in 1puid params via Ajax', function () {
        utils.setCookie('id5id.1st', JSON.stringify({'ID5ID': 'legacyid5id'}), expStrFuture);

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);

        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.s).to.be.equal('');
        expect(requestData['1puid']).to.be.undefined;

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE);

        utils.setCookie('id5id.1st', '', expStrExpired);
      });

      it('should call id5 servers with existing signature value from legacy cookie id5.1st storage if local storage is empty', function () {
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.s).to.be.equal('legacycookiesignature');

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);

        utils.setCookie('id5id.1st', '', expStrExpired);
      });

      it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty', function () {
        utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.s).to.be.equal('legacycookiesignature');

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);

        utils.setCookie('id5id.1st', '', expStrExpired);
      });

      it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty and both legacy cookies exist', function () {
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5.1st', 'signature': 'legacycookiessignature-id5.1st'}), expStrFuture);
        utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5id.1st', 'signature': 'legacycookiesignature-id5id.1st'}), expStrFuture);

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.s).to.be.equal('legacycookiesignature-id5id.1st');

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);

        utils.setCookie('id5.1st', '', expStrExpired);
        utils.setCookie('id5id.1st', '', expStrExpired);
      });

      it('removes legacy cookies', function () {
        LEGACY_COOKIE_NAMES.forEach(function(cookie) {
          utils.setCookie(`${cookie}`, JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);
          utils.setCookie(`${cookie}_nb`, 1, expStrFuture);
          utils.setCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`, 2, expStrFuture);
          utils.setCookie(`${cookie}_last`, Date.now() - (8000 * 1000), expStrFuture);
          utils.setCookie(`${cookie}.cached_pd`, 'abc', expStrFuture);
          utils.setCookie(`${cookie}.cached_consent_data`, 'xyz', expStrFuture);
        });

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        LEGACY_COOKIE_NAMES.forEach(function(cookie) {
          expect(utils.getCookie(`${cookie}`)).to.be.equal(null);
          expect(utils.getCookie(`${cookie}_nb`)).to.be.equal(null);
          expect(utils.getCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`)).to.be.equal(null);
          expect(utils.getCookie(`${cookie}_last`)).to.be.equal(null);
          expect(utils.getCookie(`${cookie}.cached_pd`)).to.be.equal(null);
          expect(utils.getCookie(`${cookie}.cached_consent_data`)).to.be.equal(null);
        });

        // just for safety's sake, forcibly remove the cookies that should already be gone
        LEGACY_COOKIE_NAMES.forEach(function(cookie) {
          utils.setCookie(`${cookie}`, '', expStrExpired);
          utils.setCookie(`${cookie}_nb`, '', expStrExpired);
          utils.setCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`, '', expStrExpired);
          utils.setCookie(`${cookie}_last`, '', expStrExpired);
          utils.setCookie(`${cookie}.cached_pd`, '', expStrExpired);
          utils.setCookie(`${cookie}.cached_consent_data`, '', expStrExpired);
        });
      });
    });
  });

  describe('Async Responses', function () {
    const AJAX_RESPONSE_MS = 5;
    const CALLBACK_TIMEOUT_MS = 10;
    // arbitrary timeout to test the ID later in the call process after any ajax calls
    // or other async activities
    const LONG_TIMEOUT = 20;

    let ajaxStub;

    before(function() {
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      ID5.userId = undefined;
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        setTimeout(() => { callbacks.success(JSON_RESPONSE) }, AJAX_RESPONSE_MS);
      });
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      ID5.userId = undefined;
    });

    describe('Callbacks', function () {
      let callbackSpy;

      beforeEach(function() {
        callbackSpy = sinon.spy();
      });

      describe('Check callbackFired', function () {
        it('should have callbackFired:false if no callback', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
          expect(ID5.callbackFired).to.be.false;
          sinon.assert.calledOnce(ajaxStub);

          setTimeout(() => {
            setTimeout(() => {
              expect(ID5.callbackFired).to.be.false;
              sinon.assert.notCalled(callbackSpy);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });

        it('should have callbackFired:true if callback', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

          sinon.assert.notCalled(callbackSpy);
          expect(ID5.callbackFired).to.be.false;
          sinon.assert.calledOnce(ajaxStub);

          setTimeout(() => {
            // callbackFired value is set before the callback is called
            expect(ID5.callbackFired).to.be.true;
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });
      });

      describe('No Stored Value, No Consent', function () {
        it('should call callback at timeout with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.undefined;
              done();
            }, (CALLBACK_TIMEOUT_MS + 1));
          }, 0);
        });

        it('should not call callback without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.notCalled(callbackSpy);
              expect(ID5.userId).to.be.undefined;
              done();
            }, LONG_TIMEOUT);
          }, AJAX_RESPONSE_MS);
        });
      });

      describe('Stored Value, No Consent', function () {
        beforeEach(function() {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should call callback immediately with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);

            // make sure the watchdog timeout is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              done();
            }, CALLBACK_TIMEOUT_MS);
          }, 0);
        });

        it('should call callback immediately without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
            done();
          }, 0);
        });
      });

      describe('Stored Value, No Refresh, With Consent', function () {
        beforeEach(function() {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should call callback immediately with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);

            // make sure the watchdog timeout is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              done();
            }, CALLBACK_TIMEOUT_MS);
          }, 0);
        });

        it('should call callback immediately without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
            done();
          }, 0);
        });
      });

      describe('No Stored Value, With Consent', function () {
        it('should call callback after server response with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);

              // make sure the watchdog timeout is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                done();
              }, CALLBACK_TIMEOUT_MS);
            }, 0);
          }, AJAX_RESPONSE_MS);
        });

        it('should call callback after server response without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });
      });

      describe('Stored Value, Refresh Needed, With Consent', function () {
        beforeEach(function() {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
        });

        it('should call callback immediately and only once with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
          }, 0);

          setTimeout(() => {
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);

              // make sure the watchdog timeout is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                done();
              }, CALLBACK_TIMEOUT_MS);
            }, 0);
          }, AJAX_RESPONSE_MS);
        });

        it('should call callback immediately and only once without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
          }, 0);

          setTimeout(() => {
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });
      });
    });

    describe('Setting ID5.userId', function () {
      describe('No Stored Value, No Consent', function () {
        it('should never set userId', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.undefined;

          setTimeout(() => {
            expect(ID5.userId).to.be.undefined;
            done();
          }, LONG_TIMEOUT);
        });
      });

      describe('Stored Value, No Consent', function () {
        beforeEach(function() {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should set userId immediately', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
            done();
          }, LONG_TIMEOUT);
        });
      });

      describe('Stored Value, No Refresh, With Consent', function () {
        beforeEach(function() {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should set userId immediately and not change', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
            done();
          }, LONG_TIMEOUT);
        });
      });

      describe('No Stored Value, With Consent', function () {
        it('should set userId after the response', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            done();
          }, LONG_TIMEOUT);
        });
      });

      describe('Stored Value, Refresh Needed, With Consent', function () {
        beforeEach(function() {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
        });

        it('should set userId immediately and update it after response received', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            done();
          }, LONG_TIMEOUT);
        });
      });
    });
  });

  describe('Fire Usersync Pixel', function() {
    let ajaxStub;
    let syncStub;

    before(function() {
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_FS_STORAGE_CONFIG);
      ID5.userId = undefined;
    });
    beforeEach(function () {
      syncStub = sinon.stub(utils, 'deferPixelFire').callsFake(function(url, initCallback, callback) {
        if (utils.isFn(initCallback)) {
          initCallback();
        };
        if (utils.isFn(callback)) {
          callback();
        }
      });
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      syncStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_FS_STORAGE_CONFIG);
      ID5.userId = undefined;
    });

    describe('Without Calling ID5', function () {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success('{}');
        });
      });

      it('should not fire sync pixel if ID5 is not called', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
      });
    });

    describe('With Cascade Needed', function () {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_CASCADE);
        });
      });

      it('should fire "call" sync pixel if ID5 is called and cascades_needed is true and no partnerUserId is provided', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
      });

      it('should fire "sync" sync pixel if ID5 is called and cascades_needed is true and partnerUserId is provided', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_SYNC_ENDPOINT);
        expect(syncStub.args[0][0]).to.contain('puid=abc123');
      });
    });

    describe('Without Cascade Needed', function () {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE);
        });
      });

      it('should not fire sync pixel if ID5 is called and cascades_needed is false', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.notCalled(syncStub);
      });
    });

    describe('Force Sync', function() {
      const AJAX_RESPONSE_MS = 10;
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          setTimeout(() => { callbacks.success(JSON_RESPONSE_CASCADE) }, AJAX_RESPONSE_MS);
        });
      });

      it('sends fs=1 for new user without partnerUserId then sets fs storage to 0', function (done) {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
          expect(syncStub.args[0][0]).to.contain('fs=1');
          expect(syncStub.args[0][0]).to.not.contain('puid=');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(0);

          done();
        }, AJAX_RESPONSE_MS);
      });
      it('sends fs=1 for new user with partnerUserId then sets fs storage to 0', function (done) {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_SYNC_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
          expect(syncStub.args[0][0]).to.contain('fs=1');
          expect(syncStub.args[0][0]).to.contain('puid=abc123');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(0);

          done();
        }, AJAX_RESPONSE_MS);
      });
      it('sends fs=0 for previously synced user', function (done) {
        utils.setInLocalStorage(TEST_FS_STORAGE_CONFIG, 0);

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
          expect(syncStub.args[0][0]).to.contain('fs=0');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(0);

          done();
        }, AJAX_RESPONSE_MS);
      });
    });
  });

  describe('Counters', function() {
    let ajaxStub;
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE);
      });
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_NB_STORAGE_CONFIG);
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_NB_STORAGE_CONFIG);
      ID5.userId = undefined;
    });

    it('should set counter to 1 if no existing counter cookie and not calling ID5 servers', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
    it('should increment counter when not calling ID5 servers if existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(6);
    });
    it('should not increment counter when not calling ID5 servers if no existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(5);
    });
    it('should reset counter to 0 after calling ID5 servers if ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(6);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });
    it('should reset counter to 0 after calling ID5 servers if ID in cookie without a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(1);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });
    it('should reset counter to 1 after calling ID5 servers if no ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
    it('should reset counter to 1 after calling ID5 servers if no ID in cookie without a previous counter', function () {
      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
  });
});
