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
    const jsonResponse = JSON.stringify({'ID5ID': 'testid5id'});
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

      sinon.assert.calledOnce(ajaxStub);
      const url = ajaxStub.firstCall.args[0];
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      expect(url).to.be.equal('https://id5-sync.com/g/v1/99.json?1puid=&gdpr=0&gdpr_consent=');
      expect(ID5.userId).to.be.equal('testid5id');
    });

    it('Call id5 servers with existing value via Ajax if expired cookie', function () {
      const expStr = (new Date(Date.now() + 5000).toUTCString())
      utils.setCookie('id5.1st', JSON.stringify({'ID5ID': 'testid5id'}), expStr);
      utils.setCookie('id5.1st_last', Date.now() - 8000 * 1000, expStr);
      ID5.init({ partnerId: 99, cmpApi: 'iab', allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const url = ajaxStub.firstCall.args[0];
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;
      expect(url).to.be.equal('https://id5-sync.com/g/v1/99.json?1puid=testid5id&gdpr=0&gdpr_consent=');
      expect(ID5.userId).to.be.equal('testid5id');
    });
  });
});
