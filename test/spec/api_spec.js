import { config } from 'src/config';
import * as utils from 'src/utils';

require('src/id5-api');

let expect = require('chai').expect;
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

describe('Publisher API', function () {
  describe('Core API availability', function () {
    it('should have a global variable ID5', function () {
      expect(ID5).to.be.an('object');
    });
    it('should have function ID5.init', function () {
      expect(ID5.init).to.be.a('function');
    });
    it('should be loaded', function () {
      expect(ID5.loaded).to.be.a('boolean');
      expect(ID5.loaded).to.be.true;
    });
  });

  describe('ID5.init:', function () {
    const jsonResponse = JSON.stringify({'ID5ID': 'testid5id', 'CASCADE_NEEDED': true});
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

    it('Use non-expired cookie if available', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'ID5ID': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now(), expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.notCalled(ajaxStub);
      expect(ID5.userId).to.be.equal('testid5id');
    });

    it('Call id5 servers via Ajax if no cookie and consent', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v1/99.json');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      const dataPrebid = ajaxStub.firstCall.args[2];
      expect(dataPrebid['1puid']).to.be.equal('');
      expect(ID5.userId).to.be.equal('testid5id');
    });

    it('Call id5 servers with existing value via Ajax if expired cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString());
      utils.setCookie('id5.1st', JSON.stringify({'ID5ID': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now() - 8000 * 1000, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v1/99.json');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      const dataPrebid = ajaxStub.firstCall.args[2];
      expect(dataPrebid['1puid']).to.be.equal('testid5id');
      expect(dataPrebid['rf']).to.include('http://localhost:9876/');
      expect(dataPrebid['top']).to.be.equal(1);
      expect(ajaxStub.secondCall.args[0]).to.be.equal('https://id5-sync.com/i/99/8.gif');
      expect(ajaxStub.secondCall.args[3].withCredentials).to.be.true;
      const dataSync = ajaxStub.secondCall.args[2];
      expect(dataSync['puid']).to.be.undefined;

      expect(ID5.userId).to.be.equal('testid5id');
    });
  });
  describe('ID5.init without cascade:', function () {
    const jsonResponse = JSON.stringify({'ID5ID': 'testid5id', 'CASCADE_NEEDED': false});
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

    it('Call id5 servers via Ajax if no cookie and consent', function () {
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v1/99.json');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      const dataPrebid = ajaxStub.firstCall.args[2];
      expect(dataPrebid['1puid']).to.be.equal('');
      expect(ID5.userId).to.be.equal('testid5id');
    });
  });
  describe('ID5.init async with cascade:', function () {
    const jsonResponse = JSON.stringify({'ID5ID': 'testid5id', 'CASCADE_NEEDED': true});
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

    it('Call id5 servers via Ajax if no cookie and consent', function (done) {
      ID5.init({ partnerId: 99, partnerUserId: 'partnerUid', cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v1/99.json');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      const dataPrebid = ajaxStub.firstCall.args[2];
      expect(dataPrebid['1puid']).to.be.equal('');

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
      utils.setCookie('id5.1st', JSON.stringify({'ID5ID': 'dummy'}), expStr);
      utils.setCookie('id5.1st_last', Date.now() - 8000 * 1000, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const dataPrebid = ajaxStub.firstCall.args[2];
      expect(ajaxStub.firstCall.args[0]).to.be.equal('https://id5-sync.com/g/v1/99.json');
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      expect(dataPrebid['1puid']).to.be.equal('dummy');
      expect(ID5.userId).to.be.equal('dummy');
      setTimeout(() => {
        expect(ID5.userId).to.be.equal('testid5id');
        done();
      }, 200);
    });
  });
});
