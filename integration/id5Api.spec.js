import puppeteer from 'puppeteer-core';
import chromePaths from 'chrome-paths';
import mockttp from 'mockttp';
import tmp from 'tmp-promise';
import path from 'path';
import {fileURLToPath} from 'url';
import chai, {expect} from 'chai';
import {version} from '../generated/version.js';
import chaiDateTime from 'chai-datetime';
import isDocker from 'is-docker';
/**
 * If you want to debug in the browser, you can use "devtools: true" in
 * the launch configuration and block the browser using
 * await browser.waitForTarget(() => false, { timeout: 0 });
 * Also increase the timeout for the tests to a very large value.
 */
const _DEBUG = false;

chai.use(chaiDateTime);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ID5_API_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', 'dist', 'id5-api.js');
const ID5_ESP_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', 'dist', 'esp.js');

const DAYS_TO_MILLISECONDS = (60 * 60 * 24 * 1000);
const MOCK_FETCH_RESPONSE = {
  created_at: '2021-05-26T20:08:13Z',
  id5_consent: true,
  universal_uid: 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*LTzsUTSrz4juTlKvKoO0brhnjXyuZIGHv44Iqf4TzN0AAGwYr9heNFf7GF6QAMRq',
  signature: 'ID5_AQo_xCuSjJ3KsW8cOsbHs1d3AvFDad0XrupUgd5LBsLV0v0pXmrYt0AbE_8WeU_nRC2Bbmif8GPKtcHFpAl4wLo',
  cascade_needed: false,
  privacy: {
    jurisdiction: 'gdpr',
    id5_consent: true
  },
  ext: {
    'linkType': 2
  }
};
const MOCK_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://my-publisher-website.net', 'Access-Control-Allow-Credentials': 'true'
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
const MOCK_LB_RESPONSE = {
  'lb': 'LB_DATA'
};

const FETCH_ENDPOINT = 'https://id5-sync.com/gm/v2';

// Note: do not use lambda syntax in describes. https://mochajs.org/#arrow-functions
describe('The ID5 API', function () {
  let browser, server, profileDir, caFingerprint;

  this.timeout((_DEBUG ? 300 : 30) * 1000);

  async function startBrowser() {
    profileDir = await tmp.dir({unsafeCleanup: true});
    const args = [
      `--proxy-server=localhost:${server.port}`,
      `--ignore-certificate-errors-spki-list=${caFingerprint}`,
      `--user-data-dir=${profileDir.path}`,
      '--no-first-run',
      '--disable-features=site-per-process'
    ];

    if (isDocker()) {
      args.push('--no-sandbox');
    }

    browser = await puppeteer.launch({
      headless: !_DEBUG, executablePath: chromePaths.chrome, devtools: _DEBUG, args,
    });
  }

  async function stopBrowser() {
    await browser.close();
    await profileDir.cleanup();
  }

  before(async () => {
    // Create a proxy server with a self-signed HTTPS CA certificate:
    const https = await mockttp.generateCACertificate();
    server = mockttp.getLocal({
      https, debug: _DEBUG
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
      const mockId5 = await server.forPost(FETCH_ENDPOINT)
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
      expect(dummyImageRequests[0].url).to.equal(
        'https://dummyimage.com/600x200?text=' + MOCK_FETCH_RESPONSE.universal_uid
      );
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

    it('reports it can use frame localStorage and detects referrer but not uses top localStorage', async () => {
      const mockId5 = await server.forPost(FETCH_ENDPOINT)
        .thenJson(200, MOCK_FETCH_RESPONSE, NON_FRIENDLY_MOCK_CORS_HEADERS);
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
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'esp.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      const mockId5 = await server.forPost(FETCH_ENDPOINT)
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
      await server.forPost(FETCH_ENDPOINT)
        .thenJson(200, MOCK_FETCH_RESPONSE, MOCK_CORS_HEADERS);
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
      const diagnosticsEndpoint = await server.forPost('https://diagnostics.id5-sync.com/measurements')
        .thenJson(202, '', MOCK_CORS_HEADERS);
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
          const commonTags = {version: version, partner: '99', source: 'api', tml: 'https://my-publisher-website.net/'};
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.instance.load.delay', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.invocation.count', 'SUMMARY', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.consent.request.time', 'TIMER', {
            ...commonTags,
            requestType: 'static',
            success: 'true',
            apiType: 'TCFv2'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.consent.wait.time', 'TIMER', {
            ...commonTags,
            cachedResponseUsed: false
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.extensions.call.time', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.call.time', 'TIMER', {
            ...commonTags,
            status: 'success'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.userid.provisioning.delay', 'TIMER', {
            ...commonTags,
            cachedResponseUsed: false,
            callType: 'direct_method',
            isUpdate: false,
            lateJoiner: false
          });
          verifyContainsMeasurement(onlyRequest.measurements, 'id5.api.instance.partySize', 'SUMMARY');
        });
    });

    it('should publish measurements before unload', async () => {
      const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'diagnostics_on_unload.html');
      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, TEST_PAGE_PATH);
      await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
        .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
      const fetchEndpoint = await server.forPost(FETCH_ENDPOINT)
        .thenJson(200, MOCK_FETCH_RESPONSE, MOCK_CORS_HEADERS);
      await server.forGet('https://dummyimage.com/600x200')
        .thenReply(200, '');
      const diagnosticsEndpoint = await server.forPost('https://diagnostics.id5-sync.com/measurements')
        .thenJson(202, '', MOCK_CORS_HEADERS);
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
          const commonTags = {version: version, partner: '99', source: 'api', tml: 'https://my-publisher-website.net/'};
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.instance.load.delay', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.invocation.count', 'SUMMARY', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.consent.request.time', 'TIMER', {
            ...commonTags,
            requestType: 'static',
            success: 'true',
            apiType: 'TCFv2'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.consent.wait.time', 'TIMER', {
            ...commonTags,
            cachedResponseUsed: false
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.extensions.call.time', 'TIMER', commonTags);
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.fetch.call.time', 'TIMER', {
            ...commonTags,
            status: 'success'
          });
          verifyContainsMeasurementWithTags(onlyRequest.measurements, 'id5.api.userid.provisioning.delay', 'TIMER', {
            ...commonTags,
            cachedResponseUsed: false,
            callType: 'direct_method',
            isUpdate: false,
            lateJoiner: false
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
      const INDEX_PAGE_PATH = path.join(SCRIPT_DIR, 'resources', 'multiplexing', 'index.html');
      const LATE_JOINER_INDEX_PAGE_PATH = path.join(SCRIPT_DIR, 'resources', 'multiplexing', 'index-latejoiner.html');
      const LATE_JOINER_REFRESH_INDEX_PAGE_PATH = path.join(SCRIPT_DIR, 'resources', 'multiplexing', 'index-latejoiner-refresh.html');
      const SINGLETON_INDEX_PAGE = path.join(SCRIPT_DIR, 'resources', 'multiplexing', 'index-singleton.html');
      const NF_FRAME_PAGE_PATH = path.join(SCRIPT_DIR, 'resources', 'multiplexing', 'single-integration.html');
      const F_FRAME_PAGE_PATH = path.join(SCRIPT_DIR, 'resources', 'multiplexing', 'multiple-integrations.html');

      await server.forGet('https://my-publisher-website.net')
        .thenFromFile(200, INDEX_PAGE_PATH);
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
        .thenCallback(jsonWithCorsAllowed(MOCK_FETCH_RESPONSE));
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

    it('leader election and messaging metrics are collected', async () => {
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

  function verifyContainsMeasurementWithTags(measurements, name, type, tags = {}) {
    let measurement = verifyContainsMeasurement(measurements, name, type);
    expect(measurement.tags).is.deep.eq({
      version: version, partner: '99', source: 'api', tml: 'https://my-publisher-website.net/', ...tags
    });
    expect(measurement.values.length).is.gte(1);
    for (const v of measurement.values) {
      expect(v.value).is.not.eq(null);
      expect(v.timestamp).is.not.eq(null);
    }
  }

  function verifyContainsMeasurement(measurements, name, type) {
    let names = measurements.map(x => x.name);
    expect(names).to.include(name);
    let measurement = measurements.find(m => m.name === name);
    expect(measurement).is.not.eq(undefined);
    expect(measurement.type).is.eq(type);
    return measurement;
  }

  function verifyContainsMeasurementWithValues(measurements, name, type, values) {
    let measurement = verifyContainsMeasurement(measurements, name, type);
    expect(measurement.values.length).is.gte(values.length);
    for (const expectedValue of values) {
      expect(measurement.values.find(v => v.value === expectedValue)).is.not.eq(undefined);
    }
  }

  function expectRequestAt(endpoint) {
    return expectRequestsAt(endpoint, 1);
  }

  function expectRequestsAt(endpoint, minCount = 1) {
    return new Promise((resolve, reject) => {
      let waitForRequest = async function () {
        let requests = await endpoint.getSeenRequests();
        if (requests && requests.length >= minCount) {
          return resolve(requests);
        } else {
          setTimeout(waitForRequest, 100);
        }
      };
      waitForRequest();
    });
  }
});
