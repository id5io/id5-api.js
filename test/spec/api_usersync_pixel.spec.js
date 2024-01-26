import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  DEFAULT_EXTENSIONS,
  defaultInitBypassConsent,
  ID5_CALL_ENDPOINT,
  ID5_FETCH_ENDPOINT,
  ID5_SYNC_ENDPOINT,
  TEST_RESPONSE_CASCADE,
  prepareMultiplexingResponse,
  sinonFetchResponder,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_ID5ID, defaultInit, setupGppV11Stub, clearGppStub, setStoredResponse, resetAllInLocalStorage
} from './test_utils.js';
import {EXTENSIONS, Extensions} from '@id5io/multiplexing';

describe('Fire Usersync Pixel', function () {
  let extensionsStub, extensionsCreatorStub;
  let imageSpy;
  let server;

  before(function () {
    resetAllInLocalStorage();
  });

  beforeEach(function () {
    imageSpy = sinon.spy(window, 'Image');
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    extensionsStub = sinon.createStubInstance(Extensions);
    extensionsStub.gather.resolves(DEFAULT_EXTENSIONS);
    extensionsCreatorStub = sinon.stub(EXTENSIONS, 'createExtensions').returns(extensionsStub);
  });

  afterEach(function () {
    imageSpy.restore();
    server.restore();
    extensionsCreatorStub.restore();
    resetAllInLocalStorage();
    clearGppStub();
  });

  describe('Without Calling ID5', function () {
    it('should not fire sync pixel if ID5 is not called', function (done) {
      const cacheId = '4167500408366467';
      setStoredResponse(cacheId, TEST_RESPONSE_ID5_CONSENT);

      ID5.init(defaultInitBypassConsent()).onAvailable(function () {
        expect(extensionsStub.gather).to.not.have.been.called;
        expect(imageSpy).to.not.have.been.called;
        done();
      });
    });
  });

  describe('With Cascade Needed', function () {
    beforeEach(function () {
      server.respondWith(sinonFetchResponder(request =>
        prepareMultiplexingResponse(TEST_RESPONSE_CASCADE, request.requestBody)
      ));
    });

    it('should fire "call" sync pixel if ID5 is called and cascades_needed is true and no partnerUserId is provided', function (done) {
      ID5.init(defaultInitBypassConsent()).onAvailable(function () {

        expect(extensionsStub.gather).to.have.been.calledOnce;

        expect(server.requests).to.have.lengthOf(1);
        expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);

        expect(imageSpy).to.have.been.calledOnce;

        const pixelUrl = imageSpy.firstCall.returnValue.src;
        expect(pixelUrl).to.contain(`${ID5_CALL_ENDPOINT}/8.gif`);
        expect(pixelUrl).to.not.contain('fs=');
        expect(pixelUrl).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
        done();
      });
    });

    it('should fire "call" sync pixel with configured maxCascades', function (done) {
      ID5.init({
        ...defaultInitBypassConsent(),
        maxCascades: 5
      }).onAvailable(function () {

        expect(extensionsStub.gather).to.have.been.calledOnce;

        expect(server.requests).to.have.lengthOf(1);
        expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);

        expect(imageSpy).to.have.been.calledOnce;
        const pixelUrl = imageSpy.firstCall.returnValue.src;
        expect(pixelUrl).to.contain(`${ID5_CALL_ENDPOINT}/5.gif`);
        done();
      });
    });

    it('should fire "sync" sync pixel if ID5 is called and cascades_needed is true and partnerUserId is provided', function (done) {
      ID5.init({
        ...defaultInitBypassConsent(),
        partnerUserId: 'abc123'
      }).onAvailable(function () {

        expect(extensionsStub.gather).to.have.been.calledOnce;

        expect(server.requests).to.have.lengthOf(1);
        expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);
        const body = JSON.parse(server.requests[0].requestBody);
        expect(body.requests[0].puid).to.be.equal('abc123');

        expect(imageSpy).to.have.been.calledOnce;
        const pixelUrl = imageSpy.firstCall.returnValue.src;
        expect(pixelUrl).to.contain(`${ID5_SYNC_ENDPOINT}/8.gif`);
        expect(pixelUrl).to.contain('puid=abc123');
        done();
      });
    });

    it('should include gpp consent string if gpp is available on the page', function (done) {
      setupGppV11Stub();
      ID5.init({
        ...defaultInit(),
        cmpApi: 'iab',
        partnerUserId: 'abc123'
      }).onAvailable(function () {
        expect(imageSpy).to.have.been.calledOnce;
        const url = new URL(imageSpy.firstCall.returnValue.src);
        expect(url.toString()).to.contain(`${ID5_SYNC_ENDPOINT}/8.gif`);
        expect(url.searchParams.get('gpp')).to.be.equal('GPP_STRING');
        expect(url.searchParams.get('gpp_sid')).to.be.equal('-1,0');
        done();
      });
    });

    it('should not fire sync pixel if ID5 is maxCascade is set to -1', function (done) {
      ID5.init({
        ...defaultInitBypassConsent(),
        maxCascades: -1
      }).onAvailable(function () {
        expect(imageSpy).to.not.have.been.called;
        done();
      });
    });
  });

  describe('Without Cascade Needed', function () {
    beforeEach(function () {
      server.respondWith(sinonFetchResponder(request =>
        prepareMultiplexingResponse(TEST_RESPONSE_ID5_CONSENT, request.requestBody)
      ));
    });

    it('should not fire sync pixel if ID5 is called and cascades_needed is false', function (done) {
      ID5.init(defaultInitBypassConsent()).onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;

        expect(server.requests).to.have.lengthOf(1);
        expect(server.requests[0].url).to.eq(ID5_FETCH_ENDPOINT);

        expect(imageSpy).to.not.have.been.called;
        done();
      });
    });
  });
});
