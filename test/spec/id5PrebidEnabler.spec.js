import sinon from 'sinon';
import {Id5PrebidEnabler, Id5ScopedPrebidEnabler, installEnabler} from '../../src/id5PrebidEnabler.js';
import {version} from '../../generated/version.js';

const PARTNER = 173;
const PRIMARY_MODULE_URL = 'https://cdn.example.com/api/1.0/id5PrebidModule.js';
const ENABLER_SRC = 'https://cdn.example.com/id5-prebid-enabler.js';

function fakePbjs() {
  const config = {};
  const listeners = [];
  const pbjs = {
    version: '11.41.0',
    userIds: {},
    que: {push: command => command()},
    setConfig: sinon.spy(update => {
      Object.assign(config, update);
      listeners
        .filter(listener => update[listener.topic] !== undefined)
        .forEach(listener => listener.callback({[listener.topic]: config[listener.topic]}));
    }),
    getConfig: (topic, listener) => {
      if (typeof listener !== 'function') {
        return config[topic];
      }
      const subscription = {topic, callback: listener};
      listeners.push(subscription);
      return () => listeners.splice(listeners.indexOf(subscription), 1);
    },
    refreshUserIds: sinon.spy(() => Promise.resolve({})),
    getUserIds: () => pbjs.userIds,
    getUserIdsAsync: () => Promise.resolve(pbjs.userIds)
  };
  return pbjs;
}

function entryOnPage(pbjs, changes) {
  const userSync = pbjs.getConfig('userSync');
  Object.assign(userSync.userIds.find(entry => entry.name === 'id5Id'), changes);
  pbjs.setConfig({userSync});
  pbjs.setConfig.resetHistory();
}

function lastUserSync(pbjs) {
  return pbjs.setConfig.lastCall.firstArg.userSync;
}

function id5Entry(pbjs) {
  return lastUserSync(pbjs).userIds.find(entry => entry.name === 'id5Id');
}

describe('ID5 Prebid enabler', function () {
  /** @type {Id5PrebidEnabler} */
  let enabler;
  let pbjs;
  let windowObj;

  let warn;

  beforeEach(function () {
    warn = sinon.stub(console, 'warn');
    pbjs = fakePbjs();
    windowObj = {pbjs, document: window.document};
    enabler = new Id5PrebidEnabler(windowObj);
    enabler.setup({externalModuleUrl: PRIMARY_MODULE_URL});
    warn.resetHistory();
  });

  afterEach(function () {
    warn.restore();
  });

  it('is globally available', function () {
    expect(window.id5PrebidEnabler).to.be.an('object');
    expect(window.id5PrebidEnabler.version).to.eq(version);
  });

  it('runs a queued command straight away', function () {
    const command = sinon.spy();

    enabler.que.push(command);

    expect(command).to.have.been.calledWith(enabler);
  });

  it('keeps going when a queued command throws', function () {
    const command = sinon.spy();

    enabler.que.push(() => {
      throw new Error('boom');
    });
    enabler.que.push(command);

    expect(command).to.have.been.calledWith(enabler);
  });

  describe('configureUserIdModule', function () {
    it('configures the submodule from the partner alone', async function () {
      expect(await enabler.configureUserIdModule({partner: PARTNER})).to.be.true;

      const entry = id5Entry(pbjs);
      expect(entry.params.partner).to.eq(PARTNER);
      expect(entry.params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(entry.params.configUrl).to.eq('https://prebid.id5-tech.io/v1/config');
      expect(entry.storage).to.deep.eq({type: 'html5', name: 'id5id', expires: 90});
    });

    it('accepts the parameters under params', async function () {
      await enabler.configureUserIdModule({params: {partner: PARTNER, pd: 'some-pd'}});

      expect(id5Entry(pbjs).params).to.include({partner: PARTNER, pd: 'some-pd'});
    });

    it('passes every submodule parameter through', async function () {
      const params = {
        partner: PARTNER,
        pd: 'some-pd',
        provider: 'some-provider',
        abTesting: {enabled: true, controlGroupPct: 0.1},
        disableExtensions: true,
        canCookieSync: true,
        gamTargetingPrefix: 'id5',
        exposeTargeting: true,
        multiplexing: {disabled: true},
        diagnostics: {publishingDisabled: true},
        segments: [{destination: '22', ids: ['a']}],
        disableUaHints: true,
        idLookupMode: true,
        configUrl: 'https://id.example.com/config/prebid',
        id5ApiBaseUrl: 'https://id.example.com',
        somethingAddedLater: 'kept'
      };

      await enabler.configureUserIdModule({params});

      expect(id5Entry(pbjs).params).to.include(params);
    });

    it('takes the entry level configuration', async function () {
      await enabler.configureUserIdModule({
        partner: PARTNER,
        storage: {type: 'cookie', name: 'id5id', expires: 30},
        bidders: ['appnexus'],
        auctionDelay: 300,
        syncDelay: 100
      });

      const userSync = lastUserSync(pbjs);
      expect(userSync.auctionDelay).to.eq(300);
      expect(userSync.syncDelay).to.eq(100);
      expect(id5Entry(pbjs).storage).to.deep.eq({type: 'cookie', name: 'id5id', expires: 30});
      expect(id5Entry(pbjs).bidders).to.deep.eq(['appnexus']);
    });

    it('leaves the delays alone when they are not given', async function () {
      await enabler.configureUserIdModule({partner: PARTNER});

      expect(lastUserSync(pbjs)).to.not.have.property('auctionDelay');
      expect(lastUserSync(pbjs)).to.not.have.property('syncDelay');
    });

    it('keeps the rest of the userSync configuration', async function () {
      pbjs.setConfig({
        userSync: {
          syncEnabled: true,
          syncsPerBidder: 3,
          filterSettings: {iframe: {bidders: '*', filter: 'include'}},
          auctionDelay: 300,
          idPriority: {id5id: ['id5Id']}
        }
      });
      pbjs.setConfig.resetHistory();

      await enabler.configureUserIdModule({partner: PARTNER});

      const userSync = lastUserSync(pbjs);
      expect(userSync.syncEnabled).to.be.true;
      expect(userSync.syncsPerBidder).to.eq(3);
      expect(userSync.filterSettings).to.deep.eq({iframe: {bidders: '*', filter: 'include'}});
      expect(userSync.auctionDelay).to.eq(300);
      expect(userSync.idPriority).to.deep.eq({id5id: ['id5Id']});
    });

    it('keeps the user IDs of other providers', async function () {
      pbjs.setConfig({userSync: {userIds: [{name: 'sharedId'}]}});

      await enabler.configureUserIdModule({partner: PARTNER});

      expect(lastUserSync(pbjs).userIds.map(entry => entry.name)).to.deep.eq(['sharedId', 'id5Id']);
    });

    it('passes the entries of other providers through unchanged', async function () {
      const sharedId = {
        name: 'sharedId',
        storage: {type: 'cookie', name: '_pubcid', expires: 30},
        bidders: ['appnexus']
      };
      const criteo = {name: 'criteo', params: {pd: 'theirs'}, auctionDelay: 50};
      pbjs.setConfig({userSync: {userIds: [sharedId, criteo]}});
      pbjs.setConfig.resetHistory();

      await enabler.configureUserIdModule({partner: PARTNER});

      expect(lastUserSync(pbjs).userIds.filter(entry => entry.name !== 'id5Id'))
        .to.deep.eq([sharedId, criteo]);
    });

    it('sets no configuration beyond userSync', async function () {
      pbjs.setConfig({bidderTimeout: 1500, currency: {adServerCurrency: 'EUR'}});
      pbjs.setConfig.resetHistory();

      await enabler.configureUserIdModule({partner: PARTNER});

      expect(pbjs.setConfig).to.have.been.calledOnce;
      expect(Object.keys(pbjs.setConfig.lastCall.firstArg)).to.deep.eq(['userSync']);
      expect(pbjs.getConfig('bidderTimeout')).to.eq(1500);
      expect(pbjs.getConfig('currency')).to.deep.eq({adServerCurrency: 'EUR'});
    });

    it('does not override a target the publisher set', async function () {
      await enabler.configureUserIdModule({partner: PARTNER, externalModuleUrl: 'https://publisher.example.com/id5PrebidModule.js'});

      expect(id5Entry(pbjs).params.externalModuleUrl).to.eq('https://publisher.example.com/id5PrebidModule.js');
    });

    it('leaves the submodule on its own implementation when the external module is off', async function () {
      enabler.setup({useExternalModule: false});

      expect(await enabler.configureUserIdModule({partner: PARTNER})).to.be.true;

      expect(id5Entry(pbjs).params).to.not.have.property('externalModuleUrl');
      expect(id5Entry(pbjs).params.partner).to.eq(PARTNER);
    });

    it('configures the module and the config endpoint together', async function () {
      enabler.setup({configUrl: 'https://id.example.com/config/prebid'});

      await enabler.configureUserIdModule({partner: PARTNER});

      const params = id5Entry(pbjs).params;
      expect(params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(params.configUrl).to.eq('https://id.example.com/config/prebid');
    });

    it('points at the module this release ships with when no URL is given', async function () {
      const untouched = new Id5PrebidEnabler(windowObj);

      await untouched.configureUserIdModule({partner: PARTNER});

      expect(id5Entry(pbjs).params.externalModuleUrl)
        .to.eq('https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js');
    });

    it('reports the enabler version it was configured by', async function () {
      await enabler.configureUserIdModule({partner: PARTNER});

      expect(id5Entry(pbjs).params.enablerVersion).to.eq(version);
    });

    it('replaces an enabler version the publisher set', async function () {
      await enabler.configureUserIdModule({partner: PARTNER, enablerVersion: '0.0.1'});

      expect(id5Entry(pbjs).params.enablerVersion).to.eq(version);
    });

    it('reports where it was loaded from and how that address was found', async function () {
      const loaded = new Id5PrebidEnabler({pbjs, document: {currentScript: {src: ENABLER_SRC, fallback: 'dns'}}});

      await loaded.configureUserIdModule({partner: PARTNER});

      const params = id5Entry(pbjs).params;
      expect(params.enablerSrc).to.eq(ENABLER_SRC);
      expect(params.enablerFallback).to.eq('dns');
    });

    it('reports the address alone when the page did not fall back', async function () {
      const loaded = new Id5PrebidEnabler({pbjs, document: {currentScript: {src: ENABLER_SRC}}});

      await loaded.configureUserIdModule({partner: PARTNER});

      const params = id5Entry(pbjs).params;
      expect(params.enablerSrc).to.eq(ENABLER_SRC);
      expect(params).to.not.have.property('enablerFallback');
    });

    it('leaves the source out when the script element carries none', async function () {
      await enabler.configureUserIdModule({partner: PARTNER});

      const params = id5Entry(pbjs).params;
      expect(params).to.not.have.property('enablerSrc');
      expect(params).to.not.have.property('enablerFallback');
    });

    it('replaces a source the publisher set with its own', async function () {
      const loaded = new Id5PrebidEnabler({pbjs, document: {currentScript: {src: ENABLER_SRC}}});

      await loaded.configureUserIdModule({partner: PARTNER, enablerSrc: 'https://publisher.example.com/enabler.js', enablerFallback: 'dns'});

      const params = id5Entry(pbjs).params;
      expect(params.enablerSrc).to.eq(ENABLER_SRC);
      expect(params).to.not.have.property('enablerFallback');
    });

    it('drops a source the publisher set when its own script element carries none', async function () {
      await enabler.configureUserIdModule({partner: PARTNER, enablerSrc: 'https://publisher.example.com/enabler.js', enablerFallback: 'dns'});

      const params = id5Entry(pbjs).params;
      expect(params).to.not.have.property('enablerSrc');
      expect(params).to.not.have.property('enablerFallback');
    });

    it('reports that nothing was pushed when Prebid cannot take a configuration', async function () {
      const withoutSetConfig = new Id5PrebidEnabler({pbjs: {que: {push: command => command()}}, document: window.document});

      expect(await withoutSetConfig.configureUserIdModule({partner: PARTNER})).to.be.false;
    });

    it('rejects a configuration without a partner', async function () {
      expect(await enabler.configureUserIdModule({pd: 'some-pd'})).to.be.false;
      expect(pbjs.setConfig).to.not.have.been.called;
    });

  });

  describe('reconfigureUserIdModule', function () {
    beforeEach(function () {
      pbjs.setConfig({
        userSync: {
          auctionDelay: 300,
          userIds: [
            {name: 'sharedId'},
            {
              name: 'id5Id',
              params: {partner: PARTNER, pd: 'publisher-pd', externalModuleUrl: 'https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js'},
              storage: {type: 'html5', name: 'id5id', expires: 30}
            }
          ]
        }
      });
      pbjs.setConfig.resetHistory();
    });

    it('replaces the routing and keeps the rest of the static configuration', async function () {
      expect(await enabler.reconfigureUserIdModule()).to.be.true;

      const entry = id5Entry(pbjs);
      expect(entry.params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(entry.params.pd).to.eq('publisher-pd');
      expect(entry.storage).to.deep.eq({type: 'html5', name: 'id5id', expires: 30});
      expect(lastUserSync(pbjs).userIds.map(e => e.name)).to.deep.eq(['sharedId', 'id5Id']);
    });

    it('keeps the rest of the userSync configuration', async function () {
      pbjs.setConfig({
        userSync: {
          ...pbjs.getConfig('userSync'),
          syncsPerBidder: 5,
          filterSettings: {image: {bidders: '*', filter: 'include'}}
        }
      });
      pbjs.setConfig.resetHistory();

      await enabler.reconfigureUserIdModule();

      const userSync = lastUserSync(pbjs);
      expect(userSync.auctionDelay).to.eq(300);
      expect(userSync.syncsPerBidder).to.eq(5);
      expect(userSync.filterSettings).to.deep.eq({image: {bidders: '*', filter: 'include'}});
    });

    it('sets no configuration beyond userSync', async function () {
      pbjs.setConfig({bidderTimeout: 1500});
      pbjs.setConfig.resetHistory();

      await enabler.reconfigureUserIdModule();

      expect(pbjs.setConfig).to.have.been.calledOnce;
      expect(Object.keys(pbjs.setConfig.lastCall.firstArg)).to.deep.eq(['userSync']);
      expect(pbjs.getConfig('bidderTimeout')).to.eq(1500);
    });

    it('keeps the entry level configuration the page set', async function () {
      const userSync = pbjs.getConfig('userSync');
      const onPage = userSync.userIds.find(entry => entry.name === 'id5Id');
      onPage.bidders = ['appnexus'];
      onPage.value = {id5id: {uid: 'from-the-page'}};
      pbjs.setConfig({userSync});
      pbjs.setConfig.resetHistory();

      await enabler.reconfigureUserIdModule();

      const entry = id5Entry(pbjs);
      expect(entry.bidders).to.deep.eq(['appnexus']);
      expect(entry.value).to.deep.eq({id5id: {uid: 'from-the-page'}});
      expect(entry.storage).to.deep.eq({type: 'html5', name: 'id5id', expires: 30});
    });

    it('overrides the static parameters it is given', async function () {
      await enabler.reconfigureUserIdModule({params: {pd: 'fresh-pd'}});

      expect(id5Entry(pbjs).params.pd).to.eq('fresh-pd');
    });

    it('keeps the targets the call is given', async function () {
      await enabler.reconfigureUserIdModule({
        externalModuleUrl: 'https://cdn.publisher.com/id5PrebidModule.js',
        configUrl: 'https://config.publisher.com/v1/config'
      });

      const params = id5Entry(pbjs).params;
      expect(params.externalModuleUrl).to.eq('https://cdn.publisher.com/id5PrebidModule.js');
      expect(params.configUrl).to.eq('https://config.publisher.com/v1/config');
    });

    it('reports that nothing was pushed when Prebid cannot take the configuration', async function () {
      pbjs.setConfig = undefined;

      expect(await enabler.reconfigureUserIdModule()).to.be.false;
    });

    it('hands Prebid a new params object, so the change is visible to it', async function () {
      const before = pbjs.getConfig('userSync').userIds.find(e => e.name === 'id5Id').params;

      await enabler.reconfigureUserIdModule();

      expect(id5Entry(pbjs).params).to.not.equal(before);
    });

    it('takes the external module off the page when it is off', async function () {
      enabler.setup({useExternalModule: false});

      await enabler.reconfigureUserIdModule();

      expect(id5Entry(pbjs).params).to.not.have.property('externalModuleUrl');
      expect(id5Entry(pbjs).params.pd).to.eq('publisher-pd');
    });

    it('puts the module and the config endpoint on the page together', async function () {
      enabler.setup({configUrl: 'https://id.example.com/config/prebid'});

      await enabler.reconfigureUserIdModule();

      const params = id5Entry(pbjs).params;
      expect(params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(params.configUrl).to.eq('https://id.example.com/config/prebid');
      expect(params.pd).to.eq('publisher-pd');
    });

    it('reports the enabler version on a configuration the page built', async function () {
      await enabler.reconfigureUserIdModule();

      expect(id5Entry(pbjs).params.enablerVersion).to.eq(version);
    });

    it('reports where it was loaded from on a configuration the page built', async function () {
      const loaded = new Id5PrebidEnabler({pbjs, document: {currentScript: {src: ENABLER_SRC, fallback: 'dns'}}});
      loaded.setup({externalModuleUrl: PRIMARY_MODULE_URL});

      await loaded.reconfigureUserIdModule();

      const params = id5Entry(pbjs).params;
      expect(params.enablerSrc).to.eq(ENABLER_SRC);
      expect(params.enablerFallback).to.eq('dns');
    });

    it('drops the source left by an earlier enabler when its own script element carries none', async function () {
      pbjs.setConfig({
        userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER, enablerSrc: ENABLER_SRC, enablerFallback: 'dns'}}]}
      });
      pbjs.setConfig.resetHistory();

      await enabler.reconfigureUserIdModule();

      const params = id5Entry(pbjs).params;
      expect(params).to.not.have.property('enablerSrc');
      expect(params).to.not.have.property('enablerFallback');
    });

    it('drops a fallback left by an earlier enabler when it was loaded from the primary host', async function () {
      pbjs.setConfig({
        userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER, enablerSrc: 'https://cdn.example.com/found/id5-prebid-enabler.js', enablerFallback: 'dns'}}]}
      });
      pbjs.setConfig.resetHistory();
      const loaded = new Id5PrebidEnabler({pbjs, document: {currentScript: {src: ENABLER_SRC}}});
      loaded.setup({externalModuleUrl: PRIMARY_MODULE_URL});

      await loaded.reconfigureUserIdModule();

      const params = id5Entry(pbjs).params;
      expect(params.enablerSrc).to.eq(ENABLER_SRC);
      expect(params).to.not.have.property('enablerFallback');
    });

    it('replaces the enabler version left by an earlier release', async function () {
      pbjs.setConfig({
        userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER, enablerVersion: '0.0.1'}}]}
      });
      pbjs.setConfig.resetHistory();

      await enabler.reconfigureUserIdModule();

      expect(id5Entry(pbjs).params.enablerVersion).to.eq(version);
    });

    it('refreshes the submodule when told to', async function () {
      enabler.setup({refreshOnReconfigure: true});

      await enabler.reconfigureUserIdModule();

      expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
    });

    it('leaves the submodule alone when told to', async function () {
      enabler.setup({refreshOnReconfigure: false});

      await enabler.reconfigureUserIdModule();

      expect(pbjs.refreshUserIds).to.not.have.been.called;
    });

    describe("refreshOnReconfigure: 'auto'", function () {
      const SERVED = {id5id: {uid: 'ID5*stored'}};

      beforeEach(function () {
        enabler.setup({refreshOnReconfigure: 'auto'});
      });

      it('is what the enabler does by default', function () {
        expect(new Id5PrebidEnabler(windowObj)._settings.refreshOnReconfigure).to.eq('auto');
      });

      it('refreshes when no ID5 ID is served', async function () {
        pbjs.userIds = {};

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      });

      it('refreshes when Prebid serves a stored ID the ID5 module did not provide here', async function () {
        pbjs.userIds = SERVED;

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      });

      it('leaves a submodule whose ID the ID5 module provided here alone', async function () {
        pbjs.userIds = SERVED;
        windowObj.id5Prebid = {integration: {userIdReady: true}};

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.not.have.been.called;
      });

      it('refreshes when the ID5 module provided no ID here', async function () {
        pbjs.userIds = SERVED;
        windowObj.id5Prebid = {integration: {userIdReady: false}};

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      });

      it('leaves a submodule running Prebid\'s own implementation with an ID served alone', async function () {
        enabler.setup({useExternalModule: false});
        pbjs.userIds = SERVED;

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.not.have.been.called;
      });

      it('refreshes a submodule running Prebid\'s own implementation with no ID served', async function () {
        enabler.setup({useExternalModule: false});
        pbjs.userIds = {};

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      });

      it('leaves a page that turned userSync.autoRefresh on alone', async function () {
        pbjs.userIds = {};
        pbjs.setConfig({userSync: {...pbjs.getConfig('userSync'), autoRefresh: true}});
        pbjs.setConfig.resetHistory();

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.not.have.been.called;
      });

      it('refreshes a page that leaves userSync.autoRefresh off', async function () {
        pbjs.userIds = {};
        pbjs.setConfig({userSync: {...pbjs.getConfig('userSync'), autoRefresh: false}});
        pbjs.setConfig.resetHistory();

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      });

      it('refreshes a User ID module that has not settled, which Prebid drops before its first run', async function () {
        const clock = sinon.useFakeTimers();
        try {
          pbjs.getUserIdsAsync = () => new Promise(() => {});

          const reconfigured = enabler.reconfigureUserIdModule();
          await clock.tickAsync(3000);

          expect(await reconfigured).to.be.true;
          expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
        } finally {
          clock.restore();
        }
      });

      it('refreshes when the wait on the User ID module is rejected', async function () {
        pbjs.getUserIdsAsync = () => Promise.reject(new Error('canceled'));

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      });

      it('refreshes on a Prebid.js that cannot report when its User ID module finished', async function () {
        pbjs.getUserIdsAsync = undefined;

        await enabler.reconfigureUserIdModule();

        expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      });
    });

    it('reads a partner given as a string as the partner on the page', async function () {
      expect(await enabler.reconfigureUserIdModule({partner: String(PARTNER)})).to.be.true;
      expect(id5Entry(pbjs).params.partner).to.eq(String(PARTNER));
    });

    it('refuses a partner other than the one the page configures', async function () {
      expect(await enabler.reconfigureUserIdModule({partner: 999})).to.be.false;
      expect(pbjs.setConfig).to.not.have.been.called;
      expect(pbjs.refreshUserIds).to.not.have.been.called;
    });

    it('takes the partner of a page that configures none', async function () {
      entryOnPage(pbjs, {params: {}});

      expect(await enabler.reconfigureUserIdModule({partner: 999})).to.be.true;
      expect(id5Entry(pbjs).params.partner).to.eq(999);
    });

    it('reports when the page carries no ID5 configuration', async function () {
      pbjs.setConfig({userSync: {userIds: [{name: 'sharedId'}]}});
      pbjs.setConfig.resetHistory();

      enabler.setup({waitForConfigMs: 0});

      expect(await enabler.reconfigureUserIdModule()).to.be.false;
      expect(pbjs.setConfig).to.not.have.been.called;
    });

    it('waits for a page that configures the submodule later', async function () {
      pbjs.setConfig({userSync: {userIds: [{name: 'sharedId'}]}});
      pbjs.setConfig.resetHistory();

      enabler.setup({waitForConfigMs: 1000});
      const reconfigured = enabler.reconfigureUserIdModule();
      setTimeout(() => pbjs.setConfig({
        userSync: {userIds: [{name: 'sharedId'}, {name: 'id5Id', params: {partner: PARTNER, pd: 'late-pd'}}]}
      }), 20);

      expect(await reconfigured).to.be.true;
      expect(id5Entry(pbjs).params.pd).to.eq('late-pd');
      expect(id5Entry(pbjs).params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
    });

    it('gives up once the deadline passes', async function () {
      pbjs.setConfig({userSync: {userIds: [{name: 'sharedId'}]}});
      pbjs.setConfig.resetHistory();

      enabler.setup({waitForConfigMs: 150});

      expect(await enabler.reconfigureUserIdModule()).to.be.false;
      expect(pbjs.setConfig).to.not.have.been.called;
    });
  });

  describe('installEnabler', function () {
    let scope;

    beforeEach(function () {
      scope = {pbjs, document: window.document};
    });

    it('runs the commands queued on the install stub', function () {
      const command = sinon.spy();
      scope.id5PrebidEnabler = {que: [command]};

      const installed = installEnabler(scope);

      expect(installed).to.be.instanceOf(Id5PrebidEnabler);
      expect(scope.id5PrebidEnabler).to.equal(installed);
      expect(command).to.have.been.calledWith(installed);
    });

    it('keeps the enabler of this release when the script is loaded twice', function () {
      const first = installEnabler(scope);

      const second = installEnabler(scope);

      expect(second).to.equal(first);
      expect(scope.id5PrebidEnabler).to.equal(first);
    });

    it('keeps a newer enabler already on the page', function () {
      const newer = {version: '99.0.0', que: {push: () => {}}};
      scope.id5PrebidEnabler = newer;

      expect(installEnabler(scope)).to.equal(newer);
      expect(scope.id5PrebidEnabler).to.equal(newer);
    });

    it('takes over the settings of an older release it replaces', async function () {
      const older = new Id5PrebidEnabler(scope);
      older.version = '0.0.1';
      older.setup({externalModuleUrl: PRIMARY_MODULE_URL, configUrl: 'https://config.publisher.com/v1/config'});
      scope.id5PrebidEnabler = older;

      const installed = installEnabler(scope);

      expect(installed).to.not.equal(older);
      await installed.configureUserIdModule({partner: PARTNER});
      const params = id5Entry(pbjs).params;
      expect(params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(params.configUrl).to.eq('https://config.publisher.com/v1/config');
    });

    it('leaves the external module on the ID5 global alone', function () {
      scope.id5Prebid = {version: '1.0.0', integration: {}};

      installEnabler(scope);

      expect(scope.id5Prebid).to.deep.equal({version: '1.0.0', integration: scope.id5Prebid.integration});
      expect(scope.id5PrebidEnabler).to.be.instanceOf(Id5PrebidEnabler);
    });

    it('leaves the ID5 global of the external module to the module', function () {
      installEnabler(scope);

      expect(scope.id5Prebid).to.be.undefined;
    });
  });

  describe('setup', function () {
    it('keeps its settings for every later call', async function () {
      enabler.setup({configUrl: 'https://id.example.com/config/prebid', useExternalModule: false});

      await enabler.configureUserIdModule({partner: PARTNER});
      await enabler.reconfigureUserIdModule();

      const params = id5Entry(pbjs).params;
      expect(params.configUrl).to.eq('https://id.example.com/config/prebid');
      expect(params).to.not.have.property('externalModuleUrl');
    });

    it('reports that it is deprecated and points at what replaces it', function () {
      expect(enabler.setup({})).to.equal(enabler);

      expect(warn).to.have.been.calledOnce;
      expect(warn.firstCall.firstArg).to.include('setup() is deprecated');
      expect(warn.firstCall.firstArg).to.include('createForDefault(');
      expect(warn.firstCall.firstArg).to.include('createForNamed(');
    });

    it('says nothing for a call that does not use it', async function () {
      await enabler.configureUserIdModule({partner: PARTNER});
      await enabler.createForDefault().configureUserIdModule({partner: PARTNER});
      await enabler.createForNamed('pbjs').configureUserIdModule({partner: PARTNER});

      expect(warn).to.not.have.been.called;
    });
  });

  describe('createForDefault', function () {
    it('makes an enabler of its own', function () {
      const scoped = enabler.createForDefault();

      expect(scoped).to.be.instanceOf(Id5ScopedPrebidEnabler);
      expect(scoped).to.not.equal(enabler);
    });

    it('configures the Prebid.js the page is found to run', async function () {
      expect(await enabler.createForDefault().configureUserIdModule({partner: PARTNER})).to.be.true;

      expect(id5Entry(pbjs).params.partner).to.eq(PARTNER);
      expect(id5Entry(pbjs).params).to.not.have.property('pbjsGlobal');
    });

    it('configures a Prebid.js that registered a name of its own', async function () {
      const renamed = fakePbjs();
      const onRenamed = new Id5PrebidEnabler({_pbjsGlobals: ['customPrebid'], customPrebid: renamed, document: window.document});

      expect(await onRenamed.createForDefault().configureUserIdModule({partner: PARTNER})).to.be.true;

      expect(id5Entry(renamed).params.partner).to.eq(PARTNER);
    });

    it('takes its own settings on top of the defaults', async function () {
      await enabler.createForDefault({configUrl: 'https://id.example.com/config/prebid', useExternalModule: false})
        .configureUserIdModule({partner: PARTNER});

      const params = id5Entry(pbjs).params;
      expect(params.configUrl).to.eq('https://id.example.com/config/prebid');
      expect(params).to.not.have.property('externalModuleUrl');
    });

    it('keeps the settings of setup() out of the enabler it makes', async function () {
      enabler.setup({configUrl: 'https://id.example.com/config/prebid'});

      await enabler.createForDefault().configureUserIdModule({partner: PARTNER});

      const params = id5Entry(pbjs).params;
      expect(params.configUrl).to.eq('https://prebid.id5-tech.io/v1/config');
      expect(params.externalModuleUrl).to.eq('https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js');
    });

    it('keeps its settings out of the shared enabler', async function () {
      await enabler.createForDefault({configUrl: 'https://id.example.com/config/prebid'}).configureUserIdModule({partner: PARTNER});
      await enabler.configureUserIdModule({partner: 42});

      expect(id5Entry(pbjs).params.configUrl).to.eq('https://prebid.id5-tech.io/v1/config');
    });

    it('reconfigures and refreshes on its own settings', async function () {
      pbjs.setConfig({userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER}}]}});

      expect(await enabler.createForDefault({refreshOnReconfigure: true}).reconfigureUserIdModule()).to.be.true;

      expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
    });
  });

  describe('createForNamed', function () {
    let theirs;
    let ours;
    let scope;
    let shared;

    beforeEach(function () {
      theirs = fakePbjs();
      ours = fakePbjs();
      scope = {pbjs: theirs, customPrebid: ours, document: window.document};
      shared = new Id5PrebidEnabler(scope);
    });

    // Prebid.js keeps the global and the queue it finds under its name, and registers that name
    function load(onScope, name) {
      const que = onScope[name]?.que || [];
      const pbjsGlobal = Object.assign(onScope[name] = onScope[name] || {}, fakePbjs(), {que});
      onScope._pbjsGlobals = (onScope._pbjsGlobals || []).concat(name);
      que.forEach(command => command());
      return pbjsGlobal;
    }

    it('makes an enabler of its own', function () {
      const scoped = shared.createForNamed('customPrebid');

      expect(scoped).to.be.instanceOf(Id5ScopedPrebidEnabler);
      expect(scoped).to.not.equal(shared);
      expect(scoped.version).to.eq(version);
    });

    it('takes no call without a name', function () {
      expect(() => shared.createForNamed()).to.throw('createForNamed()');
      expect(() => shared.createForNamed('')).to.throw('createForNamed()');
      expect(() => shared.createForNamed({useExternalModule: false})).to.throw('createForNamed()');
    });

    it('configures the named global instead of the one on the page', async function () {
      expect(await shared.createForNamed('customPrebid').configureUserIdModule({partner: PARTNER})).to.be.true;

      expect(theirs.setConfig).to.not.have.been.called;
      expect(id5Entry(ours).params.partner).to.eq(PARTNER);
    });

    it('reports the name to the submodule', async function () {
      await shared.createForNamed('customPrebid').configureUserIdModule({partner: PARTNER});

      expect(id5Entry(ours).params.pbjsGlobal).to.eq('customPrebid');
    });

    it('reports no name for the Prebid.js the page is found to run', async function () {
      await shared.configureUserIdModule({partner: PARTNER});

      expect(id5Entry(theirs).params).to.not.have.property('pbjsGlobal');
    });

    it('leaves the calls made on the shared enabler on the Prebid.js of the page', async function () {
      await shared.createForNamed('customPrebid').configureUserIdModule({partner: PARTNER});
      await shared.configureUserIdModule({partner: 42});

      expect(id5Entry(ours).params.partner).to.eq(PARTNER);
      expect(id5Entry(theirs).params.partner).to.eq(42);
    });

    it('takes its own settings on top of the defaults', async function () {
      await shared.createForNamed('customPrebid', {configUrl: 'https://id.example.com/config/prebid', useExternalModule: false})
        .configureUserIdModule({partner: PARTNER});

      const params = id5Entry(ours).params;
      expect(params.configUrl).to.eq('https://id.example.com/config/prebid');
      expect(params).to.not.have.property('externalModuleUrl');
    });

    it('keeps the settings of setup() out of the enabler it makes', async function () {
      shared.setup({configUrl: 'https://id.example.com/config/prebid', externalModuleUrl: PRIMARY_MODULE_URL});

      await shared.createForNamed('customPrebid').configureUserIdModule({partner: PARTNER});

      const params = id5Entry(ours).params;
      expect(params.configUrl).to.eq('https://prebid.id5-tech.io/v1/config');
      expect(params.externalModuleUrl).to.eq('https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js');
    });

    it('keeps its settings out of the shared enabler', async function () {
      await shared.createForNamed('customPrebid', {configUrl: 'https://id.example.com/config/prebid'})
        .configureUserIdModule({partner: PARTNER});
      await shared.configureUserIdModule({partner: 42});

      expect(id5Entry(theirs).params.configUrl).to.eq('https://prebid.id5-tech.io/v1/config');
    });

    it('resolves the targets of its own settings', async function () {
      const scoped = shared.createForNamed('customPrebid', {externalModuleUrl: PRIMARY_MODULE_URL, configUrl: 'https://id.example.com/config/prebid'});

      expect(await scoped.getExternalModuleUrl()).to.eq(PRIMARY_MODULE_URL);
      expect(await scoped.getConfigUrl()).to.eq('https://id.example.com/config/prebid');
    });

    it('reports where the shared enabler was loaded from', async function () {
      const loaded = new Id5PrebidEnabler({customPrebid: ours, document: {currentScript: {src: ENABLER_SRC, fallback: 'dns'}}});

      await loaded.createForNamed('customPrebid').configureUserIdModule({partner: PARTNER});

      const params = id5Entry(ours).params;
      expect(params.enablerSrc).to.eq(ENABLER_SRC);
      expect(params.enablerFallback).to.eq('dns');
    });

    it('reconfigures and refreshes the named global', async function () {
      ours.setConfig({userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER}}]}});
      theirs.setConfig({userSync: {userIds: [{name: 'id5Id', params: {partner: 99}}]}});

      expect(await shared.createForNamed('customPrebid', {externalModuleUrl: PRIMARY_MODULE_URL, refreshOnReconfigure: true})
        .reconfigureUserIdModule()).to.be.true;

      expect(id5Entry(ours).params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(id5Entry(ours).params.pbjsGlobal).to.eq('customPrebid');
      expect(id5Entry(theirs).params).to.not.have.property('externalModuleUrl');
      expect(ours.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      expect(theirs.refreshUserIds).to.not.have.been.called;
    });

    it('waits for a named global the page has nothing under yet', async function () {
      const emptyScope = {document: window.document};

      const configured = new Id5PrebidEnabler(emptyScope).createForNamed('customPrebid').configureUserIdModule({partner: PARTNER});
      expect(emptyScope.pbjs).to.be.undefined;
      expect(emptyScope.customPrebid.que).to.be.an('array').with.lengthOf(1);

      const loaded = load(emptyScope, 'customPrebid');

      expect(await configured).to.be.true;
      expect(id5Entry(loaded).params.partner).to.eq(PARTNER);
    });

    it('queues once on a global several enablers wait for', function () {
      const emptyScope = {document: window.document};
      const onEmpty = new Id5PrebidEnabler(emptyScope);

      onEmpty.createForNamed('customPrebid').configureUserIdModule({partner: PARTNER});
      onEmpty.createForNamed('customPrebid').configureUserIdModule({partner: PARTNER});

      expect(emptyScope.customPrebid.que).to.have.lengthOf(1);
    });

    it('configures two of three Prebid.js instances, whatever order they load in', async function () {
      const emptyScope = {document: window.document};
      const onEmpty = new Id5PrebidEnabler(emptyScope);

      const first = onEmpty.createForNamed('customPrebidA').configureUserIdModule({partner: PARTNER});
      const second = onEmpty.createForNamed('customPrebidB').configureUserIdModule({partner: 42});

      // both are awaited, and no global the enabler was not pointed at is touched
      expect(emptyScope.customPrebidA.que).to.have.lengthOf(1);
      expect(emptyScope.customPrebidB.que).to.have.lengthOf(1);
      expect(emptyScope.pbjs).to.be.undefined;

      // the one asked for last loads first, with an instance nobody asked for in between
      const b = load(emptyScope, 'customPrebidB');
      const c = load(emptyScope, 'customPrebidC');
      const a = load(emptyScope, 'customPrebidA');

      expect(await first).to.be.true;
      expect(await second).to.be.true;
      expect(id5Entry(a).params.partner).to.eq(PARTNER);
      expect(id5Entry(b).params.partner).to.eq(42);
      expect(c.setConfig).to.not.have.been.called;
      expect(emptyScope.pbjs).to.be.undefined;
    });
  });

  describe('createFor', function () {
    let theirs;
    let ours;
    let shared;

    beforeEach(function () {
      theirs = fakePbjs();
      ours = fakePbjs();
      shared = new Id5PrebidEnabler({pbjs: theirs, document: window.document});
    });

    it('takes a Prebid.js instance alone', function () {
      expect(shared.createFor(ours)).to.be.instanceOf(Id5ScopedPrebidEnabler);
      expect(() => shared.createFor('customPrebid')).to.throw('createFor()');
      expect(() => shared.createFor()).to.throw('createFor()');
      expect(() => shared.createForNamed(ours)).to.throw('createForNamed()');
    });

    it('configures the instance it is given instead of the one on the page', async function () {
      expect(await shared.createFor(ours).configureUserIdModule({partner: PARTNER})).to.be.true;

      expect(theirs.setConfig).to.not.have.been.called;
      expect(id5Entry(ours).params.partner).to.eq(PARTNER);
    });

    it('reports no name for the instance it is given', async function () {
      await shared.createFor(ours).configureUserIdModule({partner: PARTNER});

      expect(id5Entry(ours).params).to.not.have.property('pbjsGlobal');
    });

    it('takes its own settings on top of the defaults', async function () {
      shared.setup({configUrl: 'https://id.example.com/config/prebid'});

      await shared.createFor(ours, {useExternalModule: false}).configureUserIdModule({partner: PARTNER});

      const params = id5Entry(ours).params;
      expect(params.configUrl).to.eq('https://prebid.id5-tech.io/v1/config');
      expect(params).to.not.have.property('externalModuleUrl');
    });

    it('reconfigures and refreshes the instance it is given', async function () {
      ours.setConfig({userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER}}]}});
      theirs.setConfig({userSync: {userIds: [{name: 'id5Id', params: {partner: 99}}]}});

      expect(await shared.createFor(ours, {externalModuleUrl: PRIMARY_MODULE_URL, refreshOnReconfigure: true})
        .reconfigureUserIdModule()).to.be.true;

      expect(id5Entry(ours).params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(id5Entry(theirs).params).to.not.have.property('externalModuleUrl');
      expect(ours.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
      expect(theirs.refreshUserIds).to.not.have.been.called;
    });

    it('waits for the instance it is given to load', async function () {
      const loading = {que: []};

      const configured = shared.createFor(loading).configureUserIdModule({partner: PARTNER});
      expect(loading.que).to.have.lengthOf(1);
      Object.assign(loading, fakePbjs(), {que: loading.que});
      loading.que.forEach(command => command());

      expect(await configured).to.be.true;
      expect(id5Entry(loading).params.partner).to.eq(PARTNER);
      expect(theirs.setConfig).to.not.have.been.called;
    });

    it('keeps parallel calls on their own Prebid.js', async function () {
      const first = shared.createFor(ours).configureUserIdModule({partner: PARTNER});
      const second = shared.createForDefault().configureUserIdModule({partner: 99});
      await Promise.all([first, second]);

      expect(id5Entry(ours).params.partner).to.eq(PARTNER);
      expect(id5Entry(theirs).params.partner).to.eq(99);
    });
  });

  describe('buildUserIdConfig', function () {
    it('returns the entry configureUserIdModule() writes', async function () {
      const built = await enabler.buildUserIdConfig({partner: PARTNER, pd: 'some-pd', storage: {type: 'html5', name: 'custom', expires: 30}});
      await enabler.configureUserIdModule({partner: PARTNER, pd: 'some-pd', storage: {type: 'html5', name: 'custom', expires: 30}});

      expect(built).to.deep.equal(id5Entry(pbjs));
      expect(built.name).to.eq('id5Id');
      expect(built.params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(built.params.configUrl).to.eq('https://prebid.id5-tech.io/v1/config');
      expect(built.params.enablerVersion).to.eq(version);
    });

    it('leaves Prebid.js alone, on the page or not', async function () {
      const emptyScope = {document: window.document};

      expect(await enabler.buildUserIdConfig({partner: PARTNER})).to.be.an('object');
      expect(await new Id5PrebidEnabler(emptyScope).createForNamed('customPrebid').buildUserIdConfig({partner: PARTNER})).to.be.an('object');

      expect(pbjs.setConfig).to.not.have.been.called;
      expect(emptyScope).to.have.all.keys('document');
    });

    it('returns nothing without a partner', async function () {
      expect(await enabler.buildUserIdConfig({pd: 'some-pd'})).to.be.undefined;
    });

    it('builds on the settings and the Prebid.js of the enabler it is called on', async function () {
      const entry = await enabler.createForNamed('customPrebid', {configUrl: 'https://id.example.com/config/prebid', useExternalModule: false})
        .buildUserIdConfig({partner: PARTNER});

      expect(entry.params.configUrl).to.eq('https://id.example.com/config/prebid');
      expect(entry.params).to.not.have.property('externalModuleUrl');
      expect(entry.params.pbjsGlobal).to.eq('customPrebid');
    });

    it('leaves auctionDelay and syncDelay out of the entry', async function () {
      const entry = await enabler.buildUserIdConfig({partner: PARTNER, auctionDelay: 50, syncDelay: 100});

      expect(entry).to.have.all.keys('name', 'params', 'storage');
      expect(entry.params).to.not.have.any.keys('auctionDelay', 'syncDelay');
    });
  });

  describe('rebuildUserIdConfig', function () {
    beforeEach(function () {
      pbjs.setConfig({
        userSync: {
          syncDelay: 500,
          userIds: [
            {name: 'sharedId', storage: {type: 'cookie', name: '_sharedid', expires: 365}},
            {name: 'id5Id', params: {partner: PARTNER, pd: 'page-pd'}, storage: {type: 'html5', name: 'custom', expires: 30}}
          ]
        }
      });
      pbjs.setConfig.resetHistory();
    });

    it('returns the entry reconfigureUserIdModule() writes', async function () {
      const {rebuilt} = await enabler.rebuildUserIdConfig({pd: 'call-pd'});

      expect(pbjs.setConfig).to.not.have.been.called;
      await enabler.createForDefault({externalModuleUrl: PRIMARY_MODULE_URL, refreshOnReconfigure: false}).reconfigureUserIdModule({pd: 'call-pd'});
      expect(rebuilt).to.deep.equal(id5Entry(pbjs));
      expect(rebuilt.params.partner).to.eq(PARTNER);
      expect(rebuilt.params.pd).to.eq('call-pd');
      expect(rebuilt.params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
      expect(rebuilt.storage).to.deep.equal({type: 'html5', name: 'custom', expires: 30});
    });

    it('neither sets the configuration nor refreshes the submodule', async function () {
      await enabler.createForDefault({refreshOnReconfigure: true}).rebuildUserIdConfig();

      expect(pbjs.setConfig).to.not.have.been.called;
      expect(pbjs.refreshUserIds).to.not.have.been.called;
    });

    it('returns the Prebid.js and the entry the rebuilt one replaces', async function () {
      const onPage = pbjs.getConfig('userSync').userIds[1];

      const found = await enabler.rebuildUserIdConfig();

      expect(found).to.have.all.keys('pbjs', 'existing', 'rebuilt');
      expect(found.pbjs).to.equal(pbjs);
      expect(found.existing).to.equal(onPage);
      expect(found.rebuilt).to.not.equal(onPage);
    });

    it('leaves the entry on the page as it is', async function () {
      const {existing} = await enabler.rebuildUserIdConfig({pd: 'call-pd'});

      expect(existing).to.deep.equal({name: 'id5Id', params: {partner: PARTNER, pd: 'page-pd'}, storage: {type: 'html5', name: 'custom', expires: 30}});
    });

    it('lets the page replace the ID5 entry alone', async function () {
      const eidsFunction = () => [{source: 'example.com'}];
      pbjs.setConfig({
        userSync: {
          syncDelay: 500,
          userIds: [
            {name: 'pubProvidedId', params: {eidsFunction}},
            {name: 'id5Id', params: {partner: PARTNER}},
            {name: 'sharedId'}
          ]
        }
      });

      const {pbjs: foundPbjs, existing, rebuilt} = await enabler.rebuildUserIdConfig();
      const userSync = foundPbjs.getConfig('userSync');
      foundPbjs.setConfig({userSync: {...userSync, userIds: userSync.userIds.map(entry => entry === existing ? rebuilt : entry)}});

      const written = lastUserSync(pbjs);
      expect(written.syncDelay).to.eq(500);
      expect(written.userIds.map(entry => entry.name)).to.eql(['pubProvidedId', 'id5Id', 'sharedId']);
      expect(written.userIds[0].params.eidsFunction).to.equal(eidsFunction);
      expect(written.userIds[1]).to.equal(rebuilt);
      expect(rebuilt.params.externalModuleUrl).to.eq(PRIMARY_MODULE_URL);
    });

    it('waits for the page to configure the submodule', async function () {
      pbjs.setConfig({userSync: {userIds: [{name: 'sharedId'}]}});

      const rebuilt = enabler.createForDefault({waitForConfigMs: 1000}).rebuildUserIdConfig();
      setTimeout(() => pbjs.setConfig({userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER, pd: 'late-pd'}}]}}), 50);

      expect((await rebuilt).rebuilt.params.pd).to.eq('late-pd');
    });

    it('returns nothing when the page has no ID5 entry', async function () {
      pbjs.setConfig({userSync: {userIds: [{name: 'sharedId'}]}});

      expect(await enabler.createForDefault({waitForConfigMs: 0}).rebuildUserIdConfig()).to.be.undefined;
    });

    it('returns nothing for another partner than the one on the page', async function () {
      expect(await enabler.rebuildUserIdConfig({partner: 42})).to.be.undefined;
    });

    it('reads the entry from the Prebid.js of the enabler it is called on', async function () {
      const ours = fakePbjs();
      ours.setConfig({userSync: {userIds: [{name: 'id5Id', params: {partner: 99}}]}});
      const scope = {pbjs, customPrebid: ours, document: window.document};

      const found = await new Id5PrebidEnabler(scope).createForNamed('customPrebid').rebuildUserIdConfig();
      const rebuilt = found.rebuilt;

      expect(found.pbjs).to.equal(ours);
      expect(rebuilt.params.partner).to.eq(99);
      expect(rebuilt.params.pbjsGlobal).to.eq('customPrebid');
    });
  });

  describe('target helpers', function () {
    it('resolves the external module URL', async function () {
      expect(await enabler.getExternalModuleUrl()).to.eq(PRIMARY_MODULE_URL);
    });

    it('resolves the config URL', async function () {
      enabler.setup({configUrl: 'https://id.example.com/config/prebid'});

      expect(await enabler.getConfigUrl()).to.eq('https://id.example.com/config/prebid');
    });
  });
});
