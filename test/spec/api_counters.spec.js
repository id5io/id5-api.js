import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent,
  ID5_FETCH_ENDPOINT,
  localStorage,
  prepareMultiplexingResponse,
  resetAllInLocalStorage,
  sinonFetchResponder,
  STORED_JSON,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_NB_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_DISALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_ID5_CONSENT
} from './test_utils.js';
import {ApiEvent, Extensions, EXTENSIONS } from '@id5io/multiplexing';

describe('Counters', function () {
  let server;
  let extensionsStub, extensionsCreatorStub;

  before(function () {
    resetAllInLocalStorage();
  });

  beforeEach(function () {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    server.respondWith(sinonFetchResponder(request =>
      prepareMultiplexingResponse(TEST_RESPONSE_ID5_CONSENT, request.requestBody)
    ));
    extensionsStub = sinon.createStubInstance(Extensions);
    extensionsStub.gather.resolves(DEFAULT_EXTENSIONS);
    extensionsCreatorStub = sinon.stub(EXTENSIONS, 'createExtensions').returns(extensionsStub);
  });

  afterEach(function () {
    server.restore();
    extensionsCreatorStub.restore();
    resetAllInLocalStorage();
  });

  it('should set counter to 1 if no existing counter in local storage and not calling ID5 servers', function (done) {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

    ID5.init(defaultInit()).onAvailable(function () {
      expect(extensionsStub.gather).to.not.have.been.called;
      expect(server.requests).to.have.lengthOf(0);

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
      expect(extensionsStub.gather).to.not.have.been.called;
      expect(server.requests).to.have.lengthOf(0);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(6);
      done();
    });
  });

  it('should not increment counter when not calling ID5 servers if no existing ID in local storage', function (done) {
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

    const id5Status = ID5.init(defaultInit());
    id5Status._multiplexingInstance.on(ApiEvent.USER_ID_FETCH_CANCELED, () => {
      expect(extensionsStub.gather).to.not.have.been.called;
      expect(server.requests).to.have.lengthOf(0);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(5);
      done();
    });
  });

  it('should send correct count and reset counter after calling ID5 servers if ID in local storage with a previous counter', function (done) {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      expect(extensionsStub.gather).to.have.been.calledOnce;

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);
      const body = JSON.parse(server.requests[0].requestBody);
      expect(body.requests[0].nbPage).to.be.equal(5);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should send a count of 0 and reset counter after calling ID5 servers if ID in local storage without a previous counter', function (done) {
    localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      expect(extensionsStub.gather).to.have.been.calledOnce;

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);
      const body = JSON.parse(server.requests[0].requestBody);
      expect(body.requests[0].nbPage).to.be.equal(0);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should send the stored count reset counter after calling ID5 servers even though no ID in local storage but a previous counter is present', function (done) {
    localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 5);

    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      expect(extensionsStub.gather).to.have.been.calledOnce;

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);
      const body = JSON.parse(server.requests[0].requestBody);
      expect(body.requests[0].nbPage).to.be.equal(5);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should send a count of 0 and reset counter after calling ID5 servers when no previous storage is present', function (done) {
    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      expect(extensionsStub.gather).to.have.been.calledOnce;

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);
      const body = JSON.parse(server.requests[0].requestBody);
      expect(body.requests[0].nbPage).to.be.equal(0);

      const nb = parseInt(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
      done();
    });
  });
});
