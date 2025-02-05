import mockttp from 'mockttp';
import path from 'path';
import {fileURLToPath} from 'url';
import chai, {expect} from 'chai';
import {version} from '../generated/version.js';
import chaiDateTime from 'chai-datetime';
import {
  buildBrowser,
  getDebugFlag,
  makeMultiFetchResponse,
  MOCK_FETCH_RESPONSE,
  MOCK_ID,
  multiFetchResponseWithCorsAllowed,
  makeCorsHeaders, EIDS, ID5ID_EID
} from './integrationUtils.mjs';

/**
 * If you want to debug in the browser, you can use "devtools: true" in
 * the launch configuration and block the browser using
 * await browser.waitForTarget(() => false, { timeout: 0 });
 */
const _DEBUG = getDebugFlag();

chai.use(chaiDateTime);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = path.join(SCRIPT_DIR, 'resources');
const TARGET_DIR = _DEBUG ? 'dev' : 'dist';
const ID5_API_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', TARGET_DIR, 'id5-api.js');
const ID5_ESP_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', TARGET_DIR, 'esp.js');

const DAYS_TO_MILLISECONDS = (60 * 60 * 24 * 1000);

const MOCK_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://my-publisher-website.net', 'Access-Control-Allow-Credentials': 'true'
};

const MOCK_CORS_ALLOW_ALL_HEADERS = {
  'Access-Control-Allow-Origin': '*'
};

const jsonWithCorsAllowed = (payload, status = 200) => {
  return (request) => {
    return {
      status: status,
      headers: {
        'Access-Control-Allow-Origin': request.headers['origin'], 'Access-Control-Allow-Credentials': 'true'
      },
      json: payload
    };
  };
};

const multiFetchResponseSequence = (payloads, status = 200) => {
  let seq = 0;
  return async request => {
    const response = makeMultiFetchResponse(request, payloads[seq], status, makeCorsHeaders(request));
    seq = seq < payloads.length - 1 ? seq + 1 : 0;
    return response;
  };
};

const multiFetchResponseWithHeaders = (payload, headers) => {
  return async request => makeMultiFetchResponse(request, payload, 200, headers);
};

const MOCK_LB_RESPONSE = {
  'lb': 'LB_DATA'
};

const FETCH_ENDPOINT = 'https://id5-sync.com/gm/v3';

// Note: do not use lambda syntax in describes. https://mochajs.org/#arrow-functions
describe('The ID5 API', function () {
  let browser, server;

  this.timeout((_DEBUG ? 3000 : 30) * 1000);

  beforeEach(async () => {
    // Create a proxy server with a self-signed HTTPS CA certificate:
    const https = await mockttp.generateCACertificate();
    server = mockttp.getLocal({
      https, debug: _DEBUG
    });

    await server.start();
    // The API under test
    await server.forGet('https://cdn.id5-sync.com/api/integration/id5-api.js')
      .thenFromFile(200, ID5_API_JS_FILE);

    await server.forGet('https://cdn.id5-sync.com/api/integration/esp.js')
      .thenFromFile(200, ID5_ESP_JS_FILE);

    await server.forGet('/favicon.ico').thenReply(204);

    browser = await buildBrowser(https.cert, server.port, _DEBUG);
  });

  afterEach(async () => {
    await browser.close();
    await server.stop();
  });

  describe('when included directly in the publishers page', function () {
    let mockLbEndpoint, mockDummyImage;
    beforeEach(async () => {
      mockLbEndpoint = await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);

      await mockBounceEndpoint();
      mockDummyImage = await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
    });

    afterEach(async () => {
      await server.reset();
    });

    it('can succesfully retrieve an ID, store in browser and fire callbacks', async () => {
      const mockId5 = await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));

      await server.forGet('https://referer-page.com')
        .thenReply(200, `
          <!doctype html>
          <html lang="en">
          <head>
              <title>ID5 API Integration Referer</title>
              <meta http-equiv="refresh" content="0; URL=https://my-publisher-website.net" />
          </head>
          <body></body>
          </html>`);

      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'integration.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);

      const page = await browser.newPage();
      await page.goto('https://referer-page.com');
      await page.waitForSelector('p#done');

      const id5FetchRequests = await mockId5.getSeenRequests();
      expect(id5FetchRequests).to.have.lengthOf(1);
      const lbRequests = await mockLbEndpoint.getSeenRequests();
      expect(lbRequests).to.have.lengthOf(1);

      const requestBody = (await id5FetchRequests[0].body.getJson()).requests[0];
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
      const ID5_EXPIRE_DAYS = 90;
      expect(new Date(id5idExpRaw)).to.be.withinTime(
        new Date(NOW - 30000 + ID5_EXPIRE_DAYS * DAYS_TO_MILLISECONDS),
        new Date(NOW + ID5_EXPIRE_DAYS * DAYS_TO_MILLISECONDS));

      const lastRaw = await page.evaluate(() => localStorage.getItem('id5id_last'));
      expect(new Date(lastRaw)).to.be.closeToTime(new Date(NOW), 30);

      const lastExpRaw = await page.evaluate(() => localStorage.getItem('id5id_last_exp'));
      const LAST_EXPIRE_DAYS = 90;
      expect(new Date(lastExpRaw)).to.be.withinTime(
        new Date(NOW - 30000 + LAST_EXPIRE_DAYS * DAYS_TO_MILLISECONDS),
        new Date(NOW + LAST_EXPIRE_DAYS * DAYS_TO_MILLISECONDS));

      const dummyImageRequests = await mockDummyImage.getSeenRequests();
      expect(dummyImageRequests).to.have.lengthOf(1);
      expect(dummyImageRequests[0].url).to.equal('https://dummyimage.com/600x200?text=' + MOCK_ID);

      expect(await page.evaluate(() => window.id5Update)).to.eq(MOCK_ID);
      expect(await page.evaluate(() => window.id5UpdateCallback)).to.eq(1);
      expect(await page.evaluate(() => window.id5idEid)).to.eql(ID5ID_EID);
      expect(await page.evaluate(() => window.id5Eids)).to.eql(EIDS);
    });

    it('can successfully refresh an ID, store in browser and fire callbacks', async () => {
      const mockId5 = await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseSequence([
          {...MOCK_FETCH_RESPONSE},
          {...MOCK_FETCH_RESPONSE, universal_uid: 'ID5*anotherID5Id'}
        ]));

      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'integrationRefresh.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);

      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');
      await page.waitForFunction(() => !!window.id5Refresh);

      expect(await page.evaluate(() => window.id5Refresh)).to.eq('ID5*anotherID5Id');
      expect(await page.evaluate(() => window.id5UpdateCallback)).to.eq(2);

      const id5FetchRequests = await mockId5.getSeenRequests();
      expect(id5FetchRequests).to.have.lengthOf(2);

      const requestBody1 = (await id5FetchRequests[0].body.getJson()).requests[0];
      const requestBody2 = (await id5FetchRequests[1].body.getJson()).requests[0];

      expect(requestBody1.segments).to.deep.eq([{destination: '22', ids: ['abc']}]);
      expect(requestBody2.segments).to.deep.eq([{destination: '24', ids: ['def']}]);
      expect(requestBody2.requestCount).to.be.eq(2);
      expect(requestBody2.refresh).to.be.eq(true);
    });
  });

  describe('with creative restrictions', function () {
    beforeEach(async () => {
      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'creativeRestrictions.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
    });

    afterEach(async () => {
      await server.reset();
    });

    it('can send an event to ID5 backend', async function () {
      const mockId5Event = await server.forPost('https://id5-sync.com/event')
        .thenReply(204, '');

      await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');

      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');
      await page.waitForSelector('p#done');
      await page.waitForSelector('p#done_event');

      const eventRequests = await mockId5Event.getSeenRequests();
      expect(eventRequests).to.have.lengthOf(1);
      expect(eventRequests[0].url).to.eq('https://id5-sync.com/event');

      const requestBody = (await eventRequests[0].body.getJson());
      expect(requestBody.partnerId).to.eq(99);
      expect(requestBody.id5id).to.eq(MOCK_FETCH_RESPONSE.universal_uid);
      expect(requestBody.eventType).to.eq('view');
      expect(requestBody.metadata).to.deep.eq({eventId: 'TEST_TEST'});
    });

    it('does not drop local storage items', async function () {
      await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');

      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');
      await page.waitForSelector('p#done');

      const localStorage = await fetchLocalStorage(page);
      expect(localStorage).to.deep.eq({});
    });
  });

  describe('in a non-friendly iframe', function () {
    const NON_FRIENDLY_MOCK_CORS_HEADERS = {
      'Access-Control-Allow-Origin': 'https://non-friendly-stuff.com',
      'Access-Control-Allow-Credentials': 'true'
    };

    beforeEach(async () => {
      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'nonFriendlyIframeTop.html');
      const TEST_IFRAME_PATH = path.join(RESOURCES_DIR, 'nonFriendlyIframeContent.html');
      await server.forGet('https://my-iframe-website.net').thenFromFile(200, TEST_PAGE_PATH);
      await server.forGet('https://non-friendly-stuff.com').thenFromFile(200, TEST_IFRAME_PATH);
    });

    afterEach(async () => {
      await server.reset();
    });

    it('reports it can use frame localStorage and detects referrer but not uses top localStorage', async () => {
      const mockId5 = await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithHeaders(MOCK_FETCH_RESPONSE, NON_FRIENDLY_MOCK_CORS_HEADERS));
      await server.forGet('https://dummyimage.com/600x200').thenReply(200, '');
      const page = await browser.newPage();
      await page.goto('https://my-iframe-website.net');
      const mainFrame = page.mainFrame();
      const frame = mainFrame.childFrames()[0];
      await frame.waitForSelector('#done');

      expect(frame.url()).to.equal('https://non-friendly-stuff.com/');

      const id5SyncRequests = await mockId5.getSeenRequests();
      expect(id5SyncRequests).to.have.lengthOf(1);

      const requestBody = (await id5SyncRequests[0].body.getJson()).requests[0];
      expect(requestBody.top).to.equal(1);
      expect(requestBody.localStorage).to.equal(1);
      expect(requestBody.tml).to.equal('https://my-iframe-website.net/');

      // Check there is id5 stuff in the iframe local storage but not in mainFrame's storage
      const id5idRawFromIFrame = await frame.evaluate(() => localStorage.getItem('id5id'));
      expect(id5idRawFromIFrame).to.equal(encodeURIComponent(JSON.stringify(MOCK_FETCH_RESPONSE)));

      const id5idRawFromMainFrame = await mainFrame.evaluate(() => localStorage.getItem('id5id'));
      expect(id5idRawFromMainFrame).to.equal(null);
    });
  });

  describe('esp.js', function () {
    afterEach(async () => {
      await server.reset();
    });

    it('can integrate succesfully with google ESP', async () => {
      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'esp.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      const mockId5 = await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');

      const espSignal = await page.evaluate(async () =>
        window.googletag.encryptedSignalProviders[0].collectorFunction());
      expect(espSignal).to.equal(MOCK_FETCH_RESPONSE.universal_uid);

      const id5FetchRequests = await mockId5.getSeenRequests();
      expect(id5FetchRequests).to.have.lengthOf(1);
    });

    it('calls the API endpoint to increment metrics if no config detected', async () => {
      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'esp_no_config.html');
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
          // Continue ignoring the error
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
      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'diagnostics.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);

      await mockBounceEndpoint();
      await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
      const diagnosticsEndpoint = await server.forPost('https://diagnostics.id5-sync.com/measurements')
        .thenJson(202, '', MOCK_CORS_ALLOW_ALL_HEADERS);
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');

      return expectRequestAt(diagnosticsEndpoint)
        .then(diagnosticsRequests => {
          expect(diagnosticsRequests).has.lengthOf(1);
          return diagnosticsRequests[0].body.getJson();
        })
        .then(onlyRequest => {
          expect(onlyRequest.metadata).is.not.eq(undefined);
          expect(onlyRequest.metadata.sampling).is.eq(1);
          expect(onlyRequest.metadata.trigger).is.eq('fixed-time');
          expect(onlyRequest.metadata.fixed_time_msec).is.eq(3100);
          expect(onlyRequest.measurements.length).is.gte(12);
          const commonTags = {
            version: version,
            partner: '99',
            source: 'api',
            tml: 'https://my-publisher-website.net/',
            provider: 'default'
          };
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.instance.load.delay', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.invocation.count', 'SUMMARY', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.consent.request.time', 'TIMER', {
            ...commonTags,
            requestType: 'static',
            success: 'true',
            'TCFv2': 'true'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.consent.wait.time', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.extensions.call.time', 'TIMER', {
            ...commonTags,
            status: 'success',
            extensionType: 'lb'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.extensions.call.time', 'TIMER', {
            ...commonTags,
            status: 'success',
            extensionType: 'bounce'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.call.time', 'TIMER', {
            ...commonTags,
            status: 'success'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.userid.provisioning.delay', 'TIMER', {
            ...commonTags,
            cachedResponseUsed: false,
            callType: 'direct_method',
            isUpdate: false,
            hasOnAvailable: 'true',
            hasOnRefresh: false,
            hasOnUpdate: false,
            provisioner: 'leader',
            hasChanged: 'true'
          });
          verifyContainsMeasurement(onlyRequest.measurements, 'id5.api.instance.partySize', 'SUMMARY');
        });
    });

    it('should publish measurements before unload', async function () {
      this.retries(2); // metrics are triggered by `beforeunload` browser event , in some cases it may be unreliable
      const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'diagnostics_on_unload.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
      const fetchEndpoint = await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
      const diagnosticsEndpoint = await server.forPost('https://diagnostics.id5-sync.com/measurements')
        .thenJson(202, '', MOCK_CORS_ALLOW_ALL_HEADERS);
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');
      await expectRequestAt(fetchEndpoint);
      await page.reload();
      return expectRequestAt(diagnosticsEndpoint)
        .then(diagnosticsRequests => {
          expect(diagnosticsRequests).has.lengthOf(1);
          return diagnosticsRequests[0].body.getJson();
        })
        .then(onlyRequest => {
          expect(onlyRequest.metadata).is.not.eq(undefined);
          expect(onlyRequest.metadata.sampling).is.eq(1);
          expect(onlyRequest.metadata.trigger).is.eq('beforeunload');
          expect(onlyRequest.measurements.length).is.gte(12);
          const commonTags = {
            version: version,
            partner: '99',
            source: 'api',
            tml: 'https://my-publisher-website.net/',
            provider: 'default'
          };
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.instance.load.delay', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.invocation.count', 'SUMMARY', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.consent.request.time', 'TIMER', {
            ...commonTags,
            requestType: 'static',
            success: 'true',
            'TCFv2': 'true'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.consent.wait.time', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.extensions.call.time', 'TIMER', {
            ...commonTags,
            status: 'success',
            extensionType: 'lb'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.call.time', 'TIMER', {
            ...commonTags,
            status: 'success'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.userid.provisioning.delay', 'TIMER', {
            ...commonTags,
            cachedResponseUsed: false,
            callType: 'direct_method',
            isUpdate: false,
            hasOnAvailable: 'true',
            hasOnRefresh: false,
            hasOnUpdate: false,
            provisioner: 'leader',
            hasChanged: 'true'
          });
          verifyContainsMeasurement(onlyRequest.measurements, 'id5.api.instance.partySize', 'SUMMARY');
        });
    });
  });

  describe('with multiplexing enabled', function () {
    let electionNotifyEndpoint;
    let lateJoinerElectionNotifyEndpoint;
    let diagnosticsEndpoint;
    let fetchEndpoint;
    let onAvailableEndpoint;

    beforeEach(async () => {
      const INDEX_PAGE_PATH = path.join(RESOURCES_DIR, 'multiplexing', 'index.html');
      const INDEX_SINGLE_PAGE_PATH = path.join(RESOURCES_DIR, 'multiplexing', 'index-single.html');
      const TEST_HELPER_SCRIPT_PATH = path.join(RESOURCES_DIR, 'multiplexing', 'multiplexing-test-helper.js');
      const LATE_JOINER_INDEX_PAGE_PATH = path.join(RESOURCES_DIR, 'multiplexing', 'index-latejoiner.html');
      const LATE_JOINER_REFRESH_INDEX_PAGE_PATH = path.join(RESOURCES_DIR, 'multiplexing', 'index-latejoiner-refresh.html');
      const SINGLETON_INDEX_PAGE = path.join(RESOURCES_DIR, 'multiplexing', 'index-singleton.html');
      const NF_FRAME_PAGE_PATH = path.join(RESOURCES_DIR, 'multiplexing', 'single-integration.html');
      const F_FRAME_PAGE_PATH = path.join(RESOURCES_DIR, 'multiplexing', 'multiple-integrations.html');

      await server.forGet('https://cdn.id5-sync.com/api/integration/multiplexing-test-helper.js')
        .thenFromFile(200, TEST_HELPER_SCRIPT_PATH);
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, INDEX_PAGE_PATH);
      await server.forGet('https://my-publisher-website.net/single.html')
        .thenFromFile(200, INDEX_SINGLE_PAGE_PATH);
      await server.forGet('https://my-publisher-website.net/late.html')
        .thenFromFile(200, LATE_JOINER_INDEX_PAGE_PATH);
      await server.forGet('https://my-publisher-website.net/late-refresh.html')
        .thenFromFile(200, LATE_JOINER_REFRESH_INDEX_PAGE_PATH);
      await server.forGet('https://my-publisher-website.net/singleton.html')
        .thenFromFile(200, SINGLETON_INDEX_PAGE);
      await server.forGet('https://my-publisher-website.net/multiple-integrations.html')
        .thenFromFile(200, F_FRAME_PAGE_PATH);
      await server.forGet('https://non-friendly-stuff.com')
        .thenFromFile(200, NF_FRAME_PAGE_PATH);
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenCallback(jsonWithCorsAllowed(MOCK_LB_RESPONSE));
      fetchEndpoint = await server.forPost(FETCH_ENDPOINT)
        .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));
      await server.forGet('https://dummyimage.com/600x200')
        .thenCallback(jsonWithCorsAllowed(''));
      diagnosticsEndpoint = await server.forPost('https://diagnostics.id5-sync.com/measurements')
        .thenCallback(jsonWithCorsAllowed('', 202));
      electionNotifyEndpoint = await server.forPost('https://instances.log/on-election')
        .thenCallback(jsonWithCorsAllowed('', 202));
      lateJoinerElectionNotifyEndpoint = await server.forPost('https://instances.log/on-late-joiner-election')
        .thenCallback(jsonWithCorsAllowed('', 202));
      onAvailableEndpoint = await server.forPost('https://instances.log/on-available')
        .thenCallback(jsonWithCorsAllowed('', 202));
    });

    afterEach(async () => {
      await server.reset();
    });

    it('locally stored id5id should be provisioned immediately when visited again the same page', async () => {
      // when
      const leaderElectionDelayMsec = 500;
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net/single.html');
      await expectRequestsAt(fetchEndpoint);
      const firstVisitOnAvailableResult = (await expectRequestsAt(onAvailableEndpoint, 1))[0];
      const firstVisitMeasurementRequest = await ((await expectRequestsAt(diagnosticsEndpoint, 1))[0].body.getJson());
      const firstVistProvisioningMeasurements = verifyContainsMeasurement(firstVisitMeasurementRequest.measurements, 'id5.api.userid.provisioning.delay', 'TIMER');
      expect(firstVistProvisioningMeasurements[0].tags).deep.include({
        cachedResponseUsed: false,
        isUpdate: false,
        provisioner: 'leader',
        hasChanged: 'true'
      });

      // then
      expect(firstVisitOnAvailableResult.uid).is.not.null;

      // when (second visit)
      await page.goto('https://my-publisher-website.net/single.html');

      // then
      const secondVisitOnAvailableResult = (await expectRequestsAt(onAvailableEndpoint, 2))[1];
      expect(secondVisitOnAvailableResult.uid).is.eq(firstVisitOnAvailableResult.uid);
      const secondVisitMeasurementRequest = await ((await expectRequestsAt(diagnosticsEndpoint, 2))[1].body.getJson());

      const secondVisitProvisioningMeasurements = verifyContainsMeasurement(secondVisitMeasurementRequest.measurements, 'id5.api.userid.provisioning.delay', 'TIMER');
      const selfProvisionedMeasurement = secondVisitProvisioningMeasurements[0];
      expect(selfProvisionedMeasurement.tags).deep.include({
        cachedResponseUsed: 'true',
        isUpdate: false,
        hasChanged: 'true',
        provisioner: 'self'
      });
      expect(selfProvisionedMeasurement.values[0].value).is.lessThan(leaderElectionDelayMsec);

      // no more fetch requests received
      expect((await fetchEndpoint.getSeenRequests()).length).to.eq(1);
    });

    it('all integrations eventually should get to know each other and elect the same leader', async () => {
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');
      // each instance calls endpoint and post details once leader elected
      return expectRequestsAt(electionNotifyEndpoint, 4)
        .then((requests) => {
          expect(requests).has.length(4);
          return Promise.all(requests.map(rq => rq.body.getJson()));
        })
        .then(instances => {
          const allIds = new Set(instances.map(i => i.id));
          // expect all ids are unique
          expect(allIds).has.length(4);

          // expect all has the same leader
          let leader = instances[0].leader;
          // eslint-disable-next-line no-unused-expressions
          expect(allIds).to.be.not.empty;
          expect(instances[1].leader).to.be.eq(leader);
          expect(instances[2].leader).to.be.eq(leader);
          expect(instances[3].leader).to.be.eq(leader);

          expect(new Set(instances.map(i => i.role))).to.be.deep.eq(new Set(['leader', 'follower']));
          for (const i of instances) {
            expect(i.role).to.be.eq(i.id === leader ? 'leader' : 'follower');
            // knows each instance
            expect(new Set([i.id, ...i.knownInstances])).is.deep.eq(allIds);
          }
          return expectMultiFetchRequests(fetchEndpoint, [allIds])
            .then(() => expectRequestsAt(onAvailableEndpoint, 4))
            .then(onAvailableRequests => {
              expect(onAvailableRequests).has.length(4);
              return Promise.all(onAvailableRequests.map(rq => rq.body.getJson()));
            }).then(onAvailBodies => {
              const onAvailIds = new Set(onAvailBodies.map(i => i.id));
              expect(allIds).to.be.eql(onAvailIds);
              onAvailBodies.forEach(body => {
                expect(body.uid).to.be.eql(MOCK_FETCH_RESPONSE.universal_uid);
              });
            });
        });
    });

    it('instance operating in singleton mode should work on their own and not be joined to party', async () => {
      const singletonElectionNotifyEndpoint = await server.forPost('https://instances.log/on-election/singleton')
        .thenCallback(jsonWithCorsAllowed('', 202));
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net/singleton.html');
      // each instance calls endpoint and post details once leader elected

      return expectRequestAt(singletonElectionNotifyEndpoint)
        .then(singletonElectionRequests => {
          expect(singletonElectionRequests).has.length(1);
          return singletonElectionRequests[0].body.getJson();
        }).then(singletonElectionInfo => {
          const singletonId = singletonElectionInfo.id;
          expect(singletonElectionInfo.leader).to.be.eql(singletonId);
          return expectRequestsAt(electionNotifyEndpoint, 3)
            .then((requests) => {
              expect(requests).has.length(3);
              return Promise.all(requests.map(rq => rq.body.getJson()));
            })
            .then(instances => {
              const allMutiplexingPartyIds = new Set(instances.map(i => i.id));
              // expect all ids are unique
              expect(allMutiplexingPartyIds).has.length(3);

              // expect all has the same leader
              let leader = instances[0].leader;
              // eslint-disable-next-line no-unused-expressions
              expect(allMutiplexingPartyIds).to.be.not.empty;
              expect(instances[1].leader).to.be.eq(leader);
              expect(instances[2].leader).to.be.eq(leader);

              expect(new Set(instances.map(i => i.role))).to.be.deep.eq(new Set(['leader', 'follower']));
              const allInstancesOnPageIds = new Set(allMutiplexingPartyIds).add(singletonId);
              for (const i of instances) {
                expect(i.role).to.be.eq(i.id === leader ? 'leader' : 'follower');
                // knows each instance including singleton
                expect(new Set([i.id, ...i.knownInstances])).is.deep.eq(allInstancesOnPageIds);
              }
              const expectedMxRequestsParties = [
                // 1st request with  only singleton
                new Set([singletonId]),
                // 2nd multiFetch request because singleton was w/o segments, multiplex instances have segments so trigger mf and not from cache
                // 2nd request with mxPartyIds w/o singleton instance
                allMutiplexingPartyIds
              ];
              return expectMultiFetchRequests(fetchEndpoint, expectedMxRequestsParties)
                .then(() => expectRequestsAt(onAvailableEndpoint, 4))
                .then(onAvailableRequests => {
                  expect(onAvailableRequests).has.length(4); // all instances on the page have UID provisioned
                  return Promise.all(onAvailableRequests.map(rq => rq.body.getJson()));
                })
                .then(onAvailBodies => {
                  const onAvailIds = new Set(onAvailBodies.map(i => i.id));
                  expect(onAvailIds).to.be.eql(allInstancesOnPageIds);
                  onAvailBodies.forEach(body => {
                    expect(body.uid).to.be.eql(MOCK_FETCH_RESPONSE.universal_uid);
                  });
                });
            });
        });
    });

    describe('when late joiner is loaded', function () {
      it('without new signals, then it should inherit leader a be provisioned with already fetched  uid', async () => {
        const page = await browser.newPage();
        await page.goto('https://my-publisher-website.net/late.html');
        // each instance calls endpoint and post details once leader elected
        return expectRequestsAt(electionNotifyEndpoint, 3)
          .then((requests) => {
            expect(requests).has.length(3);
            return Promise.all(requests.map(rq => rq.body.getJson()));
          })
          .then(instances => {
            const allEarlyJoinersIds = new Set(instances.map(i => i.id));
            // expect all ids are unique
            expect(allEarlyJoinersIds).has.length(3);

            // expect all has the same leader
            const leader = instances[0].leader;
            // eslint-disable-next-line no-unused-expressions
            expect(allEarlyJoinersIds).to.be.not.empty;
            expect(instances[1].leader).to.be.eq(leader);
            expect(instances[2].leader).to.be.eq(leader);

            expect(new Set(instances.map(i => i.role))).to.be.deep.eq(new Set(['leader', 'follower']));
            for (const i of instances) {
              expect(i.role).to.be.eq(i.id === leader ? 'leader' : 'follower');
              // knows each instance
              expect(new Set([i.id, ...i.knownInstances])).is.deep.eq(allEarlyJoinersIds);
            }
            return expectRequestAt(lateJoinerElectionNotifyEndpoint)
              .then(lateJoinerElectionRequests => {
                expect(lateJoinerElectionRequests).has.length(1);
                return lateJoinerElectionRequests[0].body.getJson();
              }).then(lateJoinerElectionInfo => {
                expect(lateJoinerElectionInfo.leader).to.be.eql(leader); // leader inherited
                const lateJoinerId = lateJoinerElectionInfo.id;
                // then expect all including late joiner had uid provisioned
                return expectMultiFetchRequests(fetchEndpoint, [allEarlyJoinersIds])
                  .then(() => expectRequestsAt(onAvailableEndpoint, 4))
                  .then(onAvailableRequests => {
                    expect(onAvailableRequests).has.length(4);
                    return Promise.all(onAvailableRequests.map(rq => rq.body.getJson()));
                  }).then(onAvailBodies => {
                    const onAvailIds = new Set(onAvailBodies.map(i => i.id));
                    expect(onAvailIds).to.be.eql(allEarlyJoinersIds.add(lateJoinerId));
                    onAvailBodies.forEach(body => {
                      expect(body.uid).to.be.eql(MOCK_FETCH_RESPONSE.universal_uid);
                    });
                  });
              });
          });
      });

      it('with new signals, then it should inherit leader a be provisioned with refreshed uid including brought data', async () => {
        const page = await browser.newPage();
        await page.goto('https://my-publisher-website.net/late-refresh.html');
        // each instance calls endpoint and post details once leader elected
        // await browser.waitForTarget(() => false, { timeout: 0 });
        return expectRequestsAt(electionNotifyEndpoint, 3)
          .then((requests) => {
            expect(requests).has.length(3);
            return Promise.all(requests.map(rq => rq.body.getJson()));
          })
          .then(instances => {
            const allEarlyJoinersIds = new Set(instances.map(i => i.id));
            // expect all ids are unique
            expect(allEarlyJoinersIds).has.length(3);

            // expect all has the same leader
            const leader = instances[0].leader;
            // eslint-disable-next-line no-unused-expressions
            expect(allEarlyJoinersIds).to.be.not.empty;
            expect(instances[1].leader).to.be.eq(leader);
            expect(instances[2].leader).to.be.eq(leader);

            expect(new Set(instances.map(i => i.role))).to.be.deep.eq(new Set(['leader', 'follower']));
            for (const i of instances) {
              expect(i.role).to.be.eq(i.id === leader ? 'leader' : 'follower');
              // knows each instance
              expect(new Set([i.id, ...i.knownInstances])).is.deep.eq(allEarlyJoinersIds);
            }
            return expectRequestAt(lateJoinerElectionNotifyEndpoint)
              .then(lateJoinerElectionRequests => {
                expect(lateJoinerElectionRequests).has.length(1);
                return lateJoinerElectionRequests[0].body.getJson();
              }).then(lateJoinerElectionInfo => {
                expect(lateJoinerElectionInfo.leader).to.be.eql(leader); // leader inherited
                const lateJoinerId = lateJoinerElectionInfo.id;
                const allInParty = new Set(allEarlyJoinersIds).add(lateJoinerId);
                // then expect all including late joiner had uid provisioned
                return expectMultiFetchRequests(fetchEndpoint, [allEarlyJoinersIds, allInParty])
                  .then(() => expectRequestsAt(onAvailableEndpoint, 4))
                  .then(onAvailableRequests => {
                    expect(onAvailableRequests).has.length(4);
                    return Promise.all(onAvailableRequests.map(rq => rq.body.getJson()));
                  }).then(onAvailBodies => {
                    const onAvailIds = new Set(onAvailBodies.map(i => i.id));
                    expect(onAvailIds).to.be.eql(allInParty);
                    onAvailBodies.forEach(body => {
                      expect(body.uid).to.be.eql(MOCK_FETCH_RESPONSE.universal_uid);
                    });
                  });
              });
          });
      });
    });

    it('leader election and messaging metrics are collected', async function () {
      this.retries(2); // metrics are triggered by `beforeunload` browser event , in some cases it may be unreliable
      const page = await browser.newPage();
      await page.goto('https://my-publisher-website.net');

      await expectRequestsAt(electionNotifyEndpoint, 4); // all instances have elected leader
      await page.reload();

      // each instance publishes diagnostics
      return expectRequestsAt(diagnosticsEndpoint, 4)
        .then(diagnosticsRequests => {
          expect(diagnosticsRequests).has.lengthOf(4);
          return Promise.all(diagnosticsRequests.map(rq => rq.body.getJson()));
        })
        .then(instancesRequests => {
          for (const request of instancesRequests) {
            // each instance provides
            verifyContainsMeasurementWithValues(request.measurements, 'id5.api.instance.count', 'COUNTER', [4]);
            verifyContainsMeasurementWithValues(request.measurements, 'id5.api.instance.domains.count', 'COUNTER', [2]);
            verifyContainsMeasurementWithValues(request.measurements, 'id5.api.instance.windows.count', 'COUNTER', [3]);
            verifyContainsMeasurementWithValues(request.measurements, 'id5.api.instance.partners.count', 'COUNTER', [2]);
            verifyContainsMeasurement(request.measurements, 'id5.api.instance.message.delivery.time', 'TIMER');
            verifyContainsMeasurement(request.measurements, 'id5.api.instance.join.delay.time', 'TIMER');
            verifyContainsMeasurement(request.measurements, 'id5.api.instance.lastJoin.delay', 'TIMER');
          }
        });
    });
  });

  function expectMultiFetchRequests(endpoint, expectedParties) {
    let expectedNumberOfRequests = expectedParties.length;
    return expectRequestsAt(endpoint, expectedNumberOfRequests)
      .then(multiFetchRequests => {
        expect(multiFetchRequests).has.length(expectedNumberOfRequests);
        return Promise.all(multiFetchRequests.map(rq => rq.body.getJson()));
      })
      .then(requestBodies => {
        expect(requestBodies).has.length(expectedNumberOfRequests);
        for (let i = 0; i < requestBodies.length; i++) {
          expect(new Set(requestBodies[i].requests.map(rq => rq.requestId))).is.eql(expectedParties[i]);
        }
      });
  }

  function verifyContainsMeasurementWithTags(measurements, name, type, expectedTags = {}) {
    let measurementsByName = verifyContainsMeasurement(measurements, name, type);
    let tags = measurementsByName.map(measurement => measurement.tags);
    expect(tags).to.deep.contain({
      version: version, partner: '99', source: 'api', tml: 'https://my-publisher-website.net/', ...expectedTags
    });

    for (const measurement of measurementsByName) {
      expect(measurement.values.length).is.gte(1);
      for (const v of measurement.values) {
        expect(v.value).is.not.eq(null);
        expect(v.timestamp).is.not.eq(null);
      }
    }
  }

  /**
   *
   * @param {Array<Object>} measurements
   * @param name
   * @param type
   * @return {*}
   */
  function verifyContainsMeasurement(measurements, name, type) {
    let names = measurements.map(x => x.name);
    expect(names).to.include(name);
    let measurementsByName = measurements.filter(m => m.name === name);
    expect(measurementsByName).is.not.eq(undefined);
    expect(measurementsByName).is.not.empty;
    expect(measurementsByName[0].type).is.eq(type);
    return measurementsByName;
  }

  function verifyContainsMeasurementWithValues(measurements, name, type, values) {
    let measurement = verifyContainsMeasurement(measurements, name, type)[0];
    expect(measurement.values.length).is.gte(values.length);
    for (const expectedValue of values) {
      expect(measurement.values.find(v => v.value === expectedValue)).is.not.eq(undefined);
    }
  }

  function expectRequestAt(endpoint) {
    return expectRequestsAt(endpoint, 1);
  }

  function expectRequestsAt(endpoint, minCount = 1, maxTimeMs = 10000) {
    return new Promise((resolve, reject) => {
      let startTime = Date.now();
      let waitForRequest = async function () {
        let requests = await endpoint.getSeenRequests();
        if (requests && requests.length >= minCount) {
          return resolve(requests);
        } else {
          let elapsedTime = Date.now() - startTime;
          if (elapsedTime > maxTimeMs) {
            reject(`Expected at least ${minCount} requests at ${endpoint} but received only ${requests.length} in ${elapsedTime}ms`);
          } else {
            setTimeout(waitForRequest, 100);
          }
        }
      };
      waitForRequest();
    });
  }

  async function fetchLocalStorage(page) {
    return page.evaluate(() => {
      const result = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        result[key] = window.localStorage.getItem(key);
      }
      return result;
    });
  }

  async function mockBounceEndpoint() {
    await server.forGet('https://id5-sync.com/bounce').thenJson(200, {bounce: {setCookie: false}}, MOCK_CORS_HEADERS);
  }

});
