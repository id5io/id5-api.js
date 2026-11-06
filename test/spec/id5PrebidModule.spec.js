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

  it('should pass URL the module was loaded from to fetch data', async () => {
    const integration = window.id5Prebid.integration;
    const originalScriptSrc = integration._scriptSrc;
    integration._scriptSrc = 'https://cdn.id5-sync.com/api/1.0/id5PrebidModule.js';
    try {
      integration.fetchId5Id({}, {
        partner: 1234
      }, {});

      await instanceStub.instanceRegistered();

      const registerObj = instanceStub.register.firstCall.firstArg;
      expect(registerObj.fetchIdData.scriptSrc).to.eq('https://cdn.id5-sync.com/api/1.0/id5PrebidModule.js');
    } finally {
      integration._scriptSrc = originalScriptSrc;
    }
  });

  it('should pass provider from prebid config to fetch data', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234,
      provider: 'unit-test',
      externalModuleUrl: 'https://cdn.id5-sync.com/api/1.0/id5PrebidModule.js'
    }, {});

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.provider).to.eq('unit-test');
    expect(registerObj.sourceConfiguration.options.provider).to.eq('unit-test');
  });

  it('should not set provider when prebid config has none', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234
    }, {});

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.provider).to.be.undefined;
  });

  it('should ignore provider that is not a string', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234,
      provider: 1016
    }, {});

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.provider).to.be.undefined;
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
