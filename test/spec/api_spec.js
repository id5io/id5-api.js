import { config } from 'src/config';
import * as utils from 'src/utils';
import { resetConsentData } from 'src/consentManagement';
import { LEGACY_COOKIE_NAMES } from 'src/id5-api.js';

require('src/id5-api.js');

// need to manually set version since the test process doesn't set it like gulp build does
ID5.version = 'TESTING';

let expect = require('chai').expect;

describe('ID5 Publisher API', function () {
  const TEST_ID5_PARTNER_ID = 99;
  const ID5_FETCH_ENDPOINT = `https://id5-sync.com/g/v2/${TEST_ID5_PARTNER_ID}.json`;
  const ID5_CALL_ENDPOINT = `https://id5-sync.com/i/${TEST_ID5_PARTNER_ID}/8.gif`;
  const ID5_SYNC_ENDPOINT = `https://id5-sync.com/s/${TEST_ID5_PARTNER_ID}/8.gif`;

  const TEST_ID5ID_STORAGE_CONFIG = {
    name: 'id5id',
    expiresDays: 90
  };
  const TEST_LAST_STORAGE_CONFIG = {
    name: 'id5id_last',
    expiresDays: 90
  };
  const TEST_LAST_EXPIRED_STORAGE_CONFIG = {
    name: 'id5id_last',
    expiresDays: -5
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

  describe('Core API availability', function () {
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
    it('should have user-defined config and final config available', function () {
      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: false });
      expect(ID5.userConfig.partnerId).to.be.equal(TEST_ID5_PARTNER_ID);
      expect(ID5.userConfig.pd).to.be.undefined;
      expect(ID5.config.partnerId).to.be.equal(TEST_ID5_PARTNER_ID);
      expect(ID5.config.pd).to.be.equal('');
      expect(ID5.getConfig().pd).to.be.equal('');
      expect(ID5.initialized).to.be.true;
    });
    it('should retrieve current config with getConfig()', function () {
      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: false });
      expect(ID5.getConfig).to.be.a('function');
      expect(ID5.getConfig().pd).to.be.equal('');
      config.setConfig({ pd: 'testpd' });
      expect(ID5.getConfig().pd).to.be.equal('testpd');
    });
  });

  describe('Required parameters', function () {
    let ajaxStub;

    beforeEach(function () {
      ID5.userId = undefined;
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(jsonResponse);
      });
    });

    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
    });

    it('should fail if partnerId not set in config', function() {
      try {
        ID5.init({ cmpApi: 'iab', allowID5WithoutConsentApi: true });
      } catch (e) { }

      sinon.assert.notCalled(ajaxStub);
      expect(ID5.userId).to.be.equal(undefined);
    });

    it('should fail if ID5.version is not set', function () {
      let version;
      try {
        version = ID5.version;
        ID5.version = undefined;

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });
      } catch (e) { }

      sinon.assert.notCalled(ajaxStub);
      expect(ID5.userId).to.be.equal(undefined);
      ID5.version = version;
    });
  });

  describe('ID5.init', function () {
    describe('With Cascade:', function () {
      const jsonResponse = JSON.stringify({
        'universal_uid': 'testid5id',
        'cascade_needed': true,
        'signature': 'abcdef',
        'link_type': 0
      });
      let ajaxStub;
      let syncStub;
      let callbackStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(jsonResponse);
        });
        syncStub = sinon.stub(utils, 'deferPixelFire');
        utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_NB_STORAGE_CONFIG);
        callbackStub = sinon.spy();
      });

      afterEach(function () {
        config.resetConfig();
        ajaxStub.restore();
        syncStub.restore();
        utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_NB_STORAGE_CONFIG);
        ID5.userId = undefined;
      });

      it('Use no local storage without consent, callback watchdog should be used', function (done) {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: false, callback: callbackStub, callbackTimeoutInMs: 100 });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
        expect(ID5.userId).to.be.undefined;

        setTimeout(() => {
          sinon.assert.notCalled(callbackStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackStub);
            done();
          }, 100);
        }, 100);
      });

      it('Use non-expired stored value if available and refresh not needed', function (done) {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, callback: callbackStub, refreshInSeconds: 10000 });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);

        expect(ID5.userId).to.be.equal('testid5id');

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Use non-expired stored value if available, even without consent', function (done) {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: false, callback: callbackStub, refreshInSeconds: 10000 });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
        expect(ID5.userId).to.be.equal('testid5id');

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Call id5 servers via Ajax if consent but no stored value', function (done) {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, callback: callbackStub });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.partner).to.be.equal(TEST_ID5_PARTNER_ID);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Call id5 servers via Ajax if consent but no stored value and sync with supplied userId', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal(`https://id5-sync.com/g/v2/${TEST_ID5_PARTNER_ID}.json?gdpr_consent=&gdpr=0`);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.partner).to.be.equal(TEST_ID5_PARTNER_ID);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_SYNC_ENDPOINT);
        expect(syncStub.args[0][0]).to.contain('puid=abc123');
      });

      it('Call id5 servers with existing value via Ajax if refresh needed', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('abc123');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
      });

      it('Call id5 servers with existing value via Ajax if expired/missing "last" stored value', function (done) {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_EXPIRED_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, callback: callbackStub });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('abc123');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Call id5 servers with valid tpids', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_EXPIRED_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        const testTpid = [
          {
            partnerId: 123,
            uid: 'ABC'
          }
        ];

        ID5.init({
          partnerId: TEST_ID5_PARTNER_ID,
          cmpApi: 'iab',
          allowID5WithoutConsentApi: true,
          tpids: testTpid
        });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.tpids).to.be.eql(testTpid);
      });

      it('Do not include tpids if an object', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_EXPIRED_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        const testTpid = { a: 1 };

        ID5.init({
          partnerId: TEST_ID5_PARTNER_ID,
          cmpApi: 'iab',
          allowID5WithoutConsentApi: true,
          tpids: testTpid
        });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.tpids).to.be.equal(undefined);
      });

      it('Do not include tpids if an empty array', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_EXPIRED_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        const testTpid = [];

        ID5.init({
          partnerId: TEST_ID5_PARTNER_ID,
          cmpApi: 'iab',
          allowID5WithoutConsentApi: true,
          tpids: testTpid
        });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.tpids).to.be.equal(undefined);
      });

      it('Do not include tpids if a string', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_EXPIRED_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        const testTpid = 'string';

        ID5.init({
          partnerId: TEST_ID5_PARTNER_ID,
          cmpApi: 'iab',
          allowID5WithoutConsentApi: true,
          tpids: testTpid
        });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.tpids).to.be.equal(undefined);
      });

      it('Do not include tpids if not set', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
        utils.setInLocalStorage(TEST_LAST_EXPIRED_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.tpids).to.be.equal(undefined);
      });

      describe('Handle legacy cookies', function() {
        it('Call id5 servers without existing legacy value in 1puid params via Ajax', function () {
          const expStr = (new Date(Date.now() + 5000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'ID5ID': 'legacyid5id'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now(), expStr);
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.s).to.be.equal('');
          expect(typeof dataPrebid['1puid']).to.be.equal('undefined');
          expect(dataPrebid.rf).to.include('http://localhost');
          expect(dataPrebid.top).to.be.equal(1);

          expect(ID5.userId).to.be.equal('testid5id');
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(jsonResponse);

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
        });

        it('calls id5 servers with existing value from legacy cookie id5.1st storage if local storage is empty', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), (new Date(Date.now() + 25000).toUTCString()));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.s).to.be.equal('legacycookiesignature');
          expect(dataPrebid.rf).to.include('http://localhost');
          expect(dataPrebid.top).to.be.equal(1);

          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
        });

        it('calls id5 servers with existing value from legacy cookie id5id.1st storage if local storage is empty', function () {
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), (new Date(Date.now() + 25000).toUTCString()));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.s).to.be.equal('legacycookiesignature');
          expect(dataPrebid.rf).to.include('http://localhost');
          expect(dataPrebid.top).to.be.equal(1);

          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
        });

        it('calls id5 servers with existing value from legacy cookie id5id.1st storage if local storage is empty and both legacy cookies exist', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), (new Date(Date.now() + 25000).toUTCString()));
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), (new Date(Date.now() + 25000).toUTCString()));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.s).to.be.equal('legacycookiesignature');
          expect(dataPrebid.rf).to.include('http://localhost');
          expect(dataPrebid.top).to.be.equal(1);

          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
        });

        it('removes legacy cookies', function () {
          const expStr = (new Date(Date.now() + 5000).toUTCString());
          LEGACY_COOKIE_NAMES.forEach(function(cookie) {
            utils.setCookie(`${cookie}`, JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStr);
            utils.setCookie(`${cookie}_nb`, 1, expStr);
            utils.setCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`, 2, expStr);
            utils.setCookie(`${cookie}_last`, Date.now() - (8000 * 1000), expStr);
            utils.setCookie(`${cookie}.cached_pd`, 'abc', expStr);
            utils.setCookie(`${cookie}.cached_consent_data`, 'xyz', expStr);
          });

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          expect(ID5.userId).to.be.equal('testid5id');
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(jsonResponse);

          LEGACY_COOKIE_NAMES.forEach(function(cookie) {
            expect(utils.getCookie(`${cookie}`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}_nb`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}_last`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}.cached_pd`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}.cached_consent_data`)).to.be.equal(null);
          });
        });
      });

      describe('Consent changes determine call to ID5 servers', function() {
        beforeEach(function() {
          utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
        });
        after(function() {
          utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
        });

        it('does not call id5 servers if no stored consent data and refresh is not needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.notCalled(ajaxStub);
        });

        it('calls id5 servers if no stored consent data but refresh is needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (100 * 1000));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
        });

        describe('TCF v1', function() {
          let testConsentData = {
            gdprApplies: true,
            consentData: 'xyz',
            apiVersion: 1
          };
          let cmpStub;

          beforeEach(function() {
            window.__cmp = function() {};
            cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
              args[2](testConsentData);
            });
          });

          afterEach(function() {
            cmpStub.restore();
            delete window.__cmp;
            resetConsentData();
          });

          it('calls id5 servers if empty stored consent data and refresh not needed', function () {
            utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
            utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

            ID5.setStoredConsentData();

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('calls id5 servers if stored consent data does not match current consent and refresh not needed', function () {
            utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
            utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'abc',
              apiVersion: 1
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('does not call id5 servers if stored consent data matches current consent and refresh not needed', function () {
            utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
            utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'xyz',
              apiVersion: 1
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.notCalled(ajaxStub);
          });
        });

        describe('TCF v2', function() {
          let testConsentData = {
            getTCData: {
              gdprApplies: true,
              tcString: 'abc',
              eventStatus: 'tcloaded',
              apiVersion: 2
            }
          };
          let cmpStub;

          beforeEach(function() {
            window.__tcfapi = function() {};
            cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
              args[2](testConsentData.getTCData, true);
            });
          });

          afterEach(function() {
            cmpStub.restore();
            delete window.__tcfapi;
            resetConsentData();
          });

          it('calls id5 servers if empty stored consent data and refresh not needed', function () {
            utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
            utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

            ID5.setStoredConsentData();

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('calls id5 servers if stored consent data does not match current consent and refresh not needed', function () {
            utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
            utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'xyz',
              apiVersion: 2
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('does not call id5 servers if stored consent data matches current consent and refresh not needed', function () {
            utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
            utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'abc',
              apiVersion: 2
            });

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.notCalled(ajaxStub);
          });
        });
      });

      describe('PD changes determine call to ID5 servers', function() {
        beforeEach(function() {
          utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
        });
        after(function() {
          utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
        });

        it('does not call id5 servers if no stored pd and refresh is not needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.notCalled(ajaxStub);
        });

        it('calls id5 servers if no stored pd but refresh is needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (100 * 1000));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('calls id5 servers if empty stored pd and refresh not needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

          ID5.setStoredPd();

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('calls id5 servers if stored pd does not match current pd and refresh not needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

          ID5.setStoredPd('abcdefg');

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('does not call id5 servers if stored pd matches current pd and refresh not needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}));
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (1 * 1000));

          ID5.setStoredPd('xyz789');

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.notCalled(ajaxStub);
        });
      });
    });

    describe('Without Cascade:', function () {
      const jsonResponse = JSON.stringify({
        'universal_uid': 'testid5id',
        'cascade_needed': false,
        'signature': 'abcdef',
        'link_type': 0
      });
      let ajaxStub;
      let syncStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(jsonResponse);
        });
        syncStub = sinon.stub(utils, 'deferPixelFire');
      });

      afterEach(function () {
        config.resetConfig();
        ajaxStub.restore();
        syncStub.restore();
        utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
        ID5.userId = undefined;
      });

      it('Call id5 servers via Ajax if consent but no stored value', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.notCalled(syncStub);
      });

      it('Call id5 servers via Ajax with pd if pd config is set and if consent but no stored value', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, pd: 'testpubdata' });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.pd).to.be.equal('testpubdata');
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.notCalled(syncStub);
      });

      it('Call id5 servers via Ajax with empty pd if pd config not set and if consent but no stored value', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, pd: undefined });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.pd).to.be.equal('');
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.notCalled(syncStub);
      });
    });

    describe('Async With Cascade:', function () {
      const jsonResponse = JSON.stringify({
        'universal_uid': 'testid5id',
        'cascade_needed': true,
        'signature': 'abcdef',
        'link_type': 0
      });
      let ajaxStub;
      let syncStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          setTimeout(() => { callbacks.success(jsonResponse) }, 100);
        });
        syncStub = sinon.stub(utils, 'deferPixelFire');
      });

      afterEach(function () {
        config.resetConfig();
        ajaxStub.restore();
        syncStub.restore();
        utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
        ID5.userId = undefined;
      });

      it('Call id5 servers via Ajax if consent but no stored value', function (done) {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, partnerUserId: 'partnerUid', cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(ID5.userId).to.be.undefined;

        setTimeout(() => {
          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_SYNC_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain('puid=partnerUid');

          done();
        }, 200);
      });

      it('Call id5 servers with existing value via Ajax if expired stored value and return another value', function (done) {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'uidFromCache', 'signature': 'dummy'}));
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true, refreshInSeconds: 5 });

        sinon.assert.calledOnce(ajaxStub);
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        expect(dataPrebid.s).to.be.equal('dummy');
        expect(ID5.userId).to.be.equal('uidFromCache');

        setTimeout(() => {
          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);

          done();
        }, 200);
      });
    });

    describe('Handle Force Sync', function() {
      const jsonResponse = JSON.stringify({
        'universal_uid': 'testid5id',
        'cascade_needed': true,
        'signature': 'abcdef',
        'link_type': 0
      });
      let ajaxStub;
      let syncStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          setTimeout(() => { callbacks.success(jsonResponse) }, 100);
        });
        syncStub = sinon.stub(utils, 'deferPixelFire').callsFake(function(url, initCallback, callback) {
          if (utils.isFn(initCallback)) {
            initCallback();
          };
          if (utils.isFn(callback)) {
            callback();
          }
        });
        utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
        utils.removeFromLocalStorage(TEST_FS_STORAGE_CONFIG);
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

      it('sends fs=1 for new user without partnerUserId then sets fs storage to 0', function (done) {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain('id5id=testid5id');
          expect(syncStub.args[0][0]).to.contain('fs=1');
          expect(syncStub.args[0][0]).to.not.contain('puid=');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(0);

          done();
        }, 200);
      });

      it('sends fs=1 for new user with partnerUserId then sets fs storage to 0', function (done) {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_SYNC_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain('id5id=testid5id');
          expect(syncStub.args[0][0]).to.contain('fs=1');
          expect(syncStub.args[0][0]).to.contain('puid=abc123');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(0);

          done();
        }, 200);
      });

      it('sends fs=0 for previously synced user', function (done) {
        utils.setInLocalStorage(TEST_FS_STORAGE_CONFIG, 0);

        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain('id5id=testid5id');
          expect(syncStub.args[0][0]).to.contain('fs=0');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(0);

          done();
        }, 200);
      });
    });
  });

  describe('Counters', function() {
    const jsonResponse = JSON.stringify({
      'universal_uid': 'testid5id',
      'cascade_needed': false,
      'signature': 'abcdef',
      'link_type': 0
    });
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(jsonResponse);
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
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id'}));
      utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });

    it('should increment counter when not calling ID5 servers if existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id'}));
      utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(6);
    });

    it('should not increment counter when not calling ID5 servers if no existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(5);
    });

    it('should reset counter to 0 after calling ID5 servers if ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id'}));
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(6);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });

    it('should reset counter to 0 after calling ID5 servers if ID in cookie without a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, JSON.stringify({'universal_uid': 'testid5id'}));

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(1);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });

    it('should reset counter to 1 after calling ID5 servers if no ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });

    it('should reset counter to 1 after calling ID5 servers if no ID in cookie without a previous counter', function () {
      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
  });
});
