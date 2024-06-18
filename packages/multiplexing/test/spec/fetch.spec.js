import sinon from 'sinon';
import {RefreshedResponse, UidFetcher} from '../../src/fetch.js';
import {Extensions} from '../../src/extensions.js';
import {
  API_TYPE,
  ConsentData,
  GppConsentData
} from '../../src/consent.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {Id5CommonMetrics} from '@id5io/diagnostics';
import {CachedResponse} from '../../src/store.js';

const CONSENT_DATA_GDPR_ALLOWED = Object.assign(new ConsentData(), {
  consentString: 'CONSENT_STRING',
  localStoragePurposeConsent: true,
  gdprApplies: true,
  api: API_TYPE.TCF_V2
});

const DEFAULT_EXTENSIONS = {
  lb: 'lbValue',
  lbCDN: '%%LB_CDN%%'
};

const origin = 'api';
const originVersion = '1.0.36';

const PRIVACY_DATA_RETURNED = {jurisdiction: 'gdpr', id5_consent: true};

const _DEBUG = false;

const FETCH_RESPONSE_OBJ = {
  created_at: '2023-08-07T15:46:59.070010024Z',
  id5_consent: true,
  original_uid: 'testresponseid5id',
  universal_uid: 'testresponseid5id',
  signature: 'signature',
  link_type: 0,
  cascade_needed: false,
  privacy: PRIVACY_DATA_RETURNED,
  ext: {
    linkType: 0,
    pba: 'g+Q9GCIcuZuBMslwof4uDw=='
  }
};

/**
 * @type {FetchIdRequestData}
 */
const DEFAULT_FETCH_DATA = {
  integrationId: 'default-integration',
  cacheId: 'default-cache-id',
  role: 'leader',
  requestCount: 1,
  origin: origin,
  originVersion: originVersion,
  source: 'api',
  sourceVersion: '1.2.3',
  partnerId: 1234,
  refererInfo: {
    ref: 'http://example.com/page.html',
    topmostLocation: 'http://example.com/page.html',
    reachedTop: true,
    numIframes: 2,
    stack: [
      'http://example.com/page.html',
      'http://example.com/iframe1.html',
      'http://example.com/iframe2.html'
    ],
    canonicalUrl: 'https://id5.io'
  },
  isUsingCdn: true,
  att: 0,
  uaHints: undefined,
  abTesting: undefined,
  pd: undefined,
  partnerUserId: undefined,
  provider: undefined,
  segments: undefined,
  invalidSegmentsCount: undefined,
  refreshInSeconds: 3600,
  providedRefreshInSeconds: undefined,
  trueLink: {
    booted: true
  }
};

describe('RefreshedResponse', function () {
  it('should return generic response', function () {
    // given
    const refreshedResponse = new RefreshedResponse({
      generic: FETCH_RESPONSE_OBJ
    });

    // when
    const generic = refreshedResponse.getGenericResponse();

    // then
    expect(generic).to.be.eql(FETCH_RESPONSE_OBJ);
  });

  it('should return merged response when present', function () {
    // given
    const refreshedResponse = new RefreshedResponse({
      generic: FETCH_RESPONSE_OBJ,
      responses: {
        '1': {
          cascade_needed: true,
          universal_uid: 'uid-1'
        },
        '2': {
          universal_uid: 'uid-2'
        },
        '3': {}
      }
    });

    // when
    const responseFor1 = refreshedResponse.getResponseFor('1');
    const responseFor2 = refreshedResponse.getResponseFor('2');
    const responseFor3 = refreshedResponse.getResponseFor('3');
    const responseFor4 = refreshedResponse.getResponseFor('4');

    // then
    expect(responseFor1).to.be.eql({
      ...FETCH_RESPONSE_OBJ,
      cascade_needed: true,
      universal_uid: 'uid-1'
    });
    expect(responseFor2).to.be.eql({
      ...FETCH_RESPONSE_OBJ,
      universal_uid: 'uid-2'
    });
    expect(responseFor3).to.be.eql(FETCH_RESPONSE_OBJ);
    expect(responseFor4).to.be.undefined;
  });
});

/**
 *
 * @param {FetchResponse} generic
 * @param {Array<FetchIdRequestData>} fetchData
 * @return {{responses: {}, generic}}
 */
function createResponse(generic, fetchData) {
  const expectedResponse = {
    generic: generic,
    responses: {}
  };
  fetchData.forEach(data => {
    expectedResponse.responses[data.integrationId] = {};
  });
  return expectedResponse;
}

function prepareJsonResponse(genericResponse, requestString) {
  const request = JSON.parse(requestString);
  const responses = {};
  request.requests.forEach(rq => responses[rq.requestId] = {});
  return JSON.stringify({generic: genericResponse, responses: responses});
}

describe('UidFetcher', function () {
  /**
   * @type {UidFetcher}
   */
  let fetcher;
  /**
   * @type {Extensions}
   */
  let extensions;
  /**
   * @type {Id5CommonMetrics}
   */
  let metrics;
  let server;


  const CURRENT_TIME = Date.now();
  let dateTimeStub;
  beforeEach(function () {
    let log = _DEBUG ? console : NO_OP_LOGGER;
    extensions = sinon.createStubInstance(Extensions);
    metrics = new Id5CommonMetrics(origin, originVersion);
    fetcher = new UidFetcher(metrics, log, extensions);
    extensions.gather.resolves(DEFAULT_EXTENSIONS);
    dateTimeStub = sinon.stub(Date, 'now').returns(CURRENT_TIME);
  });

  afterEach(function () {
    dateTimeStub.restore();
  });

  describe('should call fetch and handle successful response', function () {

    beforeEach(function () {
      server = sinon.fakeServer.create();
      server.respondImmediately = true;
      server.respondWith(sinonFetchResponder(request =>
        prepareJsonResponse(FETCH_RESPONSE_OBJ, request.requestBody)
      ));
    });

    afterEach(function () {
      server.restore();
    });

    [
      ['default', {}, {}],
      ['with pd', {pd: 'PD_DATA'}, {pd: 'PD_DATA'}],
      ['with partnerUserId', {partnerUserId: '1234567'}, {puid: '1234567'}],
      ['with provider', {provider: 'some_provider'}, {provider: 'some_provider'}],
      ['with ua hints', {uaHints: buildTestUaHints()}, {ua_hints: buildTestUaHints()}],
      ['with abTesting', {abTesting: {enabled: true, controlGroupPct: 0.5}}, {
        ab_testing: {
          enabled: true,
          control_group_pct: 0.5
        }
      }],
      ['with segments', {
        segments: [
          {destination: '22', ids: ['abc']},
          {destination: '21', ids: ['abcd']}
        ]
      }, {
        segments: [
          {destination: '22', ids: ['abc']},
          {destination: '21', ids: ['abcd']}
        ]
      }],
      ['with invalid segments', {
        segments: [
          {destination: '22', ids: ['abc']}
        ],
        invalidSegmentsCount: 10
      }, {
        segments: [
          {destination: '22', ids: ['abc']}
        ],
        _invalid_segments: 10
      }],
      ['with provided refreshInSeconds', {providedRefreshInSeconds: 1000}, {
        provided_options: {
          refresh_in_seconds: 1000
        }
      }],
      ['with allowed vendors', {allowedVendors: ['1', '2', '3']}, {
        allowed_vendors: ['1', '2', '3']
      }],
      ['with trace', {trace: true}, {_trace: true}],
      ['with true link id',
        {trueLink: {booted: true, redirected: true, id: "tlid"} },
        {true_link: {booted: true, redirected: true, id: "tlid"} }]
    ].forEach(([description, data, expectedInRequest]) => {
      it(`should call multi-fetch and correctly use parameters to create the fetch request body (${description})`, async () => {
        // given
        /**
         * @type {FetchIdRequestData}
         */
        const fetchData = {
          ...DEFAULT_FETCH_DATA,
          integrationId: crypto.randomUUID(),
          ...data
        };
        const inputFetchData = [fetchData];

        // when
        const fetchIdResult = fetcher.fetchId(inputFetchData, CONSENT_DATA_GDPR_ALLOWED, true);

        // then
        return fetchIdResult.then(refreshedResponse => {

          expect(extensions.gather).to.be.calledWith(inputFetchData);

          expectHttpPOST(server.requests[0], `https://id5-sync.com/gm/v3`, {
            requests: [
              expectedRequestFor(fetchData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, expectedInRequest)
            ]
          });
          const expectedResponse = createResponse(FETCH_RESPONSE_OBJ, [fetchData]);


          expect(refreshedResponse.timestamp).is.not.null;
          expect(refreshedResponse.timestamp).is.not.undefined;
          expect(refreshedResponse.response).is.eql(expectedResponse);
        });
      });

      it(`should call fetch with multiple requests and correct parameters (${description})`, async () => {
        // given
        /**
         * @type {FetchIdRequestData}
         */
        const firstInstanceData = {
          ...DEFAULT_FETCH_DATA,
          integrationId: crypto.randomUUID(),
          cacheId: crypto.randomUUID(),
          role: 'leader'
        };
        /**
         * @type {FetchIdRequestData}
         */
        const secondInstanceData = {
          integrationId: crypto.randomUUID(),
          cacheId: crypto.randomUUID(),
          requestCount: 2,
          origin: 'other-origin',
          originVersion: '7.0.1',
          partnerId: 4321,
          refererInfo: {
            ref: 'http://example.com/iframe1.html',
            topmostLocation: 'http://example.com/page.html',
            reachedTop: false,
            numIframes: 2,
            stack: [
              'http://example.com/page.html',
              'http://example.com/iframe1.html',
              'http://example.com/iframe2.html'
            ],
            canonicalUrl: 'https://id5.io'
          },
          isUsingCdn: false,
          att: 10,
          refreshInSeconds: 3600,
          role: 'follower',
          source: 'api-lite',
          sourceVersion: '2.2.2',
          trueLink: {booted: true},
          ...data
        };

        // when
        const inputRequestData = [firstInstanceData, secondInstanceData];
        const fetchIdResult = fetcher.fetchId(inputRequestData, CONSENT_DATA_GDPR_ALLOWED, true);

        // then
        return fetchIdResult.then(refreshedResponse => {
          const expectedResponse = createResponse(FETCH_RESPONSE_OBJ, inputRequestData);

          expect(extensions.gather).to.be.calledWith(inputRequestData);

          expectHttpPOST(server.requests[0], `https://id5-sync.com/gm/v3`, {
            requests: [
              expectedRequestFor(firstInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS),
              expectedRequestFor(secondInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, expectedInRequest)
            ]
          });

          expect(refreshedResponse.timestamp).is.not.null;
          expect(refreshedResponse.timestamp).is.not.undefined;
          expect(refreshedResponse.response).is.eql(expectedResponse);
        });
      });
    });

    it('should add cache data to request', function () {
      const cacheId_1 = crypto.randomUUID();
      const cachedData1 = new CachedResponse({
        signature: 'sig1',
        cache_control: {
          max_age_sec: 1234
        }
      }, CURRENT_TIME, 1);
      const cacheId_2 = crypto.randomUUID();
      const cachedData2 = new CachedResponse({
        signature: 'sig2',
        cache_control: {
          max_age_sec: 4321
        }
      }, CURRENT_TIME, 2);
      const cacheId_3 = crypto.randomUUID();
      const cacheId_4 = crypto.randomUUID();
      const cachedData_NoSignature_NoNbs = new CachedResponse({signature: undefined}, CURRENT_TIME, undefined);

      const firstInstanceData = {
        ...DEFAULT_FETCH_DATA,
        integrationId: crypto.randomUUID(),
        cacheId: cacheId_1,
        cacheData: cachedData1,
        role: 'leader'
      };

      const secondInstanceData = {
        ...DEFAULT_FETCH_DATA,
        integrationId: crypto.randomUUID(),
        cacheId: cacheId_2,
        cacheData: cachedData2,
        requestCount: 2
      };

      const thirdInstanceData = {
        ...DEFAULT_FETCH_DATA,
        integrationId: crypto.randomUUID(),
        cacheId: cacheId_2,
        cacheData: cachedData2,
        requestCount: 2
      };

      const fourthInstanceData = {
        ...DEFAULT_FETCH_DATA,
        integrationId: crypto.randomUUID(),
        cacheId: cacheId_3,
        requestCount: 2,
        cacheData: undefined
      };

      const fifthInstanceData = {
        ...DEFAULT_FETCH_DATA,
        integrationId: crypto.randomUUID(),
        cacheId: cacheId_4,
        cacheData: cachedData_NoSignature_NoNbs,
        requestCount: 1
      };

      // when
      const inputRequestData = [firstInstanceData, secondInstanceData, thirdInstanceData, fourthInstanceData, fifthInstanceData];
      const fetchIdResult = fetcher.fetchId(inputRequestData, CONSENT_DATA_GDPR_ALLOWED, true);

      // then
      return fetchIdResult.then(refreshedResponse => {
        const expectedResponse = createResponse(FETCH_RESPONSE_OBJ, inputRequestData);

        expectHttpPOST(server.requests[0], `https://id5-sync.com/gm/v3`, {
          requests: [
            expectedRequestFor(firstInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, {
              nbPage: 1,
              s: 'sig1',
              used_refresh_in_seconds: 1234
            }),
            expectedRequestFor(secondInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, {
              nbPage: 2,
              s: 'sig2',
              used_refresh_in_seconds: 4321
            }),
            expectedRequestFor(thirdInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, {
              nbPage: 2,
              s: 'sig2',
              used_refresh_in_seconds: 4321
            }),
            expectedRequestFor(fourthInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS),
            expectedRequestFor(fifthInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, {
              nbPage: 0
            })
          ]
        });

        expect(refreshedResponse.timestamp).is.not.null;
        expect(refreshedResponse.timestamp).is.not.undefined;
        expect(refreshedResponse.response).is.eql(expectedResponse);
      });
    });


    [true, false, undefined].forEach(accessibilityResult => {
      it(`add local storage accessibility result to request (${accessibilityResult})`, function () {

        // when
        const inputFetchData = [DEFAULT_FETCH_DATA];
        const fetchIdResult = fetcher.fetchId(inputFetchData, CONSENT_DATA_GDPR_ALLOWED, accessibilityResult);

        // then
        return fetchIdResult.then(() => {
          expectHttpPOST(server.requests[0], `https://id5-sync.com/gm/v3`, {
            requests: [
              expectedRequestFor(DEFAULT_FETCH_DATA, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, {
                localStorage: accessibilityResult === true ? 1 : 0
              })]
          });
        });
      });
    });

    it(`passes GPP consent information to server`, function () {
      const gppAllowed = new ConsentData(API_TYPE.GPP_V1_1);
      gppAllowed.gppData = new GppConsentData(API_TYPE.GPP_V1_1, true, [2, 6], 'GPP_STRING');

      // when
      const inputFetchData = [DEFAULT_FETCH_DATA];
      const fetchIdResult = fetcher.fetchId(inputFetchData, gppAllowed, true);

      // then
      return fetchIdResult.then(() => {
        expect(server.requests[0].url).is.eq(`https://id5-sync.com/gm/v3`);
        let body = JSON.parse(server.requests[0].requestBody);
        expect(body.requests).to.have.lengthOf(1);
        expect(body.requests[0].gpp_string).is.eq('GPP_STRING');
        expect(body.requests[0].gpp_sid).is.eq('2,6');
      });
    });
  });

  describe('should handle fetch refresh error', function () {
    const fetchData = DEFAULT_FETCH_DATA;

    beforeEach(function () {
      /**
       * @type {FetchIdRequestData}
       */
      server = sinon.fakeServer.create();
      server.respondImmediately = true;
    });

    afterEach(function () {
      server.restore();
    });

    it('when empty response', function () {
      // given
      server.respondWith(sinonFetchResponder(() => ''));

      // when
      const fetchIdResult = fetcher.fetchId([fetchData], CONSENT_DATA_GDPR_ALLOWED, true);

      // then
      return fetchIdResult.catch(error => {
        // done
        expect(error).is.eql(new Error('Empty fetch response from ID5 servers: ""'));
      });
    });

    it('when invalid json response', function () {
      // given
      server.respondWith(sinonFetchResponder(() => '{'));

      // when
      const fetchIdResult = fetcher.fetchId([fetchData], CONSENT_DATA_GDPR_ALLOWED, true);


      // then
      return fetchIdResult.catch(error => {
        // done
        expect(error).is.instanceof(SyntaxError);
      });
    });

    it('when ajax fails', function () {
      // given
      server.respondWith((request) => {
        request.respond(500, {'Content-Type': ' application/json'}, 'Error');
      });

      // when
      const fetchIdResult = fetcher.fetchId([fetchData], CONSENT_DATA_GDPR_ALLOWED, true);

      // then
      return fetchIdResult.catch(error => {
        // done
        expect(error).is.eql('Internal Server Error');
      });
    });

    it('when missing universal_uid', function () {
      // given
      server.respondWith(sinonFetchResponder(() => '{ "property" : 10 }'));

      // when
      const fetchIdResult = fetcher.fetchId([fetchData], CONSENT_DATA_GDPR_ALLOWED, true);

      // then
      return fetchIdResult.catch(error => {
        // done
        expect(error).is.eql(new Error(`Server response failed to validate: { "property" : 10 }`));
      });
    });
  });
});

// Helper functions

/**
 * @type FetchIdRequestData
 */
function expectedRequestFor(fetchIdData, consentData, extensions, other = undefined) {
  return {
    requestId: fetchIdData.integrationId,
    requestCount: fetchIdData.requestCount,
    role: fetchIdData.role,
    cacheId: fetchIdData.cacheId,
    att: fetchIdData.att,
    extensions: extensions,
    gdpr: consentData.gdprApplies ? 1 : 0,
    gdpr_consent: consentData.consentString,
    id5cdn: fetchIdData.isUsingCdn,
    localStorage: 1,
    o: fetchIdData.origin,
    v: fetchIdData.originVersion,
    source: fetchIdData.source,
    sourceVersion: fetchIdData.sourceVersion,
    partner: fetchIdData.partnerId,
    provided_options: {},
    cu: fetchIdData.refererInfo.canonicalUrl,
    ref: fetchIdData.refererInfo.ref,
    tml: fetchIdData.refererInfo.topmostLocation,
    top: fetchIdData.refererInfo.reachedTop ? 1 : 0,
    u: fetchIdData.refererInfo.stack[0],
    ua: window.navigator.userAgent,
    true_link: fetchIdData.trueLink,
    ...other
  };
}

function expectHttpPOST(request, url, body) {
  expect(request.url).is.eq(url);
  expect(request.method).is.eq('POST');
  const requestBody = JSON.parse(request.requestBody);
  expect(requestBody).is.eql(body);
}

function sinonFetchResponder(responseProvider) {
  return (request) => {
    request.respond(200, {'Content-Type': ' application/json'}, responseProvider(request));
  };
}

function buildTestUaHints() {
  return {
    'architecture': 'x86',
    'brands': [
      {
        'brand': ' Not A;Brand',
        'version': '99'
      },
      {
        'brand': 'Chromium',
        'version': '101'
      },
      {
        'brand': 'Froogle Chrome',
        'version': '101'
      }
    ],
    'fullVersionList': [
      {
        'brand': ' Not A;Brand',
        'version': '99.0.0.0'
      },
      {
        'brand': 'Chromium',
        'version': '101.0.4951.64'
      },
      {
        'brand': 'Froogle Chrome',
        'version': '101.0.4951.64'
      }
    ],
    'mobile': false,
    'model': '',
    'platform': 'Linux',
    'platformVersion': '5.17.9'
  };
}
