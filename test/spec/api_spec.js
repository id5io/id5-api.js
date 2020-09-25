import { config } from 'src/config';
import * as utils from 'src/utils';
import { resetConsentData } from 'src/consentManagement';

require('src/id5-api.js');

// need to manually set version since the test process doesn't set it like gulp build does
ID5.version = 'TESTING';

let expect = require('chai').expect;

describe('ID5 Publisher API', function () {
  const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

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
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });
      expect(ID5.userConfig.partnerId).to.be.equal(99);
      expect(ID5.userConfig.cookieName).to.be.undefined;
      expect(ID5.config.partnerId).to.be.equal(99);
      expect(ID5.config.cookieName).to.be.equal('id5id.1st');
      expect(ID5.getConfig().cookieName).to.be.equal('id5id.1st');
      expect(ID5.initialized).to.be.true;
    });
    it('should retrieve config with getConfig()', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });
      expect(ID5.getConfig).to.be.a('function');
      expect(ID5.getConfig().cookieName).to.be.equal('id5id.1st');
      config.setConfig({ cookieName: 'testcookie' });
      expect(ID5.getConfig().cookieName).to.be.equal('testcookie');
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

        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });
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
        utils.setCookie('id5id.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id.1st_last', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id.1st_99_nb', '', EXPIRED_COOKIE_DATE);
        callbackStub = sinon.spy();
      });

      afterEach(function () {
        config.resetConfig();
        ajaxStub.restore();
        syncStub.restore();
        utils.setCookie('id5id.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id.1st_last', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id.1st_99_nb', '', EXPIRED_COOKIE_DATE);
        ID5.userId = undefined;
      });

      it('Use no cookie, without consent, nothing, callback watchdog should be used', function (done) {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false, callback: callbackStub, callbackTimeoutInMs: 100 });

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

      it('Use non-expired cookie if available', function (done) {
        const expStr = (new Date(Date.now() + 5000).toUTCString())
        utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5id.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true, callback: callbackStub });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);

        expect(ID5.userId).to.be.equal('testid5id');

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Use non-expired cookie if available, without consent', function (done) {
        const expStr = (new Date(Date.now() + 5000).toUTCString())
        utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5id.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false, callback: callbackStub });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
        expect(ID5.userId).to.be.equal('testid5id');

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Ignore non-expired legacy cookie if available, with consent', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString())
        utils.setCookie('id5id.1st', JSON.stringify({'ID5ID': 'legacyid5id'}), expStr);
        utils.setCookie('id5id.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledOnce(syncStub);
        expect(ID5.userId).to.be.equal('testid5id');
      });

      it('Call id5 servers via Ajax if consent but no cookie', function (done) {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true, callback: callbackStub });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.partner).to.be.equal(99);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Call id5 servers via Ajax if consent but no cookie and sync with supplied userId', function () {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.partner).to.be.equal(99);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/s/99/8.gif?puid=abc123&gdpr_consent=&gdpr=0');
      });

      it('Call id5 servers with existing value via Ajax if refresh needed', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5id.1st_last', Date.now() - (8000 * 1000), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('abc123');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');
      });

      it('removes legacy cookies when new cookie name is used', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStr);
        utils.setCookie('id5.1st_last', Date.now() - (8000 * 1000), expStr);
        utils.setCookie('id5.1st_nb', '10', expStr);

        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.s).to.be.equal('');
        expect(requestData.nb).to.be.equal(undefined);

        expect(ID5.userId).to.be.equal('testid5id');

        expect(utils.getCookie('id5.1st')).to.be.equal(null);
        expect(utils.getCookie('id5.1st_last')).to.be.equal(null);
        expect(utils.getCookie('id5.1st_last_nb')).to.be.equal(null);

        expect(utils.getCookie('id5id.1st')).to.be.eq(jsonResponse);
      });

      it('Call id5 servers with existing value via Ajax if expired/missing "last" cookie', function (done) {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5id.1st_last', '', EXPIRED_COOKIE_DATE);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true, callback: callbackStub });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('abc123');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');

        setTimeout(() => {
          sinon.assert.calledOnce(callbackStub);
          done();
        }, 10);
      });

      it('Call id5 servers without existing legacy value via Ajax', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5id.1st', JSON.stringify({'ID5ID': 'legacyid5id'}), expStr);
        utils.setCookie('id5id.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(typeof dataPrebid['1puid']).to.be.equal('undefined');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);

        expect(ID5.userId).to.be.equal('testid5id');
        expect(utils.getCookie('id5id.1st')).to.be.eq(jsonResponse);

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');
      });

      it('Call id5 servers without existing legacy value via Ajax if expired cookie', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5id.1st', JSON.stringify({'ID5ID': 'legacyid5id'}), expStr);
        utils.setCookie('id5id.1st_last', Date.now() - 8000 * 1000, expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(typeof dataPrebid['1puid']).to.be.equal('undefined');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);

        expect(ID5.userId).to.be.equal('testid5id');
        expect(utils.getCookie('id5id.1st')).to.be.eq(jsonResponse);

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');
      });

      describe('Consent changes determine call to ID5 servers', function() {
        beforeEach(function() {
          utils.setCookie('id5id.cached_consent_data', '', EXPIRED_COOKIE_DATE);
        });
        after(function() {
          utils.setCookie('id5id.cached_consent_data', '', EXPIRED_COOKIE_DATE);
        });

        it('does not call id5 servers if no stored consent data and refresh is not needed', function () {
          const expStr = (new Date(Date.now() + 25000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

          ID5.init({ partnerId: 99, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.notCalled(ajaxStub);
        });

        it('calls id5 servers if no stored consent data but refresh is needed', function () {
          const expStr = (new Date(Date.now() + 25000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now() - (100 * 1000), expStr);

          ID5.init({ partnerId: 99, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

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
            const expStr = (new Date(Date.now() + 5000).toUTCString());
            utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
            utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

            ID5.setStoredConsentData();

            ID5.init({ partnerId: 99, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('calls id5 servers if stored consent data does not match current consent and refresh not needed', function () {
            const expStr = (new Date(Date.now() + 5000).toUTCString());
            utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
            utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'abc',
              apiVersion: 1
            });

            ID5.init({ partnerId: 99, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('does not call id5 servers if stored consent data matches current consent and refresh not needed', function () {
            const expStr = (new Date(Date.now() + 5000).toUTCString());
            utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
            utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

            ID5.setStoredConsentData({
              gdprApplies: true,
              consentString: 'xyz',
              apiVersion: 1
            });

            ID5.init({ partnerId: 99, refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: false });

            sinon.assert.notCalled(ajaxStub);
          });
        });
      });

      describe('PD changes determine call to ID5 servers', function() {
        beforeEach(function() {
          utils.setCookie('id5id.cached_pd', '', EXPIRED_COOKIE_DATE);
        });
        after(function() {
          utils.setCookie('id5id.cached_pd', '', EXPIRED_COOKIE_DATE);
        });

        it('does not call id5 servers if no stored pd and refresh is not needed', function () {
          const expStr = (new Date(Date.now() + 25000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

          ID5.init({ partnerId: 99, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.notCalled(ajaxStub);
        });

        it('calls id5 servers if no stored pd but refresh is needed', function () {
          const expStr = (new Date(Date.now() + 25000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now() - (100 * 1000), expStr);

          ID5.init({ partnerId: 99, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('calls id5 servers if empty stored pd and refresh not needed', function () {
          const expStr = (new Date(Date.now() + 5000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

          ID5.setStoredPd();

          ID5.init({ partnerId: 99, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('calls id5 servers if stored pd does not match current pd and refresh not needed', function () {
          const expStr = (new Date(Date.now() + 5000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

          ID5.setStoredPd('abcdefg');

          ID5.init({ partnerId: 99, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
        });

        it('does not call id5 servers if stored pd matches current pd and refresh not needed', function () {
          const expStr = (new Date(Date.now() + 5000).toUTCString());
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
          utils.setCookie('id5id.1st_last', Date.now() - (1 * 1000), expStr);

          ID5.setStoredPd('xyz789');

          ID5.init({ partnerId: 99, pd: 'xyz789', refreshInSeconds: 30, cmpApi: 'iab', allowID5WithoutConsentApi: true });

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
        utils.setCookie('id5id.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id.1st_last', '', EXPIRED_COOKIE_DATE);
        ID5.userId = undefined;
      });

      it('Call id5 servers via Ajax if consent but no cookie', function () {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.notCalled(syncStub);
      });

      it('Call id5 servers via Ajax with pd if pd config is set and if consent but no cookie', function () {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true, pd: 'testpubdata' });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.pd).to.be.equal('testpubdata');
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.notCalled(syncStub);
      });

      it('Call id5 servers via Ajax with empty pd if pd config not set and if consent but no cookie', function () {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true, pd: undefined });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
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
        utils.setCookie('id5id.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id.1st_last', '', EXPIRED_COOKIE_DATE);
        ID5.userId = undefined;
      });

      it('Call id5 servers via Ajax if consent but no cookie', function (done) {
        ID5.init({ partnerId: 99, partnerUserId: 'partnerUid', cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(ID5.userId).to.be.undefined;

        setTimeout(() => {
          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/s/99/8.gif?puid=partnerUid&gdpr_consent=&gdpr=0');

          done();
        }, 200);
      });

      it('Call id5 servers with existing value via Ajax if expired cookie and return another value', function (done) {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'uidFromCookie', 'signature': 'dummy'}), expStr);
        utils.setCookie('id5id.1st_last', Date.now() - 8000 * 1000, expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        expect(dataPrebid.s).to.be.equal('dummy');
        expect(ID5.userId).to.be.equal('uidFromCookie');

        setTimeout(() => {
          expect(ID5.userId).to.be.equal('testid5id');

          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');

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
      utils.setCookie('id5id.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5id.1st_last', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5id.1st_99_nb', '', EXPIRED_COOKIE_DATE);
    });

    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.setCookie('id5id.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5id.1st_last', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5id.1st_99_nb', '', EXPIRED_COOKIE_DATE);
      ID5.userId = undefined;
    });

    it('should set counter to 1 if no existing counter cookie and not calling ID5 servers', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5id.1st_last', Date.now(), expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getCookie('id5id.1st_99_nb'));
      expect(nb).to.be.equal(1);
    });

    it('should increment counter when not calling ID5 servers if existing ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5id.1st_last', Date.now(), expStr);
      utils.setCookie('id5id.1st_99_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getCookie('id5id.1st_99_nb'));
      expect(nb).to.be.equal(6);
    });

    it('should not increment counter when not calling ID5 servers if no existing ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5id.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5id.1st_99_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getCookie('id5id.1st_99_nb'));
      expect(nb).to.be.equal(5);
    });

    it('should reset counter to 0 after calling ID5 servers if ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5id.1st_99_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(6);

      const nb = parseInt(utils.getCookie('id5id.1st_99_nb'));
      expect(nb).to.be.equal(0);
    });

    it('should reset counter to 1 after calling ID5 servers if no ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5id.1st_99_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(utils.getCookie('id5id.1st_99_nb'));
      expect(nb).to.be.equal(1);
    });

    it('should reset counter to 1 after calling ID5 servers if no ID in cookie', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(utils.getCookie('id5id.1st_99_nb'));
      expect(nb).to.be.equal(1);
    });
  });
});
