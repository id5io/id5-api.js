import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent,
  localStorage,
  prepareMultiplexingResponse,
  sinonFetchResponder,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_LAST_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_SIGNATURE
} from './test_utils.js';
import {CONSTANTS, EXTENSIONS, Extensions} from '@id5io/multiplexing';

describe('A/B Testing', function () {
  let server;
  let extensionsStub, extensionsCreatorStub;
  const API_CONFIG = {
    ...defaultInitBypassConsent(),
    abTesting: {enabled: true, controlGroupPct: 0.5} // config not relevant with the stub
  };

  before(function () {
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
    ID5.userId = undefined;
  });

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    extensionsStub = sinon.createStubInstance(Extensions);
    extensionsStub.gather.resolves(DEFAULT_EXTENSIONS);
    extensionsCreatorStub = sinon.stub(EXTENSIONS, 'createExtensions').returns(extensionsStub);
  })

  afterEach(function () {
    server.restore();
    localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
    localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
    extensionsCreatorStub.restore()
    ID5.userId = undefined;
  });


  describe('Function Availability', function () {
    beforeEach(function () {
      server.respondWith(sinonFetchResponder(request =>
        prepareMultiplexingResponse(TEST_RESPONSE_ID5_CONSENT, request.requestBody)
      ));
    });

    it('should set exposeUserId to true without any config', function (done) {
      const id5Status = ID5.init(defaultInit());
      id5Status.onAvailable(function () {
        expect(id5Status.exposeUserId()).to.be.true;
        done();
      });
    });

    it('should send ab_testing config in server request', function (done) {
      ID5.init(API_CONFIG).onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);
        const body = JSON.parse(server.requests[0].requestBody);
        expect(body.requests[0].ab_testing).to.be.an('object');
        expect(body.requests[0].ab_testing.enabled).to.be.true;
        expect(body.requests[0].ab_testing.control_group_pct).to.equal(0.5);
        done();
      });
    });
  });

  describe('Not in Control Group', function () {
    const TEST_RESPONSE_ABTEST = {
      'universal_uid': 'whateverID_AB_NORMAL',
      'cascade_needed': false,
      'signature': TEST_RESPONSE_SIGNATURE,
      'privacy': TEST_PRIVACY_ALLOWED,
      'ab_testing': {
        'result': 'normal'
      }, 'ext': {
        'linkType': 1
      }
    };
    const ENCODED_STORED_JSON_ABTEST = encodeURIComponent(JSON.stringify(TEST_RESPONSE_ABTEST));
    const TEST_RESPONSE_EID_AB_NORMAL = {
      source: CONSTANTS.ID5_EIDS_SOURCE,
      uids: [{
        atype: 1,
        id: 'whateverID_AB_NORMAL',
        ext: {
          linkType: 1,
          abTestingControlGroup: false
        }
      }]
    };

    beforeEach(function () {
      server.respondWith(sinonFetchResponder(request =>
        prepareMultiplexingResponse(TEST_RESPONSE_ABTEST, request.requestBody)
      ));
    });

    it('should expose ID5.userId from a stored response', function (done) {
      localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, ENCODED_STORED_JSON_ABTEST);
      localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

      const id5Status = ID5.init(API_CONFIG);

      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.not.have.been.called;
        expect(server.requests).to.have.lengthOf(0);
        expect(id5Status.getUserId()).to.be.equal('whateverID_AB_NORMAL');
        expect(id5Status.getLinkType()).to.be.equal(1);
        expect(id5Status.exposeUserId()).to.be.true;
        done();
      });
    });

    it('should expose ID5.userId from a server response', function (done) {
      const id5Status = ID5.init(API_CONFIG);

      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);
        expect(id5Status.getUserId()).to.be.equal('whateverID_AB_NORMAL');
        expect(id5Status.getLinkType()).to.be.equal(1);
        expect(id5Status.exposeUserId()).to.be.true;
        expect(id5Status.getUserIdAsEid()).to.eql(TEST_RESPONSE_EID_AB_NORMAL);
        done();
      });
    });
  });

  describe('In Control Group', function () {
    let onAvailableSpy, onUpdateSpy, onRefreshSpy;
    const RESPONSE_ABTEST = {
      'universal_uid': 'whateverID_AB_NORMAL',
      'cascade_needed': false,
      'signature': TEST_RESPONSE_SIGNATURE,
      'ext': {
        'linkType': 1
      },
      'privacy': JSON.parse(TEST_PRIVACY_ALLOWED),
      'ab_testing': {
        'result': 'control'
      }
    };
    const ENCODED_STORED_JSON_ABTEST = encodeURIComponent(JSON.stringify(RESPONSE_ABTEST));
    const TEST_RESPONSE_EID_AB_CONTROL_GROUP = {
      source: CONSTANTS.ID5_EIDS_SOURCE,
      uids: [{
        atype: 1,
        id: '0',
        ext: {
          abTestingControlGroup: true
        }
      }]
    };

    beforeEach(function () {
      server.respondWith(sinonFetchResponder(request =>
        prepareMultiplexingResponse(RESPONSE_ABTEST, request.requestBody)
      ));
      onAvailableSpy = sinon.spy();
      onUpdateSpy = sinon.spy();
      onRefreshSpy = sinon.spy();
    });

    afterEach(function () {
      onAvailableSpy.resetHistory();
      onUpdateSpy.resetHistory();
      onRefreshSpy.resetHistory();
    });

    it('should not expose ID5.userId from a server response', function (done) {
      const id5Status = ID5.init(API_CONFIG);
      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.have.been.calledOnce;
        expect(server.requests).to.have.lengthOf(1);
        expect(id5Status.getUserId()).to.be.equal('0');
        expect(id5Status.getLinkType()).to.be.equal(0);
        expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON.stringify(RESPONSE_ABTEST)));
        expect(id5Status.exposeUserId()).to.be.false;
        expect(id5Status.getUserIdAsEid()).to.be.eql(TEST_RESPONSE_EID_AB_CONTROL_GROUP);
        done();
      });
    });

    it('should not expose ID5.userId from a stored response', function (done) {
      localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, ENCODED_STORED_JSON_ABTEST);
      localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

      const id5Status = ID5.init(API_CONFIG);
      id5Status.onAvailable(function () {
        expect(extensionsStub.gather).to.not.have.been.called;
        expect(server.requests).to.have.lengthOf(0);
        expect(id5Status.getUserId()).to.be.equal('0');
        expect(id5Status.getLinkType()).to.be.equal(0);
        expect(id5Status.exposeUserId()).to.be.false;
        expect(id5Status.getUserIdAsEid()).to.be.eql(TEST_RESPONSE_EID_AB_CONTROL_GROUP);
        done();
      });
    });
  });
});
