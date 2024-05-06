import puppeteer from 'puppeteer-core';
import isDocker from 'is-docker';
import chromePaths from 'chrome-paths';
import tmp from "tmp-promise";
import mockttp from "mockttp";


export function getDebugFlag() {
  const debug = process.env.DEBUG?.toLowerCase() === 'true';
  global.id5Debug = debug;
  return debug;
}

export async function buildBrowser(cert, port, debug = false) {
  const caFingerprint = mockttp.generateSPKIFingerprint(cert);
  const profileDir = await tmp.dir({unsafeCleanup: true});
  const args = [
    `--proxy-server=localhost:${port}`,
    `--ignore-certificate-errors-spki-list=${caFingerprint}`,
    `--user-data-dir=${profileDir.path}`,
    '--no-first-run',
    '--disable-features=site-per-process',
    '--disable-component-update'
  ];

  if (isDocker()) {
    args.push('--no-sandbox');
  }
  //console.log('Starting browser with args:', args)  //uncomment for debug purposes

  return await puppeteer.launch({
    headless: !debug, executablePath: chromePaths.chrome, devtools: debug, args,
  });
}

export function multiFetchResponseWithCorsAllowed(payload, status = 200) {
  return async request => makeMultiFetchResponse(request, payload, status, makeCorsHeaders(request));
}


export async function makeMultiFetchResponse(request, payload, status, headers) {
  const requestObj = await request.body.getJson();
  const responses = {};
  requestObj.requests.forEach(rq => {
    responses[rq.requestId] = {};
  });
  const response = {
    status,
    headers,
    json: {
      generic: payload,
      responses: responses
    }
  };
  global.id5Debug && console.log('Multifetch response:', response);
  return response;
}


export const MOCK_ID = 'ID5*LTzsUTSrz4juTlKvKoO0brhnjXyuZIGHv44Iqf4TzN0AAGwYr9heNFf7GF6QAMRq';
export const MOCK_FETCH_RESPONSE = {
  created_at: '2021-05-26T20:08:13Z',
  id5_consent: true,
  universal_uid: MOCK_ID,
  signature: 'ID5_AQo_xCuSjJ3KsW8cOsbHs1d3AvFDad0XrupUgd5LBsLV0v0pXmrYt0AbE_8WeU_nRC2Bbmif8GPKtcHFpAl4wLo',
  cascade_needed: false,
  privacy: {
    jurisdiction: 'gdpr',
    id5_consent: true
  },
  ext: {
    'linkType': 2
  },
  cache_control: {
    max_age_sec: 7200
  }
};

export function makeCorsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': request.headers['origin'],
    'Access-Control-Allow-Credentials': 'true'
  };
}