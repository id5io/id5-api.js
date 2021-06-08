import puppeteer from 'puppeteer-core';
import chromePaths from 'chrome-paths';
import mockttp from 'mockttp';
import tmp from 'tmp-promise';
import path from 'path';
import { fileURLToPath } from 'url';
import chai, { expect } from 'chai';
import { version } from '../generated/version.js';
import chaiDateTime from 'chai-datetime';
import { readFile } from 'fs/promises';
import isDocker from 'is-docker';

chai.use(chaiDateTime);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEST_PAGE_PATH = path.join(SCRIPT_DIR, 'integration.html');
const ID5_API_JS_FILE = path.join(SCRIPT_DIR, '..', 'build', 'dist', 'id5-api.js');

const MOCK_CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://my-publisher-website.net',
  'Access-Control-Allow-Credentials': 'true'
};

const DAYS_TO_MILLISECONDS = (60 * 60 * 24 * 1000);

// Note: do not use lambda syntax in describes. https://mochajs.org/#arrow-functions
describe('The ID5 API', function() {
  let browser, server, CONSTANTS;

  this.timeout(30000);

  before(async () => {
    CONSTANTS = JSON.parse(await readFile(path.join(SCRIPT_DIR,
      '..', 'lib', 'constants.json')));

    // Create a proxy server with a self-signed HTTPS CA certificate:
    const https = await mockttp.generateCACertificate();
    server = mockttp.getLocal({ https });
    const caFingerprint = mockttp.generateSPKIFingerprint(https.cert);

    await server.start();

    const profileDir = await tmp.dir({ unsafeCleanup: true });
    const args = [
      `--proxy-server=localhost:${server.port}`,
      `--ignore-certificate-errors-spki-list=${caFingerprint}`,
      `--user-data-dir=${profileDir.path}`,
      '--no-first-run'
    ];

    if (isDocker()) {
      args.push('--no-sandbox');
    }

    browser = await puppeteer.launch({
      executablePath: chromePaths.chrome,
      // devtools: true,
      args
    });
  });

  after(async () => {
    await browser.close();
    await server.stop();
  });

  beforeEach(async () => {
    await server.get('code.jquery.com/jquery-3.3.1.slim.min.js').thenPassThrough();
    await server.get('https://my-publisher-website.net').thenFromFile(200, TEST_PAGE_PATH);
    await server.get('https://cdn.id5-sync.com/api/integration/id5-api.js')
      .thenFromFile(200, ID5_API_JS_FILE);
  });

  afterEach(async () => {
    await server.reset();
  });

  it('can succesfully retrieve an ID, store in browser and fire callback', async () => {
    const mockFetchReponse = {
      'created_at': '2021-05-26T20:08:13Z',
      'id5_consent': true,
      'universal_uid': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*LTzsUTSrz4juTlKvKoO0brhnjXyuZIGHv44Iqf4TzN0AAGwYr9heNFf7GF6QAMRq',
      'signature': 'ID5_AQo_xCuSjJ3KsW8cOsbHs1d3AvFDad0XrupUgd5LBsLV0v0pXmrYt0AbE_8WeU_nRC2Bbmif8GPKtcHFpAl4wLo',
      'link_type': 2,
      'cascade_needed': false,
      'privacy': {
        'jurisdiction': 'gdpr',
        'id5_consent': true
      }
    };
    const mockId5 = await server.post('https://id5-sync.com/g/v2/99.json')
      .thenJson(200, mockFetchReponse, MOCK_CORS_HEADERS);
    const mockDummyImage = await server.get('https://dummyimage.com/600x200')
      .thenReply(200, '');
    const page = await browser.newPage();
    await page.goto('https://my-publisher-website.net');
    await page.waitForSelector('p#done');

    const id5SyncRequests = await mockId5.getSeenRequests();
    expect(id5SyncRequests).to.have.lengthOf(1);

    const response = id5SyncRequests[0].body.json;
    expect(response.partner).to.equal(415); // from integration.html
    expect(response.v).to.equal(version);
    expect(response.id5cdn).to.equal(true);
    expect(response.top).to.equal(1);
    expect(response.o).to.equal('api');
    expect(response.u).to.equal('https://my-publisher-website.net/');
    expect(response.rf).to.equal('https://my-publisher-website.net/');
    // from integration.html
    expect(response.gdpr_consent).to.equal( // from integration.html
      'CPBZjR9PBZjR9AKAZAENBMCsAP_AAH_AAAqIHWtf_X_fb39j-_59_9t0eY1f9_7_v-0zjhfds-8Nyf_X_L8X42M7vF36pq4KuR4Eu3LBIQFlHOHUTUmw6okVrTPsak2Mr7NKJ7LEinMbe2dYGHtfn9VTuZKYr97s___z__-__v__79f_r-3_3_vp9X---_e_V3dgdYASYal8BFmJY4Ek0aVQogQhXEh0AoAKKEYWiawgJXBTsrgI9QQMAEBqAjAiBBiCjFgEAAAAASURASAHggEQBEAgABACpAQgAIkAQWAFgYBAAKAaFgBFAEIEhBkcFRymBARItFBPJWAJRd7GGEIZRYAUCj-iowEAAAAA.cAAAAAAAAAAA');

    // Check local storage items with some puppeteer magic
    const id5idRaw = await page.evaluate(() => localStorage.getItem('id5id'));
    const id5idJson = JSON.parse(decodeURIComponent(id5idRaw));
    expect(id5idJson).to.eql(mockFetchReponse);

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
      'https://dummyimage.com/600x200?text=' + mockFetchReponse.universal_uid);
  });
});
