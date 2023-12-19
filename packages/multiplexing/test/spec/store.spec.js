import * as chai from 'chai';
import {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiDateTime from 'chai-datetime';
import {Store, StoredDataState, StorageConfig} from '../../src/store.js';
import {ClientStore} from '../../src/clientStore.js';
import {API_TYPE, ConsentData} from '../../src/index.js';
import CONSTANTS from '../../src/constants.js';
import {RefreshedResponse} from '../../src/fetch.js';

chai.use(sinonChai);
chai.use(chaiDateTime);


const FETCH_ID_DATA = [
  {
    integrationId: 'id-1',
    partnerId: 1,
    pd: 'pd1',
    segments: 'seg1',
    cacheId: 'cache-1'
  },
  {
    integrationId: 'id-2',
    partnerId: 2,
    pd: 'pd2',
    segments: 'seg2',
    cacheId: 'cache-2'
  }
];

const CONSENT_DATA = Object.assign(new ConsentData(), {
  consentString: 'CONSENT_STRING',
  localStoragePurposeConsent: true,
  gdprApplies: true,
  api: API_TYPE.TCF_V2
});

const FETCH_RESPONSE_OBJ = {
  created_at: '2023-08-07T15:46:59.070010024Z',
  id5_consent: true,
  original_uid: 'testresponseid5id',
  universal_uid: 'testresponseid5id',
  link_type: 0,
  cascade_needed: false,
  ext: {
    linkType: 0,
    pba: 'g+Q9GCIcuZuBMslwof4uDw=='
  }
};

describe('Stored Data State', function () {

  [
    [undefined, false],
    [100, false],
    [13 * 3600 * 24, false],
    [14 * 3600 * 24 + 1, true] // 14 days and 1 second
  ].forEach(([age, expected]) => {
    it(`should check if response is stale (age=${age})`, function () {
      // given
      const state = new StoredDataState();
      state.storedDateTime = !age ? undefined : (Date.now() - age * 1000);

      // when
      expect(state.isStoredIdStale()).to.be.eql(expected);
    });
  });

  [
    [3600, 1800, true],
    [1800, 3600, false],
    [7200, 7200, false]
  ].forEach(([age, maxAge, expected]) => {
    it(`should check if response require refresh (age=${age}, maxAge=${maxAge})`, function () {
      // given
      const state = new StoredDataState();
      state.storedDateTime = Date.now() - age * 1000;
      state.refreshInSeconds = maxAge;

      // when
      expect(state.refreshInSecondsHasElapsed()).to.be.eql(expected);
    });
  });
});

describe('Store', function () {


  /**
   * @type {ClientStore}
   */
  let clientStore;
  /**
   * @type {Store}
   */
  let store;
  beforeEach(() => {
    clientStore = sinon.createStubInstance(ClientStore);
    store = new Store(clientStore);
  });


  const STORE_TIME = 1691737155000;

  it('should return stored data state with defaults', function () {

    // given
    const partnerId1 = FETCH_ID_DATA[0].partnerId;
    const partnerId2 = FETCH_ID_DATA[1].partnerId;

    clientStore.getResponse.returns(FETCH_RESPONSE_OBJ);
    clientStore.getDateTime.returns(STORE_TIME);
    clientStore.isStoredPdUpToDate.returns(true);
    clientStore.storedSegmentsMatchesSegments.returns(true);

    // when
    const storedDataState = store.getStoredDataState(FETCH_ID_DATA);

    // then
    expect(clientStore.isStoredPdUpToDate).to.have.been.calledTwice;
    expect(clientStore.isStoredPdUpToDate.firstCall).to.have.been.calledWith(partnerId1, FETCH_ID_DATA[0].pd);
    expect(clientStore.isStoredPdUpToDate.secondCall).to.have.been.calledWith(partnerId2, FETCH_ID_DATA[1].pd);
    expect(clientStore.storedSegmentsMatchesSegments).to.have.been.calledTwice;
    expect(clientStore.storedSegmentsMatchesSegments.firstCall).to.have.been.calledWith(partnerId1, FETCH_ID_DATA[0].segments);
    expect(clientStore.storedSegmentsMatchesSegments.secondCall).to.have.been.calledWith(partnerId2, FETCH_ID_DATA[1].segments);
    expect(clientStore.getNb).to.have.been.calledTwice;
    expect(clientStore.getNb.firstCall).to.have.been.calledWith(partnerId1);
    expect(clientStore.getNb.secondCall).to.have.been.calledWith(partnerId2);
    expect(clientStore.storedConsentDataMatchesConsentData).to.have.not.been.called;

    expect(storedDataState).to.eql(Object.assign(new StoredDataState(), {
      storedResponse: FETCH_RESPONSE_OBJ,
      storedDateTime: STORE_TIME,
      pdHasChanged: false,
      segmentsHaveChanged: false,
      refreshInSeconds: 7200,
      nb: {'1': 0, '2': 0},
      consentHasChanged: undefined
    }));
  });

  it('should return stored data state with nb counters ', function () {

    // given
    clientStore.getResponse.returns(FETCH_RESPONSE_OBJ);
    clientStore.getDateTime.returns(STORE_TIME);
    clientStore.isStoredPdUpToDate.returns(true);
    clientStore.storedSegmentsMatchesSegments.returns(true);
    clientStore.getNb.onFirstCall().returns(10);
    clientStore.getNb.onSecondCall().returns(20);
    // when
    const storedDataState = store.getStoredDataState(FETCH_ID_DATA);

    // then

    expect(storedDataState).to.eql(Object.assign(new StoredDataState(), {
      storedResponse: FETCH_RESPONSE_OBJ,
      storedDateTime: STORE_TIME,
      pdHasChanged: false,
      segmentsHaveChanged: false,
      refreshInSeconds: 7200,
      nb: {'1': 10, '2': 20},
      consentHasChanged: undefined
    }));
  });

  it('should return stored data state with minimum refresh time from fetch data', function () {

    // given

    clientStore.getResponse.returns(FETCH_RESPONSE_OBJ);
    clientStore.getDateTime.returns(STORE_TIME);
    clientStore.isStoredPdUpToDate.returns(true);
    clientStore.storedSegmentsMatchesSegments.returns(true);

    const fetchIdData = [
      {
        ...FETCH_ID_DATA[0],
        refreshInSeconds: 200
      }, {
        ...FETCH_ID_DATA[1],
        refreshInSeconds: 20
      }
    ];

    // when
    const storedDataState = store.getStoredDataState(fetchIdData);

    // then

    expect(storedDataState).to.eql(Object.assign(new StoredDataState(), {
      storedResponse: FETCH_RESPONSE_OBJ,
      storedDateTime: STORE_TIME,
      pdHasChanged: false,
      segmentsHaveChanged: false,
      refreshInSeconds: 20,
      nb: {'1': 0, '2': 0},
      consentHasChanged: undefined
    }));
  });

  it('should return stored data state with refresh time from cached response', function () {

    // given
    const response = {
      ...FETCH_RESPONSE_OBJ,
      cache_control: {
        max_age_sec: 1800
      }
    };
    clientStore.getResponse.returns(response);
    clientStore.getDateTime.returns(STORE_TIME);
    clientStore.isStoredPdUpToDate.returns(true);
    clientStore.storedSegmentsMatchesSegments.returns(true);
    const fetchIdData = [
      {
        ...FETCH_ID_DATA[0],
        refreshInSeconds: 200
      }, {
        ...FETCH_ID_DATA[1],
        refreshInSeconds: 20
      }
    ];

    // when
    const storedDataState = store.getStoredDataState(fetchIdData);

    // then

    expect(storedDataState).to.eql(Object.assign(new StoredDataState(), {
      storedResponse: response,
      storedDateTime: STORE_TIME,
      pdHasChanged: false,
      segmentsHaveChanged: false,
      refreshInSeconds: 1800,
      nb: {'1': 0, '2': 0},
      consentHasChanged: undefined
    }));
  });

  [false, true].forEach(consentUpToDate => {
    it(`should return stored data with consent data change up to date (${consentUpToDate})`, function () {

      // given
      clientStore.getResponse.returns(FETCH_RESPONSE_OBJ);
      clientStore.getDateTime.returns(STORE_TIME);
      clientStore.isStoredPdUpToDate.returns(true);
      clientStore.storedSegmentsMatchesSegments.returns(true);
      clientStore.storedConsentDataMatchesConsentData.returns(consentUpToDate);

      // when
      const storedDataState = store.getStoredDataState(FETCH_ID_DATA, CONSENT_DATA);

      // then
      expect(clientStore.storedConsentDataMatchesConsentData).to.have.been.calledWith(CONSENT_DATA);

      expect(storedDataState).to.eql(Object.assign(new StoredDataState(), {
        storedResponse: FETCH_RESPONSE_OBJ,
        storedDateTime: STORE_TIME,
        pdHasChanged: false,
        segmentsHaveChanged: false,
        refreshInSeconds: 7200,
        nb: {'1': 0, '2': 0},
        consentHasChanged: !consentUpToDate
      }));
    });
  });

  [[false, false, true],
    [true, false, true],
    [false, true, true],
    [true, true, false]
  ].forEach(([firstUpToDate, secondUpToDate, expectedHasChanged]) => {
    it(`should return stored data with pd has changed true only if any changed (${JSON.stringify({
      firstUpdToDate: firstUpToDate,
      secondUpToDate,
      expectedHasChanged
    })})`, function () {

      // given
      clientStore.getResponse.returns(FETCH_RESPONSE_OBJ);
      clientStore.getDateTime.returns(STORE_TIME);
      clientStore.isStoredPdUpToDate.onFirstCall().returns(firstUpToDate);
      clientStore.isStoredPdUpToDate.onSecondCall().returns(secondUpToDate);
      clientStore.storedSegmentsMatchesSegments.returns(true);
      clientStore.storedConsentDataMatchesConsentData.returns(true);

      // when
      const storedDataState = store.getStoredDataState(FETCH_ID_DATA, CONSENT_DATA);

      // then
      expect(storedDataState).to.eql(Object.assign(new StoredDataState(), {
        storedResponse: FETCH_RESPONSE_OBJ,
        storedDateTime: STORE_TIME,
        pdHasChanged: expectedHasChanged,
        segmentsHaveChanged: false,
        refreshInSeconds: 7200,
        nb: {'1': 0, '2': 0},
        consentHasChanged: false
      }));
    });
  });

  [[false, false, true],
    [true, false, true],
    [false, true, true],
    [true, true, false]
  ].forEach(([firstUpToDate, secondUpToDate, expectedHasChanged]) => {
    it(`should return stored data with segments has changed true only if any changed (${JSON.stringify({
      firstUpdToDate: firstUpToDate,
      secondUpToDate,
      expectedHasChanged
    })})`, function () {

      // given
      clientStore.getResponse.returns(FETCH_RESPONSE_OBJ);
      clientStore.getDateTime.returns(STORE_TIME);
      clientStore.storedSegmentsMatchesSegments.onFirstCall().returns(firstUpToDate);
      clientStore.storedSegmentsMatchesSegments.onSecondCall().returns(secondUpToDate);
      clientStore.isStoredPdUpToDate.returns(true);
      clientStore.storedConsentDataMatchesConsentData.returns(true);

      // when
      const storedDataState = store.getStoredDataState(FETCH_ID_DATA, CONSENT_DATA);

      // then
      expect(storedDataState).to.eql(Object.assign(new StoredDataState(), {
        storedResponse: FETCH_RESPONSE_OBJ,
        storedDateTime: STORE_TIME,
        pdHasChanged: false,
        segmentsHaveChanged: expectedHasChanged,
        refreshInSeconds: 7200,
        nb: {'1': 0, '2': 0},
        consentHasChanged: false
      }));
    });

  });

  it(`should store request data`, function () {
    // given
    const partner1 = FETCH_ID_DATA[0].partnerId;
    const partner2 = FETCH_ID_DATA[1].partnerId;
    const consentData = {};

    clientStore.isStoredPdUpToDate.onFirstCall().returns(false);
    clientStore.isStoredPdUpToDate.onSecondCall().returns(false);

    // when
    store.storeRequestData(consentData, FETCH_ID_DATA);

    // then
    expect(clientStore.putHashedConsentData).to.have.been.calledOnce;
    expect(clientStore.isStoredPdUpToDate).to.have.been.calledTwice;
    expect(clientStore.isStoredPdUpToDate.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStore.isStoredPdUpToDate.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].pd);
    expect(clientStore.putHashedPd).to.have.been.calledTwice;
    expect(clientStore.putHashedPd.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStore.putHashedPd.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].pd);
    expect(clientStore.putHashedSegments).to.have.been.calledTwice;
    expect(clientStore.putHashedSegments.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].segments);
    expect(clientStore.putHashedSegments.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].segments);
  });

  it(`should store request data and pd only if changed`, function () {
    // given
    const partner1 = FETCH_ID_DATA[0].partnerId;
    const partner2 = FETCH_ID_DATA[1].partnerId;
    const consentData = {};

    clientStore.isStoredPdUpToDate.onFirstCall().returns(false);
    clientStore.isStoredPdUpToDate.onSecondCall().returns(true);

    // when
    store.storeRequestData(consentData, FETCH_ID_DATA);

    // then
    expect(clientStore.putHashedConsentData).to.have.been.calledOnce;
    expect(clientStore.isStoredPdUpToDate).to.have.been.calledTwice;
    expect(clientStore.isStoredPdUpToDate.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStore.isStoredPdUpToDate.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].pd);
    expect(clientStore.putHashedPd).to.have.been.calledOnce;
    expect(clientStore.putHashedPd.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStore.putHashedSegments).to.have.been.calledTwice;
    expect(clientStore.putHashedSegments.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].segments);
    expect(clientStore.putHashedSegments.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].segments);
  });

  it('should increase NB and update state', function () {
    // given
    const partner1 = FETCH_ID_DATA[0].partnerId;
    const partner2 = FETCH_ID_DATA[1].partnerId;
    const state = {
      nb: {}
    };
    state.nb[partner1] = 10;
    state.nb[partner2] = 0;

    clientStore.incNbV1.onFirstCall().returns(11);
    clientStore.incNbV1.onSecondCall().returns(1);

    // when
    store.incNbs(FETCH_ID_DATA, state);

    // then
    expect(clientStore.incNbV1).to.have.been.calledTwice;
    expect(clientStore.incNbV1.firstCall.args).to.be.eql([partner1, 10]);
    expect(clientStore.incNbV1.secondCall.args).to.be.eql([partner2, 0]);

    expect(clientStore.incNbV2).to.have.been.calledTwice;
    expect(clientStore.incNbV2.firstCall).to.be.calledWith(FETCH_ID_DATA[0].cacheId);
    expect(clientStore.incNbV2.secondCall).to.be.calledWith(FETCH_ID_DATA[1].cacheId);

    let expectedNb = {};
    expectedNb[partner1] = 11;
    expectedNb[partner2] = 1;
    expect(state.nb).to.be.eql(expectedNb);
  });

  [true, false].forEach(usedCachedResponse => {
    it(`should store response usedCachedResponse=${usedCachedResponse}`, () => {
      // given
      const responseTime = 10234;

      const expectedNbReset = usedCachedResponse ? 0 : 1;
      const genericResponse = {
        universal_uid: 'uid',
        signature: 'sig'
      };

      const response1 = {
        universal_uid: 'uid-1',
        signature: 'sig'
      };
      const response2 = {
        universal_uid: 'uid-2',
        signature: 'sig'
      };

      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getGenericResponse.returns(genericResponse);
      refreshedResponse.timestamp = responseTime;
      refreshedResponse.getResponseFor.withArgs(FETCH_ID_DATA[0].integrationId).returns(response1);
      refreshedResponse.getResponseFor.withArgs(FETCH_ID_DATA[1].integrationId).returns(response2);

      // when
      store.storeResponse(FETCH_ID_DATA, refreshedResponse, usedCachedResponse);

      // then
      // store V1
      expect(clientStore.putResponseV1).to.have.been.calledWith(genericResponse);
      expect(clientStore.setResponseDateTimeV1).to.have.been.calledWith(new Date(responseTime).toUTCString());
      expect(clientStore.setNbV1).to.be.calledTwice;
      expect(clientStore.setNbV1.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId, expectedNbReset]);
      expect(clientStore.setNbV1.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId, expectedNbReset]);

      // store V2
      expect(clientStore.setNbV2).to.be.calledTwice;
      expect(clientStore.setNbV2.firstCall.args).to.be.eql([FETCH_ID_DATA[0].cacheId, expectedNbReset]);
      expect(clientStore.setNbV2.secondCall.args).to.be.eql([FETCH_ID_DATA[1].cacheId, expectedNbReset]);
      expect(clientStore.storeResponseV2).to.be.calledTwice;
      expect(clientStore.storeResponseV2.firstCall).to.be.calledWith(FETCH_ID_DATA[0].cacheId, response1);
      expect(clientStore.storeResponseV2.secondCall).to.be.calledWith(FETCH_ID_DATA[1].cacheId, response2);
    });

  });

  it('should clear all', () => {

    // when
    store.clearAll(FETCH_ID_DATA);

    // then
    expect(clientStore.clearResponse).to.have.been.calledOnce;
    expect(clientStore.clearDateTime).to.have.been.calledOnce;
    expect(clientStore.clearNb).to.have.been.calledTwice;
    expect(clientStore.clearNb.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId]);
    expect(clientStore.clearNb.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId]);
    expect(clientStore.clearHashedPd).to.have.been.calledTwice;
    expect(clientStore.clearHashedPd.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId]);
    expect(clientStore.clearHashedPd.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId]);
    expect(clientStore.clearHashedSegments).to.have.been.calledTwice;
    expect(clientStore.clearHashedSegments.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId]);
    expect(clientStore.clearHashedSegments.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId]);
    expect(clientStore.clearHashedConsentData).to.have.been.calledOnce;
  });
});

describe('Storage config', function () {
  const STORAGE_CONFIG = CONSTANTS.STORAGE_CONFIG;
  it('should return default config', function () {
    const storageConfig = new StorageConfig(undefined);

    function verifyConfig(actual, expected) {
      expect(actual.name).is.eq(expected.name);
      expect(actual.expiresDays).is.eq(expected.expiresDays);
    }

    verifyConfig(storageConfig.ID5, STORAGE_CONFIG.ID5);
    verifyConfig(storageConfig.LAST, STORAGE_CONFIG.LAST);
    verifyConfig(storageConfig.PD, STORAGE_CONFIG.PD);
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
    verifyConfig(storageConfig.SEGMENTS, STORAGE_CONFIG.SEGMENTS);
  });

  it('should return configured expiration', function () {
    const storageExpirationDays = 40;
    const storageConfig = new StorageConfig(storageExpirationDays);

    function verifyConfig(actual, expected) {
      expect(actual.name).is.eq(expected.name);
      expect(actual.expiresDays).is.eq(storageExpirationDays);
    }

    verifyConfig(storageConfig.ID5, STORAGE_CONFIG.ID5);
    verifyConfig(storageConfig.LAST, STORAGE_CONFIG.LAST);
    verifyConfig(storageConfig.PD, STORAGE_CONFIG.PD);
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
    verifyConfig(storageConfig.SEGMENTS, STORAGE_CONFIG.SEGMENTS);
  });

  it('should apply minimum expiration', function () {
    const storageExpirationDays = 0;
    const storageConfig = new StorageConfig(storageExpirationDays);

    function verifyConfig(actual, expected) {
      expect(actual.name).is.eq(expected.name);
      expect(actual.expiresDays).is.eq(1);
    }

    verifyConfig(storageConfig.ID5, STORAGE_CONFIG.ID5);
    verifyConfig(storageConfig.LAST, STORAGE_CONFIG.LAST);
    verifyConfig(storageConfig.PD, STORAGE_CONFIG.PD);
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
    verifyConfig(storageConfig.SEGMENTS, STORAGE_CONFIG.SEGMENTS);
  });
});

