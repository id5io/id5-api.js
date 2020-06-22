import { config } from 'src/config';
import * as utils from 'src/utils';

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
    });
    it('should have user-defined config and final config available', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });
      expect(ID5.userConfig.partnerId).to.be.equal(99);
      expect(ID5.userConfig.cookieName).to.be.undefined;
      expect(ID5.config.partnerId).to.be.equal(99);
      expect(ID5.config.cookieName).to.be.equal('id5.1st');
      expect(ID5.getConfig().cookieName).to.be.equal('id5.1st');
      expect(ID5.initialized).to.be.true;
    });
    it('should retrieve config with getConfig()', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });
      expect(ID5.getConfig).to.be.a('function');
      expect(ID5.getConfig().cookieName).to.be.equal('id5.1st');
      config.setConfig({ cookieName: 'testcookie' });
      expect(ID5.getConfig().cookieName).to.be.equal('testcookie');
    });
  });

  describe('Required parameters', function () {
    let ajaxStub;

    beforeEach(function () {
      ID5.userId = undefined;
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callback, data, options) {
        callback(jsonResponse);
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

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callback, data, options) {
          callback(jsonResponse);
        });
        syncStub = sinon.stub(ID5, 'fireId5SyncPixel');
        utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5.1st_nb', '', EXPIRED_COOKIE_DATE);
      });

      afterEach(function () {
        config.resetConfig();
        ajaxStub.restore();
        syncStub.restore();
        utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5.1st_nb', '', EXPIRED_COOKIE_DATE);
        ID5.userId = undefined;
      });

      it('Use non-expired cookie if available', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString())
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
        expect(ID5.userId).to.be.equal('testid5id');
      });

      it('Use non-expired cookie if available, without consent', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString())
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
        expect(ID5.userId).to.be.equal('testid5id');
      });

      it('Use non-expired legacy cookie if available, without consent', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString())
        utils.setCookie('id5.1st', JSON.stringify({'ID5ID': 'testid5id'}), expStr);
        utils.setCookie('id5.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
        expect(ID5.userId).to.be.equal('testid5id');
      });

      it('Call id5 servers via Ajax if consent but no cookie', function () {
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid.partner).to.be.equal(99);
        expect(ID5.userId).to.be.equal('testid5id');

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');
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
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5.1st_last', Date.now() - (8000 * 1000), expStr);
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

      it('Call id5 servers with existing value via Ajax if expired/missing "last" cookie', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id', 'signature': 'abc123'}), expStr);
        utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
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

      it('Call id5 servers with existing legacy value via Ajax', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5.1st', JSON.stringify({'ID5ID': 'testid5id'}), expStr);
        utils.setCookie('id5.1st_last', Date.now(), expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid['1puid']).to.be.equal('testid5id');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);

        expect(ID5.userId).to.be.equal('testid5id');
        expect(utils.getCookie('id5.1st')).to.be.eq(jsonResponse);

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');
      });

      it('Call id5 servers with existing legacy value via Ajax if expired cookie', function () {
        const expStr = (new Date(Date.now() + 5000).toUTCString());
        utils.setCookie('id5.1st', JSON.stringify({'ID5ID': 'testid5id'}), expStr);
        utils.setCookie('id5.1st_last', Date.now() - 8000 * 1000, expStr);
        ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
        expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

        const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(dataPrebid.s).to.be.equal('');
        expect(dataPrebid['1puid']).to.be.equal('testid5id');
        expect(dataPrebid.rf).to.include('http://localhost');
        expect(dataPrebid.top).to.be.equal(1);

        expect(ID5.userId).to.be.equal('testid5id');
        expect(utils.getCookie('id5.1st')).to.be.eq(jsonResponse);

        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.be.equal('https://id5-sync.com/i/99/8.gif?gdpr_consent=&gdpr=0');
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
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callback, data, options) {
          callback(jsonResponse);
        });
        syncStub = sinon.stub(ID5, 'fireId5SyncPixel');
      });

      afterEach(function () {
        config.resetConfig();
        ajaxStub.restore();
        syncStub.restore();
        utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
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
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callback, data, options) {
          setTimeout(() => { callback(jsonResponse) }, 100);
        });
        syncStub = sinon.stub(ID5, 'fireId5SyncPixel');
      });

      afterEach(function () {
        config.resetConfig();
        ajaxStub.restore();
        syncStub.restore();
        utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
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
        utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'uidFromCookie', 'signature': 'dummy'}), expStr);
        utils.setCookie('id5.1st_last', Date.now() - 8000 * 1000, expStr);
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
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callback, data, options) {
        callback(jsonResponse);
      });
      utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_nb', '', EXPIRED_COOKIE_DATE);
    });

    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_nb', '', EXPIRED_COOKIE_DATE);
      ID5.userId = undefined;
    });

    it('should set counter to 1 if no existing counter cookie and not calling ID5 servers', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now(), expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(1);
    });

    it('should increment counter when not calling ID5 servers if existing ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now(), expStr);
      utils.setCookie('id5.1st_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(6);
    });

    it('should not increment counter when not calling ID5 servers if no existing ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(5);
    });

    it('should reset counter to 0 after calling ID5 servers if ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(6);

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(0);
    });

    it('should reset counter to 1 after calling ID5 servers if no ID in cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(1);
    });

    it('should reset counter to 1 after calling ID5 servers if no ID in cookie', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(1);
    });
  });
});
