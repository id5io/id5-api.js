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

  it('should take the Prebid.js version from the global the enabler named', async () => {
    window.customPrebid = {version: '9.1.0'};
    try {
      window.id5Prebid.integration.fetchId5Id({}, {partner: 1234, pbjsGlobal: 'customPrebid'}, {});

      await instanceStub.instanceRegistered();

      expect(instanceStub.register.firstCall.firstArg.fetchIdData.originVersion).to.eq('9.1.0');
    } finally {
      delete window.customPrebid;
    }
  });

  describe('events tracking', function () {
    const TRACKED_PARTNER = 987650;
    let trackerFlags;

    // the tracker is started on a timer once the fetch is under way
    const trackerStarted = () => new Promise(resolve => setTimeout(resolve, 20));

    beforeEach(function () {
      trackerFlags = window.id5_pbjs_et;
      delete window.id5_pbjs_et;
      window.pbjs = {version: pbjsVersion, que: []};
    });

    afterEach(function () {
      window.id5_pbjs_et = trackerFlags;
    });

    it('should start on the detected Prebid.js when the enabler reported none', async () => {
      window.id5Prebid.integration.fetchId5Id({}, {partner: TRACKED_PARTNER}, {});
      await instanceStub.instanceRegistered();
      await trackerStarted();

      expect(window.pbjs.que).to.have.lengthOf(1);
    });

    it('should start for the same partner on every global the enabler named', async () => {
      window.customPrebidA = {version: '9.1.0', que: []};
      window.customPrebidB = {version: '9.1.0', que: []};
      try {
        window.id5Prebid.integration.fetchId5Id({}, {partner: TRACKED_PARTNER, pbjsGlobal: 'customPrebidA'}, {});
        window.id5Prebid.integration.fetchId5Id({}, {partner: TRACKED_PARTNER, pbjsGlobal: 'customPrebidB'}, {});
        await instanceStub.instanceRegistered();
        await trackerStarted();

        expect(window.customPrebidA.que).to.have.lengthOf(1);
        expect(window.customPrebidB.que).to.have.lengthOf(1);
      } finally {
        delete window.customPrebidA;
        delete window.customPrebidB;
      }
    });

    it('should start on the global the enabler named', async () => {
      window.customPrebid = {version: '9.1.0', que: []};
      try {
        window.id5Prebid.integration.fetchId5Id({}, {partner: TRACKED_PARTNER, pbjsGlobal: 'customPrebid'}, {});
        await instanceStub.instanceRegistered();
        await trackerStarted();

        expect(window.customPrebid.que).to.have.lengthOf(1);
        expect(window.pbjs.que).to.be.empty;
      } finally {
        delete window.customPrebid;
      }
    });
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

  it('should pass where the enabler was loaded from to fetch data', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234,
      enablerSrc: 'https://cdn.example.com/id5-prebid-enabler.js',
      enablerFallback: 'dns'
    }, {});

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.enablerSrc).to.eq('https://cdn.example.com/id5-prebid-enabler.js');
    expect(registerObj.fetchIdData.enablerFallback).to.eq('dns');
  });

  it('should pass only origins from prebid refererInfo to fetch data', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234
    }, {
      reachedTop: true,
      isAmp: false,
      numIframes: 1,
      stack: ['https://top.com/article?secret=1#frag', 'https://frame.com/secret-frame'],
      topmostLocation: 'https://top.com/article?secret=1#frag',
      location: 'https://top.com/article?secret=1#frag',
      canonicalUrl: 'https://top.com/secret-canonical',
      page: 'https://top.com/secret-canonical',
      domain: 'top.com',
      ref: 'https://referrer.com/search?q=secret',
      legacy: {referer: 'https://top.com/article?secret=1'}
    });

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.refererInfo).to.eql({
      topmostLocation: 'https://top.com',
      ref: 'https://referrer.com',
      reachedTop: true,
      numIframes: 1,
      stack: ['https://top.com', 'https://frame.com']
    });
    expect(JSON.stringify(registerObj)).to.not.include('secret');
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

  it('should pass enablerVersion from prebid config to fetch data', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234,
      enablerVersion: '1.0.101'
    }, {});

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.enablerVersion).to.eq('1.0.101');
    expect(registerObj.sourceConfiguration.options.enablerVersion).to.eq('1.0.101');
  });

  it('should not set enablerVersion when prebid config has none', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234
    }, {});

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.enablerVersion).to.be.undefined;
  });

  it('should ignore enablerVersion that is not a string', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234,
      enablerVersion: 101
    }, {});

    await instanceStub.instanceRegistered();

    const registerObj = instanceStub.register.firstCall.firstArg;
    expect(registerObj.fetchIdData.enablerVersion).to.be.undefined;
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
