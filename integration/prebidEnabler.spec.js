import mockttp from 'mockttp';
import path from 'path';
import {fileURLToPath} from 'url';
import {expect} from 'chai';
import {version} from '../generated/version.js';
import {buildBrowser, getDebugFlag} from './integrationUtils.mjs';

/**
 * If you want to debug in the browser, you can use "devtools: true" in
 * the launch configuration and block the browser using
 * await browser.waitForTarget(() => false, { timeout: 0 });
 */
const _DEBUG = getDebugFlag();

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = path.join(SCRIPT_DIR, 'resources', 'prebidEnabler');
const TARGET_DIR = _DEBUG ? 'dev' : 'dist';
const ENABLER_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', TARGET_DIR, 'id5-prebid-enabler.js');
const ENABLER_URL = 'https://cdn.delivrfy.cloud/api/integration/id5-prebid-enabler.js';
const MODULE_URL = 'https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js';
const CONFIG_URL = 'https://prebid.id5-tech.io/v1/config';
const PAGE_URL = 'https://my-publisher-website.net';

function id5Entry(userSync) {
  return userSync.userIds.find(entry => entry.name === 'id5Id');
}

// Note: do not use lambda syntax in describes. https://mochajs.org/#arrow-functions
describe('The Prebid enabler', function () {
  let browser, server;

  this.timeout((_DEBUG ? 3000 : 30) * 1000);

  beforeEach(async () => {
    const https = await mockttp.generateCACertificate();
    server = mockttp.getLocal({https, debug: _DEBUG});

    await server.start();
    await server.forGet(ENABLER_URL).thenFromFile(200, ENABLER_JS_FILE);
    await server.forGet('https://cdn.delivrfy.cloud/test/pbjsStub.js')
      .thenFromFile(200, path.join(RESOURCES_DIR, 'pbjsStub.js'));
    await server.forGet('/favicon.ico').thenReply(204);

    browser = await buildBrowser(https.cert, server.port, _DEBUG);
  });

  afterEach(async () => {
    await browser.close();
    await server.stop();
  });

  async function openPage(fileName) {
    await server.forGet(PAGE_URL).thenFromFile(200, path.join(RESOURCES_DIR, fileName));
    const page = await browser.newPage();
    await page.goto(PAGE_URL);
    return page;
  }

  describe('configureUserIdModule', function () {
    it('configures the submodule when it runs before Prebid is there', async () => {
      const page = await openPage('configure-before-pbjs.html');

      expect(await page.evaluate(async () => window.configured)).to.be.true;

      const userSync = await page.evaluate(() => window.pbjs.getConfig('userSync'));
      const entry = id5Entry(userSync);
      expect(entry.params.partner).to.eq(99);
      expect(entry.params.externalModuleUrl).to.eq(MODULE_URL);
      expect(entry.params.configUrl).to.eq(CONFIG_URL);
      expect(entry.storage).to.eql({type: 'html5', name: 'id5id', expires: 90});
      expect(await page.evaluate(() => window.id5Prebid.enabler.version)).to.eq(version);
    });

    it('configures the submodule when Prebid is already up', async () => {
      const page = await openPage('configure-after-pbjs.html');

      expect(await page.evaluate(async () => window.configured)).to.be.true;

      const userSync = await page.evaluate(() => window.pbjs.getConfig('userSync'));
      const entry = id5Entry(userSync);
      expect(entry.params.partner).to.eq(99);
      expect(entry.params.pd).to.eq('publisher-pd');
      expect(entry.params.externalModuleUrl).to.eq(MODULE_URL);
      expect(entry.bidders).to.eql(['appnexus']);
      expect(userSync.userIds.map(userId => userId.name)).to.eql(['sharedId', 'id5Id']);
      expect(userSync.syncsPerBidder).to.eq(7);
    });

    it('sets nothing but the userSync topic', async () => {
      const page = await openPage('configure-after-pbjs.html');
      await page.evaluate(async () => window.configured);

      const calls = await page.evaluate(() => window.setConfigCalls);
      const fromEnabler = calls.slice(1);
      expect(fromEnabler).to.have.lengthOf(1);
      expect(Object.keys(fromEnabler[0])).to.eql(['userSync']);
    });
  });

  describe('reconfigureUserIdModule', function () {
    it('waits for a page that configures ID5 after Prebid is up', async () => {
      const page = await openPage('reconfigure-before-pbjs.html');

      expect(await page.evaluate(async () => window.reconfigured)).to.be.true;

      const entry = id5Entry(await page.evaluate(() => window.pbjs.getConfig('userSync')));
      expect(entry.params.externalModuleUrl).to.eq(MODULE_URL);
      expect(entry.params.pd).to.eq('publisher-pd');
      expect(entry.storage).to.eql({type: 'html5', name: 'id5id', expires: 30});
    });

    it('updates the configuration the page already carries', async () => {
      const page = await openPage('reconfigure-after-pbjs.html');

      expect(await page.evaluate(async () => window.reconfigured)).to.be.true;

      const userSync = await page.evaluate(() => window.pbjs.getConfig('userSync'));
      const entry = id5Entry(userSync);
      expect(entry.params.externalModuleUrl).to.eq(MODULE_URL);
      expect(entry.params.configUrl).to.eq(CONFIG_URL);
      expect(entry.params.partner).to.eq(99);
      expect(entry.params.pd).to.eq('publisher-pd');
      expect(entry.bidders).to.eql(['appnexus']);
      expect(entry.storage).to.eql({type: 'html5', name: 'id5id', expires: 30});
      expect(userSync.auctionDelay).to.eq(300);
      expect(userSync.filterSettings).to.eql({image: {bidders: '*', filter: 'include'}});
      expect(userSync.userIds.map(userId => userId.name)).to.eql(['sharedId', 'id5Id']);
    });

    it('does not refresh the submodule unless it is asked to', async () => {
      const page = await openPage('reconfigure-after-pbjs.html');
      await page.evaluate(async () => window.reconfigured);

      expect(await page.evaluate(() => window.refreshUserIdsCalls)).to.be.undefined;
    });
  });
});
