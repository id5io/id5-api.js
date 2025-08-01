import '../../src/id5PrebidModule.js';
import {version} from '../../generated/version.js';
import {
  MultiplexingStub, MultiplexInstanceStub
} from './test_utils.js';
import {ApiEvent} from '../../packages/multiplexing/index.mjs';

describe('ID5 Prebid module', function () {
  const pbjsVersion = '8.0.1';

  let multiplexingStub;
  /** @type {MultiplexInstanceStub} */
  let instanceStub;
  beforeEach(function () {
    multiplexingStub = new MultiplexingStub();
    instanceStub = new MultiplexInstanceStub();
    multiplexingStub.returnsInstance(instanceStub);
    window.pbjs = {version: pbjsVersion};
  });

  afterEach(function () {
    multiplexingStub.restore();
  });


  it('should be globally available', function () {
    expect(window.id5Prebid.integration).to.be.a('object');
    expect(window.id5Prebid.version).to.be.eq(version);
  });

  it('should register to multiplexing', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234
    }, {});

    await instanceStub.instanceRegistered();

    expect(instanceStub.updateConsent).to.have.been.calledOnce;
    expect(instanceStub.register).to.have.been.calledOnce;
    const registerObj = instanceStub.register.firstCall.firstArg;

    expect(registerObj.source).to.eq('id5-prebid-ext-module');
    expect(registerObj.sourceVersion).to.eq(version);
    expect(registerObj.fetchIdData.partnerId).to.eq(1234);
    expect(registerObj.fetchIdData.origin).to.eq('pbjs');
    expect(registerObj.fetchIdData.originVersion).to.eq(pbjsVersion);
  });

  it('should return response to prebid', async () => {
    const responsePromise = window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234
    }, {});

    await instanceStub.instanceRegistered();

    expect(instanceStub.updateConsent).to.have.been.calledOnce;
    expect(instanceStub.register).to.have.been.calledOnce;

    /**
     * @type {FetchResponse}
     */
    const responseObj = {
      gp: 'gp',
      universal_uid: 'uid',
      signature: 'signature',
      ids: {
        id5id: {},
        gpid: {}
      },
      cascade_needed: true,
      ab_testing: {
        result: 'control'
      },
      ext: {
        extId: 'extID'
      },
      cache_control: {},
      publisherTrueLinkId: 'tlID'
    };
    instanceStub.emit(ApiEvent.USER_ID_READY, {
      responseObj: responseObj,
      isFromCache: false
    });

    const result = await responsePromise;
    expect(result).to.be.eql(responseObj);
  });


});

describe('getPrebidVersion', function() {
  beforeEach(function() {
    delete window.pbjs;
    delete window._pbjsGlobals;
  });

  it('should return version from window.pbjs.version when available', function() {
    window.pbjs = { version: '8.0.1' };
    expect(window.id5Prebid.integration.getPrebidVersion()).to.equal('8.0.1');
  });

  it('should return version from first global in window._pbjsGlobals when pbjs is not available', function() {
    window._pbjsGlobals = ['customPbjsGlobal'];
    window.customPbjsGlobal = { version: '7.0.0' };
    expect(window.id5Prebid.integration.getPrebidVersion()).to.equal('7.0.0');
  });

  it('should return "unknown" when no version is available', function() {
    expect(window.id5Prebid.integration.getPrebidVersion()).to.equal('unknown');
  });

  it('should return "unknown" when _pbjsGlobals exists but first global has no version', function() {
    window._pbjsGlobals = ['emptyGlobal'];
    window.emptyGlobal = {};
    expect(window.id5Prebid.integration.getPrebidVersion()).to.equal('unknown');
  });

  it('should return "unknown" when _pbjsGlobals is empty', function() {
    window._pbjsGlobals = [];
    expect(window.id5Prebid.integration.getPrebidVersion()).to.equal('unknown');
  });
});
