import sinon from 'sinon';
import {CachedResponse, StorageConfig, Store, StoreItemConfig} from '../../src/store.js';
import {ClientStore} from '../../src/clientStore.js';
import {API_TYPE, ConsentData} from '../../src/consent.js';
import {CONSTANTS} from '../../src/constants.js';
import {RefreshedResponse} from '../../src/fetch.js';
import {TrueLinkAdapter} from '../../src/trueLink.js';


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
  signature: 'signature',
  cache_control: {
    max_age_sec: 10
  },
  link_type: 0,
  cascade_needed: false,
  ext: {
    linkType: 0,
    pba: 'g+Q9GCIcuZuBMslwof4uDw=='
  }
};

describe('Store', function () {

  /**
   * @type {ClientStore}
   */
  let clientStore;

  /**
   * @type {TrueLinkAdapter}
   */
  let trueLinkAdapter;
  /**
   * @type {Store}
   */
  let store;
  beforeEach(() => {
    clientStore = sinon.createStubInstance(ClientStore);
    trueLinkAdapter = sinon.createStubInstance(TrueLinkAdapter);
    store = new Store(clientStore, trueLinkAdapter);
  });


  const STORE_TIME = 1691737155000;

  [false, true].forEach(consentUpToDate => {
    it(`should check if consent data is up to date. Stored changed=(${consentUpToDate})`, function () {

      // given
      clientStore.storedConsentDataMatchesConsentData.returns(consentUpToDate);

      // when
      const result = store.hasConsentChanged(CONSENT_DATA);

      // then
      expect(result).to.eql(!consentUpToDate);
      expect(clientStore.storedConsentDataMatchesConsentData).to.have.been.calledWith(CONSENT_DATA);
    });
  });

  it(`should not check if consent data is up to date when current undefined`, function () {

    // given
    clientStore.storedConsentDataMatchesConsentData.returns(true);

    // when
    const result = store.hasConsentChanged(undefined);

    // then
    expect(result).to.eql(undefined);
    expect(clientStore.storedConsentDataMatchesConsentData).to.have.not.been.called;
  });

  it(`should store consent data`, function () {
    // given
    const consentData = sinon.stub();

    // when
    store.storeConsent(consentData);

    // then
    expect(clientStore.putHashedConsentData).to.have.been.calledWith(consentData);
  });

  it('should update nbs', function () {
    // given

    const cacheData = new Map([
      ['cacheId1', new CachedResponse(FETCH_RESPONSE_OBJ, STORE_TIME, 11)],
      ['cacheId2', new CachedResponse(FETCH_RESPONSE_OBJ, STORE_TIME, 0)],
      ['cacheId3', new CachedResponse(FETCH_RESPONSE_OBJ, STORE_TIME, 222)],
      ['cacheId4', new CachedResponse(FETCH_RESPONSE_OBJ, STORE_TIME, -1)],
      ['cacheId5', new CachedResponse(FETCH_RESPONSE_OBJ, STORE_TIME, undefined)],
      ['cacheId5', undefined]
    ]);

    // when
    store.updateNbs(cacheData);

    // then
    expect(clientStore.incNbV2).to.have.been.calledTwice;
    expect(clientStore.incNbV2.firstCall).to.be.calledWith('cacheId1', -11);
    expect(clientStore.incNbV2.secondCall).to.be.calledWith('cacheId3', -222);
  });

  it(`should store response`, () => {
    // given
    const responseTime = 10234;
    const genericResponse = {
      universal_uid: 'uid',
      signature: 'sig',
      privacy: {id5_consent: true}
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
    store.storeResponse(FETCH_ID_DATA, refreshedResponse);

    // then
    // store V1
    expect(clientStore.putResponseV1).to.have.been.calledWith(genericResponse);
    expect(clientStore.setResponseDateTimeV1).to.have.been.calledWith(new Date(responseTime).toUTCString());

    // store V2
    expect(clientStore.storeResponseV2).to.be.calledTwice;
    expect(clientStore.storeResponseV2.firstCall).to.be.calledWith(FETCH_ID_DATA[0].cacheId, response1);
    expect(clientStore.storeResponseV2.secondCall).to.be.calledWith(FETCH_ID_DATA[1].cacheId, response2);
    expect(trueLinkAdapter.setPrivacy).to.be.calledWith(genericResponse.privacy);
  });

  it(`should store only non-empty response and one per cacheId`, () => {
    // given
    const responseTime = 10234;
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
    const requestData = [
      {
        integrationId: 'i1',
        cacheId: 'c1'
      },
      {
        integrationId: 'i2',
        cacheId: 'c1'
      },
      {
        integrationId: 'i3',
        cacheId: 'c2'
      }, {
        integrationId: 'i4',
        cacheId: 'c2'
      }
    ];
    refreshedResponse.getGenericResponse.returns(genericResponse);
    refreshedResponse.timestamp = responseTime;
    refreshedResponse.getResponseFor.withArgs('i1').returns(undefined);
    refreshedResponse.getResponseFor.withArgs('i2').returns(response1);
    refreshedResponse.getResponseFor.withArgs('i3').returns(response2);
    refreshedResponse.getResponseFor.withArgs('i4').returns(response2);

    // when
    store.storeResponse(requestData, refreshedResponse);

    // then
    expect(clientStore.storeResponseV2).to.be.calledTwice;
    expect(clientStore.storeResponseV2.firstCall).to.be.calledWith('c1', response1);
    expect(clientStore.storeResponseV2.secondCall).to.be.calledWith('c2', response2);
  });

  it('should clear all', () => {

    // when
    store.clearAll(FETCH_ID_DATA);

    // then
    expect(clientStore.clearResponse).to.have.been.calledOnce;
    expect(clientStore.clearDateTime).to.have.been.calledOnce;
    expect(clientStore.clearResponseV2).to.have.been.calledTwice;
    expect(clientStore.clearResponseV2.firstCall.args).to.be.eql([FETCH_ID_DATA[0].cacheId]);
    expect(clientStore.clearResponseV2.secondCall.args).to.be.eql([FETCH_ID_DATA[1].cacheId]);
    expect(clientStore.clearHashedConsentData).to.have.been.calledOnce;
    expect(clientStore.clearExtensions).to.have.been.calledOnce;
    expect(trueLinkAdapter.clearPrivacy).to.have.been.calledOnce;
  });

  it('should return stored response', () => {
    // given
    clientStore.getStoredResponseV2.withArgs('cacheId').returns({
      response: FETCH_RESPONSE_OBJ,
      responseTimestamp: STORE_TIME,
      nb: 9
    });

    // when
    const result = store.getCachedResponse('cacheId');

    // then
    expect(result).to.be.eql(new CachedResponse(FETCH_RESPONSE_OBJ, STORE_TIME, 9));
  });

  it('should inc nb', () => {
    // when
    store.incNb('c1');
    store.incNb('c2', 10);

    // then
    expect(clientStore.incNbV2).to.be.calledWith('c1',1);
    expect(clientStore.incNbV2).to.be.calledWith('c2',10);
  });

  it('should take into account the extension ttl', () => {
    // when
    const extensions = {extA: "A", ttl: 60 * 60};
    store.storeExtensions(extensions);

    // then
    expect(clientStore.storeExtensions).to.be.calledWith(extensions, new StoreItemConfig(CONSTANTS.STORAGE_CONFIG.EXTENSIONS.name, 1/24) );
  });

  it('should use a default extension ttl if not provided', () => {
    // when
    const extensions = {extA: "A"};
    store.storeExtensions(extensions);

    // then
    expect(clientStore.storeExtensions).to.be.calledWith(extensions, new StorageConfig().EXTENSIONS );
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
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
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
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
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
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
  });
});

describe('CachedResponse', function () {
  let currentTime;
  let clockStub;
  const validResponse = {
    signature: 'sig',
    universal_uid: 'universal_uid'
  };

  beforeEach(function () {
    currentTime = Date.now();
    clockStub = sinon.stub(Date, 'now').returns(currentTime);
  });

  afterEach(function () {
    clockStub.restore();
  });

  [
    [undefined, true],
    [0, false],
    [-1, false],
    [daysToMs(14), false],
    [daysToMs(14) + secondsToMs(1), true],
    [100, false]
  ].forEach(([ageMs, expectedStale]) => {
    it(`should check if stale age-ms=${ageMs}`, function () {
      // given
      const responseTime = ageMs !== undefined ? (currentTime - ageMs) : undefined;
      const response = new CachedResponse(validResponse, responseTime);

      // when/then
      expect(response.isStale()).to.be.eq(expectedStale);
      expect(response.isValid()).to.be.eq(!expectedStale); // stale is recognized as invalid
    });
  });

  [
    [validResponse, true],
    [{
      signature: 'sig'
    }, false],
    [{
      signature: {},
      universal_uid: 'uid'
    }, false],
    [{
      signature: 'sig',
      universal_uid: 1
    }, false],
    [{
      universal_uid: 'uid'
    }, false],
    [undefined, false],
    ['not an object', false]
  ].forEach(([response, expectedValid]) => {
    it(`should check if response complete response=${JSON.stringify(response)}`, function () {
      // given
      const cachedResponse = new CachedResponse(response, currentTime);

      // when/then
      expect(cachedResponse.isResponseComplete()).to.be.eq(expectedValid);
      expect(cachedResponse.isValid()).to.be.eq(expectedValid);
    });
  });

  [
    [hoursToMs(1), undefined, true], // invalid age in response
    [hoursToMs(1), {max_age_sec: 'rr'}, true], // invalid age in response
    [hoursToMs(1), {}, true], // invalid age in response
    [hoursToMs(1), {max_age_sec: hoursToSec(1)}, false],
    [hoursToMs(1), {max_age_sec: hoursToSec(2)}, false],
    [hoursToMs(1) + secondsToMs(1), {max_age_sec: hoursToSec(1)}, true]
  ].forEach(([ageMs, cache_control, expected]) => {
    it(`should check if is expired age-ms=${ageMs}, cache-control=${JSON.stringify(cache_control)}`, function () {

      // given
      const responseTime = ageMs !== undefined ? (currentTime - ageMs) : undefined;
      const response = new CachedResponse({
        cache_control: cache_control
      }, responseTime);

      // when/then
      expect(response.isExpired()).to.be.eq(expected);
    });
  });

});

function daysToMs(numOfDays) {
  return numOfDays * hoursToMs(24);
}

function hoursToMs(numOfHours) {
  return hoursToSec(numOfHours) * 1000;
}

function hoursToSec(numOfHours) {
  return numOfHours * 3600;
}

function secondsToMs(numOfSeconds) {
  return numOfSeconds * 1000;
}
