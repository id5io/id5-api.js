import sinon from 'sinon';
import {CrossInstanceMessenger, ProxyMethodCallTarget} from '../../src/messaging.js';
import {ActualLeader, AddFollowerResult, AwaitedLeader, Leader, ProxyLeader} from '../../src/leader.js';
import {RefreshedResponse, UidFetcher} from '../../src/fetch.js';
import {CachedResponse, Store} from '../../src/store.js';
import {API_TYPE, ConsentData, LocalStorageGrant} from '../../src/consent.js';
import {ConsentManagement} from '../../src/consentManagement.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {Follower} from '../../src/follower.js';
import {Properties} from '../../src/instance.js';
import {Counter, Id5CommonMetrics} from '@id5io/diagnostics';
import {ReplicatingStorage} from '../../src/localStorage.js';
import {WindowStorage} from '../../src/localStorage.js';

describe('ProxyLeader', function () {
  /**
   * @type CrossInstanceMessenger
   */
  let messenger;
  /**
   * @type ProxyLeader
   */
  let leader;
  const leaderId = 'LEADER_ID';
  const leaderProperties = new Properties(leaderId);
  beforeEach(function () {
    messenger = sinon.createStubInstance(CrossInstanceMessenger);
    leader = new ProxyLeader(messenger, leaderProperties);
  });

  it('should sent message to call consnetData', function () {
    // given
    const consentData = sinon.stub();

    // when
    leader.updateConsent(consentData);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'updateConsent', [consentData]);
  });

  it('should sent message to call refreshUid', function () {
    // given
    const forceFetch = sinon.stub();

    // when
    leader.refreshUid(forceFetch);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'refreshUid', [forceFetch, undefined]);
  });

  it('should sent message to call refreshUid with refresherId', function () {
    // given
    const forceFetch = sinon.stub();

    // when
    leader.refreshUid(forceFetch, 'follower-id');

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'refreshUid', [forceFetch, 'follower-id']);
  });

  it('should sent message to call fetchDataUpdate', function () {
    // given
    const fetchData = sinon.stub();

    // when
    leader.updateFetchIdData('id', fetchData);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'updateFetchIdData', ['id', fetchData]);
  });

  it('should return properties when asked', function () {
    // when/then
    expect(leader.getProperties()).to.be.eq(leaderProperties);
  });
});

describe('AwaitedLeader', function () {

  it('should buffer called method and call them when leader change', function () {
    // given
    const consentData = sinon.stub();
    const fetchData = sinon.stub();
    const refreshOptions = sinon.stub();
    const refreshOptions2 = sinon.stub();
    const follower = sinon.stub();

    const awaitedLeader = new AwaitedLeader();
    const newLeader = sinon.createStubInstance(Leader);
    newLeader.addFollower.returns(new AddFollowerResult());

    // when
    awaitedLeader.updateConsent(consentData);
    awaitedLeader.refreshUid(refreshOptions);
    awaitedLeader.refreshUid(refreshOptions2, 'follower-id');
    awaitedLeader.updateFetchIdData('1', fetchData);
    let addResult = awaitedLeader.addFollower(follower);

    // then
    expect(newLeader.updateConsent).to.have.not.been.called;
    expect(newLeader.refreshUid).to.have.not.been.called;
    expect(newLeader.updateFetchIdData).to.have.not.been.called;
    expect(newLeader.addFollower).to.have.not.been.called;
    expect(addResult).to.be.undefined; // just buffered no result known

    // when
    awaitedLeader.assignLeader(newLeader);

    // then
    expect(newLeader.updateConsent).to.have.been.calledWith(consentData);
    expect(newLeader.updateConsent).to.have.been.calledBefore(newLeader.refreshUid);
    expect(newLeader.refreshUid).to.have.been.calledWith(refreshOptions);
    expect(newLeader.refreshUid).to.have.been.calledWith(refreshOptions2, 'follower-id');
    expect(newLeader.refreshUid).to.have.been.calledBefore(newLeader.updateFetchIdData);
    expect(newLeader.updateFetchIdData).to.have.been.calledWith('1', fetchData);
    expect(newLeader.addFollower).to.have.been.calledWith(follower);
    expect(awaitedLeader._assignedLeader).is.eq(newLeader);
    expect(awaitedLeader._callsQueue).has.length(0);
  });

  it('should directly call assigned leader', function () {
    // given
    const consentData = sinon.stub();
    const fetchData = sinon.stub();
    const refreshOptions = sinon.stub();
    const follower = sinon.stub();

    const awaitedLeader = new AwaitedLeader();
    const assignedLeader = sinon.createStubInstance(Leader);
    assignedLeader.addFollower.returns(new AddFollowerResult());
    awaitedLeader.assignLeader(assignedLeader);

    // when
    assignedLeader.updateConsent(consentData);

    // then
    expect(assignedLeader.updateConsent).to.have.been.calledWith(consentData);
    expect(awaitedLeader._callsQueue).has.length(0);

    // when
    awaitedLeader.refreshUid(refreshOptions, 'follower-id');

    // then
    expect(assignedLeader.refreshUid).to.have.been.calledWith(refreshOptions, 'follower-id');
    expect(awaitedLeader._callsQueue).has.length(0);

    // when
    awaitedLeader.updateFetchIdData('1', fetchData);

    // then
    expect(assignedLeader.updateFetchIdData).to.have.been.calledWith('1', fetchData);
    expect(awaitedLeader._callsQueue).has.length(0);

    // when
    let addResult = awaitedLeader.addFollower(follower);

    // then
    expect(addResult).to.be.eql(new AddFollowerResult());
    expect(assignedLeader.addFollower).to.have.been.calledWith(follower);
    expect(awaitedLeader._callsQueue).has.length(0);
  });

  it('returns assigned leader properties', function () {
    const awaitedLeader = new AwaitedLeader();
    const leader = sinon.createStubInstance(Leader);
    const properties = {id: 'a'};
    leader.getProperties.returns(properties);

    // then
    expect(awaitedLeader.getProperties()).to.be.undefined;

    // when
    awaitedLeader.assignLeader(leader);

    // then
    expect(awaitedLeader.getProperties()).to.be.eq(properties);
  });
});

describe('ActualLeader', () => {
  /**
   * @type {UidFetcher}
   */
  let uidFetcher;
  /**
   * @type {ReplicatingStorage}
   */
  let leaderStorage;
  /**
   * @type {ConsentManagement}
   */
  let consentManager;
  /**
   * @type {ActualLeader}
   */
  let leader;
  /**
   * @type {Follower}
   */
  let follower1, follower2, follower3;
  /**
   * @type {FetchIdData}
   */
  let follower1FetchIdData = {
    partnerId: 1
  };
  /**
   * @type {FetchIdData}
   */
  let follower2FetchIdData = {
    partnerId: 2
  };
  /**
   * @type {FetchIdData}
   */
  let follower3FetchIdData = {
    partnerId: 3
  };
  let follower1Id = '1';
  let follower2Id = '2';
  let follower3Id = '3';

  let leaderProperties = new Properties(follower1Id);
  /**
   * @type {LocalStorageGrant}
   */
  let localStorageGrant;
  /**
   * @type {Store}
   */
  let store;
  const leaderWindow = window;
  let localStorageCheckStub;

  beforeEach(() => {
    uidFetcher = sinon.createStubInstance(UidFetcher);
    consentManager = sinon.createStubInstance(ConsentManagement);
    localStorageGrant = sinon.createStubInstance(LocalStorageGrant);
    consentManager.localStorageGrant.returns(localStorageGrant);
    leaderStorage = sinon.createStubInstance(ReplicatingStorage);
    follower1 = sinon.createStubInstance(Follower);
    store = sinon.createStubInstance(Store);
    follower1.getId.returns(follower1Id);
    follower1.getFetchIdData.returns(follower1FetchIdData);
    follower1.getWindow.returns(leaderWindow);
    follower1.getCacheId.returns('cacheId1');
    follower2 = sinon.createStubInstance(Follower);
    follower2.getId.returns(follower2Id);
    follower2.getFetchIdData.returns(follower2FetchIdData);
    follower2.getWindow.returns(leaderWindow);
    follower2.getCacheId.returns('cacheId2');
    follower3 = sinon.createStubInstance(Follower);
    follower3.getId.returns(follower3Id);
    follower3.getFetchIdData.returns(follower3FetchIdData);
    follower3.getWindow.returns(leaderWindow);
    follower3.getCacheId.returns('cacheId3');
    leader = new ActualLeader(leaderWindow, leaderProperties, leaderStorage, store, consentManager, sinon.createStubInstance(Id5CommonMetrics), NO_OP_LOGGER, uidFetcher);
    localStorageCheckStub = sinon.stub(WindowStorage, 'checkIfAccessible').returns(true);
  });

  afterEach(() => {
    localStorageCheckStub.restore();
  });

  function expectedRequestData(follower, role, requestCount = 1, refresh = false, cacheData = undefined) {
    return {
      ...follower.getFetchIdData(),
      integrationId: follower.getId(),
      cacheId: follower.getCacheId(),
      role: role,
      requestCount: requestCount,
      refresh: refresh,
      cacheData: cacheData
    };
  }

  function expectedLeaderData(follower, requestCount = 1, refresh = false, cacheData = undefined) {
    return expectedRequestData(follower, 'leader', requestCount, refresh, cacheData);
  }

  function expectedFollowerData(follower, requestCount = 1, refresh = false, cacheData = undefined) {
    return expectedRequestData(follower, 'follower', requestCount, refresh, cacheData);
  }

  describe('when consent data available - given', function () {

    const CONSENT_DATA_GDPR_ALLOWED = Object.assign(new ConsentData(), {
      consentString: 'CONSENT_STRING',
      localStoragePurposeConsent: true,
      gdprApplies: true,
      api: API_TYPE.TCF_V2,
      gppData: {
        gppString: 'GPP_STRING',
        applicableSections: [7, 8]
      }
    });
    let consentPromise;

    beforeEach(() => {
      consentPromise = Promise.resolve(CONSENT_DATA_GDPR_ALLOWED);
      consentManager.getConsentData.returns(consentPromise);
      consentManager.localStorageGrant.returns(localStorageGrant);
      localStorageGrant.allowed = true;
    });

    it('should getId on start, notify followers when uid ready and store data when local storage access definitely allowed', async () => {

      // given
      const fetchIdPromise = sinon.promise();
      uidFetcher.fetchId.returns(fetchIdPromise);
      localStorageGrant.isDefinitivelyAllowed.returns(true);

      // when
      let add1Result = leader.addFollower(follower1);
      let add2Result = leader.addFollower(follower2);

      // then
      expect(add1Result).to.be.eql(new AddFollowerResult());
      expect(add2Result).to.be.eql(new AddFollowerResult());

      // when
      leader.start();

      await resolved(consentPromise);

      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'id-1'});
      refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'id-2'});
      refreshedResponse.timestamp = 345;
      refreshedResponse.getGenericResponse.returns({
        privacy: {jurisdiction: 'gdpr', id5_consent: true}
      });
      fetchIdPromise.resolve(refreshedResponse);

      // then
      expect(store.storeConsent).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED);
      const requestData = [
        expectedLeaderData(follower1, 1, true),
        expectedFollowerData(follower2, 1, true)
      ];
      expect(uidFetcher.fetchId).to.be.calledWith(requestData,
        CONSENT_DATA_GDPR_ALLOWED,
        true
      );

      await resolved(fetchIdPromise);

      // then
      expect(follower1.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-1'},
        timestamp: 345,
        isFromCache: false
      });
      expect(follower2.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-2'},
        timestamp: 345,
        isFromCache: false
      });
      expect(consentManager.setStoredPrivacy).to.have.been.calledWith({jurisdiction: 'gdpr', id5_consent: true});
      expect(store.storeResponse).to.have.been.calledWith(requestData, refreshedResponse);
      expect(store.updateNbs).to.have.been.calledWith(new Map());
      expect(store.clearAll).to.have.not.been.called;
    });

    it('should clear cached data when server response indicates no consent', async () => {

      // given
      const fetchIdPromise = sinon.promise();
      uidFetcher.fetchId.returns(fetchIdPromise);
      localStorageGrant.isDefinitivelyAllowed.returns(true);

      // when
      let add1Result = leader.addFollower(follower1);
      let add2Result = leader.addFollower(follower2);

      // then
      expect(add1Result).to.be.eql(new AddFollowerResult());
      expect(add2Result).to.be.eql(new AddFollowerResult());

      // when
      leader.start();

      await resolved(consentPromise);

      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'id-1'});
      refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'id-2'});
      refreshedResponse.timestamp = 345;
      refreshedResponse.getGenericResponse.returns({
        privacy: {jurisdiction: 'gdpr', id5_consent: false}
      });
      localStorageGrant.isDefinitivelyAllowed.reset();
      localStorageGrant.isDefinitivelyAllowed.returns(false);
      fetchIdPromise.resolve(refreshedResponse);

      // then
      expect(store.storeConsent).to.have.been.calledWith(CONSENT_DATA_GDPR_ALLOWED);
      const requestData = [
        expectedLeaderData(follower1, 1, true),
        expectedFollowerData(follower2, 1, true)
      ];
      expect(uidFetcher.fetchId).to.be.calledWith(requestData,
        CONSENT_DATA_GDPR_ALLOWED,
        true
      );

      await resolved(fetchIdPromise);

      // then
      expect(follower1.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-1'},
        timestamp: 345,
        isFromCache: false
      });
      expect(follower2.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-2'},
        timestamp: 345,
        isFromCache: false
      });
      expect(consentManager.setStoredPrivacy).to.have.been.calledWith({jurisdiction: 'gdpr', id5_consent: false});
      expect(store.storeResponse).to.have.not.been.calledWith(requestData, refreshedResponse);
      expect(store.updateNbs).to.have.not.been.calledWith(new Map());
      expect(store.clearAll).to.have.been.called;
    });

    it('should getId on start, notify followers when uid ready and NOT store data when local storage access NOT definitely allowed', async () => {

      // given
      const fetchIdPromise = sinon.promise();
      uidFetcher.fetchId.returns(fetchIdPromise);
      localStorageGrant.isDefinitivelyAllowed.returns(false);

      // when
      let add1Result = leader.addFollower(follower1);
      let add2Result = leader.addFollower(follower2);

      // then
      expect(add1Result).to.be.eql(new AddFollowerResult());
      expect(add2Result).to.be.eql(new AddFollowerResult());

      // when
      leader.start();

      await resolved(consentPromise);

      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'id-1'});
      refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'id-2'});
      refreshedResponse.timestamp = 345;
      refreshedResponse.getGenericResponse.returns({
        privacy: {jurisdiction: 'gdpr', id5_consent: true}
      });
      fetchIdPromise.resolve(refreshedResponse);

      // then
      expect(store.storeConsent).to.have.not.been.calledWith(CONSENT_DATA_GDPR_ALLOWED);
      const requestData = [
        expectedLeaderData(follower1, 1, true),
        expectedFollowerData(follower2, 1, true)
      ];
      expect(uidFetcher.fetchId).to.be.calledWith(requestData,
        CONSENT_DATA_GDPR_ALLOWED,
        true
      );

      await resolved(fetchIdPromise);

      // then
      expect(follower1.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-1'},
        timestamp: 345,
        isFromCache: false
      });
      expect(follower2.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-2'},
        timestamp: 345,
        isFromCache: false
      });
      expect(consentManager.setStoredPrivacy).to.have.been.calledWith({jurisdiction: 'gdpr', id5_consent: true});
      expect(store.storeResponse).to.have.not.been.calledWith(requestData, refreshedResponse);
      expect(store.updateNbs).to.have.not.been.called;
    });

    it('should notify followers when uid ready from cache when registered and then refresh on start when consent has changed', async () => {

      // given
      localStorageGrant.isDefinitivelyAllowed.returns(true);
      const cachedResponse1 = sinon.stub(new CachedResponse({
        universal_uid: crypto.randomUUID()
      }, Date.now(), 1));
      cachedResponse1.isValid.returns(true);
      const uidFromCache1 = {
        responseObj: cachedResponse1.response,
        timestamp: cachedResponse1.timestamp,
        isFromCache: true,
        willBeRefreshed: false
      };

      const cachedResponse2 = sinon.stub(new CachedResponse({
        universal_uid: crypto.randomUUID()
      }, Date.now(), 10));
      cachedResponse2.isValid.returns(true);
      const uidFromCache2 = {
        responseObj: cachedResponse2.response,
        timestamp: cachedResponse2.timestamp,
        isFromCache: true,
        willBeRefreshed: false
      };

      store.getCachedResponse.withArgs(follower1.getCacheId()).returns(cachedResponse1);
      store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse2);

      const fetchResult = sinon.promise();
      uidFetcher.fetchId.returns(fetchResult);

      store.hasConsentChanged.returns(true);

      // when
      let add1Result = leader.addFollower(follower1);
      let add2Result = leader.addFollower(follower2);

      // then
      expect(add1Result).to.be.eql(new AddFollowerResult());
      expect(add2Result).to.be.eql(new AddFollowerResult());
      expect(store.getCachedResponse).to.be.calledWith(follower1.getCacheId());
      expect(store.incNb).to.be.calledWith(follower1.getCacheId());
      expect(follower1.notifyUidReady).to.be.calledWith(uidFromCache1);
      expect(store.getCachedResponse).to.be.calledWith(follower2.getCacheId());
      expect(store.incNb).to.be.calledWith(follower2.getCacheId());
      expect(follower2.notifyUidReady).to.be.calledWith(uidFromCache2);

      // when
      leader.start();
      await resolved(consentPromise);

      // then
      expect(store.hasConsentChanged).to.be.calledWith(CONSENT_DATA_GDPR_ALLOWED);
      expect(uidFetcher.fetchId).to.be.calledWith([
        expectedLeaderData(follower1, 1, false, cachedResponse1),
        expectedFollowerData(follower2, 1, false, cachedResponse2)
      ], CONSENT_DATA_GDPR_ALLOWED, true);

      // when
      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'id-1'});
      refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'id-2'});
      refreshedResponse.timestamp = 345;
      fetchResult.resolve(refreshedResponse);
      await resolved(fetchResult);

      // then
      expect(follower1.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-1'},
        timestamp: 345,
        isFromCache: false
      });
      expect(follower2.notifyUidReady).to.be.calledWith({
        responseObj: {universal_uid: 'id-2'},
        timestamp: 345,
        isFromCache: false
      });
      const expectedCacheData = new Map();
      expectedCacheData.set(follower1.getCacheId(), cachedResponse1);
      expectedCacheData.set(follower2.getCacheId(), cachedResponse2);
      expect(store.updateNbs).to.be.calledWith(expectedCacheData);
    });

    it('should notify followers when uid ready from cache when registered and then NOT refresh on start when consent has not changed', async () => {

      // given
      const cachedResponse = sinon.stub(new CachedResponse({
        universal_uid: crypto.randomUUID()
      }, Date.now(), 1));
      cachedResponse.isValid.returns(true);
      store.getCachedResponse.returns(cachedResponse);
      const uidFromCache = {
        responseObj: cachedResponse.response,
        timestamp: cachedResponse.timestamp,
        isFromCache: true,
        willBeRefreshed: false
      };

      const fetchResult = sinon.promise();
      uidFetcher.fetchId.returns(fetchResult);

      store.hasConsentChanged.returns(false);

      // when
      let add1Result = leader.addFollower(follower1);
      let add2Result = leader.addFollower(follower2);

      // then
      expect(add1Result).to.be.eql(new AddFollowerResult());
      expect(add2Result).to.be.eql(new AddFollowerResult());
      expect(store.getCachedResponse).to.be.calledWith(follower1.getCacheId());
      expect(store.incNb).to.be.calledWith(follower1.getCacheId());
      expect(follower1.notifyUidReady).to.be.calledWith(uidFromCache);
      expect(store.getCachedResponse).to.be.calledWith(follower2.getCacheId());
      expect(store.incNb).to.be.calledWith(follower2.getCacheId());
      expect(follower2.notifyUidReady).to.be.calledWith(uidFromCache);

      // when
      leader.start();
      await resolved(consentPromise);

      // then
      expect(store.hasConsentChanged).to.be.calledWith(CONSENT_DATA_GDPR_ALLOWED);
      expect(uidFetcher.fetchId).to.not.be.called;
    });

    [true, false].forEach((isExpired) => {
      it(`should provision cached response if valid available expired=${isExpired} when follower added and getId on start`, async () => {

        // given
        store.hasConsentChanged.returns(true);
        const cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, Date.now(), 1));
        cachedResponse.isValid.returns(true);
        cachedResponse.isExpired.returns(isExpired);
        store.getCachedResponse.returns(cachedResponse);
        const uidFromCache = {
          responseObj: cachedResponse.response,
          timestamp: cachedResponse.timestamp,
          isFromCache: true,
          willBeRefreshed: isExpired
        };

        const fetchResult = Promise.resolve(new RefreshedResponse({}));
        uidFetcher.fetchId.returns(fetchResult);

        // when
        let add1Result = leader.addFollower(follower1);
        let add2Result = leader.addFollower(follower2);

        // then
        expect(add1Result).to.be.eql(new AddFollowerResult());
        expect(add2Result).to.be.eql(new AddFollowerResult());
        expect(store.getCachedResponse).to.be.calledWith(follower1.getCacheId());
        expect(store.incNb).to.be.calledWith(follower1.getCacheId());
        expect(follower1.notifyUidReady).to.be.calledWith(uidFromCache);
        expect(store.getCachedResponse).to.be.calledWith(follower2.getCacheId());
        expect(store.incNb).to.be.calledWith(follower2.getCacheId());
        expect(follower2.notifyUidReady).to.be.calledWith(uidFromCache);

        // when
        leader.start();

        await resolved(consentPromise);
        // then
        expect(uidFetcher.fetchId).to.be.calledWith([
          expectedLeaderData(follower1, 1, isExpired, cachedResponse),
          expectedFollowerData(follower2, 1, isExpired, cachedResponse)
        ], CONSENT_DATA_GDPR_ALLOWED, true);
      });
    });

    it('should NOT provision cached response if invalid available when follower added and get with refreshNeeded', async () => {

      // given
      store.hasConsentChanged.returns(false);
      const cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, Date.now(), 1));
      cachedResponse.isValid.returns(false);
      store.getCachedResponse.returns(cachedResponse);

      const fetchResult = Promise.resolve(new RefreshedResponse({}));
      uidFetcher.fetchId.returns(fetchResult);

      // when
      let add1Result = leader.addFollower(follower1);
      let add2Result = leader.addFollower(follower2);

      // then
      expect(add1Result).to.be.eql(new AddFollowerResult());
      expect(add2Result).to.be.eql(new AddFollowerResult());
      expect(store.getCachedResponse).to.be.calledWith(follower1.getCacheId());
      expect(store.getCachedResponse).to.be.calledWith(follower2.getCacheId());
      expect(store.incNb).to.be.not.called;
      expect(follower1.notifyUidReady).to.not.be.called;
      expect(follower2.notifyUidReady).to.not.be.called;

      // when
      leader.start();
      // then
      await resolved(consentPromise);
      expect(uidFetcher.fetchId).to.be.calledWith([
        expectedLeaderData(follower1, 1, true, cachedResponse),
        expectedFollowerData(follower2, 1, true, cachedResponse)
      ], CONSENT_DATA_GDPR_ALLOWED, true);
    });

    describe('when uid already fetched', () => {

      let cachedResponse;
      beforeEach(async function () {
        // make sure leader astred and after first fetch
        const fetchResult = sinon.promise();
        const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
        refreshedResponse.getResponseFor.returns({
          universal_uid: 'id5-uid',
          cascade_needed: true
        });

        uidFetcher.fetchId.returns(fetchResult);
        leader.addFollower(follower1);
        leader.start();
        await resolved(consentPromise);
        fetchResult.resolve(refreshedResponse);
        await resolved(fetchResult);
        uidFetcher.fetchId.reset();

        cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, Date.now(), 1));
      });

      it('late joiner should be notified with cached  response if available valid and not expired', function () {
        // given
        const lateJoiner = follower2;
        store.getCachedResponse.withArgs(lateJoiner.getCacheId()).returns(cachedResponse);
        cachedResponse.isValid.returns(true);
        cachedResponse.isExpired.returns(false);

        // when
        const result = leader.addFollower(lateJoiner);

        // then
        expect(result).to.be.eql(new AddFollowerResult(true, true));
        expect(lateJoiner.notifyUidReady).have.been.calledWith({
          responseObj: cachedResponse.response,
          timestamp: cachedResponse.timestamp,
          isFromCache: true,
          willBeRefreshed: false
        });
        expect(store.incNb).have.been.calledWith(lateJoiner.getCacheId());
        expect(uidFetcher.fetchId).have.not.been.called;
      });

      it('late joiner should be notified with cached response if available valid and trigger refresh when expired', async () => {
        // given
        store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse);
        cachedResponse.isValid.returns(true);
        cachedResponse.isExpired.returns(true);

        uidFetcher.fetchId.returns(Promise.resolve({}));

        // when
        const result = leader.addFollower(follower2);

        // then
        expect(result).to.be.eql(new AddFollowerResult(true, true));
        expect(follower2.notifyUidReady).have.been.calledWith({
          responseObj: cachedResponse.response,
          timestamp: cachedResponse.timestamp,
          isFromCache: true,
          willBeRefreshed: true
        });
        expect(store.incNb).have.been.calledWith(follower2.getCacheId());

        await resolved(consentPromise);
        expect(uidFetcher.fetchId).have.been.calledWith(
          [
            expectedLeaderData(follower1, 2, false),
            expectedFollowerData(follower2, 1, true, cachedResponse)
          ], CONSENT_DATA_GDPR_ALLOWED,
          true);
      });

      it('late joiner should be notified with cached response if available valid and trigger refresh when expired - not unique', async () => {
        // given
        follower2.getCacheId.returns(follower1.getCacheId()); // not unique
        store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse);
        cachedResponse.isValid.returns(true);
        cachedResponse.isExpired.returns(true);

        uidFetcher.fetchId.returns(Promise.resolve(new RefreshedResponse({})));

        // when
        const result = leader.addFollower(follower2);

        // then
        expect(result).to.be.eql(new AddFollowerResult(true, false));
        expect(follower2.notifyUidReady).have.been.calledWith({
          responseObj: cachedResponse.response,
          timestamp: cachedResponse.timestamp,
          isFromCache: true,
          willBeRefreshed: true
        });
        expect(store.incNb).have.been.calledWith(follower2.getCacheId());

        await resolved(consentPromise);
        expect(uidFetcher.fetchId).have.been.calledWith(
          [
            expectedLeaderData(follower1, 2, false, cachedResponse),
            expectedFollowerData(follower2, 1, true, cachedResponse)
          ],
          CONSENT_DATA_GDPR_ALLOWED,
          true);
      });

      it('late joiner should NOT be notified with cached response if available is invalid and trigger refresh', async () => {
        // given
        store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse);
        cachedResponse.isValid.returns(false);
        cachedResponse.isExpired.returns(false);

        uidFetcher.fetchId.returns(Promise.resolve(new RefreshedResponse({})));

        // when
        const result = leader.addFollower(follower2);

        // then
        expect(result).to.be.eql(new AddFollowerResult(true, true));
        expect(follower2.notifyUidReady).have.not.been.called;
        expect(store.incNb).have.not.been.called;

        await resolved(consentPromise);

        expect(uidFetcher.fetchId).have.been.calledWith(
          [
            expectedLeaderData(follower1, 2, false),
            expectedFollowerData(follower2, 1, true, cachedResponse)
          ],
          CONSENT_DATA_GDPR_ALLOWED,
          true);
      });

      it('late joiner should trigger refresh if not available response found', async () => {
        // given
        store.getCachedResponse.withArgs(follower2.getCacheId()).returns(undefined);

        uidFetcher.fetchId.returns(Promise.resolve(new RefreshedResponse({})));

        // when
        const result = leader.addFollower(follower2);

        // then
        expect(result).to.be.eql(new AddFollowerResult(true, true));
        expect(follower2.notifyUidReady).have.not.been.called;
        expect(store.incNb).have.not.been.called;

        await resolved(consentPromise);

        expect(uidFetcher.fetchId).have.been.calledWith(
          [
            expectedLeaderData(follower1, 2, false),
            expectedFollowerData(follower2, 1, true)
          ],
          CONSENT_DATA_GDPR_ALLOWED,
          true);
      });
    });

    describe('when uid fetch is in progress', function () {
      let fetchInProgressResult;

      beforeEach(async () => {
        leader.addFollower(follower1);
        fetchInProgressResult = sinon.promise();
        uidFetcher.fetchId.returns(fetchInProgressResult);
        leader.start();
        await resolved(consentPromise);
      });

      [
        ['failed', promise => promise.reject(new Error('some error')), 1],
        ['skipped', promise => promise.resolve(), 1],
        ['refreshed', promise => promise.resolve(new RefreshedResponse({universal_uid: 'resolved'})), 2]
      ].forEach(([descr, resolve, expectedRequestCount]) => {
        it(`should schedule refresh uid when in progress and execute when previous is done (${descr})`, async () => {

          // then
          expect(uidFetcher.fetchId).to.be.calledWith([
            expectedLeaderData(follower1, 1, true)
          ], CONSENT_DATA_GDPR_ALLOWED, true);

          // when
          uidFetcher.fetchId.reset();

          leader.refreshUid({
            forceAllowLocalStorageGrant: true,
            resetConsent: true,
            forceFetch: true
          }, follower1.getId());

          // then
          expect(uidFetcher.fetchId).to.not.be.called;
          expect(consentManager.resetConsentData).to.not.be.called;

          // when
          resolve(fetchInProgressResult);

          return Promise.allSettled([fetchInProgressResult, consentPromise]).then(async () => {
            // then
            expect(consentManager.resetConsentData).to.be.calledWith(true);
            await resolved(consentPromise);
            expect(uidFetcher.fetchId).to.be.calledWith([
              expectedLeaderData(follower1, expectedRequestCount, true)
            ], CONSENT_DATA_GDPR_ALLOWED, true);
          });
        });
      });

      it('late joiner should triggered refresh when active is completed', async function () {
        // then
        expect(uidFetcher.fetchId).to.be.calledWith([
          expectedLeaderData(follower1, 1, true)
        ], CONSENT_DATA_GDPR_ALLOWED, true);

        // when
        uidFetcher.fetchId.reset();

        // given
        store.getCachedResponse.withArgs(follower2.getCacheId()).returns(undefined);

        // when
        const result = leader.addFollower(follower2);

        // then
        expect(result).to.be.eql(new AddFollowerResult(true, true));
        expect(follower2.notifyUidReady).have.not.been.called;

        // when
        const refreshedResponse = sinon.stub(new RefreshedResponse({universal_uid: 'resolved'}, Date.now()));
        refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({response: 'aa'});
        fetchInProgressResult.resolve(refreshedResponse);
        await resolved(fetchInProgressResult);
        await resolved(consentPromise);
        // then
        expect(follower1.notifyUidReady).have.been.calledWith({
          responseObj: {response: 'aa'},
          timestamp: refreshedResponse.timestamp,
          isFromCache: false
        });
        expect(refreshedResponse.getResponseFor.withArgs(follower2.getCacheId())).have.not.been.called;
        expect(follower2.notifyUidReady).have.not.been.called;

        expect(uidFetcher.fetchId).have.been.calledWith(
          [
            expectedLeaderData(follower1, 2, false),
            expectedFollowerData(follower2, 1, true)
          ],
          CONSENT_DATA_GDPR_ALLOWED,
          true);
      });
    });

    it(`should add follower's storage as replica if follower from different window`, function () {
      // given
      const otherWindow = sinon.stub();
      const follower1Storage = sinon.stub();
      const follower2Storage = sinon.stub();
      follower1.getWindow.reset();
      follower1.getWindow.returns(leaderWindow);
      follower1.getStorage.returns(follower1Storage);
      follower2.getWindow.reset();
      follower2.getWindow.returns(otherWindow);
      follower2.getStorage.returns(follower2Storage);

      // when
      leader.addFollower(follower1);
      leader.addFollower(follower2);

      // then
      expect(leaderStorage.addReplica).to.be.calledOnce;
      expect(leaderStorage.addReplica).to.be.calledWith(follower2Storage);

    });

    it('should notify followers when uid fetch failed', async () => {

      // given
      leader.addFollower(follower1);
      leader.addFollower(follower2);

      const fetchResult = sinon.promise();
      uidFetcher.fetchId.returns(fetchResult);

      // when
      leader.start();
      await resolved(consentPromise);

      fetchResult.reject(new Error('some-error'));
      await Promise.allSettled([fetchResult]);

      // then
      expect(follower1.notifyFetchUidCanceled).to.be.calledWith({reason: 'error'});
      expect(follower2.notifyFetchUidCanceled).to.be.calledWith({reason: 'error'});
    });


    describe('refresh when uid already fetched', () => {

      beforeEach(async () => {
        leader.addFollower(follower1);
        leader.addFollower(follower2);

        const fetchResult = sinon.promise();
        const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
        refreshedResponse.getResponseFor.returns({
          universal_uid: 'id5-uid',
          cascade_needed: true
        });
        uidFetcher.fetchId.returns(fetchResult);

        leader.start();
        await resolved(consentPromise);

        fetchResult.resolve(refreshedResponse);
        await fetchResult;
        uidFetcher.fetchId.reset();
        uidFetcher.fetchId.returns(sinon.promise());
        store.getCachedResponse.reset();
        consentManager.getConsentData.reset();
        consentManager.getConsentData.resolves(consentPromise);
      });

      it('should refresh uid with force fetch and requester provided', async () => {
        // given
        // when
        leader.refreshUid({
          forceFetch: true
        }, follower2.getId());


        // then
        expect(consentManager.resetConsentData).to.not.be.called;
        expect(consentManager.getConsentData).to.be.called;
        expect(store.getCachedResponse).to.have.not.been.called;

        await resolved(consentPromise);

        expect(uidFetcher.fetchId).to.be.calledWith([
          expectedLeaderData(follower1, 2, false),
          expectedFollowerData(follower2, 2, true)
        ], CONSENT_DATA_GDPR_ALLOWED, true);
      });

      it('should refresh uid without force fetch and requester provided', async () => {
        // given
        store.getCachedResponse.reset();

        // when
        follower1.notifyUidReady.reset();
        leader.refreshUid({
          forceFetch: false
        }, follower1.getId());

        // then
        expect(consentManager.resetConsentData).to.not.be.called;
        // called to provision cached id
        expect(store.getCachedResponse).to.have.been.calledWith(follower1.getCacheId());
        expect(store.getCachedResponse).to.have.not.been.calledWith(follower2.getCacheId());

        expect(consentManager.getConsentData).to.be.called;

        store.getCachedResponse.reset();

        await resolved(consentPromise);

        expect(uidFetcher.fetchId).to.be.calledWith([
          expectedLeaderData(follower1, 2, true),
          expectedFollowerData(follower2, 2, false)
        ], CONSENT_DATA_GDPR_ALLOWED, true);

        // called again to collect data for fetch
        expect(store.getCachedResponse).to.have.been.calledWith(follower1.getCacheId());
        expect(store.getCachedResponse).to.have.been.calledWith(follower2.getCacheId());

        expect(follower1.notifyUidReady).have.not.been.called;
      });

      it('should refresh uid with without force fetch and provide cached response if valid and not expired', async () => {
        // given
        store.getCachedResponse.reset();
        store.hasConsentChanged.returns(true);

        const timestamp = Date.now();
        const cachedResponse = sinon.stub(new CachedResponse({
          universal_uid: 'id5-uid',
          signature: '12243',
          cascade_needed: true
        }, timestamp, 1));
        cachedResponse.isExpired.returns(false);
        cachedResponse.isValid.returns(true);
        store.getCachedResponse.withArgs(follower1.getCacheId()).returns(cachedResponse);

        // when
        follower1.notifyUidReady.reset();
        leader.refreshUid({
          forceFetch: false
        }, follower1.getId());

        // then
        expect(store.getCachedResponse).to.have.not.been.calledWith(follower1.getId());
        expect(follower1.notifyUidReady).to.have.been.calledWith({
          timestamp: timestamp,
          responseObj: {
            universal_uid: 'id5-uid',
            signature: '12243',
            cascade_needed: true
          },
          isFromCache: true,
          willBeRefreshed: false
        });
        expect(consentManager.resetConsentData).to.not.be.called;
        await resolved(consentPromise);
        expect(uidFetcher.fetchId).to.be.calledWith([
          expectedLeaderData(follower1, 2, false, cachedResponse),
          expectedFollowerData(follower2, 2, false)
        ], CONSENT_DATA_GDPR_ALLOWED, true);
      });

      it('should refresh uid with without force fetch and provide cached response if valid but expired', async () => {
        // given
        store.getCachedResponse.reset();
        const timestamp = Date.now();
        const cachedResponse = sinon.stub(new CachedResponse({
          universal_uid: 'id5-uid',
          signature: '12243',
          cascade_needed: true
        }, timestamp, 1));
        cachedResponse.isExpired.returns(true);
        cachedResponse.isValid.returns(true);
        store.getCachedResponse.withArgs(follower1.getCacheId()).returns(cachedResponse);

        // when
        follower1.notifyUidReady.reset();
        leader.refreshUid({
          forceFetch: false
        }, follower1.getId());

        // then
        expect(store.getCachedResponse).to.have.not.been.calledWith(follower1.getId());
        expect(follower1.notifyUidReady).to.have.been.calledWith({
          timestamp: timestamp,
          responseObj: {
            universal_uid: 'id5-uid',
            signature: '12243',
            cascade_needed: true
          },
          isFromCache: true,
          willBeRefreshed: true
        });
        expect(consentManager.resetConsentData).to.not.be.called;
        await resolved(consentPromise);

        expect(uidFetcher.fetchId).to.be.calledWith([
          expectedLeaderData(follower1, 2, true, cachedResponse),
          expectedFollowerData(follower2, 2, false)
        ], CONSENT_DATA_GDPR_ALLOWED, true);
      });

      it('should refresh uid with without force fetch and NOT provide cached response if not valid', async () => {
        // given
        store.getCachedResponse.reset();
        const timestamp = Date.now();
        const cachedResponse = sinon.stub(new CachedResponse({
          universal_uid: 'id5-uid',
          signature: '12243',
          cascade_needed: true
        }, timestamp, 1));
        cachedResponse.isExpired.returns(false);
        cachedResponse.isValid.returns(false);
        store.getCachedResponse.withArgs(follower1.getCacheId()).returns(cachedResponse);

        // when
        follower1.notifyUidReady.reset();
        leader.refreshUid({
          forceFetch: false,
          resetConsent: true
        }, follower1.getId());

        // then
        expect(store.getCachedResponse).to.have.not.been.calledWith(follower1.getId());
        expect(follower1.notifyUidReady).to.have.not.been.called;
        expect(consentManager.resetConsentData).to.be.called;
        await resolved(consentPromise);

        expect(uidFetcher.fetchId).to.be.calledWith([
          expectedLeaderData(follower1, 2, true, cachedResponse),
          expectedFollowerData(follower2, 2, false)
        ], CONSENT_DATA_GDPR_ALLOWED, true);
      });

      it('should refresh uid with no args', async () => {

        // given
        store.hasConsentChanged.returns(true);

        // when
        leader.refreshUid();

        // then
        expect(consentManager.resetConsentData).to.not.be.called;

        await resolved(consentPromise);

        expect(uidFetcher.fetchId).to.be.calledWith([
            expectedLeaderData(follower1, 2, false),
            expectedFollowerData(follower2, 2, false)
          ],
          CONSENT_DATA_GDPR_ALLOWED,
          true
        );
      });

      [true, false, undefined].forEach(forceAllowLocalStorageGrant => {
        it(`should refresh uid and reset consent if required forceAllowLocalStorageGrant=${forceAllowLocalStorageGrant}`, async () => {

          // given
          store.hasConsentChanged.returns(true);

          // when
          leader.refreshUid({
            forceAllowLocalStorageGrant: forceAllowLocalStorageGrant,
            resetConsent: true
          });

          // then
          expect(consentManager.resetConsentData).to.be.calledWith(forceAllowLocalStorageGrant === true);

          await resolved(consentPromise);
          expect(uidFetcher.fetchId).to.be.calledWith([
            expectedLeaderData(follower1, 2, false),
            expectedFollowerData(follower2, 2, false)
          ], CONSENT_DATA_GDPR_ALLOWED, true);
        });
      });
    });


    it('should update consent data', function () {
      // given
      const consentData = sinon.stub();

      // when
      leader.updateConsent(consentData);

      // then
      expect(consentManager.setConsentData).to.be.calledWith(consentData);
    });

    it('should update consent data and measure change', function () {
      // given
      const consentData = Object.assign(new ConsentData(), {
        api: API_TYPE.TCF_V2,
        consentString: 'string'
      });

      const consentStringChangedData = Object.assign(new ConsentData(), {
        api: API_TYPE.TCF_V2,
        consentString: 'new-string'
      });

      const apiChangedConsentData = Object.assign(new ConsentData(), {
        api: API_TYPE.USP_V1,
        consentString: 'new-string',
        ccpaString: 'ccpa'
      });

      const metrics = leader._metrics;
      const counter = sinon.createStubInstance(Counter);
      metrics.consentChangeCounter.returns(counter);

      // when
      leader.updateConsent(consentData);

      // then
      expect(consentManager.setConsentData).to.be.calledWith(consentData);
      expect(metrics.consentChangeCounter).have.not.been.called;

      // when
      leader.updateConsent(consentStringChangedData);

      // then
      expect(consentManager.setConsentData).to.be.calledWith(consentStringChangedData);
      expect(metrics.consentChangeCounter).have.been.calledWith({
        apiChanged: false,
        consentStringChanged: true,
        usPrivacyChanged: false
      });

      // when
      metrics.consentChangeCounter.reset();
      metrics.consentChangeCounter.returns(counter);
      leader.updateConsent(consentStringChangedData);

      // then
      expect(consentManager.setConsentData).to.be.calledWith(consentStringChangedData);
      expect(metrics.consentChangeCounter).have.not.been.called;

      // when
      metrics.consentChangeCounter.reset();
      metrics.consentChangeCounter.returns(counter);
      leader.updateConsent(apiChangedConsentData);

      // then
      expect(consentManager.setConsentData).to.be.calledWith(consentStringChangedData);
      expect(metrics.consentChangeCounter).have.been.calledWith({
        apiChanged: true,
        consentStringChanged: false,
        usPrivacyChanged: true
      });
      expect(counter.inc).to.have.calledTwice;
    });

    it('should update follower data', function () {
      // given
      leader.addFollower(follower1);
      leader.addFollower(follower2);

      // when
      leader.updateFetchIdData(follower2Id, {updated: 'data'});

      // then
      expect(follower2.updateFetchIdData).to.be.calledWith({updated: 'data'});
      expect(follower1.updateFetchIdData).to.not.be.called;
    });

    it('should notify about cascade eligible follower if needed', async () => {
      // given
      localStorageGrant.isDefinitivelyAllowed.returns(true);

      follower1.canDoCascade.returns(true);
      follower1FetchIdData.refererInfo = {
        stack: ['top', 'frame1', 'frame2']
      };
      follower2.canDoCascade.returns(false);
      follower2FetchIdData.refererInfo = {
        stack: ['top', 'frame1']
      };
      follower3.canDoCascade.returns(true);
      follower3FetchIdData.refererInfo = {
        stack: ['top']
      };

      leader.addFollower(follower1);
      leader.addFollower(follower2);
      leader.addFollower(follower3);

      const fetchResult = sinon.promise();
      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.returns({
        universal_uid: 'id5-uid',
        cascade_needed: true
      });

      uidFetcher.fetchId.returns(fetchResult);

      // when
      leader.start();
      fetchResult.resolve(refreshedResponse);

      // then
      await resolved(consentPromise);
      await resolved(fetchResult);
      expect(follower1.canDoCascade).to.have.been.called;
      expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
      expect(follower2.canDoCascade).to.have.been.called;
      expect(follower2.notifyCascadeNeeded).to.have.not.been.called;
      expect(follower3.canDoCascade).to.have.been.called;
      // follower3 is the closest to the top can can do cascade
      expect(follower3.notifyCascadeNeeded).to.have.been.calledWith({
        userId: 'id5-uid',
        partnerId: 3,
        consentString: 'CONSENT_STRING',
        gdprApplies: true,
        gppString: 'GPP_STRING',
        gppSid: '7,8'
      });
    });

    it('should notify about cascade eligible follower only if requested', async () => {
      // given
      localStorageGrant.isDefinitivelyAllowed.returns(true);

      follower1.canDoCascade.returns(true);
      follower1FetchIdData.refererInfo = {
        stack: ['top', 'frame1', 'frame2']
      };
      follower2.canDoCascade.returns(true);
      follower2FetchIdData.refererInfo = {
        stack: ['top', 'frame1']
      };
      follower3.canDoCascade.returns(true);
      follower3FetchIdData.refererInfo = {
        stack: ['top']
      };

      leader.addFollower(follower1);
      leader.addFollower(follower2);
      leader.addFollower(follower3);

      const fetchResult = sinon.promise();
      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({
        universal_uid: 'id5-uid-1',
        cascade_needed: true
      });
      refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({
        universal_uid: 'id5-uid-2',
        cascade_needed: true
      });
      refreshedResponse.getResponseFor.withArgs(follower3.getId()).returns({
        universal_uid: 'id5-uid-3'
      });


      uidFetcher.fetchId.returns(fetchResult);

      // when
      leader.start();
      fetchResult.resolve(refreshedResponse);

      // then
      await resolved(consentPromise);
      await resolved(fetchResult);
      expect(follower1.canDoCascade).to.have.been.called;
      expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
      // follower2 is requested in response and the closest to the top that can do cascade
      expect(follower2.canDoCascade).to.have.been.called;
      expect(follower2.notifyCascadeNeeded).to.have.been.calledWith({
        userId: 'id5-uid-2',
        partnerId: 2,
        consentString: 'CONSENT_STRING',
        gdprApplies: true,
        gppString: 'GPP_STRING',
        gppSid: '7,8'
      });
      // follower3 is the closest to the top can can do cascade but not requested in response
      expect(follower3.canDoCascade).to.have.not.been.called;
      expect(follower3.notifyCascadeNeeded).to.have.not.been.called;
    });

    it('should NOT notify about cascade if response is from cache', function () {
      // given
      localStorageGrant.isDefinitivelyAllowed.returns(true);
      const consentData = new ConsentData();
      consentData.gdprApplies = true;
      consentData.consentString = 'gdprConsentString';
      const cachedResponse = new CachedResponse({
        universal_uid: 'id5-uid',
        signature: '12243',
        cascade_needed: true
      }, Date.now(), 1);
      store.getCachedResponse.withArgs(follower1.getCacheId()).returns(cachedResponse);

      // when
      leader.addFollower(follower1);

      // then
      expect(follower1.notifyUidReady).to.have.been.calledWith({
        responseObj: cachedResponse.response,
        timestamp: cachedResponse.timestamp,
        isFromCache: true,
        willBeRefreshed: true
      });
      expect(follower1.canDoCascade).to.have.not.been.called;
      expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
    });

    it('should NOT notify about cascade if not requested in response', async () => {
      // given
      localStorageGrant.isDefinitivelyAllowed.returns(true);
      const consentData = new ConsentData();
      consentData.gdprApplies = true;
      consentData.consentString = 'gdprConsentString';

      leader.addFollower(follower1);
      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.returns({
        universal_uid: 'id5-uid'
      });
      refreshedResponse.timestamp = 1;
      const fetchResult = Promise.resolve(refreshedResponse);
      uidFetcher.fetchId.returns(fetchResult);

      // when
      leader.start();

      // then
      await resolved(consentPromise);
      await resolved(fetchResult);

      expect(follower1.notifyUidReady).to.have.been.calledWith({
        responseObj: {
          universal_uid: 'id5-uid'
        },
        timestamp: 1,
        isFromCache: false
      });
      expect(follower1.canDoCascade).to.have.not.been.called;
      expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
    });

    it('should NOT notify about cascade if eligible follower is not present', async () => {
      // given
      localStorageGrant.isDefinitivelyAllowed.returns(true);
      const consentData = new ConsentData();
      consentData.gdprApplies = true;
      consentData.consentString = 'gdprConsentString';

      leader.addFollower(follower1);
      const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
      refreshedResponse.getResponseFor.returns({
        universal_uid: 'id5-uid',
        cascade_needed: true
      });
      const fetchResult = Promise.resolve(refreshedResponse);

      uidFetcher.fetchId.returns(fetchResult);

      follower1.canDoCascade.returns(false);
      follower1FetchIdData.refererInfo = {
        stack: ['top']
      };

      leader.addFollower(follower1);

      // when
      leader.start();
      await resolved(consentPromise);
      await resolved(fetchResult);

      // then
      expect(follower1.canDoCascade).to.have.been.called;
      expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
    });

    [true, false, undefined].forEach(accessibilityResult => {
      it(`should provide local storage accessibility result when fetId (${accessibilityResult})`, async () => {
        localStorageCheckStub.reset();
        localStorageCheckStub.returns(accessibilityResult);
        leader.addFollower(follower1);

        // when
        leader.start();
        await resolved(consentPromise);

        // then
        expect(localStorageCheckStub).to.be.calledOnce;
        expect(uidFetcher.fetchId).to.be.calledWith(
          [
            expectedLeaderData(follower1, 1, true)
          ],
          CONSENT_DATA_GDPR_ALLOWED,
          accessibilityResult
        );
      });
    });

  });

  describe('when consent data available - not given', function () {
    let consentPromise;
    beforeEach(() => {
      consentPromise = Promise.resolve(new ConsentData());
      consentManager.getConsentData.returns(consentPromise);
      consentManager.localStorageGrant.returns(localStorageGrant);
      localStorageGrant.allowed = false;
    });

    it('should notify followers that fetch canceled', async () => {

      // given
      leader.addFollower(follower1);
      leader.addFollower(follower2);

      // when
      leader.start();
      await resolved(consentPromise);

      // then
      const cancel = {
        reason: 'No legal basis to use ID5'
      };
      expect(follower1.notifyFetchUidCanceled).to.be.calledWith(cancel);
      expect(follower2.notifyFetchUidCanceled).to.be.calledWith(cancel);
      expect(localStorageCheckStub).to.not.be.called;
      expect(uidFetcher.fetchId).to.not.be.called;
      expect(store.storeConsent).to.not.be.called;
    });
  });

  it('should return properties when asked', function () {
    // when/then
    expect(leader.getProperties()).to.be.eq(leaderProperties);
  });
});

async function resolved(promise) {
  await promise.then(() => {
  });
}
