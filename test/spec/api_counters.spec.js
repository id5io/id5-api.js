import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent,
  ID5_FETCH_ENDPOINT,
  localStorage,
  prepareMultiplexingResponse,
  resetAllInLocalStorage, getStoredResponse, setStoredResponse,
  sinonFetchResponder,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_DISALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_ID5_CONSENT
} from './test_utils.js';
import {ApiEvent, Extensions, EXTENSIONS } from '@id5io/multiplexing';

describe('Counters', function () {
  let server;
  let extensionsStub, extensionsCreatorStub;

  beforeEach(function () {
    resetAllInLocalStorage();
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

  const CACHE_ID = '4167500408366467';

  it('should set counter to 1 if no existing counter in local storage and not calling ID5 servers', function (done) {
    setStoredResponse(CACHE_ID, TEST_RESPONSE_ID5_CONSENT, Date.now(), undefined);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

    ID5.init(defaultInit()).onAvailable(function () {
      expect(extensionsStub.gather).to.not.have.been.called;
      expect(server.requests).to.have.lengthOf(0);

      const nb = getStoredResponse(CACHE_ID).nb;
      expect(nb).to.be.equal(1);
      done();
    });
  });

  it('should increment counter when not calling ID5 servers if existing ID in local storage', function (done) {
    setStoredResponse(CACHE_ID, TEST_RESPONSE_ID5_CONSENT, Date.now(), 5);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

    ID5.init(defaultInit()).onAvailable(function () {
      expect(extensionsStub.gather).to.not.have.been.called;
      expect(server.requests).to.have.lengthOf(0);

      const nb = getStoredResponse(CACHE_ID).nb;
      expect(nb).to.be.equal(6);
      done();
    });
  });

  it('should not increment counter when not calling ID5 servers if no existing ID in local storage', function (done) {
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

    const id5Status = ID5.init(defaultInit());
    id5Status._multiplexingInstance.on(ApiEvent.USER_ID_FETCH_CANCELED, () => {
      expect(extensionsStub.gather).to.not.have.been.called;
      expect(server.requests).to.have.lengthOf(0);

      expect(getStoredResponse(CACHE_ID)).to.be.undefined;
      done();
    });
  });

  it('should reset counter to 0 after calling ID5 servers if ID in local storage with a previous counter', function (done) {
    setStoredResponse(CACHE_ID, TEST_RESPONSE_ID5_CONSENT, Date.now() - (TEST_RESPONSE_ID5_CONSENT.cache_control.max_age_sec * 1000 + 1000), 5);
    localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

    ID5.init(defaultInitBypassConsent()).onAvailable(function () {

      expect(extensionsStub.gather).to.have.been.calledOnce;
      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);
      const requestPayload = JSON.parse(server.requests[0].requestBody).requests[0];
      expect(requestPayload.nbPage).to.be.equal(6);

      const nb = parseInt(getStoredResponse(CACHE_ID).nb);
      expect(nb).to.be.equal(0);
      done();
    });
  });

});
