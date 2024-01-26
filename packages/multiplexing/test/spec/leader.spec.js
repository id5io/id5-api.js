import sinon from 'sinon';
import { CrossInstanceMessenger, ProxyMethodCallTarget } from '../../src/messaging.js';
import { ActualLeader, AddFollowerResult, AwaitedLeader, Leader, ProxyLeader } from '../../src/leader.js';
import { RefreshedResponse, UidFetcher} from '../../src/fetch.js';
import {CachedResponse, Store} from '../../src/store.js';
import { API_TYPE, ConsentData, LocalStorageGrant, NoConsentError } from '../../src/consent.js';
import { ConsentManagement } from '../../src/consentManagement.js';
import { NoopLogger } from '../../src/logger.js';
import { Follower } from '../../src/follower.js';
import { Properties } from '../../src/instance.js';
import { Counter, Id5CommonMetrics } from '@id5io/diagnostics';
import { ReplicatingStorage } from '../../src/localStorage.js';

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
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'refreshUid', [forceFetch]);
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
    const follower = sinon.stub();

    const awaitedLeader = new AwaitedLeader();
    const newLeader = sinon.createStubInstance(Leader);
    newLeader.addFollower.returns(new AddFollowerResult());

    // when
    awaitedLeader.updateConsent(consentData);
    awaitedLeader.refreshUid(refreshOptions);
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
    awaitedLeader.refreshUid(refreshOptions);

    // then
    expect(assignedLeader.refreshUid).to.have.been.calledWith(refreshOptions);
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
    const properties = { id: 'a' };
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
    leader = new ActualLeader(leaderWindow, leaderProperties, leaderStorage, store, consentManager, sinon.createStubInstance(Id5CommonMetrics), NoopLogger, uidFetcher);
  });

  it('should getId on start and notify followers when uid ready', async () => {

    // given
    const fetchResult = sinon.promise();

    uidFetcher.getId.returns(fetchResult);

    // when
    let add1Result = leader.addFollower(follower1);
    let add2Result = leader.addFollower(follower2);

    // then
    expect(add1Result).to.be.eql(new AddFollowerResult());
    expect(add2Result).to.be.eql(new AddFollowerResult());

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader',
        cacheId: follower1.getCacheId()
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower',
        cacheId: follower2.getCacheId()
      }],
      true // required refresh no cache
    );

    // when
    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'id-1'});
    refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({ universal_uid: 'id-2' });
    refreshedResponse.timestamp = 345;
    fetchResult.resolve({ refreshedResponse: refreshedResponse });
    await fetchResult.refreshResult;

    // then
    expect(follower1.notifyUidReady).to.be.calledWith({
      responseObj: { universal_uid: 'id-1' },
      timestamp: 345,
      isFromCache: false
    });
    expect(follower2.notifyUidReady).to.be.calledWith({
      responseObj: {universal_uid: 'id-2'},
      timestamp: 345,
      isFromCache: false
    });

    // when
    uidFetcher.getId.reset();
    uidFetcher.getId.returns(sinon.promise())
    leader.refreshUid({
      forceFetch: false
    })

    // then
    expect(uidFetcher.getId).to.be.calledWith([
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 2,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 2,
          role: 'follower',
          cacheId: follower2.getCacheId()
        }],
      false // already provisioned
    );
  });

  it('should getId on start and notify followers when uid ready from cache and then update when refreshed', async () => {

    // given
    const cachedResponse = sinon.stub(new CachedResponse({ universal_uid: crypto.randomUUID() }, Date.now(), 1));
    cachedResponse.isValid.returns(true);
    store.getCachedResponse.returns(cachedResponse);
    const uidFromCache = {
      responseObj: cachedResponse.response,
      timestamp: cachedResponse.timestamp,
      isFromCache: true
    };

    const fetchResult = sinon.promise();
    uidFetcher.getId.returns(fetchResult);

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

    // then
    expect(uidFetcher.getId).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader',
        cacheId: follower1.getCacheId()
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower',
        cacheId: follower2.getCacheId()
      }], false);

    // when
    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({ universal_uid: 'id-1' });
    refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({ universal_uid: 'id-2' });
    refreshedResponse.timestamp = 345;
    fetchResult.resolve({ refreshedResponse: refreshedResponse });
    await fetchResult.refreshResult;

    // then
    expect(follower1.notifyUidReady).to.be.calledWith({
      responseObj: { universal_uid: 'id-1' },
      timestamp: 345,
      isFromCache: false
    });
    expect(follower2.notifyUidReady).to.be.calledWith({
      responseObj: { universal_uid: 'id-2' },
      timestamp: 345,
      isFromCache: false
    });
  });

  [true, false].forEach((isExpired) => {
    it(`should provision cached response if valid available expired=${isExpired} when follower added and getId on start`, async () => {

      // given
      const cachedResponse = sinon.stub(new CachedResponse({ universal_uid: crypto.randomUUID() }, Date.now(), 1));
      cachedResponse.isValid.returns(true);
      cachedResponse.isExpired.returns(isExpired);
      store.getCachedResponse.returns(cachedResponse);
      const uidFromCache = {
        responseObj: cachedResponse.response,
        timestamp: cachedResponse.timestamp,
        isFromCache: true
      };

      const fetchResult = Promise.resolve({});
      uidFetcher.getId.returns(fetchResult);

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

      // then
      expect(uidFetcher.getId).to.be.calledWith([
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 1,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 1,
          role: 'follower',
          cacheId: follower2.getCacheId()
        }], isExpired);

      // when
      await fetchResult.refreshResult;

      // then
      expect(follower1.notifyUidReady).to.be.calledOnce; // no more calls
      expect(follower2.notifyUidReady).to.be.calledOnce;
    });
  });

  it('should NOT provision cached response if invalid available when follower added and get with refreshNeeded', async () => {

    // given
    const cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, Date.now(), 1));
    cachedResponse.isValid.returns(false);
    store.getCachedResponse.returns(cachedResponse);

    const fetchResult = Promise.resolve({});
    uidFetcher.getId.returns(fetchResult);

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
    expect(uidFetcher.getId).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader',
        cacheId: follower1.getCacheId()
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower',
        cacheId: follower2.getCacheId()
      }], true);
  });

  describe('when uid already fetched', () => {

    let cachedResponse;
    beforeEach(async function () {
      // make sure leader astred and after first fetch
      const response = Promise.resolve({});
      uidFetcher.getId.returns(response);
      leader.addFollower(follower1);
      leader.start();
      await response;
      uidFetcher.getId.reset();

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
      expect(result).to.be.eql(new AddFollowerResult(true, false));
      expect(lateJoiner.notifyUidReady).have.been.calledWith({
        responseObj: cachedResponse.response,
        timestamp: cachedResponse.timestamp,
        isFromCache: true
      });
      expect(store.incNb).have.been.calledWith(lateJoiner.getCacheId());
      expect(uidFetcher.getId).have.not.been.called;
    });

    it('late joiner should be notified with cached response if available valid and trigger refresh when expired', function () {
      // given
      store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse);
      cachedResponse.isValid.returns(true);
      cachedResponse.isExpired.returns(true);

      uidFetcher.getId.returns(Promise.resolve({}));

      // when
      const result = leader.addFollower(follower2);

      // then
      expect(result).to.be.eql(new AddFollowerResult(true, false));
      expect(follower2.notifyUidReady).have.been.calledWith({
        responseObj: cachedResponse.response,
        timestamp: cachedResponse.timestamp,
        isFromCache: true
      });
      expect(store.incNb).have.been.calledWith(follower2.getCacheId());
      expect(uidFetcher.getId).have.been.calledWith(
        [{
          ...follower1FetchIdData,
          integrationId: follower1.getId(),
          requestCount: 1,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
          {
            ...follower2FetchIdData,
            integrationId: follower2.getId(),
            requestCount: 1,
            role: 'follower',
            cacheId: follower2.getCacheId()
          }],
        true);
    });

    it('late joiner should NOT be notified with cached response if available is invalid and trigger refresh', function () {
      // given
      store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse);
      cachedResponse.isValid.returns(false);
      cachedResponse.isExpired.returns(false);

      uidFetcher.getId.returns(Promise.resolve({}));

      // when
      const result = leader.addFollower(follower2);

      // then
      expect(result).to.be.eql(new AddFollowerResult(true, false));
      expect(follower2.notifyUidReady).have.not.been.called;
      expect(store.incNb).have.not.been.called;
      expect(uidFetcher.getId).have.been.calledWith(
        [{
          ...follower1FetchIdData,
          integrationId: follower1.getId(),
          requestCount: 1,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
          {
            ...follower2FetchIdData,
            integrationId: follower2.getId(),
            requestCount: 1,
            role: 'follower',
            cacheId: follower2.getCacheId()
          }],
        true);
    });

    it('late joiner should trigger refresh if not available response found', function () {
      // given
      store.getCachedResponse.withArgs(follower2.getCacheId()).returns(undefined);

      uidFetcher.getId.returns(Promise.resolve({}));

      // when
      const result = leader.addFollower(follower2);

      // then
      expect(result).to.be.eql(new AddFollowerResult(true, true));
      expect(follower2.notifyUidReady).have.not.been.called;
      expect(store.incNb).have.not.been.called;
      expect(uidFetcher.getId).have.been.calledWith(
        [{
          ...follower1FetchIdData,
          integrationId: follower1.getId(),
          requestCount: 1,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
          {
            ...follower2FetchIdData,
            integrationId: follower2.getId(),
            requestCount: 1,
            role: 'follower',
            cacheId: follower2.getCacheId()
          }],
        true);
    });
  });

  describe('when uid fetch is in progress', function () {
    let fetchInProgressResult;

    beforeEach(function () {
      leader.addFollower(follower1);
      fetchInProgressResult = sinon.promise();
      uidFetcher.getId.returns(fetchInProgressResult);
      leader.start();
    });

    [
      ['failed', promise => promise.reject(new Error('some error')), 1],
      ['skipped', promise => promise.resolve({}), 1],
      ['refreshed', promise => promise.resolve({refreshedResponse: new RefreshedResponse({universal_uid: 'resolved'})}), 2]
    ].forEach(([descr, resolve, expectedRequestCount]) => {
      it(`should schedule refresh uid when in progress and execute when previous is done (${descr})`, async () => {

        // then
        expect(uidFetcher.getId).to.be.calledWith([
          {
            ...follower1FetchIdData,
            integrationId: follower1Id,
            requestCount: 1,
            role: 'leader',
            cacheId: follower1.getCacheId()
          }], true);

        // when
        uidFetcher.getId.reset();

        leader.refreshUid({
          forceAllowLocalStorageGrant: true,
          resetConsent: true,
          forceFetch: true
        });

        // then
        expect(uidFetcher.getId).to.not.be.called;
        expect(consentManager.resetConsentData).to.not.be.called;

        // when
        resolve(fetchInProgressResult);

        return Promise.allSettled([fetchInProgressResult]).then(() => {
          // then
          expect(consentManager.resetConsentData).to.be.calledWith(true);
          expect(uidFetcher.getId).to.be.calledWith([
            {
              ...follower1FetchIdData,
              integrationId: follower1Id,
              requestCount: expectedRequestCount,
              role: 'leader',
              cacheId: follower1.getCacheId()
            }], true);
        });
      });
    });

    it('late joiner should be notified with cached response then refresh should be triggered', async function () {
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
      fetchInProgressResult.resolve({refreshedResponse});
      await refreshedResponse;

      // then
      expect(result).to.be.eql(new AddFollowerResult(true, true));
      expect(follower1.notifyUidReady).have.been.calledWith({
        responseObj: {response: 'aa'},
        timestamp: refreshedResponse .timestamp,
        isFromCache: false
      });
      expect(refreshedResponse.getResponseFor.withArgs(follower2.getCacheId())).have.not.been.called;
      expect(follower2.notifyUidReady).have.not.been.called;

      expect(uidFetcher.getId).have.been.calledWith(
        [{
          ...follower1FetchIdData,
          integrationId: follower1.getId(),
          requestCount: 2,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
          {
            ...follower2FetchIdData,
            integrationId: follower2.getId(),
            requestCount: 1,
            role: 'follower',
            cacheId: follower2.getCacheId()
          }],
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

  it('should notify followers when uid fetch canceled', async () => {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    const refreshResult = sinon.promise();
    uidFetcher.getId.returns(refreshResult);

    // when
    leader.start();

    refreshResult.reject(new NoConsentError(sinon.stub(), 'no consent'));
    // then
    return Promise.allSettled([refreshResult]).then(() => {
      const cancel = {
        reason: 'no consent'
      };
      expect(follower1.notifyFetchUidCanceled).to.be.calledWith(cancel);
      expect(follower2.notifyFetchUidCanceled).to.be.calledWith(cancel);
    });
  });

  it('should notify followers when uid fetch failed', async () => {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    const fetchResult = sinon.promise();
    uidFetcher.getId.returns(fetchResult);

    // when
    leader.start();
    fetchResult.reject(new Error('some-error'));
    await Promise.allSettled([fetchResult.refreshResult]);

    // then
    expect(follower1.notifyFetchUidCanceled).to.be.calledWith({ reason: 'error' });
    expect(follower2.notifyFetchUidCanceled).to.be.calledWith({ reason: 'error' });
  });

  it('should refresh uid', function () {

    // given
    const cachedResponse = sinon.stub(new CachedResponse({
      universal_uid: 'id5-uid',
      signature: '12243',
      cascade_needed: true
    }, Date.now(), 1));

    cachedResponse.isValid.returns(true);
    cachedResponse.isExpired.returns(false);

    store.getCachedResponse.withArgs(follower1.getCacheId()).returns(cachedResponse);
    store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse);

    leader.addFollower(follower1);
    leader.addFollower(follower2);
    uidFetcher.getId.returns(Promise.resolve({}));

    // when
    leader.refreshUid();

    // then
    expect(consentManager.resetConsentData).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledWith([
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 1,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 1,
          role: 'follower',
          cacheId: follower2.getCacheId()
        }],
      false // both provisioned from cache and not expired
    );
  });

  [true, false, undefined].forEach(forceAllowLocalStorageGrant => {
    it(`should refresh uid and reset consent if required forceAllowLocalStorageGrant=${forceAllowLocalStorageGrant}`, function () {

      // given
      leader.addFollower(follower1);
      leader.addFollower(follower2);
      uidFetcher.getId.returns(Promise.resolve({}));

      // when
      leader.refreshUid({
        forceAllowLocalStorageGrant: forceAllowLocalStorageGrant,
        resetConsent: true
      });

      // then
      expect(consentManager.resetConsentData).to.be.calledWith(forceAllowLocalStorageGrant === true);
      expect(uidFetcher.getId).to.be.calledWith([
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 1,
          role: 'leader',
          cacheId: follower1.getCacheId()
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 1,
          role: 'follower',
          cacheId: follower2.getCacheId()
        }], true);
    });
  });

  it('should refresh uid with force fetch', function () {
    // given
    const cachedResponse = new CachedResponse({
      universal_uid: 'id5-uid',
      signature: '12243',
      cascade_needed: true
    }, Date.now(), 1);
    store.getCachedResponse.withArgs(follower1.getCacheId()).returns(cachedResponse);
    store.getCachedResponse.withArgs(follower2.getCacheId()).returns(cachedResponse);

    // then
    leader.addFollower(follower1);
    leader.addFollower(follower2);
    uidFetcher.getId.returns(Promise.resolve({}));

    // when
    leader.refreshUid({
      forceFetch: true
    });

    // then
    expect(consentManager.resetConsentData).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader',
        cacheId: follower1.getCacheId()
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower',
        cacheId: follower2.getCacheId()
      }], true);
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
    leader.updateFetchIdData(follower2Id, { updated: 'data' });

    // then
    expect(follower2.updateFetchIdData).to.be.calledWith({ updated: 'data' });
    expect(follower1.updateFetchIdData).to.not.be.called;
  });

  it('should notify about cascade eligible follower if needed', async () => {
    // given
    localStorageGrant.isDefinitivelyAllowed.returns(true);
    const consentData = new ConsentData();
    consentData.gdprApplies = true;
    consentData.consentString = 'gdprConsentString';
    consentData.gppData = {
      gppString: 'GPP_STRING',
      applicableSections: [7, 8]
    };

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
    const refreshResult = {
      refreshedResponse: refreshedResponse,
      consentData: consentData
    };

    uidFetcher.getId.returns(fetchResult);

    // when
    leader.start();
    fetchResult.resolve(refreshResult);
    await fetchResult.refreshResult;
    // then

    expect(follower1.canDoCascade).to.have.been.called;
    expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
    expect(follower2.canDoCascade).to.have.been.called;
    expect(follower2.notifyCascadeNeeded).to.have.not.been.called;
    expect(follower3.canDoCascade).to.have.been.called;
    // follower3 is the closest to the top can can do cascade
    expect(follower3.notifyCascadeNeeded).to.have.been.calledWith({
      userId: 'id5-uid',
      partnerId: 3,
      consentString: 'gdprConsentString',
      gdprApplies: true,
      gppString: 'GPP_STRING',
      gppSid: '7,8'
    });

  });

  it('should notify about cascade eligible follower only if requested', async () => {
    // given
    localStorageGrant.isDefinitivelyAllowed.returns(true);
    const consentData = new ConsentData();
    consentData.gdprApplies = true;
    consentData.consentString = 'gdprConsentString';

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
    const refreshResult = {
      refreshedResponse: refreshedResponse,
      consentData: consentData
    };

    uidFetcher.getId.returns(fetchResult);

    // when
    leader.start();
    fetchResult.resolve(refreshResult);
    await fetchResult.refreshResult;
    // then

    expect(follower1.canDoCascade).to.have.been.called;
    expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
    // follower2 is requested in response and the closest to the top that can do cascade
    expect(follower2.canDoCascade).to.have.been.called;
    expect(follower2.notifyCascadeNeeded).to.have.been.calledWith({
      userId: 'id5-uid-2',
      partnerId: 2,
      consentString: 'gdprConsentString',
      gdprApplies: true,
      gppString: undefined,
      gppSid: undefined
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
      isFromCache: true
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
    const fetchResult = Promise.resolve({ refreshedResponse: refreshedResponse });
    uidFetcher.getId.returns(fetchResult);
    // when
    leader.start();
    await fetchResult.refreshResult;

    // then
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
    const fetchResult = Promise.resolve({
      refreshedResponse: refreshedResponse,
      consentData: consentData
    });
    uidFetcher.getId.returns(fetchResult);

    follower1.canDoCascade.returns(false);
    follower1FetchIdData.refererInfo = {
      stack: ['top']
    };

    leader.addFollower(follower1);

    // when
    leader.start();
    await fetchResult.refreshResult;

    // then
    expect(follower1.canDoCascade).to.have.been.called;
    expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
  });

  it('should return properties when asked', function () {
    // when/then
    expect(leader.getProperties()).to.be.eq(leaderProperties);
  });
});
