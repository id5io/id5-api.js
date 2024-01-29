import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  localStorage,
  prepareMultiplexingResponse,
  resetAllInLocalStorage,
  sinonFetchResponder,
  setStoredResponse,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE,
  TEST_RESPONSE_SIGNATURE,
  makeCacheId
} from './test_utils.js';
import {Extensions, EXTENSIONS} from '@id5io/multiplexing';

describe('ID5 JS API', function () {
  let extensionsStub, extensionsCreatorStub;

  beforeEach(function () {
    extensionsStub = sinon.createStubInstance(Extensions);
    extensionsStub.gather.resolves(DEFAULT_EXTENSIONS);
    extensionsCreatorStub = sinon.stub(EXTENSIONS, 'createExtensions').returns(extensionsStub);
  });

  afterEach(function () {
    extensionsCreatorStub.restore();
  });

  describe('Core API Availability', function () {
    it('should have a global variable ID5', function () {
      expect(ID5).to.be.a('object');
    });
    it('should have function ID5.init', function () {
      expect(ID5.init).to.be.a('function');
    });
    it('should have function ID5.refreshId', function () {
      expect(ID5.refreshId).to.be.a('function');
    });
    it('should be loaded', function () {
      expect(ID5.loaded).to.be.a('boolean');
      expect(ID5.loaded).to.be.true;
    });
  });

  describe('Required Configuration and Parameters', function () {
    it('should fail if partnerId not set in config', function () {
      // Note fatal configuration error: missing partnerId
        let id5Status = ID5.init({debugBypassConsent: true});
      expect(id5Status).to.be.undefined;
    });
  });

  describe('Standard Storage and Responses', function () {
    let server;

    beforeEach(function () {
      server = sinon.fakeServer.create();
      server.respondImmediately = true;
      server.respondWith(sinonFetchResponder(request =>
        prepareMultiplexingResponse(TEST_RESPONSE_ID5_CONSENT, request.requestBody)
      ));
      resetAllInLocalStorage();
    });

    afterEach(function () {
      server.restore();
      resetAllInLocalStorage();
    });


    it('when consent is not in storage but present on previous response should request anyway a new value even if no refresh needed', function (done) {
      const initOptions = {
        ...defaultInit(),
        refreshInSeconds: 1000
      };
      setStoredResponse(makeCacheId(initOptions), TEST_RESPONSE_ID5_CONSENT);

      const id5Status = ID5.init(initOptions);

      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);
        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(id5Status.isFromCache()).to.be.false;
        done();
      });
    });

    describe('when consent is present in storage', function () {
      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
      });

      it('should use stored value with consent from privacy storage when available', function (done) {
        const initOptions = {
          ...defaultInit(),
          refreshInSeconds: 1000
        };
        setStoredResponse(makeCacheId(initOptions), TEST_RESPONSE_ID5_CONSENT);
        const id5Status = ID5.init(initOptions);

        id5Status.onAvailable(function () {
          expect(extensionsStub.gather).to.not.have.been.called;
          expect(server.requests).to.have.lengthOf(0);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.true;
          done();
        });
      });

      it('should fetch new ID if stored response is older than cache max age', function (done) {
        setStoredResponse(
          makeCacheId(defaultInit()),
          {
            universal_uid: TEST_RESPONSE_ID5ID,
            cascade_needed: false,
            signature: TEST_RESPONSE_SIGNATURE,
            ext: {
              linkType: TEST_RESPONSE_LINK_TYPE
            },
            privacy: JSON.parse(TEST_PRIVACY_ALLOWED),
            cache_control: {
              max_age_sec: 11
            },
          },
          Date.now() - (12 * 1000) // older than max age in previous response
        );

        const id5Status = ID5.init(defaultInit());

        id5Status.onAvailable(function () {
          expect(extensionsStub.gather).to.have.been.calledOnce;
          expect(server.requests).to.have.lengthOf(1);
          const body = JSON.parse(server.requests[0].requestBody);
          expect(body.requests[0].used_refresh_in_seconds).to.be.eq(11);
          expect(body.requests[0].provided_options.refresh_in_seconds).to.be.eq(undefined);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          done();
        });
      });
    });

  });
});
