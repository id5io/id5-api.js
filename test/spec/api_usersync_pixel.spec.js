import sinon from 'sinon';
import ID5 from '../../lib/id5-api';
import * as utils from '../../lib/utils';
import {
  ID5_CALL_ENDPOINT,
  ID5_FETCH_ENDPOINT,
  ID5_LB_ENDPOINT,
  ID5_SYNC_ENDPOINT,
  JSON_RESPONSE_CASCADE,
  JSON_RESPONSE_ID5_CONSENT,
  localStorage,
  STORED_JSON,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_RESPONSE_ID5ID,
  defaultInitBypassConsent
} from './test_utils';

describe('Fire Usersync Pixel', function () {
  let ajaxStub;
  let syncStub;

  before(function () {
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
  });

  beforeEach(function () {
    syncStub = sinon.stub(utils, 'deferPixelFire').callsFake(function(url, initCallback, callback) {
      if (utils.isFn(initCallback)) {
        initCallback();
      }
      if (utils.isFn(callback)) {
        callback();
      }
    });
  });

  afterEach(function () {
    ajaxStub.restore();
    syncStub.restore();
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
  });

  describe('Without Calling ID5', function () {
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success('{}');
      });
    });

    it('should not fire sync pixel if ID5 is not called', function () {
      localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

      ID5.init(defaultInitBypassConsent());

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
      ID5.init(defaultInitBypassConsent());

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      sinon.assert.calledOnce(syncStub);
      expect(syncStub.args[0][0]).to.contain(`${ID5_CALL_ENDPOINT}/8.gif`);
      expect(syncStub.args[0][0]).to.not.contain('fs=');
      expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
    });

    it('should fire "call" sync pixel with configured maxCascades', function () {
      ID5.init({
        ...defaultInitBypassConsent(),
        maxCascades: 5
      });

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      sinon.assert.calledOnce(syncStub);
      expect(syncStub.args[0][0]).to.contain(`${ID5_CALL_ENDPOINT}/5.gif`);
      expect(syncStub.args[0][0]).to.not.contain('fs=');
      expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
    });

    it('should fire "sync" sync pixel if ID5 is called and cascades_needed is true and partnerUserId is provided', function () {
      ID5.init({
        ...defaultInitBypassConsent(),
        partnerUserId: 'abc123'
      });

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      sinon.assert.calledOnce(syncStub);
      expect(JSON.parse(ajaxStub.secondCall.args[2]).puid).to.be.equal('abc123');
      expect(syncStub.args[0][0]).to.contain(`${ID5_SYNC_ENDPOINT}/8.gif`);
      expect(syncStub.args[0][0]).to.contain('puid=abc123');
      expect(syncStub.args[0][0]).to.not.contain('fs=');
      expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
    });

    it('should not fire sync pixel if ID5 is maxCascade is set to -1', function () {
      ID5.init({
        ...defaultInitBypassConsent(),
        maxCascades: -1
      });

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      sinon.assert.notCalled(syncStub);
    });
  });

  describe('Without Cascade Needed', function () {
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });

    it('should not fire sync pixel if ID5 is called and cascades_needed is false', function () {
      ID5.init(defaultInitBypassConsent());

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      sinon.assert.notCalled(syncStub);
    });
  });
});
