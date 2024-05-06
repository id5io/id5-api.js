import mockttp from 'mockttp';
import path from 'path';
import {fileURLToPath} from 'url';
import chai, {expect} from 'chai';
import {parse, serialize} from 'cookie';
import chaiDateTime from 'chai-datetime';
import {
  buildBrowser,
  getDebugFlag,
  MOCK_FETCH_RESPONSE,
  multiFetchResponseWithCorsAllowed
} from './integrationUtils.mjs';
import {decode, stringify} from 'querystring';


chai.use(chaiDateTime);

/**
 * If you want to debug in the browser, you can set this flag to true (through env variable)
 */
const _DEBUG = getDebugFlag()

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = path.join(SCRIPT_DIR, 'resources')
const TARGET_DIR = _DEBUG ? 'dev' : 'dist';
const ID5_API_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', TARGET_DIR, 'id5-api.js');
const ID5_CDN = "https://cdn.id5-sync.com/"
const FETCH_ENDPOINT = 'https://id5-sync.com/gm/v3';
const TEST_DOMAIN = 'https://true-link-domain.com';
const TRUE_LINK_ID_PREFIX = 'ID5_TRUE_LINK_';

// Note: do not use lambda syntax in describes. https://mochajs.org/#arrow-functions
describe('The ID5 API true link integration', function () {
  let browser, proxyServer, trueLinkMockServer;

  this.timeout((_DEBUG ? 3000 : 30) * 1000);


  beforeEach(async () => {
    // Create a proxy server with a self-signed HTTPS CA certificate:
    const https = await mockttp.generateCACertificate();
    proxyServer = mockttp.getLocal({
      https, debug: _DEBUG
    });

    await proxyServer.start();
    browser = await buildBrowser(https.cert, proxyServer.port, _DEBUG);

    await proxyServer.forGet('/favicon.ico').thenReply(204);
    await proxyServer.forGet('https://cdn.id5-sync.com/api/integration/id5-api.js').thenFromFile(200, ID5_API_JS_FILE);

    if(process.env.LOCAL_BOOTSTRAP) {
      //set LOCAL_BOOTSTRAP env variable to an absolute path to bootstrap js library to test against a local version
      await proxyServer.forGet(TEST_DOMAIN + '/bootstrap/id5-bootstrap.js').thenFromFile(200, process.env.LOCAL_BOOTSTRAP);
    } else {
      await proxyServer.forGet(TEST_DOMAIN + '/bootstrap/id5-bootstrap.js').thenForwardTo(ID5_CDN)
    }
    await proxyServer.forGet(TEST_DOMAIN).thenFromFile(200, path.join(RESOURCES_DIR, 'trueLink', 'trueLinkIntegration.html'));
    trueLinkMockServer = await mockTrueLinkServerEndpoint()
  });

  afterEach(async () => {
    await browser.close();
    await proxyServer.stop();
  });

  it('passes trueLinkId to the server after it is provided', async function () {
    const mockId5 = await proxyServer.forPost(FETCH_ENDPOINT)
      .thenCallback(multiFetchResponseWithCorsAllowed(MOCK_FETCH_RESPONSE));
    const page = await browser.newPage();
    await openPageAndWaitForId5Id(page, trueLinkMockServer, TEST_DOMAIN);
    const id5FetchRequests = await mockId5.getSeenRequests();
    expect(id5FetchRequests).to.have.lengthOf(1);
    const requestBody = (await id5FetchRequests[0].body.getJson()).requests[0];
    expect(requestBody.true_link.booted).to.equal(true);
    expect(requestBody.true_link.redirected).to.equal(false);
    expect(requestBody.true_link.id).to.equal(undefined)
    await openPageAndWaitForId5Id(page, trueLinkMockServer, TEST_DOMAIN);
    const newId5FetchRequests = await mockId5.getSeenRequests();
    expect(newId5FetchRequests).to.have.lengthOf(2);
    const newRequestBody = (await newId5FetchRequests[1].body.getJson()).requests[0];
    expect(newRequestBody.true_link.booted).to.equal(true);
    expect(newRequestBody.true_link.redirected).to.equal(true);
    expect(newRequestBody.true_link.id).to.contain(TRUE_LINK_ID_PREFIX)
  });

  async function openPageAndWaitForId5Id(page, mockServer, domain) {
    await page.goto(domain);
    await page.waitForFunction(() => !!window.testResults?.id5id);
    if(_DEBUG) {
      await page.waitForFunction(() => !!window.id5ButtonClick, {timeout: 0});
    }
  }
  async function mockTrueLinkServerEndpoint() {
    return await proxyServer.forGet('https://id5-sync.com/true-link').thenCallback(async (request) => {
      const params = decode(request.url.split('?')[1]);
      const cookies = request.headers['cookie'] ? parse(request.headers['cookie'], {map: true}) : {};
      if(_DEBUG) {
        console.log('Server: request cookies:', cookies)
      }
      let id5ServerCookie = 'id5TrueLink';
      const trueLinkId = id5ServerCookie in cookies ? cookies[id5ServerCookie] : (TRUE_LINK_ID_PREFIX + Math.ceil(Math.random() * 1000000));
      const origLocation = params['trueLinkLocation'];
      const redirectTo = origLocation + '?' + stringify({
        trueLinkId: trueLinkId
      });

      const expires = new Date();
      expires.setTime(expires.getTime() + (90 * 24 * 60 * 60 * 1000)); // Keep for 90 days

      return {
        statusCode: 307,
        headers: {
          'Location': redirectTo,
          'Set-Cookie': serialize(id5ServerCookie, trueLinkId, {expires}),
        }
      };
    });
  }



});
