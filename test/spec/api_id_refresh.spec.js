import sinon from 'sinon';
import ID5 from '../../lib/id5-api';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent,
  ID5_FETCH_ENDPOINT,
  localStorage,
  MultiplexingStub, prepareMultiplexingResponse,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_PD_STORAGE_CONFIG,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE
} from './test_utils';
import {expect} from 'chai';
import {EXTENSIONS, Extensions, utils} from '@id5io/multiplexing';

describe('Refresh ID Fetch Handling', function () {
  let ajaxStub;
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
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      callbacks.success(prepareMultiplexingResponse(TEST_RESPONSE_ID5_CONSENT, data));
    });
    extensionsStub = sinon.createStubInstance(Extensions);
    extensionsStub.gather.resolves(DEFAULT_EXTENSIONS);
    extensionsCreatorStub = sinon.stub(EXTENSIONS, 'createExtensions').returns(extensionsStub);
  });
  afterEach(function () {
    ajaxStub.restore();
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
        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        extensionsStub.gather.resetHistory();
        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(prepareMultiplexingResponse(REFRESH_RESPONSE, data));
        });

        ID5.refreshId(id5Status).onRefresh(function () {
          sinon.assert.notCalled(extensionsStub.gather);
          sinon.assert.notCalled(ajaxStub);

          sinon.assert.calledTwice(getIdSpy);

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
        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        const requestData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
        expect(requestData.used_refresh_in_seconds).to.be.eq(50);
        expect(requestData.provided_options.refresh_in_seconds).to.be.eq(50);

        extensionsStub.gather.resetHistory();
        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(prepareMultiplexingResponse(REFRESH_RESPONSE, data));
        });

        ID5.refreshId(id5Status, false, {refreshInSeconds: 100}).onRefresh(function () {
          sinon.assert.notCalled(extensionsStub.gather);
          sinon.assert.notCalled(ajaxStub);
          sinon.assert.calledTwice(getIdSpy);

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)));
          done();
        });
      });
    });

    it('should call ID5 with config changes that require a refresh', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent()).onAvailable(function () {
        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        const requestData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
        expect(requestData.provided_options.refresh_in_seconds).to.be.eq(undefined);
        expect(requestData.used_refresh_in_seconds).to.be.eq(7200);

        extensionsStub.gather.resetHistory();
        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(prepareMultiplexingResponse(REFRESH_RESPONSE, data));
        });

        ID5.refreshId(id5Status, false, {pd: 'abcdefg'}).onRefresh(function () {
          sinon.assert.calledOnce(extensionsStub.gather);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          sinon.assert.calledTwice(getIdSpy);

          const requestData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
          expect(requestData.pd).to.be.equal('abcdefg');

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
          sinon.assert.calledOnce(extensionsStub.gather);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          extensionsStub.gather.resetHistory();
          ajaxStub.restore();
          ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
            callbacks.success(prepareMultiplexingResponse(REFRESH_RESPONSE, data));
          });

          ID5.refreshId(id5Status).onRefresh(function () {
            sinon.assert.notCalled(extensionsStub.gather);
            sinon.assert.notCalled(ajaxStub);
            sinon.assert.calledTwice(getIdSpy);

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
          sinon.assert.calledOnce(extensionsStub.gather);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          extensionsStub.gather.resetHistory();
          ajaxStub.restore();
          ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
            callbacks.success(prepareMultiplexingResponse(REFRESH_RESPONSE, data));
          });

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
            sinon.assert.calledOnce(extensionsStub.gather);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            sinon.assert.calledTwice(getIdSpy);

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
        sinon.assert.calledOnce(extensionsStub.gather);
        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        extensionsStub.gather.resetHistory();
        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(prepareMultiplexingResponse(REFRESH_RESPONSE, data));
        });

        ID5.refreshId(id5Status, true).onRefresh(function () {
          sinon.assert.calledOnce(extensionsStub.gather);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          sinon.assert.calledTwice(getIdSpy);

          expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_REFRESH_RESPONSE));
          done();
        });
      });
    });
  });
});
