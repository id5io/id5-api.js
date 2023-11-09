import * as chai from 'chai';
import {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiDateTime from 'chai-datetime';
import {Store, StoredDataState, StorageConfig} from "../../src/store.js";
import {ClientStore} from "../../src/clientStore.js";
import {API_TYPE, ConsentData} from "../../src/index.js";
import CONSTANTS from '../../src/constants.js'

chai.use(sinonChai);
chai.use(chaiDateTime);


const FETCH_ID_DATA = [
  {
    partnerId: 1,
    pd: 'pd1',
    segments: 'seg1'
  },
  {
    partnerId: 2,
    pd: 'pd2',
    segments: 'seg2'
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
      const state = new StoredDataState()
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
      const state = new StoredDataState()
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
  let clientStoreV1;
  /**
   * @type {Store}
   */
  let store;
  beforeEach(() => {
    clientStoreV1 = sinon.createStubInstance(ClientStore);
    store = new Store(clientStoreV1);
  });


  const STORE_TIME = 1691737155000;

  it('should return stored data state with defaults', function () {

    // given
    const partnerId1 = FETCH_ID_DATA[0].partnerId;
    const partnerId2 = FETCH_ID_DATA[1].partnerId;

    clientStoreV1.getResponse.returns(FETCH_RESPONSE_OBJ);
    clientStoreV1.getDateTime.returns(STORE_TIME);
    clientStoreV1.isStoredPdUpToDate.returns(true);
    clientStoreV1.storedSegmentsMatchesSegments.returns(true);

    // when
    const storedDataState = store.getStoredDataState(FETCH_ID_DATA);

    // then
    expect(clientStoreV1.isStoredPdUpToDate).to.have.been.calledTwice;
    expect(clientStoreV1.isStoredPdUpToDate.firstCall).to.have.been.calledWith(partnerId1, FETCH_ID_DATA[0].pd);
    expect(clientStoreV1.isStoredPdUpToDate.secondCall).to.have.been.calledWith(partnerId2, FETCH_ID_DATA[1].pd);
    expect(clientStoreV1.storedSegmentsMatchesSegments).to.have.been.calledTwice;
    expect(clientStoreV1.storedSegmentsMatchesSegments.firstCall).to.have.been.calledWith(partnerId1, FETCH_ID_DATA[0].segments);
    expect(clientStoreV1.storedSegmentsMatchesSegments.secondCall).to.have.been.calledWith(partnerId2, FETCH_ID_DATA[1].segments);
    expect(clientStoreV1.getNb).to.have.been.calledTwice;
    expect(clientStoreV1.getNb.firstCall).to.have.been.calledWith(partnerId1);
    expect(clientStoreV1.getNb.secondCall).to.have.been.calledWith(partnerId2);
    expect(clientStoreV1.storedConsentDataMatchesConsentData).to.have.not.been.called;

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
    clientStoreV1.getResponse.returns(FETCH_RESPONSE_OBJ);
    clientStoreV1.getDateTime.returns(STORE_TIME);
    clientStoreV1.isStoredPdUpToDate.returns(true);
    clientStoreV1.storedSegmentsMatchesSegments.returns(true);
    clientStoreV1.getNb.onFirstCall().returns(10);
    clientStoreV1.getNb.onSecondCall().returns(20);
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

    clientStoreV1.getResponse.returns(FETCH_RESPONSE_OBJ);
    clientStoreV1.getDateTime.returns(STORE_TIME);
    clientStoreV1.isStoredPdUpToDate.returns(true);
    clientStoreV1.storedSegmentsMatchesSegments.returns(true);

    const fetchIdData = [
      {
        ...FETCH_ID_DATA[0],
        refreshInSeconds: 200,
      }, {
        ...FETCH_ID_DATA[1],
        refreshInSeconds: 20,
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
    clientStoreV1.getResponse.returns(response);
    clientStoreV1.getDateTime.returns(STORE_TIME);
    clientStoreV1.isStoredPdUpToDate.returns(true);
    clientStoreV1.storedSegmentsMatchesSegments.returns(true);
    const fetchIdData = [
      {
        ...FETCH_ID_DATA[0],
        refreshInSeconds: 200,
      }, {
        ...FETCH_ID_DATA[1],
        refreshInSeconds: 20,
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
      clientStoreV1.getResponse.returns(FETCH_RESPONSE_OBJ);
      clientStoreV1.getDateTime.returns(STORE_TIME);
      clientStoreV1.isStoredPdUpToDate.returns(true);
      clientStoreV1.storedSegmentsMatchesSegments.returns(true);
      clientStoreV1.storedConsentDataMatchesConsentData.returns(consentUpToDate);

      // when
      const storedDataState = store.getStoredDataState(FETCH_ID_DATA, CONSENT_DATA);

      // then
      expect(clientStoreV1.storedConsentDataMatchesConsentData).to.have.been.calledWith(CONSENT_DATA);

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
      clientStoreV1.getResponse.returns(FETCH_RESPONSE_OBJ);
      clientStoreV1.getDateTime.returns(STORE_TIME);
      clientStoreV1.isStoredPdUpToDate.onFirstCall().returns(firstUpToDate);
      clientStoreV1.isStoredPdUpToDate.onSecondCall().returns(secondUpToDate);
      clientStoreV1.storedSegmentsMatchesSegments.returns(true);
      clientStoreV1.storedConsentDataMatchesConsentData.returns(true);

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
      clientStoreV1.getResponse.returns(FETCH_RESPONSE_OBJ);
      clientStoreV1.getDateTime.returns(STORE_TIME);
      clientStoreV1.storedSegmentsMatchesSegments.onFirstCall().returns(firstUpToDate);
      clientStoreV1.storedSegmentsMatchesSegments.onSecondCall().returns(secondUpToDate);
      clientStoreV1.isStoredPdUpToDate.returns(true);
      clientStoreV1.storedConsentDataMatchesConsentData.returns(true);

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

    clientStoreV1.isStoredPdUpToDate.onFirstCall().returns(false);
    clientStoreV1.isStoredPdUpToDate.onSecondCall().returns(false);

    // when
    store.storeRequestData(consentData, FETCH_ID_DATA);

    // then
    expect(clientStoreV1.putHashedConsentData).to.have.been.calledOnce;
    expect(clientStoreV1.isStoredPdUpToDate).to.have.been.calledTwice;
    expect(clientStoreV1.isStoredPdUpToDate.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStoreV1.isStoredPdUpToDate.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].pd);
    expect(clientStoreV1.putHashedPd).to.have.been.calledTwice;
    expect(clientStoreV1.putHashedPd.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStoreV1.putHashedPd.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].pd);
    expect(clientStoreV1.putHashedSegments).to.have.been.calledTwice;
    expect(clientStoreV1.putHashedSegments.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].segments);
    expect(clientStoreV1.putHashedSegments.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].segments);
  });

  it(`should store request data and pd only if changed`, function () {
    // given
    const partner1 = FETCH_ID_DATA[0].partnerId;
    const partner2 = FETCH_ID_DATA[1].partnerId;
    const consentData = {};

    clientStoreV1.isStoredPdUpToDate.onFirstCall().returns(false);
    clientStoreV1.isStoredPdUpToDate.onSecondCall().returns(true);

    // when
    store.storeRequestData(consentData, FETCH_ID_DATA);

    // then
    expect(clientStoreV1.putHashedConsentData).to.have.been.calledOnce;
    expect(clientStoreV1.isStoredPdUpToDate).to.have.been.calledTwice;
    expect(clientStoreV1.isStoredPdUpToDate.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStoreV1.isStoredPdUpToDate.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].pd);
    expect(clientStoreV1.putHashedPd).to.have.been.calledOnce;
    expect(clientStoreV1.putHashedPd.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].pd);
    expect(clientStoreV1.putHashedSegments).to.have.been.calledTwice;
    expect(clientStoreV1.putHashedSegments.firstCall).to.have.been.calledWith(partner1, FETCH_ID_DATA[0].segments);
    expect(clientStoreV1.putHashedSegments.secondCall).to.have.been.calledWith(partner2, FETCH_ID_DATA[1].segments);
  });

  it('should increase NB and update state', function () {
    // given
    const partner1 = FETCH_ID_DATA[0].partnerId;
    const partner2 = FETCH_ID_DATA[1].partnerId;
    const state = {
      nb: {}
    }
    state.nb[partner1] = 10;
    state.nb[partner2] = 0;

    clientStoreV1.incNb.onFirstCall().returns(11);
    clientStoreV1.incNb.onSecondCall().returns(1);

    // when
    store.incNbs(FETCH_ID_DATA, state);

    // then
    expect(clientStoreV1.incNb).to.have.been.calledTwice;
    expect(clientStoreV1.incNb.firstCall.args).to.be.eql([partner1, 10]);
    expect(clientStoreV1.incNb.secondCall.args).to.be.eql([partner2, 0]);

    let expectedNb = {}
    expectedNb[partner1] = 11;
    expectedNb[partner2] = 1;
    expect(state.nb).to.be.eql(expectedNb);
  });

  [true, false].forEach(usedCachedResponse => {
    it(`should store response usedCachedResponse=${usedCachedResponse}`, () => {
      // given
      const now = new Date();
      const expectedNbReset = usedCachedResponse ? 0 : 1;

      // when
      const response = {
        universal_uid: 'uid',
        signature: 'sig'
      };
      store.storeResponse(FETCH_ID_DATA, response, usedCachedResponse);

      // then
      expect(clientStoreV1.putResponse).to.have.been.calledWith(response);
      expect(clientStoreV1.setDateTime).to.have.been.called;
      expect(new Date(clientStoreV1.setDateTime.firstCall.args[0])).to.be.closeToTime(now, 1);
      expect(clientStoreV1.setNb).to.be.calledTwice;
      expect(clientStoreV1.setNb.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId, expectedNbReset]);
      expect(clientStoreV1.setNb.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId, expectedNbReset]);
    });

  });

  it('should clear all', () => {

    // when
    store.clearAll(FETCH_ID_DATA);

    // then
    expect(clientStoreV1.clearResponse).to.have.been.calledOnce;
    expect(clientStoreV1.clearDateTime).to.have.been.calledOnce;
    expect(clientStoreV1.clearNb).to.have.been.calledTwice;
    expect(clientStoreV1.clearNb.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId]);
    expect(clientStoreV1.clearNb.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId]);
    expect(clientStoreV1.clearHashedPd).to.have.been.calledTwice;
    expect(clientStoreV1.clearHashedPd.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId]);
    expect(clientStoreV1.clearHashedPd.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId]);
    expect(clientStoreV1.clearHashedSegments).to.have.been.calledTwice;
    expect(clientStoreV1.clearHashedSegments.firstCall.args).to.be.eql([FETCH_ID_DATA[0].partnerId]);
    expect(clientStoreV1.clearHashedSegments.secondCall.args).to.be.eql([FETCH_ID_DATA[1].partnerId]);
    expect(clientStoreV1.clearHashedConsentData).to.have.been.calledOnce;
  });
});

describe("Storage config", function () {
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
    verifyConfig(storageConfig.LIVE_INTENT, STORAGE_CONFIG.LIVE_INTENT);
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
    verifyConfig(storageConfig.LIVE_INTENT, STORAGE_CONFIG.LIVE_INTENT);
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
    verifyConfig(storageConfig.LIVE_INTENT, STORAGE_CONFIG.LIVE_INTENT);
  });
});

