import sinon from 'sinon';
import ID5 from '../../lib/id5-api';
import * as utils from '../../lib/utils';
import {
  ID5_CALL_ENDPOINT,
  ID5_FETCH_ENDPOINT,
  ID5_SYNC_ENDPOINT,
  JSON_RESPONSE_CASCADE,
  JSON_RESPONSE_ID5_CONSENT,
  localStorage,
  STORED_JSON,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_RESPONSE_ID5ID,
  defaultInitBypassConsent,
  DEFAULT_EXTENSIONS
} from './test_utils';
import {EXTENSIONS, Extensions, utils as mxutils} from '@id5io/multiplexing';

describe('Fire Usersync Pixel', function () {
  let ajaxStub;
  let syncStub;
  let extensionsStub, extensionsCreatorStub;

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
    extensionsStub = sinon.createStubInstance(Extensions);
    extensionsStub.gather.resolves(DEFAULT_EXTENSIONS);
    extensionsCreatorStub = sinon.stub(EXTENSIONS, 'createExtensions').returns(extensionsStub);
  });

  afterEach(function () {
    ajaxStub.restore();
    syncStub.restore();
    extensionsCreatorStub.restore()
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
  });

  describe('Without Calling ID5', function () {
    beforeEach(function () {
      ajaxStub = sinon.stub(mxutils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success('{}');
      });
    });

    it('should not fire sync pixel if ID5 is not called', function (done) {
      localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

      ID5.init(defaultInitBypassConsent()).onAvailable(function () {
        sinon.assert.notCalled(extensionsStub.gather);
        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
        done();
      });
    });
  });

  describe('With Cascade Needed', function () {
    beforeEach(function () {
      ajaxStub = sinon.stub(mxutils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_CASCADE);
      });
    });

    it('should fire "call" sync pixel if ID5 is called and cascades_needed is true and no partnerUserId is provided', function (done) {
      ID5.init(defaultInitBypassConsent()).onAvailable(function () {

        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(`${ID5_CALL_ENDPOINT}/8.gif`);
        expect(syncStub.args[0][0]).to.not.contain('fs=');
        expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
        done();
      });
    });

    it('should fire "call" sync pixel with configured maxCascades', function (done) {
      ID5.init({
        ...defaultInitBypassConsent(),
        maxCascades: 5
      }).onAvailable(function () {

        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(`${ID5_CALL_ENDPOINT}/5.gif`);
        expect(syncStub.args[0][0]).to.not.contain('fs=');
        expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
        done();
      });
    });

    it('should fire "sync" sync pixel if ID5 is called and cascades_needed is true and partnerUserId is provided', function (done) {
      ID5.init({
        ...defaultInitBypassConsent(),
        partnerUserId: 'abc123'
      }).onAvailable(function () {

        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        sinon.assert.calledOnce(syncStub);
        expect(JSON.parse(ajaxStub.firstCall.args[2]).requests[0].puid).to.be.equal('abc123');
        expect(syncStub.args[0][0]).to.contain(`${ID5_SYNC_ENDPOINT}/8.gif`);
        expect(syncStub.args[0][0]).to.contain('puid=abc123');
        expect(syncStub.args[0][0]).to.not.contain('fs=');
        expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
        done();
      });
    });

    it('should not fire sync pixel if ID5 is maxCascade is set to -1', function (done) {
      ID5.init({
        ...defaultInitBypassConsent(),
        maxCascades: -1
      }).onAvailable(function () {

        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        sinon.assert.notCalled(syncStub);
        done();
      });
    });
  });

  describe('Without Cascade Needed', function () {
    beforeEach(function () {
      ajaxStub = sinon.stub(mxutils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });

    it('should not fire sync pixel if ID5 is called and cascades_needed is false', function (done) {
      ID5.init(defaultInitBypassConsent()).onAvailable(function () {

        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        sinon.assert.notCalled(syncStub);
        done();
      });
    });
  });
});
