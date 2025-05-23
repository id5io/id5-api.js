import sinon from 'sinon';
import '../../src/index.js';
import '../../src/api-lite.js';
import {version as currentVersion} from '../../generated/version.js';

import {
  clearMockedConsent,
  DEFAULT_EXTENSIONS,
  defaultInit,
  localStorage,
  makeCacheId,
  prepareMultiplexingResponse,
  resetAllInLocalStorage,
  setStoredResponse,
  setupMockedConsent,
  sinonFetchResponder,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE,
  TEST_RESPONSE_SIGNATURE
} from './test_utils.js';
import {ApiEvent, Extensions, EXTENSIONS} from '@id5io/multiplexing';
import {isGlobalDebug, setGlobalDebug} from '../../lib/utils.js';

/**
 * @type {Id5Api}
 */
const ID5 = window.ID5;

describe('ID5 API', function () {
  describe('Standard', function () {
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
        expect(ID5.ApiStandardLoaded).to.be.a('boolean');
        expect(ID5.ApiStandardLoaded).to.be.true;
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
            expect(localStorageGrantNotAllowedCounterValue(id5Status)).to.be.eq(0);
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
              }
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
            expect(localStorageGrantNotAllowedCounterValue(id5Status)).to.be.eq(0);
            done();
          });
        });
      });

      describe('when id5 has been denied consent', function () {
        beforeEach(function () {
          setupMockedConsent(false);
        });

        afterEach(function () {
          clearMockedConsent();
        });

        it('should emit a fetch cancelled event', function (done) {
          const initOptions = {
            ...defaultInit(),
            refreshInSeconds: 1000
          };
          setStoredResponse(makeCacheId(initOptions), TEST_RESPONSE_ID5_CONSENT);
          const id5Status = ID5.init(initOptions);

          id5Status._multiplexingInstance.on(ApiEvent.USER_ID_FETCH_CANCELED, () => {
            expect(localStorageGrantNotAllowedCounterValue(id5Status)).to.be.eq(1);
            expect(lsgCounterTag(id5Status, 'allowed')).to.be.eq(false);
            expect(lsgCounterTag(id5Status, 'TCFv2-localStoragePurposeConsent')).to.be.eq(true);
            expect(lsgCounterTag(id5Status, 'TCFv2-vendorsConsentForId5Granted')).to.be.eq(false);
            done();
          });
        });
      });

      function localStorageGrantNotAllowedCounterValue(id5Status) {
        const counterValue = findLsgCounter(id5Status)
          ?.values[0]?.value;
        return counterValue || 0;
      }

      function lsgCounterTag(id5Status, tag) {
        const tagValue = findLsgCounter(id5Status)
          ?.tags[tag];
        return tagValue || false;
      }

      function findLsgCounter(id5Status) {
        return id5Status._metrics.getAllMeasurements()
          .find(m => m.name == 'id5.api.consent.lsg.count'
            && m.tags['lsgContext'] == 'fetch-before-request'
            && m.tags['allowed'] == false);
      }
    });
  });

  describe('Lite', function () {

    describe('Core API Availability', function () {
      it('should have a global variable ID5', function () {
        expect(ID5).to.be.a('object');
      });
      it('should have function ID5.initLite', function () {
        expect(ID5.initLite).to.be.a('function');
      });
      it('should be loaded', function () {
        expect(ID5.loaded).to.be.a('boolean');
        expect(ID5.loaded).to.be.true;
        expect(ID5.ApiLiteLoaded).to.be.a('boolean');
        expect(ID5.ApiLiteLoaded).to.be.true;
      });
    });

    describe('Required Configuration and Parameters', function () {
      it('should fail if partnerId not set in config', function () {
        // Note fatal configuration error: missing partnerId
        let id5Status = ID5.initLite({debugBypassConsent: true});
        expect(id5Status).to.be.undefined;
      });


      it('should initLite create id5Instance with callbacks ', function () {
        // Note fatal configuration error: missing partnerId
        let ind5Instance = ID5.init(defaultInit());
        expect(ind5Instance).to.not.be.undefined;
        expect(ind5Instance.onAvailable).to.be.a('function');
        expect(ind5Instance.onUpdate).to.be.a('function');
      });
    });
  });

  it('should provide version', function () {
    expect(ID5.version).to.be.not.undefined;
    expect(ID5.version).to.be.eq(currentVersion);
  });

  it('should provide global debug functions', function () {
    expect(ID5.debug).to.be.not.undefined;
    expect(ID5.debug).to.be.false;
    expect(isGlobalDebug()).to.be.false;

    // setting via ID5
    ID5.debug = true;
    expect(ID5.debug).to.be.true;
    expect(isGlobalDebug()).to.be.true;
    ID5.debug = false;
    expect(ID5.debug).to.be.false;
    expect(isGlobalDebug()).to.be.false;

    // setting global
    setGlobalDebug(true);
    expect(ID5.debug).to.be.true;
    expect(isGlobalDebug()).to.be.true;
    setGlobalDebug(false);
    expect(ID5.debug).to.be.false;
    expect(isGlobalDebug()).to.be.false;
  });

  it('should share object for standard and lite api', function (done) {
    const invocationId = ID5.invocationId;
    const id5Standard = ID5.init(defaultInit());
    expect(ID5.invocationId).to.be.eq(invocationId + 1);
    ID5.initLite(defaultInit());
    expect(ID5.invocationId).to.be.eq(invocationId + 2);
    id5Standard.onAvailable(function () {
      // let's wait for it to not influence other tests
      done();
    });
  });
});
