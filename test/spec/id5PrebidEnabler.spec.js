import sinon from 'sinon';
import {Id5PrebidEnabler, installEnabler} from '../../src/id5PrebidEnabler.js';
import {version} from '../../generated/version.js';

const PARTNER = 173;
const PRIMARY_MODULE_URL = 'https://cdn.example.com/api/1.0/id5PrebidModule.js';

function fakePbjs() {
  const config = {};
  const listeners = [];
  return {
    version: '11.41.0',
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
    refreshUserIds: sinon.spy(() => Promise.resolve({}))
  };
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

  beforeEach(function () {
    pbjs = fakePbjs();
    windowObj = {pbjs, document: window.document};
    enabler = new Id5PrebidEnabler(windowObj);
    enabler.setup({externalModuleUrl: PRIMARY_MODULE_URL});
  });

  it('is globally available', function () {
    expect(window.id5Prebid.enabler).to.be.an('object');
    expect(window.id5Prebid.enabler.version).to.eq(version);
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

    it('replaces the enabler version left by an earlier release', async function () {
      pbjs.setConfig({
        userSync: {userIds: [{name: 'id5Id', params: {partner: PARTNER, enablerVersion: '0.0.1'}}]}
      });
      pbjs.setConfig.resetHistory();

      await enabler.reconfigureUserIdModule();

      expect(id5Entry(pbjs).params.enablerVersion).to.eq(version);
    });

    it('refreshes the submodule only when asked to', async function () {
      await enabler.reconfigureUserIdModule();
      expect(pbjs.refreshUserIds).to.not.have.been.called;

      enabler.setup({refreshOnReconfigure: true});
      await enabler.reconfigureUserIdModule();
      expect(pbjs.refreshUserIds).to.have.been.calledWith({submoduleNames: ['id5Id']});
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
      scope.id5Prebid = {enabler: {que: [command]}};

      const installed = installEnabler(scope);

      expect(installed).to.be.instanceOf(Id5PrebidEnabler);
      expect(scope.id5Prebid.enabler).to.equal(installed);
      expect(command).to.have.been.calledWith(installed);
    });

    it('keeps the enabler of this release when the script is loaded twice', function () {
      const first = installEnabler(scope);

      const second = installEnabler(scope);

      expect(second).to.equal(first);
      expect(scope.id5Prebid.enabler).to.equal(first);
    });

    it('keeps a newer enabler already on the page', function () {
      const newer = {version: '99.0.0', que: {push: () => {}}};
      scope.id5Prebid = {enabler: newer};

      expect(installEnabler(scope)).to.equal(newer);
      expect(scope.id5Prebid.enabler).to.equal(newer);
    });

    it('takes over the settings of an older release it replaces', async function () {
      const older = new Id5PrebidEnabler(scope);
      older.version = '0.0.1';
      older.setup({externalModuleUrl: PRIMARY_MODULE_URL, configUrl: 'https://config.publisher.com/v1/config'});
      scope.id5Prebid = {enabler: older};

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

      expect(scope.id5Prebid.version).to.eq('1.0.0');
      expect(scope.id5Prebid.integration).to.exist;
      expect(scope.id5Prebid.enabler).to.be.instanceOf(Id5PrebidEnabler);
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
