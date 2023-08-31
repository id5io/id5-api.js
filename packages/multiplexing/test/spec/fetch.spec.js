import * as chai from 'chai';
import {expect} from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import {UidFetcher} from '../../src/fetch.js';
import {Extensions} from '../../src/extensions.js';
import {
  API_TYPE,
  ApiEvent,
  ApiEventsDispatcher,
  ConsentData,
  ConsentManager,
  GRANT_TYPE,
  LocalStorageGrant,
  NoopLogger
} from '../../src/index.js';
import {Id5CommonMetrics} from '@id5io/diagnostics';
import * as utils from '../../../../lib/utils.js';
import {Store, StoredDataState} from "../../src/store.js";
import Promise from "../../src/promise.js";

chai.use(sinonChai);

const LOCAL_STORAGE_GRANT_ALLOWED_BY_API = new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
const CONSENT_DATA_GDPR_ALLOWED = Object.assign(new ConsentData(), {
  consentString: 'CONSENT_STRING',
  localStoragePurposeConsent: true,
  gdprApplies: true,
  api: API_TYPE.TCF_V2
});

const DEFAULT_EXTENSIONS = {
  lb: 'lbValue',
  lbCDN: '%%LB_CDN%%'
}

const origin = 'api';
const originVersion = '1.0.36';

const PRIVACY_DATA_RETURNED = {jurisdiction: 'gdpr', id5_consent: true}

const _DEBUG = false;

const FETCH_RESPONSE_OBJ = {
  created_at: '2023-08-07T15:46:59.070010024Z',
  id5_consent: true,
  original_uid: 'testresponseid5id',
  universal_uid: 'testresponseid5id',
  link_type: 0,
  cascade_needed: false,
  privacy: PRIVACY_DATA_RETURNED,
  ext: {
    linkType: 0,
    pba: 'g+Q9GCIcuZuBMslwof4uDw=='
  }
};

const FETCH_RESPONSE_STRING = JSON.stringify(FETCH_RESPONSE_OBJ);

/**
 * @type {FetchIdData}
 */
const DEFAULT_FETCH_DATA = {
  integrationId: 'default-integration',
  origin: origin,
  originVersion: originVersion,
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
  isLocalStorageAvailable: true,
  isUsingCdn: true,
  att: 0,
  uaHints: undefined,
  liveIntentId: undefined,
  abTesting: undefined,
  pd: undefined,
  partnerUserId: undefined,
  provider: undefined,
  segments: undefined,
  invalidSegmentsCount: undefined,
  refreshInSeconds: 3600,
  providedRefreshInSeconds: undefined
}

class Dispatcher4Test extends ApiEventsDispatcher {

  constructor(logger) {
    super(logger);
  }

  /**
   *
   * @param event
   * @return {Promise<Object>}
   */
  when(event) {
    return new Promise((resolve, reject) => {
      this.on(event, resolve);
    });
  }
}

describe('UidFetcher', function () {
  /**
   * @type {UidFetcher}
   */
  let fetcher;
  /**
   * @type {ApiEventsDispatcher}
   */
  let dispatcher;
  /**
   * @type {ConsentManager}
   */
  let consentManager;
  /**
   * @type {Extensions}
   */
  let extensions;
  /**
   * @type {Store}
   */
  let store;
  /**
   * @type {Id5CommonMetrics}
   */
  let metrics;
  let ajaxStub;


  beforeEach(function () {
    let log = _DEBUG ? console : NoopLogger;
    consentManager = sinon.createStubInstance(ConsentManager);
    dispatcher = new Dispatcher4Test(log);
    store = sinon.createStubInstance(Store);
    extensions = sinon.createStubInstance(Extensions);
    metrics = new Id5CommonMetrics(origin, originVersion);
    fetcher = new UidFetcher(consentManager, store, metrics, log, extensions);

    consentManager.localStorageGrant.returns(LOCAL_STORAGE_GRANT_ALLOWED_BY_API);
    consentManager.getConsentData.resolves(CONSENT_DATA_GDPR_ALLOWED);
    extensions.gather.resolves(DEFAULT_EXTENSIONS);
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      callbacks.success(FETCH_RESPONSE_STRING);
    });
  })

  afterEach(function () {
    ajaxStub.restore();
  });

  describe('Calls multi fetch', function () {
    const storedDataState = Object.assign(new StoredDataState(), {
      nb: {},
      refreshInSeconds: 7200
    });

    beforeEach(function () {
      storedDataState.nb = {};
      store.getStoredDataState.returns(storedDataState)
    });

    [
      ['default', {}, {}],
      ['with pd', {pd: 'PD_DATA'}, {pd: 'PD_DATA'}],
      ['with partnerUserId', {partnerUserId: '1234567'}, {puid: '1234567'}],
      ['with provider', {provider: 'some_provider'}, {provider: 'some_provider'}],
      ['with ua hints', {
        uaHints: {
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
        }
      }, {
        ua_hints: {
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
        }
      },
      ],
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
        invalidSegmentsCount: 10,
      }, {
        segments: [
          {destination: '22', ids: ['abc']}
        ],
        _invalid_segments: 10
      }],
      ['with liveIntentId', {liveIntentId: 'LID'}, {li: 'LID'}],
      ['with provided refreshInSeconds', {providedRefreshInSeconds: 1000}, {
        provided_options: {
          refresh_in_seconds: 1000
        }
      }]
    ].forEach(([description, data, expectedInRequest]) => {
      it(`should call fetch with single request (${description})`, async () => {
        // given
        /**
         * @type {FetchIdData}
         */
        const fetchData = {
          ...DEFAULT_FETCH_DATA,
          integrationId: crypto.randomUUID(),
          ...data
        };
        const inputFetchData = [fetchData];
        const nbPage = 3;
        storedDataState.nb[fetchData.partnerId] = nbPage;

        // when
        const userIdPromise = dispatcher.when(ApiEvent.USER_ID_READY);
        fetcher.getId(dispatcher, inputFetchData)

        // then
        return userIdPromise.then(data => {
          expect(store.getStoredDataState).to.have.been.calledTwice;
          expect(store.getStoredDataState.firstCall.args).to.be.eql([inputFetchData]);
          expect(store.getStoredDataState.secondCall.args).to.be.eql([inputFetchData, CONSENT_DATA_GDPR_ALLOWED]);
          expect(store.storeRequestData).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED, inputFetchData);
          expect(consentManager.setStoredPrivacy).to.have.been.calledWith(PRIVACY_DATA_RETURNED);
          expectHttpPOST(ajaxStub.firstCall, `https://id5-sync.com/gm/v2`, {
            requests: [
              expectedRequestFor(fetchData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, nbPage, storedDataState, expectedInRequest)
            ]
          });
          expect(store.storeResponse).to.have.been.calledWith(inputFetchData, FETCH_RESPONSE_STRING, false);
          expect(store.incNbs).to.have.not.been.called;
          expect(data.timestamp).is.not.null;
          expect(data.timestamp).is.not.undefined;
          expect(data.isFromCache).is.false;
          expect(data.responseObj).is.eql(FETCH_RESPONSE_OBJ);
        });
      });

      it(`should call fetch with multiple requests (${description})`, async () => {
        // given
        /**
         * @type {FetchIdData}
         */
        const firstInstanceData = {
          ...DEFAULT_FETCH_DATA,
          integrationId: crypto.randomUUID()
        };
        /**
         * @type {FetchIdData}
         */
        const secondInstanceData = {
          integrationId: crypto.randomUUID(),
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
          isLocalStorageAvailable: false,
          isUsingCdn: false,
          att: 10,
          refreshInSeconds: 3600,
          ...data
        };
        const nbPage1 = 3;
        const nbPage2 = 4;
        storedDataState.nb[firstInstanceData.partnerId] = nbPage1;
        storedDataState.nb[secondInstanceData.partnerId] = nbPage2;
        const userIdPromise = dispatcher.when(ApiEvent.USER_ID_READY);

        // when
        fetcher.getId(dispatcher, [firstInstanceData, secondInstanceData])

        // then
        return userIdPromise.then(data => {
          expect(consentManager.setStoredPrivacy).to.have.been.calledWith(PRIVACY_DATA_RETURNED);
          expect(store.storeRequestData).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED, [firstInstanceData, secondInstanceData]);
          expect(store.storeResponse).to.have.been.calledWith([firstInstanceData, secondInstanceData], FETCH_RESPONSE_STRING, false);
          expectHttpPOST(ajaxStub.firstCall, `https://id5-sync.com/gm/v2`, {
            requests: [
              expectedRequestFor(firstInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, nbPage1, storedDataState),
              expectedRequestFor(secondInstanceData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, nbPage2, storedDataState, expectedInRequest)
            ]
          });
          expect(data.timestamp).is.not.null;
          expect(data.timestamp).is.not.undefined;
          expect(data.isFromCache).is.false;
          expect(data.responseObj).is.eql(FETCH_RESPONSE_OBJ);
        });
      })
    });

    it('should notify if cascade is needed', () => {
      // given
      const fetchIdData = {
        ...DEFAULT_FETCH_DATA,
        integrationId: crypto.randomUUID()
      };

      const cascadePromise = dispatcher.when(ApiEvent.CASCADE_NEEDED);

      ajaxStub.restore();
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
        callbacks.success(JSON.stringify({
          ...FETCH_RESPONSE_OBJ,
          cascade_needed: true
        }));
      });

      // when
      fetcher.getId(dispatcher, [fetchIdData])

      // then
      return cascadePromise.then(data => {
        expect(data).to.be.eql({
          partnerId: fetchIdData.partnerId,
          consentString: CONSENT_DATA_GDPR_ALLOWED.consentString,
          gdprApplies: CONSENT_DATA_GDPR_ALLOWED.gdprApplies,
          userId: FETCH_RESPONSE_OBJ.universal_uid
        });
      });
    });
  });

  describe('Response from cache', function () {
    it(`should provide from cache and don't refresh if not needed`, function () {
      // given
      const stateStub = sinon.createStubInstance(StoredDataState);

      stateStub.storedResponse = FETCH_RESPONSE_OBJ;
      stateStub.storedDateTime = 1234;
      stateStub.consentHasChanged = false;
      stateStub.pdHasChanged = false;
      stateStub.isStoredIdStale.returns(false);
      stateStub.refreshInSecondsHasElapsed.returns(false);
      stateStub.isResponseComplete.returns(true);
      stateStub.isResponsePresent.returns(true);
      stateStub.segmentsHaveChanged = false;
      stateStub.hasValidUid.returns(true);
      stateStub.consentHasChanged = false;
      stateStub.nb = {}

      store.getStoredDataState.returns(stateStub);

      // when
      const userIdPromise = dispatcher.when(ApiEvent.USER_ID_READY);

      fetcher.getId(dispatcher, [DEFAULT_FETCH_DATA]);

      // then
      return userIdPromise.then(fromCacheData => {
        expect(fromCacheData.timestamp).is.eq(stateStub.storedDateTime);
        expect(fromCacheData.isFromCache).is.true;
        expect(fromCacheData.responseObj).is.eql(stateStub.storedResponse);
        expect(extensions.gather).to.have.not.been.called;
        expect(ajaxStub).to.have.not.been.called;
        expect(store.incNbs).to.have.been.calledWith([DEFAULT_FETCH_DATA], stateStub);
        expect(store.getStoredDataState).to.have.been.calledTwice;
        expect(store.getStoredDataState.firstCall.args).to.be.eql([[DEFAULT_FETCH_DATA]]);
        expect(store.getStoredDataState.secondCall.args).to.be.eql([[DEFAULT_FETCH_DATA], CONSENT_DATA_GDPR_ALLOWED]);
        expect(store.storeRequestData).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED, [DEFAULT_FETCH_DATA]);
        expect(consentManager.setStoredPrivacy).to.have.not.been.called;
      })
    });

    [
      {
        responseComplete: true, refreshRequired: true, consentHasChanged: false
      },
      {
        responseComplete: true, refreshRequired: false, consentHasChanged: true
      },
      {
        responseComplete: false, refreshRequired: false, consentHasChanged: false
      }
    ].forEach(cacheState => {
      it(`should provide from cache and then  refresh (${JSON.stringify(cacheState)})`, function () {
        // given
        const stateStub = sinon.createStubInstance(StoredDataState);

        stateStub.storedResponse = FETCH_RESPONSE_OBJ;
        stateStub.storedDateTime = 1234;
        stateStub.consentHasChanged = cacheState.consentHasChanged;
        stateStub.pdHasChanged = false;
        stateStub.isStoredIdStale.returns(false);
        stateStub.refreshInSecondsHasElapsed.returns(cacheState.refreshRequired);
        stateStub.isResponseComplete.returns(cacheState.responseComplete);
        stateStub.isResponsePresent.returns(true);
        stateStub.segmentsHaveChanged = false;
        stateStub.hasValidUid.returns(true);
        stateStub.nb = {}

        store.getStoredDataState.returns(stateStub);
        consentManager.getConsentData.reset();
        let resolveConsent;
        consentManager.getConsentData.returns(new Promise((resolve, reject) => {
          resolveConsent = resolve;
        }));

        // when
        const userIdFromCachePromise = dispatcher.when(ApiEvent.USER_ID_READY);

        fetcher.getId(dispatcher, [DEFAULT_FETCH_DATA]);

        // then
        return userIdFromCachePromise.then(fromCacheData => {
          expect(fromCacheData.timestamp).is.eq(stateStub.storedDateTime);
          expect(fromCacheData.isFromCache).is.true;
          expect(fromCacheData.responseObj).is.eql(stateStub.storedResponse);
          expect(store.incNbs).to.have.been.calledWith([DEFAULT_FETCH_DATA], stateStub);
          expect(store.getStoredDataState).to.have.been.calledOnce;
          expect(store.getStoredDataState.firstCall.args).to.be.eql([[DEFAULT_FETCH_DATA]]);

          const refreshedIdPromise = dispatcher.when(ApiEvent.USER_ID_READY);
          resolveConsent(CONSENT_DATA_GDPR_ALLOWED);
          return refreshedIdPromise;
        }).then(refreshedData => {
          expect(extensions.gather).to.have.been.called;
          expect(ajaxStub).to.have.been.called;

          expect(refreshedData.timestamp).is.not.eq(stateStub.storedDateTime);
          expect(refreshedData.isFromCache).is.false;
          expect(refreshedData.responseObj).is.eql(FETCH_RESPONSE_OBJ);
          expect(store.getStoredDataState).to.have.been.calledTwice;
          expect(store.getStoredDataState.secondCall.args).to.be.eql([[DEFAULT_FETCH_DATA], CONSENT_DATA_GDPR_ALLOWED]);
          expect(store.storeRequestData).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED, [DEFAULT_FETCH_DATA]);
          expect(store.storeResponse).to.have.been.calledWith([DEFAULT_FETCH_DATA], FETCH_RESPONSE_STRING, true);
          expect(consentManager.setStoredPrivacy).to.have.been.calledWith(PRIVACY_DATA_RETURNED);
        });
      });
    });

    [
      {
        hasValidUid: true, pdHasChanged: true, segmentsHaveChanged: false, isStale: false
      },
      {
        hasValidUid: true, pdHasChanged: false, segmentsHaveChanged: true, isStale: false
      },
      {
        hasValidUid: true, pdHasChanged: false, segmentsHaveChanged: false, isStale: true
      },
      {
        hasValidUid: false, pdHasChanged: false, segmentsHaveChanged: false, isStale: false
      }
    ].forEach(cacheState => {
      it(`should not provide from cache then refresh (${JSON.stringify(cacheState)})`, function () {
        // given
        const stateStub = sinon.createStubInstance(StoredDataState);

        stateStub.storedResponse = FETCH_RESPONSE_OBJ;
        stateStub.storedDateTime = 1234;
        stateStub.consentHasChanged = false;
        stateStub.pdHasChanged = cacheState.pdHasChanged;
        stateStub.isStoredIdStale.returns(cacheState.isStale);
        stateStub.refreshInSecondsHasElapsed.returns(false);
        stateStub.isResponseComplete.returns(true);
        stateStub.isResponsePresent.returns(true);
        stateStub.segmentsHaveChanged = cacheState.segmentsHaveChanged;
        stateStub.hasValidUid.returns(cacheState.hasValidUid);
        stateStub.nb = {}

        store.getStoredDataState.returns(stateStub);

        // when
        const userIdPromise = dispatcher.when(ApiEvent.USER_ID_READY);

        fetcher.getId(dispatcher, [DEFAULT_FETCH_DATA]);

        // then
        return userIdPromise.then(data => {
          expect(data.timestamp).is.not.undefined;
          expect(data.timestamp).is.not.eq(stateStub.storedDateTime);
          expect(data.isFromCache).is.false;
          expect(data.responseObj).is.eql(FETCH_RESPONSE_OBJ);
          expect(store.incNbs).to.have.not.been.called;
          expect(store.getStoredDataState).to.have.been.calledTwice;
          expect(store.getStoredDataState.firstCall.args).to.be.eql([[DEFAULT_FETCH_DATA]]);
          expect(store.getStoredDataState.secondCall.args).to.be.eql([[DEFAULT_FETCH_DATA], CONSENT_DATA_GDPR_ALLOWED]);
          expect(extensions.gather).to.have.been.called;
          expect(ajaxStub).to.have.been.called;
          expect(store.storeRequestData).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED, [DEFAULT_FETCH_DATA]);
          expect(store.storeResponse).to.have.been.calledWith([DEFAULT_FETCH_DATA], FETCH_RESPONSE_STRING, false);
          expect(consentManager.setStoredPrivacy).to.have.been.calledWith(PRIVACY_DATA_RETURNED);
        })
      });
    });

    it(`should not provide from cache when no local storage access not allowed`, function () {
      // given
      const stateStub = sinon.createStubInstance(StoredDataState);

      stateStub.storedResponse = FETCH_RESPONSE_OBJ;
      stateStub.storedDateTime = 1234;
      stateStub.consentHasChanged = false;
      stateStub.pdHasChanged = false;
      stateStub.isStoredIdStale.returns(false);
      stateStub.refreshInSecondsHasElapsed.returns(false);
      stateStub.isResponseComplete.returns(true);
      stateStub.isResponsePresent.returns(true);
      stateStub.segmentsHaveChanged = false;
      stateStub.hasValidUid.returns(true);
      stateStub.nb = {}

      store.getStoredDataState.returns(stateStub);

      consentManager.localStorageGrant.reset();
      consentManager.localStorageGrant.onCall(0).returns(new LocalStorageGrant(false, API_TYPE.NONE));
      consentManager.localStorageGrant.onCall(1).returns(LOCAL_STORAGE_GRANT_ALLOWED_BY_API);
      consentManager.localStorageGrant.onCall(2).returns(LOCAL_STORAGE_GRANT_ALLOWED_BY_API);

      // when
      const userIdPromise = dispatcher.when(ApiEvent.USER_ID_READY);

      fetcher.getId(dispatcher, [DEFAULT_FETCH_DATA]);

      // then
      return userIdPromise.then(data => {
        expect(data.timestamp).is.not.undefined;
        expect(data.timestamp).is.not.eq(stateStub.storedDateTime);
        expect(data.isFromCache).is.false;
        expect(data.responseObj).is.eql(FETCH_RESPONSE_OBJ);
        expect(store.incNbs).to.have.not.been.called;
        expect(store.getStoredDataState).to.have.been.calledOnce;
        expect(store.getStoredDataState.firstCall.args).to.be.eql([[DEFAULT_FETCH_DATA], CONSENT_DATA_GDPR_ALLOWED]);
        expect(extensions.gather).to.have.been.called;
        expect(ajaxStub).to.have.been.called;
        expect(store.storeRequestData).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED, [DEFAULT_FETCH_DATA]);
        expect(store.storeResponse).to.have.been.calledWith([DEFAULT_FETCH_DATA], FETCH_RESPONSE_STRING, false);
        expect(consentManager.setStoredPrivacy).to.have.been.calledWith(PRIVACY_DATA_RETURNED);
      })
    });
  });

  /**
   * @type FetchIdData
   */
  function expectedRequestFor(fetchIdData, consentData, extensions, nbPage, storedDataState, other = undefined) {
    return {
      requestId: fetchIdData.integrationId,
      att: fetchIdData.att,
      extensions: extensions,
      gdpr: consentData.gdprApplies ? 1 : 0,
      gdpr_consent: consentData.consentString,
      id5cdn: fetchIdData.isUsingCdn,
      localStorage: fetchIdData.isLocalStorageAvailable ? 1 : 0,
      o: fetchIdData.origin,
      v: fetchIdData.originVersion,
      partner: fetchIdData.partnerId,
      provided_options: {},
      cu: fetchIdData.refererInfo.canonicalUrl,
      ref: fetchIdData.refererInfo.ref,
      tml: fetchIdData.refererInfo.topmostLocation,
      top: fetchIdData.refererInfo.reachedTop ? 1 : 0,
      u: fetchIdData.refererInfo.stack[0],
      ua: window.navigator.userAgent,
      used_refresh_in_seconds: storedDataState.refreshInSeconds,
      nbPage: nbPage,
      ...other
    }
  }

  function expectHttpPOST(call, url, body) {
    expect(call.args[0]).is.eq(url);
    expect(JSON.parse(call.args[2])).is.eql(body);
    expect(call.args[3].method).is.eq('POST');
  }

});

