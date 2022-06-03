import sinon from 'sinon';
import * as utils from '../../lib/utils';
import ID5 from '../../lib/id5-api';
import {
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_PD_STORAGE_CONFIG,
  JSON_RESPONSE_ID5_CONSENT,
  ID5_LB_ENDPOINT,
  ID5_FETCH_ENDPOINT,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE,
  defaultInit,
  defaultInitBypassConsent,
  localStorage
} from './test_utils';

describe('Refresh ID Fetch Handling', function () {
  let ajaxStub;
  const TEST_REFRESH_RESPONSE_ID5ID = 'testrefreshresponseid5id';
  const TEST_REFRESH_RESPONSE_SIGNATURE = 'lmnopq';
  const TEST_REFRESH_RESPONSE_LINK_TYPE = 2;
  const REFRESH_JSON_RESPONSE = JSON.stringify({
    'universal_uid': TEST_REFRESH_RESPONSE_ID5ID,
    'cascade_needed': false,
    'signature': TEST_REFRESH_RESPONSE_SIGNATURE,
    'link_type': TEST_REFRESH_RESPONSE_LINK_TYPE
  });

  before(function () {
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_PD_STORAGE_CONFIG);
  });
  beforeEach(function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
      callbacks.success(JSON_RESPONSE_ID5_CONSENT);
    });
  });
  afterEach(function () {
    ajaxStub.restore();
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_PD_STORAGE_CONFIG);
  });

  describe('No Force Fetch', function () {
    let getIdSpy;

    beforeEach(function () {
      getIdSpy = sinon.spy(ID5, 'getId');
    });
    afterEach(function () {
      ID5.getId.restore();
    });

    it('should not call ID5 with no config changes', function () {
      const id5Status = ID5.init(defaultInitBypassConsent());
      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

      ajaxStub.restore();
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
        callbacks.success(REFRESH_JSON_RESPONSE);
      });

      ID5.refreshId(id5Status);
      sinon.assert.notCalled(ajaxStub);
      sinon.assert.calledTwice(getIdSpy);

      expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
      expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
      expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
    });

    it('should not call ID5 with config changes that do not require a refresh', function () {
      const id5Status = ID5.init({
        ...defaultInitBypassConsent(),
        refreshInSeconds: 50
      });
      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

      ajaxStub.restore();
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(REFRESH_JSON_RESPONSE);
      });

      ID5.refreshId(id5Status, false, { refreshInSeconds: 100 });
      sinon.assert.notCalled(ajaxStub);
      sinon.assert.calledTwice(getIdSpy);

      expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
      expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
      expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
    });

    it('should call ID5 with config changes that require a refresh', function () {
      const id5Status = ID5.init(defaultInitBypassConsent());
      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

      ajaxStub.restore();
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(REFRESH_JSON_RESPONSE);
      });

      ID5.refreshId(id5Status, false, { pd: 'abcdefg' });
      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      sinon.assert.calledTwice(getIdSpy);

      const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
      expect(requestData.pd).to.be.equal('abcdefg');

      expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
      expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
      expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(REFRESH_JSON_RESPONSE));
    });

    describe('Consent Checks TCF v2', function () {
      let testConsentDataFromCmp = {
        getTCData: {
          gdprApplies: true,
          tcString: 'cmpconsentstring',
          eventStatus: 'tcloaded',
          apiVersion: 2,
          purpose: {
            consents: {
              '1': true
            }
          }
        }
      };
      let cmpStub;

      before(function () {
        localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
      });
      beforeEach(function () {
        window.__tcfapi = function () {};
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
          args[2](testConsentDataFromCmp.getTCData, true);
        });
      });
      afterEach(function () {
        cmpStub.restore();
        delete window.__tcfapi;
        localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
      });

      it('should not call ID5 with no consent changes', function () {
        const id5Status = ID5.init(defaultInit());
        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(id5Status);
        sinon.assert.notCalled(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
      });

      it('should call ID5 when consent changes after init', function () {
        const id5Status = ID5.init(defaultInit());
        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        cmpStub.restore();
        delete window.__tcfapi;
        window.__tcfapi = function () {};
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
          args[2]({
            gdprApplies: true,
            tcString: 'NEWcmpconsentstring',
            eventStatus: 'tcloaded',
            apiVersion: 2,
            purpose: {
              consents: {
                '1': true
              }
            }
          }, true);
        });

        ID5.refreshId(id5Status);
        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        sinon.assert.calledTwice(getIdSpy);

        expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
        expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(REFRESH_JSON_RESPONSE));
      });
    });

    it('should call ID5 even when LB call fails', function () {
      ajaxStub.callsFake(function(url, callbacks, data, options) {
        if (url.includes(ID5_LB_ENDPOINT)) {
          callbacks.error('Failure happened')
        } else {
          callbacks.success(JSON_RESPONSE_ID5_CONSENT)
        }
      });
      const id5Status = ID5.init(defaultInitBypassConsent());
      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

      expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
    });

  });

  describe('Force Fetch', function () {
    let getIdSpy;

    beforeEach(function () {
      getIdSpy = sinon.spy(ID5, 'getId');
    });
    afterEach(function () {
      ID5.getId.restore();
    });

    it('should call ID5 with no other reason to refresh', function () {
      const id5Status = ID5.init(defaultInitBypassConsent());
      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

      ajaxStub.restore();
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(REFRESH_JSON_RESPONSE);
      });

      ID5.refreshId(id5Status, true);
      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      sinon.assert.calledTwice(getIdSpy);

      expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
      expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
      expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(REFRESH_JSON_RESPONSE));
    });
  });
});
