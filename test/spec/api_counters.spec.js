import sinon from 'sinon';
import ID5 from '../../lib/id5-api';
import * as utils from '../../lib/utils';
import {
  ID5_FETCH_ENDPOINT,
  ID5_LB_ENDPOINT,
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
  defaultInitBypassConsent
} from './test_utils';

describe('Counters', function () {
  let ajaxStub;

  before(function () {
    resetAllInLocalStorage();
  });

  beforeEach(function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
      callbacks.success(JSON_RESPONSE_ID5_CONSENT);
    });
  });

  afterEach(function () {
    ajaxStub.restore();
    resetAllInLocalStorage();
  });

  it('should set counter to 1 if no existing counter in local storage and not calling ID5 servers', function () {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

    ID5.init(defaultInit());

    sinon.assert.notCalled(ajaxStub);

    const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
    expect(nb).to.be.equal(1);
  });

  it('should increment counter when not calling ID5 servers if existing ID in local storage', function () {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInit());

    sinon.assert.notCalled(ajaxStub);

    const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
    expect(nb).to.be.equal(6);
  });

  it('should not increment counter when not calling ID5 servers if no existing ID in local storage', function () {
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

    ID5.init(defaultInit());

    sinon.assert.notCalled(ajaxStub);

    const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
    expect(nb).to.be.equal(5);
  });

  it('should reset counter to 0 after calling ID5 servers if ID in local storage with a previous counter', function () {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInitBypassConsent());

    sinon.assert.calledTwice(ajaxStub);
    expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
    expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
    const requestPayload = JSON.parse(ajaxStub.secondCall.args[2]);
    expect(requestPayload.nbPage).to.be.equal(5);

    const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
    expect(nb).to.be.equal(1);
  });

  it('should reset counter to 0 after calling ID5 servers if ID in local storage without a previous counter', function () {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

    ID5.init(defaultInitBypassConsent());

    sinon.assert.calledTwice(ajaxStub);
    expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
    expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
    const requestPayload = JSON.parse(ajaxStub.secondCall.args[2]);
    expect(requestPayload.nbPage).to.be.equal(0);

    const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
    expect(nb).to.be.equal(1);
  });

  it('should reset counter to 1 after calling ID5 servers if no ID in local storage with a previous counter', function () {
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInitBypassConsent());

    sinon.assert.calledTwice(ajaxStub);
    expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
    expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
    const requestPayload = JSON.parse(ajaxStub.secondCall.args[2]);
    expect(requestPayload.nbPage).to.be.equal(5);

    const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
    expect(nb).to.be.equal(1);
  });

  it('should reset counter to 1 after calling ID5 servers if no ID in local storage without a previous counter', function () {
    ID5.init(defaultInitBypassConsent());

    sinon.assert.calledTwice(ajaxStub);
    expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
    expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
    const requestPayload = JSON.parse(ajaxStub.secondCall.args[2]);
    expect(requestPayload.nbPage).to.be.equal(0);

    const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
    expect(nb).to.be.equal(1);
  });
});
