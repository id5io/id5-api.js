import * as chai from 'chai';
import {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {CrossInstanceMessenger, ProxyMethodCallTarget} from '../../src/messaging.js';
import {ActualLeader, AddFollowerResult, AwaitedLeader, Leader, ProxyLeader} from '../../src/leader.js';
import {CachedResponse, RefreshedResponse, RefreshResult, UidFetcher} from '../../src/fetch.js';
import {
  API_TYPE,
  ConsentData,
  ConsentManagement,
  LocalStorageGrant,
  NoConsentError,
  NoopLogger
} from '../../src/index.js';
import {Follower} from '../../src/follower.js';
import {Properties} from '../../src/instance.js';
import {Counter, Id5CommonMetrics} from '@id5io/diagnostics';
import {ReplicatingStorage} from '../../src/localStorage.js';

chai.use(sinonChai);

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
  const leaderWindow = window;

  const FETCH_RESULT_FROM_CACHE_NO_REFRESH = {
    cachedResponse: {
      timestamp: Date.now(),
      response: {
        universal_uid: 'cached_uid',
        signature: 'signature'
      }
    },
    refreshResult: Promise.resolve({})
  };

  beforeEach(() => {
    uidFetcher = sinon.createStubInstance(UidFetcher);
    consentManager = sinon.createStubInstance(ConsentManagement);
    localStorageGrant = sinon.createStubInstance(LocalStorageGrant);
    consentManager.localStorageGrant.returns(localStorageGrant);
    leaderStorage = sinon.createStubInstance(ReplicatingStorage);
    follower1 = sinon.createStubInstance(Follower);
    follower1.getId.returns(follower1Id);
    follower1.getFetchIdData.returns(follower1FetchIdData);
    follower1.getWindow.returns(leaderWindow);
    follower2 = sinon.createStubInstance(Follower);
    follower2.getId.returns(follower2Id);
    follower2.getFetchIdData.returns(follower2FetchIdData);
    follower2.getWindow.returns(leaderWindow);
    follower3 = sinon.createStubInstance(Follower);
    follower3.getId.returns(follower3Id);
    follower3.getFetchIdData.returns(follower3FetchIdData);
    follower3.getWindow.returns(leaderWindow);
    leader = new ActualLeader(leaderWindow, uidFetcher, leaderProperties, leaderStorage, consentManager, sinon.createStubInstance(Id5CommonMetrics), NoopLogger);
  });

  it('should getId on start and notify followers when uid ready', async () => {

    // given
    const fetchResult = {
      refreshResult: sinon.promise()
    };
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
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);

    // when
    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getResponseFor.returns({universal_uid: 'refreshed'});
    refreshedResponse.timestamp = 345;
    fetchResult.refreshResult.resolve({refreshedResponse: refreshedResponse});
    await fetchResult.refreshResult;

    const fetchedUid = {
      responseObj: {universal_uid: 'refreshed'},
      timestamp: 345,
      isFromCache: false
    };

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(fetchedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(fetchedUid);
  });

  it('should getId on start and notify followers when uid ready from cache and then update when refreshed', async () => {

    // given
    const fetchResult = {
      cachedResponse: new CachedResponse({universal_uid: crypto.randomUUID()}),
      refreshResult: sinon.promise()
    };

    const uidFromCache = {
      responseObj: fetchResult.cachedResponse.response,
      timestamp: fetchResult.cachedResponse.timestamp,
      isFromCache: true
    };

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
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);
    expect(follower1.notifyUidReady).to.be.calledWith(uidFromCache);
    expect(follower2.notifyUidReady).to.be.calledWith(uidFromCache);

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();

    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'refreshed_f1'});
    refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'refreshed_f2'});
    refreshedResponse.timestamp = 1;
    fetchResult.refreshResult.resolve({refreshedResponse: refreshedResponse});
    await fetchResult.refreshResult;

    // then
    expect(follower1.notifyUidReady).to.be.calledWith({
      responseObj: {universal_uid: 'refreshed_f1'},
      timestamp: 1,
      isFromCache: false
    });
    expect(follower2.notifyUidReady).to.be.calledWith({
      responseObj: {universal_uid: 'refreshed_f2'},
      timestamp: 1,
      isFromCache: false
    });
  });

  it('should getId on start and notify followers when uid ready from cache and not refreshed', async () => {

    // given
    const fetchResult = {
      cachedResponse: new CachedResponse({universal_uid: crypto.randomUUID()}),
      refreshResult: Promise.resolve({})
    };

    const uidFromCache = {
      responseObj: fetchResult.cachedResponse.response,
      timestamp: fetchResult.cachedResponse.timestamp,
      isFromCache: true
    };

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
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);
    expect(follower1.notifyUidReady).to.be.calledWith(uidFromCache);
    expect(follower2.notifyUidReady).to.be.calledWith(uidFromCache);
    expect(follower1.notifyUidReady).to.be.calledOnce;
    expect(follower2.notifyUidReady).to.be.calledOnce;
    // when

    await fetchResult.refreshResult;

    // then
    expect(follower1.notifyUidReady).to.be.calledOnce; // no more calls
    expect(follower2.notifyUidReady).to.be.calledOnce;
  });

  it(`should notify late joiner when uid already received from cache and don't trigger fetch when not required`, function () {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);
    uidFetcher.getId.returns(FETCH_RESULT_FROM_CACHE_NO_REFRESH);
    const expectedUid = {
      responseObj: FETCH_RESULT_FROM_CACHE_NO_REFRESH.cachedResponse.response,
      timestamp: FETCH_RESULT_FROM_CACHE_NO_REFRESH.cachedResponse.timestamp,
      isFromCache: true
    };

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(expectedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(expectedUid);

    // when
    follower3.isSimilarTo.onFirstCall().returns(false);
    follower3.isSimilarTo.onSecondCall().returns(true);

    let result = leader.addFollower(follower3);

    // then
    expect(result).to.be.eql(new AddFollowerResult(true, false));
    expect(follower3.isSimilarTo).to.be.calledTwice;
    expect(follower3.isSimilarTo.firstCall).to.be.calledWith(follower1);
    expect(follower3.isSimilarTo.secondCall).to.be.calledWith(follower1);
    expect(follower3.notifyUidReady).to.be.calledWith({
      ...expectedUid,
      isFromCache: true
    });

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(leader._followers).contains(follower3);
  });

  it(`should add to queue refresh when different late joiner added and fetch is in progress - uid already provisioned from cache`, async () => {

    // given
    const uidFromCache = {
      responseObj: sinon.stub(),
      timestamp: Date.now(),
      isFromCache: true
    };
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    const firstFetchResult = {
      cachedResponse: new CachedResponse(uidFromCache.responseObj, uidFromCache.timestamp),
      refreshResult: sinon.promise()
    };
    const secondFetchResult = {
      refreshResult: sinon.promise()
    };
    uidFetcher.getId.onCall(0).returns(firstFetchResult);
    uidFetcher.getId.onCall(1).returns(secondFetchResult);

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);

    expect(follower1.notifyUidReady).to.be.calledWith(uidFromCache);
    expect(follower2.notifyUidReady).to.be.calledWith(uidFromCache);

    // when
    follower3.isSimilarTo.onFirstCall().returns(false);
    follower3.isSimilarTo.onSecondCall().returns(false);
    let result = leader.addFollower(follower3);

    // then
    expect(result).to.be.eql(new AddFollowerResult(true, true));
    expect(follower3.isSimilarTo).to.be.calledTwice;
    expect(follower3.isSimilarTo.firstCall).to.be.calledWith(follower1);
    expect(follower3.isSimilarTo.secondCall).to.be.calledWith(follower1);
    expect(follower3.notifyUidReady).to.be.calledWith(uidFromCache);
    expect(uidFetcher.getId).to.be.calledOnce;

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();
    follower3.notifyUidReady.reset();

    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'refreshed'});
    refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'refreshed'});
    refreshedResponse.timestamp = 123;
    firstFetchResult.refreshResult.resolve({refreshedResponse: refreshedResponse});
    await firstFetchResult.refreshResult;

    const refreshedUid = {
      responseObj: {universal_uid: 'refreshed'},
      timestamp: 123,
      isFromCache: false
    };

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(refreshedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(refreshedUid);
    expect(follower3.notifyUidReady).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledTwice;
    expect(uidFetcher.getId.secondCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 2,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 2,
        role: 'follower'
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id,
        requestCount: 1,
        role: 'follower'
      }
    ], true);

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();
    follower3.notifyUidReady.reset();

    const secondRefreshedResponse = sinon.createStubInstance(RefreshedResponse);
    secondRefreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.getResponseFor.withArgs(follower3.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.timestamp = 1234567;
    secondFetchResult.refreshResult.resolve({refreshedResponse: secondRefreshedResponse});
    await secondFetchResult.refreshResult;

    const updatedUid = {
      responseObj: {universal_uid: 'refreshed_again'},
      timestamp: 1234567,
      isFromCache: false
    };

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower3.notifyUidReady).to.be.calledWith(updatedUid);
  });

  it(`should add to queue refresh when different late joiner added and fetch is in progress - refreshed uid already provisioned`, async () => {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    const firstFetchResult = {
      refreshResult: sinon.promise()
    };
    const secondFetchResult = {
      refreshResult: sinon.promise()
    };
    uidFetcher.getId.onCall(0).returns(firstFetchResult);
    uidFetcher.getId.onCall(1).returns(secondFetchResult);

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);

    // when
    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getGenericResponse.returns({universal_uid: 'refreshed_generic'});
    refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'refreshed_specific'});
    refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'refreshed_specific'});
    refreshedResponse.timestamp = 123;
    firstFetchResult.refreshResult.resolve({refreshedResponse: refreshedResponse});
    await firstFetchResult.refreshResult;

    const refreshedUid = {
      responseObj: {universal_uid: 'refreshed_specific'},
      timestamp: 123,
      isFromCache: false
    };

    const genericRefreshedUid = {
      responseObj: {universal_uid: 'refreshed_generic'},
      timestamp: 123,
      isFromCache: true
    };

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(refreshedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(refreshedUid);

    // when
    follower3.isSimilarTo.onFirstCall().returns(false);
    follower3.isSimilarTo.onSecondCall().returns(false);
    let result = leader.addFollower(follower3);

    // then
    expect(result).to.be.eql(new AddFollowerResult(true, true));
    expect(follower3.isSimilarTo).to.be.calledTwice;
    expect(follower3.isSimilarTo.firstCall).to.be.calledWith(follower1);
    expect(follower3.isSimilarTo.secondCall).to.be.calledWith(follower1);
    expect(follower3.notifyUidReady).to.be.calledWith(genericRefreshedUid);

    expect(uidFetcher.getId).to.be.calledTwice;
    expect(uidFetcher.getId.secondCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 2,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 2,
        role: 'follower'
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id,
        requestCount: 1,
        role: 'follower'
      }
    ], true);

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();
    follower3.notifyUidReady.reset();

    const secondRefreshedResponse = sinon.createStubInstance(RefreshedResponse);
    secondRefreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.getResponseFor.withArgs(follower3.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.timestamp = 1234567;
    secondFetchResult.refreshResult.resolve({refreshedResponse: secondRefreshedResponse});
    await secondFetchResult.refreshResult;

    const updatedUid = {
      responseObj: {universal_uid: 'refreshed_again'},
      timestamp: 1234567,
      isFromCache: false
    };

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower3.notifyUidReady).to.be.calledWith(updatedUid);
  });

  it(`should add to queue refresh when different late joiner added and fetch is in progress - no uid ready yet`, async () => {

    // given
    const firstFetchResult = {
      refreshResult: sinon.promise()
    };
    const secondFetchResult = {
      refreshResult: sinon.promise()
    };
    uidFetcher.getId.onCall(0).returns(firstFetchResult);
    uidFetcher.getId.onCall(1).returns(secondFetchResult);

    leader.addFollower(follower1);
    leader.addFollower(follower2);

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);

    // when
    follower3.isSimilarTo.onFirstCall().returns(false);
    follower3.isSimilarTo.onSecondCall().returns(false);
    let result = leader.addFollower(follower3);

    // then
    expect(result).to.be.eql(new AddFollowerResult(true, true));
    expect(follower3.isSimilarTo).to.be.calledTwice;
    expect(follower3.isSimilarTo.firstCall).to.be.calledWith(follower1);
    expect(follower3.isSimilarTo.secondCall).to.be.calledWith(follower1);

    expect(uidFetcher.getId).to.be.calledOnce; // not called yet

    // when
    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'refreshed'});
    refreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'refreshed'});

    refreshedResponse.timestamp = 12345;
    firstFetchResult.refreshResult.resolve({refreshedResponse: refreshedResponse});
    await firstFetchResult.refreshResult;

    const uid = {
      responseObj: {universal_uid: 'refreshed'},
      timestamp: 12345,
      isFromCache: false
    };

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);
    expect(follower3.notifyUidReady).to.not.be.called;

    // then
    expect(uidFetcher.getId).to.be.calledTwice;
    expect(uidFetcher.getId.secondCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 2,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 2,
        role: 'follower'
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id,
        requestCount: 1,
        role: 'follower'
      }
    ], true);

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();

    const secondRefreshedResponse = sinon.createStubInstance(RefreshedResponse);
    secondRefreshedResponse.getResponseFor.withArgs(follower1.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.getResponseFor.withArgs(follower2.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.getResponseFor.withArgs(follower3.getId()).returns({universal_uid: 'refreshed_again'});
    secondRefreshedResponse.timestamp = 123456;

    secondFetchResult.refreshResult.resolve(new RefreshResult(new ConsentData(), secondRefreshedResponse));
    await secondFetchResult.refreshResult;

    const updatedUid = {
      responseObj: {universal_uid: 'refreshed_again'},
      timestamp: 123456,
      isFromCache: false
    };
    // then
    expect(follower1.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower3.notifyUidReady).to.be.calledWith(updatedUid);
  });

  it(`should trigger fetch when different late joiner added`, async () => {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    const fetchResult = {
      cachedResponse: new CachedResponse({
        universal_uid: 'cached_uid',
        signature: 'signature'
      }),
      refreshResult: sinon.promise()
    };

    uidFetcher.getId.returns(fetchResult);

    const expectedCachedUid = {
      responseObj: fetchResult.cachedResponse.response,
      timestamp: fetchResult.cachedResponse.timestamp,
      isFromCache: true
    };

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);

    // then
    expect(follower1.notifyUidReady.firstCall).to.be.calledWith(expectedCachedUid);
    expect(follower2.notifyUidReady.firstCall).to.be.calledWith(expectedCachedUid);

    // when refresh result completed
    const refreshedResponse = sinon.createStubInstance(RefreshedResponse);
    refreshedResponse.getResponseFor.returns({universal_uid: 'refreshed'});
    refreshedResponse.timestamp = 391;
    fetchResult.refreshResult.resolve({refreshedResponse: refreshedResponse});
    const expectedRefreshedUid = {
      responseObj: {universal_uid: 'refreshed'},
      timestamp: 391,
      isFromCache: false
    };

    await fetchResult.refreshResult;

    // then 2nd notification with refreshed uid
    expect(follower1.notifyUidReady).to.be.calledTwice;
    expect(follower2.notifyUidReady).to.be.calledTwice;

    expect(follower1.notifyUidReady).to.be.calledWith(expectedRefreshedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(expectedRefreshedUid);

    // when
    follower3.isSimilarTo.onFirstCall().returns(false);
    follower3.isSimilarTo.onSecondCall().returns(false);

    const secondRefreshedResponse = sinon.createStubInstance(RefreshedResponse);
    secondRefreshedResponse.getResponseFor.returns({universal_uid: 'refreshed_only_uid'});
    secondRefreshedResponse.timestamp = 446;
    const secondFetchResult = {
      refreshResult: Promise.resolve({
        refreshedResponse: secondRefreshedResponse
      })
    };

    uidFetcher.getId.reset();
    uidFetcher.getId.returns(secondFetchResult);
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();

    let addFollowerResult = leader.addFollower(follower3);
    await secondFetchResult.refreshResult;
    const secondRefreshedUid = {
      responseObj: {universal_uid: 'refreshed_only_uid'},
      timestamp: 446,
      isFromCache: false
    };

    // then
    expect(addFollowerResult).to.be.eql(new AddFollowerResult(true, true));
    expect(follower3.isSimilarTo).to.be.calledTwice;
    expect(follower3.isSimilarTo.firstCall).to.be.calledWith(follower1);
    expect(follower3.isSimilarTo.secondCall).to.be.calledWith(follower1);

    expect(uidFetcher.getId).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 2,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 2,
        role: 'follower'
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id,
        requestCount: 1,
        role: 'follower'
      }
    ], true);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(secondRefreshedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(secondRefreshedUid);
    expect(follower3.notifyUidReady).to.be.calledWith(secondRefreshedUid);
  });

  it(`should add follower's storage as replica if follower form different window`, function () {
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
    uidFetcher.getId.returns({
      refreshResult: refreshResult
    });

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

    const fetchResult = {
      refreshResult: sinon.promise()
    };
    uidFetcher.getId.returns(fetchResult);

    // when
    leader.start();
    fetchResult.refreshResult.reject(new Error('some-error'));
    await Promise.allSettled([fetchResult.refreshResult]);

    // then
    expect(follower1.notifyFetchUidCanceled).to.be.calledWith({reason: 'error'});
    expect(follower2.notifyFetchUidCanceled).to.be.calledWith({reason: 'error'});
  });

  [
    ['failed', promise => promise.reject(new Error('some error'))],
    ['skipped', promise => promise.resolve({})],
    ['refreshed', promise => promise.resolve({refreshedResponse: new RefreshedResponse({universal_uid: 'resolved'})})]
  ].forEach(([descr, resolve]) => {
    it(`should schedule refresh uid when in progress and execute when previous is done (${descr})`, async () => {

      // given
      leader.addFollower(follower1);
      leader.addFollower(follower2);
      const fetchResult = {
        refreshResult: sinon.promise()
      };
      uidFetcher.getId.returns(fetchResult);

      // when
      leader.start();

      // then
      expect(uidFetcher.getId).to.be.calledWith([
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 1,
          role: 'leader'
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 1,
          role: 'follower'
        }], false);

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
      resolve(fetchResult.refreshResult);

      return Promise.allSettled([fetchResult.refreshResult]).then(() => {
        // then
        expect(consentManager.resetConsentData).to.be.calledWith(true);
        expect(uidFetcher.getId).to.be.calledWith([
          {
            ...follower1FetchIdData,
            integrationId: follower1Id,
            requestCount: 2,
            role: 'leader'
          },
          {
            ...follower2FetchIdData,
            integrationId: follower2Id,
            requestCount: 2,
            role: 'follower'
          }], true);

      });
    });
  });

  it('should refresh uid', function () {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);
    uidFetcher.getId.returns({
      cachedResponse: {
        timestamp: Date.now(),
        response: {
          universal_uid: '124',
          signature: '1223'
        }
      },
      refreshResult: Promise.resolve({})
    });

    // when
    leader.refreshUid();

    // then
    expect(consentManager.resetConsentData).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledWith([
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1,
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
      }], false);
  });

  [true, false, undefined].forEach(forceAllowLocalStorageGrant => {
    it(`should refresh uid and reset consent if required forceAllowLocalStorageGrant=${forceAllowLocalStorageGrant}`, function () {

      // given
      leader.addFollower(follower1);
      leader.addFollower(follower2);
      uidFetcher.getId.returns({
        cachedResponse: {
          timestamp: Date.now(),
          response: {
            universal_uid: '124',
            signature: '1223'
          }
        },
        refreshResult: Promise.resolve({})
      });

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
          role: 'leader'
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 1,
          role: 'follower'
        }], false);
    });
  });

  it('should refresh uid with force fetch', function () {
    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);
    uidFetcher.getId.returns({
      cachedResponse: {
        timestamp: Date.now(),
        response: {
          universal_uid: '124',
          signature: '1223'
        }
      },
      refreshResult: Promise.resolve({})
    });

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
        role: 'leader'
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1,
        role: 'follower'
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
    leader.updateFetchIdData(follower2Id, {updated: 'data'});

    // then
    expect(follower2.updateFetchIdData).to.be.calledWith({updated: 'data'});
    expect(follower1.updateFetchIdData).to.not.be.called;
  });

  it('should notify about cascade eligible follower if needed', async () => {
    // given
    localStorageGrant.isDefinitivelyAllowed.returns(true);
    const consentData = new ConsentData();
    consentData.gdprApplies = true;
    consentData.consentString = 'gdprConsentString';
    consentData.gppData = {
      gppString: "GPP_STRING",
      applicableSections: [7, 8]
    }

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

    const fetchResult = {
      refreshResult: sinon.promise()
    };
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
    fetchResult.refreshResult.resolve(refreshResult);
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
      gppString: "GPP_STRING",
      gppSid: "7,8"
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

    const fetchResult = {
      refreshResult: sinon.promise()
    };
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
    fetchResult.refreshResult.resolve(refreshResult);
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
    expect(follower3.notifyCascadeNeeded).to.have.not. been.called;
  });

  it('should NOT notify about cascade if response is from cache', function () {
    // given
    localStorageGrant.isDefinitivelyAllowed.returns(true);
    const consentData = new ConsentData();
    consentData.gdprApplies = true;
    consentData.consentString = 'gdprConsentString';

    leader.addFollower(follower1);
    const cachedResponse = new CachedResponse({
      universal_uid: 'id5-uid',
      cascade_needed: true
    });
    uidFetcher.getId.returns({
      cachedResponse: cachedResponse,
      refreshResult: Promise.resolve({})
    });
    // when
    leader.start();

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
    const fetchResult = {
      refreshResult: Promise.resolve({refreshedResponse: refreshedResponse})
    };
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
    const fetchResult = {
      refreshResult: Promise.resolve({
        refreshedResponse: refreshedResponse,
        consentData: consentData
      })
    };
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
