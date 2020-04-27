import { config } from 'src/config';
import * as utils from 'src/utils';

require('src/id5-api');

let expect = require('chai').expect;
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

describe('Publisher API', function () {
  describe('Core API availability', function () {
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

    it('Should have user-defined config and final config available', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });
      expect(ID5.userConfig.partnerId).to.be.equal(99);
      expect(ID5.userConfig.cookieName).to.be.undefined;
      expect(ID5.config.partnerId).to.be.equal(99);
      expect(ID5.config.cookieName).to.be.equal('id5.1st');
      expect(ID5.initialized).to.be.true;
      config.resetConfig();
    });
  });

  describe('ID5.init:', function () {
    const jsonResponse = JSON.stringify({
      'universal_uid': 'testid5id',
      'cascade_needed': true,
      'signature': 'abcdef',
      'link_type': 0
    });
    let ajaxStub;
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callback, data, options) {
        callback(jsonResponse);
      });
    });

    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_nb', '', EXPIRED_COOKIE_DATE);
      ID5.userId = undefined;
    });

    it('Use non-expired cookie if available, even without consent', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now(), expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);
      expect(ID5.userId).to.be.equal('testid5id');
    });

    it('Counter should be set to 1 if no existing counter cookie and not calling ID5 servers', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now(), expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(1);
    });

    it('Increment counter when not calling ID5 servers', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now(), expStr);
      utils.setCookie('id5.1st_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: false });

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(6);
    });

    it('Call id5 servers via Ajax if consent but no cookie', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledTwice(ajaxStub); // 2nd call is the usersync pixel
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(dataPrebid.s).to.be.equal('');
      expect(ID5.userId).to.be.equal('testid5id');
    });

    it('Reset counter after calling ID5 servers', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st_nb', 5, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      const nb = parseInt(utils.getCookie('id5.1st_nb'));
      expect(nb).to.be.equal(0);
    });

    it('Call id5 servers with existing value via Ajax if expired cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString());
      utils.setCookie('id5.1st', JSON.stringify({'signature': 'abcdef'}), expStr);
      utils.setCookie('id5.1st_last', Date.now() - 8000 * 1000, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledTwice(ajaxStub); // 2nd call is usersync pixel
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(dataPrebid.s).to.be.equal('abcdef');
      expect(dataPrebid.rf).to.include('http://localhost:9876/');
      expect(dataPrebid.top).to.be.equal(1);

      expect(ajaxStub.secondCall.args[0]).to.be.equal('https://id5-sync.com/i/99/8.gif');
      expect(ajaxStub.secondCall.args[3].withCredentials).to.be.true;
      const dataSync = ajaxStub.secondCall.args[2];
      expect(dataSync.puid).to.be.null;

      expect(ID5.userId).to.be.equal('testid5id');
    });
  });

  describe('ID5.init without cascade:', function () {
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
    });

    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.setCookie('id5.1st', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('id5.1st_last', '', EXPIRED_COOKIE_DATE);
      ID5.userId = undefined;
    });

    it('Call id5 servers via Ajax if consent but no cookie', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub); // no 2nd call for usersync
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v2/99.json?gdpr_consent=&gdpr=0');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(dataPrebid.s).to.be.equal('');
      expect(ID5.userId).to.be.equal('testid5id');
    });
  });

  describe('ID5.init async with cascade:', function () {
    const jsonResponse = JSON.stringify({
      'universal_uid': 'testid5id',
      'cascade_needed': true,
      'signature': 'abcdef',
      'link_type': 0
    });
    let ajaxStub;
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callback, data, options) {
        setTimeout(() => { callback(jsonResponse) }, 100);
      });
    });

    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
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
        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.secondCall.args[0]).to.be.equal('https://id5-sync.com/s/99/8.gif');
        expect(ajaxStub.secondCall.args[3].withCredentials).to.be.true;
        const dataSync = ajaxStub.secondCall.args[2];
        expect(dataSync['puid']).to.be.equal('partnerUid');
        expect(ID5.userId).to.be.equal('testid5id');
        done();
      }, 200);
    });
    it('Call id5 servers with existing value via Ajax if expired cookie and return another value', function () {
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
        done();
      }, 200);
    });
  });
});
