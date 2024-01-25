import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent,
  localStorage,
  MultiplexingStub,
  prepareMultiplexingResponse,
  sinonFetchResponder,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_PD_STORAGE_CONFIG,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE
} from './test_utils.js';
import {EXTENSIONS, Extensions} from '@id5io/multiplexing';

describe('Refresh ID Fetch Handling', function () {
  let server;
  let extensionsStub, extensionsCreatorStub;
  const TEST_REFRESH_RESPONSE_ID5ID = 'testrefreshresponseid5id';
  const TEST_REFRESH_RESPONSE_SIGNATURE = 'lmnopq';
  const TEST_REFRESH_RESPONSE_LINK_TYPE = 2;
  const REFRESH_RESPONSE = {
    'universal_uid': TEST_REFRESH_RESPONSE_ID5ID,
    'cascade_needed': false,
    'signature': TEST_REFRESH_RESPONSE_SIGNATURE,
    'ext': {
      'linkType': TEST_REFRESH_RESPONSE_LINK_TYPE
    }
  };
  const JSON_REFRESH_RESPONSE = JSON.stringify(REFRESH_RESPONSE);

  before(function () {
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_PD_STORAGE_CONFIG);
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
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_PD_STORAGE_CONFIG);
  });

  describe('No Force Fetch', function () {
    let getIdSpy, multiplexingStub;

    beforeEach(function () {
      multiplexingStub = new MultiplexingStub();
      multiplexingStub.interceptInstance(instance => {
        instance._leader.realAssignLeader = instance._leader.assignLeader;
        sinon.stub(instance._leader, 'assignLeader').callsFake( (leader) => {
          getIdSpy = sinon.spy(leader._fetcher, 'getId');
          instance._leader.realAssignLeader(leader);// let instance complete election
        });
        return instance;
      })
    });

    afterEach(function () {
      multiplexingStub.restore();
      getIdSpy.restore();
    });

    it('should not call ID5 with no config changes', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);

        ID5.refreshId(id5Status).onRefresh(function () {
          // No new calls
          expect(extensionsStub.gather).to.have.been.calledOnce;
          expect(server.requests).to.have.lengthOf(1);

          expect(getIdSpy).to.have.been.calledTwice;

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)));
          done();
        });
      });
    });

    it('should not call ID5 with config changes that do not require a refresh', function (done) {
      const id5Status = ID5.init({
        ...defaultInitBypassConsent(),
        refreshInSeconds: 50
      });
      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);

        const body = JSON.parse(server.requests[0].requestBody);
        expect(body.requests[0].used_refresh_in_seconds).to.be.eq(50);
        expect(body.requests[0].provided_options.refresh_in_seconds).to.be.eq(50);

        ID5.refreshId(id5Status, false, {refreshInSeconds: 100}).onRefresh(function () {
          // No new calls
          expect(extensionsStub.gather).to.have.been.calledOnce;
          expect(server.requests).to.have.lengthOf(1);

          expect(getIdSpy).to.have.been.calledTwice;

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)));
          done();
        });
      });
    });

    it('should call ID5 with config changes that require a refresh', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent()).onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);

        const body = JSON.parse(server.requests[0].requestBody);
        expect(body.requests[0].provided_options.refresh_in_seconds).to.be.eq(undefined);
        expect(body.requests[0].used_refresh_in_seconds).to.be.eq(7200);

        server.respondWith(sinonFetchResponder(request =>
          prepareMultiplexingResponse(REFRESH_RESPONSE, request.requestBody)
        ));

        ID5.refreshId(id5Status, false, {pd: 'abcdefg'}).onRefresh(function () {
          expect(extensionsStub.gather).to.have.been.calledTwice;
          expect(server.requests).to.have.lengthOf(2);
          expect(getIdSpy).to.have.been.calledTwice;

          const body = JSON.parse(server.requests[1].requestBody);
          expect(body.requests[0].pd).to.be.equal('abcdefg');

          expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_REFRESH_RESPONSE));
          done();
        });
      });
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
        window.__tcfapi = function () {
        };
        cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
          args[2](testConsentDataFromCmp.getTCData, true);
        });
      });
      afterEach(function () {
        cmpStub.restore();
        delete window.__tcfapi;
        localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
      });

      it('should not call ID5 with no consent changes', function (done) {
        const id5Status = ID5.init(defaultInit());
        id5Status.onAvailable(function () {
          expect(extensionsStub.gather).to.have.been.calledOnce;
          expect(server.requests).to.have.lengthOf(1);

          ID5.refreshId(id5Status).onRefresh(function () {
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);
            expect(getIdSpy).to.have.been.calledTwice;

            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)));
            done();
          });
        });
      });

      it('should call ID5 when consent changes after init', function (done) {
        const id5Status = ID5.init(defaultInit());
        id5Status.onAvailable(function () {
          expect(extensionsStub.gather).to.have.been.calledOnce;
          expect(server.requests).to.have.lengthOf(1);
          server.respondWith(sinonFetchResponder(request =>
            prepareMultiplexingResponse(REFRESH_RESPONSE, request.requestBody)
          ));

          cmpStub.restore();
          delete window.__tcfapi;
          window.__tcfapi = function () {
          };
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

          ID5.refreshId(id5Status).onRefresh(function () {
            expect(extensionsStub.gather).to.have.been.calledTwice;
            expect(server.requests).to.have.lengthOf(2);
            expect(getIdSpy).to.have.been.calledTwice;

            expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON.stringify(REFRESH_RESPONSE)));
            done();
          });
        });
      });
    });
  });

  describe('Force Fetch', function () {
    let getIdSpy, multiplexingStub;

    beforeEach(function () {
      multiplexingStub = new MultiplexingStub();
      multiplexingStub.interceptInstance(instance => {
        instance._leader.realAssignLeader = instance._leader.assignLeader;
        sinon.stub(instance._leader, 'assignLeader').callsFake( (leader) => {
          getIdSpy = sinon.spy(leader._fetcher, 'getId');
          instance._leader.realAssignLeader(leader);// let instance complete election
        });
        return instance;
      })
    });
    afterEach(function () {
      multiplexingStub.restore();
      getIdSpy.restore();
    });

    it('should call ID5 with no other reason to refresh', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);

        server.respondWith(sinonFetchResponder(request =>
          prepareMultiplexingResponse(REFRESH_RESPONSE, request.requestBody)
        ));

        ID5.refreshId(id5Status, true).onRefresh(function () {
          expect(extensionsStub.gather).to.have.been.calledTwice;
          expect(server.requests).to.have.lengthOf(2);
          expect(getIdSpy).to.have.been.calledTwice;

          expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_REFRESH_RESPONSE));
          done();
        });
      });
    });
  });
});
