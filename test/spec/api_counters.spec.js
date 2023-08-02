import sinon from 'sinon';
import ID5 from '../../lib/id5-api';
import * as utils from '../../lib/utils';
import {
  ID5_FETCH_ENDPOINT,
  JSON_RESPONSE_ID5_CONSENT,
  localStorage,
  STORED_JSON,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_NB_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_DISALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  resetAllInLocalStorage,
  defaultInit,
  defaultInitBypassConsent,
  DEFAULT_EXTENSIONS
} from './test_utils';
import EXTENSIONS from "../../lib/extensions.js";
import {ApiEvent} from "@id5io/multiplexing";

describe('Counters', function () {
  let ajaxStub;
  let extensionsStub;

  before(function () {
    resetAllInLocalStorage();
  });

  beforeEach(function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      callbacks.success(JSON_RESPONSE_ID5_CONSENT);
    });
    extensionsStub = sinon.stub(EXTENSIONS, 'gather').resolves(DEFAULT_EXTENSIONS);
  });

  afterEach(function () {
    ajaxStub.restore();
    extensionsStub.restore();
    resetAllInLocalStorage();
  });

  it('should set counter to 1 if no existing counter in local storage and not calling ID5 servers', function (done) {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

    ID5.init(defaultInit()).onAvailable(function () {
      sinon.assert.notCalled(extensionsStub);
      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should increment counter when not calling ID5 servers if existing ID in local storage', function (done) {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInit()).onAvailable(function () {
      sinon.assert.notCalled(extensionsStub);
      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(6);
      done();
    });
  });

  it('should not increment counter when not calling ID5 servers if no existing ID in local storage', function (done) {
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

    const id5Status = ID5.init(defaultInit());
    id5Status.instance.on(ApiEvent.USER_ID_FETCH_CANCELED, details => {
      sinon.assert.notCalled(extensionsStub);
      sinon.assert.notCalled(ajaxStub);
      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(5);
      done();
    })
  });

  it('should reset counter to 0 after calling ID5 servers if ID in local storage with a previous counter', function (done) {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      sinon.assert.calledOnce(extensionsStub);
      sinon.assert.calledOnce(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should reset counter to 0 after calling ID5 servers if ID in local storage without a previous counter', function (done) {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      sinon.assert.calledOnce(extensionsStub);
      sinon.assert.calledOnce(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should reset counter to 1 after calling ID5 servers if no ID in local storage with a previous counter', function (done) {
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      sinon.assert.calledOnce(extensionsStub);
      sinon.assert.calledOnce(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should reset counter to 1 after calling ID5 servers if no ID in local storage without a previous counter', function (done) {
    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      sinon.assert.calledOnce(extensionsStub);
      sinon.assert.calledOnce(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });
});
