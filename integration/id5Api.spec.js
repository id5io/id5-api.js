import puppeteer from 'puppeteer-core';
import chromePaths from 'chrome-paths';
import mockttp from 'mockttp';
import tmp from 'tmp-promise';
import path from 'path';
import {fileURLToPath} from 'url';
import chai, {expect} from 'chai';
import {version} from '../generated/version.js';
import chaiDateTime from 'chai-datetime';
import {readFile} from 'fs/promises';
import isDocker from 'is-docker';
/**
 * If you want to debug in the browser, you can use "devtools: true" in
 * the launch configuration and block the browser using
 * await browser.waitForTarget(() => false, { timeout: 0 });
 * Also increase the timeout for the tests to a very large value.
 */

chai.use(chaiDateTime);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ID5_API_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', 'dist', 'id5-api.js');
const ID5_ESP_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', 'dist', 'esp.js');

const DAYS_TO_MILLISECONDS = (60 * 60 * 24 * 1000);
const MOCK_FETCH_RESPONSE = {
  'created_at': '2021-05-26T20:08:13Z',
  'id5_consent': true,
  'universal_uid': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*LTzsUTSrz4juTlKvKoO0brhnjXyuZIGHv44Iqf4TzN0AAGwYr9heNFf7GF6QAMRq',
  'signature': 'ID5_AQo_xCuSjJ3KsW8cOsbHs1d3AvFDad0XrupUgd5LBsLV0v0pXmrYt0AbE_8WeU_nRC2Bbmif8GPKtcHFpAl4wLo',
  'cascade_needed': false,
  'privacy': {
    'jurisdiction': 'gdpr',
    'id5_consent': true
  },
  'ext': {
    'linkType': 2
  }
};
const MOCK_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://my-publisher-website.net',
  'Access-Control-Allow-Credentials': 'true'
};
const MOCK_LB_RESPONSE = {
  'lb': 'LB_DATA'
};

// Note: do not use lambda syntax in describes. https://mochajs.org/#arrow-functions
describe('The ID5 API', function () {
  let browser, server, CONSTANTS, profileDir, caFingerprint;

  this.timeout(30000);

  async function startBrowser() {
    profileDir = await tmp.dir({unsafeCleanup: true});
    const args = [
      `--proxy-server=localhost:${server.port}`,
      `--ignore-certificate-errors-spki-list=${caFingerprint}`,
      `--user-data-dir=${profileDir.path}`,
      '--no-first-run',
      '--disable-features=site-per-process',
    ];

    if (isDocker()) {
      args.push('--no-sandbox');
    }

    browser = await puppeteer.launch({
      // headless: false,
      executablePath: chromePaths.chrome,
      // devtools: true,
      args,
    });
  }

  async function stopBrowser() {
    await browser.close();
    await profileDir.cleanup();
  }

  before(async () => {
    CONSTANTS = JSON.parse(await readFile(path.join(SCRIPT_DIR,
      '..', 'lib', 'constants.json')));

    // Create a proxy server with a self-signed HTTPS CA certificate:
    const https = await mockttp.generateCACertificate();
    server = mockttp.getLocal({
      https,
      // debug: true
    });
    caFingerprint = mockttp.generateSPKIFingerprint(https.cert);

    await server.start();
  });

  after(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    // The API under test
    await server.forGet('https://cdn.id5-sync.com/api/integration/id5-api.js')
      .thenFromFile(200, ID5_API_JS_FILE);
    await server.forGet('https://cdn.id5-sync.com/api/integration/esp.js')
      .thenFromFile(200, ID5_ESP_JS_FILE);
    await server.forGet('/favicon.ico').thenReply(204);
    await startBrowser();
  });

  afterEach(async () => {
    await stopBrowser();
  });

  describe('when included directly in the publishers page', function () {
    beforeEach(async () => {
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'integration.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      const TEST_REFERER_PAGE_PATH = path.join(SCRIPT_DIR, 'referer.html');
      await server.forGet('https://referer-page.com')
        .thenFromFile(200, TEST_REFERER_PAGE_PATH);
    });

    afterEach(async () => {
      await server.reset();
    });

    it('can succesfully retrieve an ID, store in browser and fire callback', async () => {
      const mockId5 = await server.forPost('https://id5-sync.com/g/v2/99.json')
        .thenJson(200, MOCK_FETCH_RESPONSE, MOCK_CORS_HEADERS);
      const mockLbEndpoint = await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
      const mockDummyImage = await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
      const page = await browser.newPage();
      await page.goto('https://referer-page.com');
      await page.waitForSelector('p#done');

      const id5FetchRequests = await mockId5.getSeenRequests();
      expect(id5FetchRequests).to.have.lengthOf(1);
      const lbRequests = await mockLbEndpoint.getSeenRequests();
      expect(lbRequests).to.have.lengthOf(1);

      const requestBody = await id5FetchRequests[0].body.getJson();
      expect(requestBody.partner).to.equal(99); // from integration.html
      expect(requestBody.v).to.equal(version);
      expect(requestBody.id5cdn).to.equal(true);
      expect(requestBody.top).to.equal(1);
      expect(requestBody.localStorage).to.equal(1);
      expect(requestBody.o).to.equal('api');
      expect(requestBody.u).to.equal('https://my-publisher-website.net/');
      expect(requestBody.tml).to.equal('https://my-publisher-website.net/');
      expect(requestBody.cu).to.equal('https://www.id5.io/');
      expect(requestBody.ref).to.equal('https://referer-page.com/');
      expect(requestBody.segments).to.deep.equal([{destination: '22', ids: ['abc']}]);
      expect(requestBody.ua).to.be.a('string');
      expect(requestBody.extensions.lb).to.equal('LB_DATA'); // from MOCK_LB_RESPONSE
      expect(requestBody.extensions.lbCDN).to.equal('%%LB_CDN%%'); // lbCDN substitution macro

      // from integration.html
      expect(requestBody.gdpr_consent).to.equal(
        'CPBZjR9PBZjR9AKAZAENBMCsAP_AAH_AAAqIHWtf_X_fb39j-_59_9t0eY1f9_7_v-0zjhfds-8Nyf_X_L8X42M7vF36pq4KuR4Eu3LBIQFlHOHUTUmw6okVrTPsak2Mr7NKJ7LEinMbe2dYGHtfn9VTuZKYr97s___z__-__v__79f_r-3_3_vp9X---_e_V3dgdYASYal8BFmJY4Ek0aVQogQhXEh0AoAKKEYWiawgJXBTsrgI9QQMAEBqAjAiBBiCjFgEAAAAASURASAHggEQBEAgABACpAQgAIkAQWAFgYBAAKAaFgBFAEIEhBkcFRymBARItFBPJWAJRd7GGEIZRYAUCj-iowEAAAAA.cAAAAAAAAAAA');

      // Check local storage items with some puppeteer magic
      const id5idRaw = await page.evaluate(() => localStorage.getItem('id5id'));
      const id5idJson = JSON.parse(decodeURIComponent(id5idRaw));
      expect(id5idJson).to.eql(MOCK_FETCH_RESPONSE);

      const NOW = Date.now();

      // For comparing timestamps we use an interval of 30s of uncertainty
      const id5idExpRaw = await page.evaluate(() => localStorage.getItem('id5id_exp'));
      const ID5_EXPIRE_DAYS = CONSTANTS.STORAGE_CONFIG.ID5.expiresDays;
      expect(new Date(id5idExpRaw)).to.be.withinTime(
        new Date(NOW - 30000 + ID5_EXPIRE_DAYS * DAYS_TO_MILLISECONDS),
        new Date(NOW + ID5_EXPIRE_DAYS * DAYS_TO_MILLISECONDS));

      const lastRaw = await page.evaluate(() => localStorage.getItem('id5id_last'));
      expect(new Date(lastRaw)).to.be.closeToTime(new Date(NOW), 30);

      const lastExpRaw = await page.evaluate(() => localStorage.getItem('id5id_last_exp'));
      const LAST_EXPIRE_DAYS = CONSTANTS.STORAGE_CONFIG.LAST.expiresDays;
      expect(new Date(lastExpRaw)).to.be.withinTime(
        new Date(NOW - 30000 + LAST_EXPIRE_DAYS * DAYS_TO_MILLISECONDS),
        new Date(NOW + LAST_EXPIRE_DAYS * DAYS_TO_MILLISECONDS));

      const dummyImageRequests = await mockDummyImage.getSeenRequests();
      expect(dummyImageRequests).to.have.lengthOf(1);
      expect(dummyImageRequests[0].url).to.equal(
        'https://dummyimage.com/600x200?text=' + MOCK_FETCH_RESPONSE.universal_uid);
    });
  });

  describe('in a non-friendly iframe', function () {
    const NON_FRIENDLY_MOCK_CORS_HEADERS = {
      'Access-Control-Allow-Origin': 'https://non-friendly-stuff.com',
      'Access-Control-Allow-Credentials': 'true'
    };

    beforeEach(async () => {
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'nonFriendlyIframeTop.html');
      const TEST_IFRAME_PATH = path.join(SCRIPT_DIR, 'nonFriendlyIframeContent.html');
      await server.forGet('https://my-iframe-website.net').thenFromFile(200, TEST_PAGE_PATH);
      await server.forGet('https://non-friendly-stuff.com').thenFromFile(200, TEST_IFRAME_PATH);
    });

    afterEach(async () => {
      await server.reset();
    });

    it('reports it cannot use localStorage but detects referrer', async () => {
      const mockId5 = await server.forPost('https://id5-sync.com/g/v2/99.json')
        .thenJson(200, MOCK_FETCH_RESPONSE, NON_FRIENDLY_MOCK_CORS_HEADERS);
      await server.forGet('https://dummyimage.com/600x200').thenReply(200, '');
      const page = await browser.newPage();
      await page.goto('https://my-iframe-website.net');
      const frame = page.mainFrame().childFrames()[0];
      await frame.waitForSelector('#done');

      expect(frame.url()).to.equal('https://non-friendly-stuff.com/');

      const id5SyncRequests = await mockId5.getSeenRequests();
      expect(id5SyncRequests).to.have.lengthOf(1);

      const requestBody = await id5SyncRequests[0].body.getJson();
      expect(requestBody.top).to.equal(1);
      expect(requestBody.localStorage).to.equal(0);
      expect(requestBody.tml).to.equal('https://my-iframe-website.net/');

      // Check there is no id5 stuff in the iframe local storage
      const id5idRaw = await frame.evaluate(() => localStorage.getItem('id5id'));
      expect(id5idRaw).to.equal(null);
    });
  });

  describe('esp.js', function () {
    afterEach(async () => {
      await server.reset();
    });

    it('can integrate succesfully with google ESP', async () => {
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'esp.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      const mockId5 = await server.forPost('https://id5-sync.com/g/v2/99.json')
        .thenJson(200, MOCK_FETCH_RESPONSE, MOCK_CORS_HEADERS);
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');

      const espSignal = await page.evaluate(async () =>
        window.googletag.encryptedSignalProviders[0].collectorFunction());
      expect(espSignal).to.equal(MOCK_FETCH_RESPONSE.universal_uid);

      const id5FetchRequests = await mockId5.getSeenRequests();
      expect(id5FetchRequests).to.have.lengthOf(1);
    });

    it('calls the API endpoint to increment metrics if no config detected', async () => {
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'esp_no_config.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      const mockId5 = await server.forGet('https://id5-sync.com/api/esp/increment')
        .thenReply(204, undefined, MOCK_CORS_HEADERS);
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');

      await page.evaluate(async () => {
        try {
          await window.googletag.encryptedSignalProviders[0].collectorFunction();
        } catch (ignore) {
        }
      });
      const id5Requests = await mockId5.getSeenRequests();
      expect(id5Requests).to.have.lengthOf(1);
      expect(id5Requests[0].url).to.equal('https://id5-sync.com/api/esp/increment?counter=no-config');
    });
  });

  describe('Diagnostics', function () {
    afterEach(async () => {
      await server.reset();
    });

    it('should publish measurements after fixed delay', async () => {
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'diagnostics.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
      await server.forPost('https://id5-sync.com/g/v2/99.json')
        .thenJson(200, MOCK_FETCH_RESPONSE, MOCK_CORS_HEADERS);
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
      const diagnosticsEndpoint = await server.forPost('https://diagnostics.id5-sync.com/measurements')
        .thenJson(202, '', MOCK_CORS_HEADERS);
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');

      return awaitRequestAt(diagnosticsEndpoint)
        .then(diagnosticsRequests => {
          expect(diagnosticsRequests).has.lengthOf(1);
          return diagnosticsRequests[0].body.getJson();
        })
        .then(onlyRequest => {
          expect(onlyRequest.measurements.length).is.eq(5);

          verifyMeasurement(onlyRequest.measurements[0], 'id5.api.instance.load.delay', 'TIMER');
          verifyMeasurement(onlyRequest.measurements[1], 'id5.api.invocation.count', 'SUMMARY');
          verifyMeasurement(onlyRequest.measurements[2], 'id5.api.consent.request.time', 'TIMER', {requestType: 'static'});
          verifyMeasurement(onlyRequest.measurements[3], 'id5.api.extensions.call.time', 'TIMER');
          verifyMeasurement(onlyRequest.measurements[4], 'id5.api.fetch.call.time', 'TIMER', {status: 'success'});
        });
    });

    it('should publish measurements before unload', async () => {
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'diagnostics_on_unload.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
      let fetchEndpoint = await server.forPost('https://id5-sync.com/g/v2/99.json')
        .thenJson(200, MOCK_FETCH_RESPONSE, MOCK_CORS_HEADERS);
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
      const diagnosticsEndpoint = await server.forPost('https://diagnostics.id5-sync.com/measurements')
        .thenJson(202, '', MOCK_CORS_HEADERS);
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');
      await awaitRequestAt(fetchEndpoint);
      await page.reload();
      return awaitRequestAt(diagnosticsEndpoint)
        .then(diagnosticsRequests => {
          expect(diagnosticsRequests).has.lengthOf(1);
          return diagnosticsRequests[0].body.getJson();
        })
        .then(onlyRequest => {
          expect(onlyRequest.measurements.length).is.eq(5);

          verifyMeasurement(onlyRequest.measurements[0], 'id5.api.instance.load.delay', 'TIMER');
          verifyMeasurement(onlyRequest.measurements[1], 'id5.api.invocation.count', 'SUMMARY');
          verifyMeasurement(onlyRequest.measurements[2], 'id5.api.consent.request.time', 'TIMER', {requestType: 'static'});
          verifyMeasurement(onlyRequest.measurements[3], 'id5.api.extensions.call.time', 'TIMER');
          verifyMeasurement(onlyRequest.measurements[4], 'id5.api.fetch.call.time', 'TIMER', {status: 'success'});
        });
    });
  });

  function verifyMeasurement(measurement, name, type, tags = {}) {
    expect(measurement.name).is.eq(name);
    expect(measurement.type).is.eq(type);
    expect(measurement.tags).is.deep.eq({
      version: version,
      partner: '99',
      source: 'api',
      tml: 'https://my-publisher-website.net/',
      ...tags
    });
    expect(measurement.values.length).is.eq(1);
    expect(measurement.values[0].value).is.not.eq(null);
    expect(measurement.values[0].timestamp).is.not.eq(null);
  }

  function awaitRequestAt(endpoint) {
    return new Promise((resolve, reject) => {
      let waitForRequest = async function () {
        let requests = await endpoint.getSeenRequests();
        if (requests && requests.length > 0) {
          return resolve(requests);
        } else {
          setTimeout(waitForRequest, 100);
        }
      };
      waitForRequest();
    });
  }
});
