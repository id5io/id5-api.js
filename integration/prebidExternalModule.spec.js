import mockttp, {RulePriority} from 'mockttp';
import path from 'path';
import {fileURLToPath} from 'url';
import chai, {expect} from 'chai';
import {version} from '../generated/version.js';
import chaiDateTime from 'chai-datetime';
import {
  buildBrowser,
  getDebugFlag,
  MOCK_FETCH_RESPONSE,
  multiFetchResponseWithCorsAllowed
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
const ID5_PBMODULE_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', TARGET_DIR, 'id5PrebidModule.js');
const TEST_PAGE_PATH = path.join(RESOURCES_DIR, 'prebidModule/integration.html');


const MOCK_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://my-publisher-website.net', 'Access-Control-Allow-Credentials': 'true'
};

const MOCK_LB_RESPONSE = {
  'lb': 'LB_DATA'
};

const FETCH_ENDPOINT = 'https://id5-sync.com/gm/v3';
// Note: do not use lambda syntax in describes. https://mochajs.org/#arrow-functions
describe('The Prebid External Module', function () {
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

    await server.forGet('https://cdn.id5-sync.com/api/integration/id5PrebidModule.js')
      .thenFromFile(200, ID5_PBMODULE_JS_FILE);

    await server.forGet('/favicon.ico').thenReply(204);
    await server.forGet('https://id5-sync.com/bounce').asPriority(RulePriority.FALLBACK)
      .thenCallback(request => ({
        statusCode: 200,
        json: {bounce: {setCookie: false}},
        headers: {'Access-Control-Allow-Origin': request.headers.origin, 'Access-Control-Allow-Credentials': 'true'}
      }));

    browser = await buildBrowser(https.cert, server.port, _DEBUG);
    await server.forGet('https://lb.eu-1-id5-sync.com/lb/v1')
      .thenJson(200, MOCK_LB_RESPONSE, MOCK_CORS_HEADERS);
    await server.forGet('https://my-publisher-website.net')
      .thenFromFile(200, TEST_PAGE_PATH);
  });

  afterEach(async () => {
    await browser.close();
    await server.stop();
  });

  it('should call multiplexing request and return response when ready', async () => {
    const mockId5 = await server.forPost(FETCH_ENDPOINT)
      .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));

    const page = await browser.newPage();
    await page.goto('https://my-publisher-website.net');

    const prebidResponse = await page.evaluate(async () => window.responseForPrebid);
    expect(prebidResponse).to.eql(MOCK_FETCH_RESPONSE);

    const id5FetchRequests = await mockId5.getSeenRequests();
    expect(id5FetchRequests).to.have.lengthOf(1);
    const requestBody = await id5FetchRequests[0].body.getJson();
    expect(requestBody.requests[0].source).to.be.eql('id5-prebid-ext-module');
    expect(requestBody.requests[0].sourceVersion).to.be.eq(version);
    expect(requestBody.requests[0].o).to.be.eql('pbjs');
    expect(requestBody.requests[0].v).to.be.eql('9.0.0');
  });

  it('should trigger id5tags callbacks when exposeTargeting is enabled', async () => {
    const tags = {
      'id': 'y',
      'ab': 'n'
    };
    const responseWithTags = {
      ...MOCK_FETCH_RESPONSE,
      tags: tags
    };

    await server.forPost(FETCH_ENDPOINT)
      .thenCallback(multiFetchResponseWithCorsAllowed(responseWithTags));

    const page = await browser.newPage();
    await page.goto('https://my-publisher-website.net');

    // Wait for the response and callbacks to be executed
    await page.evaluate(async () => window.responseForPrebid);

    // Check if the pre-registered callback was called
    // Need to wait a bit because it's called via setTimeout(() => ..., 0)
    const callbackResults = await page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return window.tagCallbackResults;
    });
    expect(callbackResults).to.have.lengthOf(1);
    expect(callbackResults[0]).to.eql(tags);
  });

  it('should call multiplexing request with idLookupMode when lookup mode is enabled', async () => {
    const mockId5 = await server.forPost(FETCH_ENDPOINT)
      .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));

    const pageUrl = 'https://lookup-mode-website.net';
    // Bounce tries to set the id5 cookie; credentials are allowed, so only credentials: 'omit' keeps it out
    const bounceEndpoint = await server.forGet('https://id5-sync.com/bounce')
      .thenReply(200, JSON.stringify({bounce: {setCookie: false}}), {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': pageUrl,
        'Access-Control-Allow-Credentials': 'true',
        'Set-Cookie': 'id5=should-not-be-stored; Domain=id5-sync.com; Path=/; Secure; SameSite=None'
      });
    await server.forGet(pageUrl)
      .thenFromFile(200, path.join(RESOURCES_DIR, 'prebidModule/lookupModeIntegration.html'));
    const page = await browser.newPage();
    // An existing id5 cookie that bounce must not send
    await page.setCookie({name: 'id5', value: 'should-not-be-sent', domain: 'id5-sync.com', path: '/', secure: true, sameSite: 'None'});
    await page.goto(pageUrl);

    const prebidResponse = await page.evaluate(async () => window.responseForPrebid);
    expect(prebidResponse).to.eql(MOCK_FETCH_RESPONSE);

    const id5FetchRequests = await mockId5.getSeenRequests();
    expect(id5FetchRequests).to.have.lengthOf(1);
    const requestBody = await id5FetchRequests[0].body.getJson();
    expect(requestBody.requests[0].idLookupMode).to.be.eql(true);
    // In lookup mode bounce is sent with credentials: 'omit': the id5 cookie is neither sent nor stored
    const bounceRequests = await bounceEndpoint.getSeenRequests();
    expect(bounceRequests).to.have.lengthOf(1);
    expect(bounceRequests[0].headers.cookie || '').to.not.include('should-not-be-sent');
    const id5Cookies = await page.cookies('https://id5-sync.com');
    expect(id5Cookies.map(cookie => cookie.value)).to.eql(['should-not-be-sent']);
  });
});
