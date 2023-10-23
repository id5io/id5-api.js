import * as chai from 'chai';
import {expect} from 'chai';
import sinon, {stub} from 'sinon';
import sinonChai from 'sinon-chai';
import {CrossInstanceMessenger, ProxyMethodCallTarget} from '../../src/messaging.js';
import {AwaitedLeader, ActualLeader, Leader, ProxyLeader, AddFollowerResult} from '../../src/leader.js';
import {UidFetcher} from '../../src/fetch.js';
import {API_TYPE, ApiEvent, ConsentData, ConsentManagement, NoopLogger} from '../../src/index.js';
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

  let leaderProperties = new Properties('leaderId');

  const leaderWindow = window;

  beforeEach(() => {
    uidFetcher = sinon.createStubInstance(UidFetcher);
    consentManager = sinon.createStubInstance(ConsentManagement);
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

  it('should getId on start and notify followers when uid ready', function () {

    // given
    const uid = sinon.stub();

    // when
    let add1Result = leader.addFollower(follower1);
    let add2Result = leader.addFollower(follower2);

    // then
    expect(add1Result).to.be.eql(new AddFollowerResult());
    expect(add2Result).to.be.eql(new AddFollowerResult());

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1
      }], false);

    // when
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, uid);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);
  });

  it(`should notify late joiner when uid already received and don't trigger fetch when not required`, function () {

    // given
    const uid = {
      responseObj: sinon.stub(),
      timestamp: Date.now(),
      isFromCache: false
    };
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1
      }], false);

    // when
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, uid);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);

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
      ...uid,
      isFromCache: true
    });

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(leader._followers).contains(follower3);
  });

  it(`should add to queue refresh when different late joiner added and fetch is in progress - uid already provisioned`, function () {

    // given
    const uid = {
      responseObj: sinon.stub(),
      timestamp: Date.now(),
      isFromCache: false
    };
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1
      }], false);

    // when
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, uid); // uid already provisioned, fetch not completed (i.e. from cache but fetch is ongoing)

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);

    // when
    follower3.isSimilarTo.onFirstCall().returns(false);
    follower3.isSimilarTo.onSecondCall().returns(false);
    let result = leader.addFollower(follower3);

    // then
    expect(result).to.be.eql(new AddFollowerResult(true, true));
    expect(follower3.isSimilarTo).to.be.calledTwice;
    expect(follower3.isSimilarTo.firstCall).to.be.calledWith(follower1);
    expect(follower3.isSimilarTo.secondCall).to.be.calledWith(follower1);

    expect(follower3.notifyUidReady).to.be.calledWith({
      ...uid,
      isFromCache: true
    });

    expect(uidFetcher.getId).to.be.calledOnce;

    // when
    leader._dispatcher.emit(ApiEvent.USER_ID_FETCH_COMPLETED); // complete fetch

    // then
    expect(uidFetcher.getId).to.be.calledTwice;
    expect(uidFetcher.getId.secondCall).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 2
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 2
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id,
        requestCount: 1
      },
    ], true);

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();

    const updatedUid = stub();
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, updatedUid);
    leader._dispatcher.emit(ApiEvent.USER_ID_FETCH_COMPLETED);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower3.notifyUidReady).to.be.calledWith(updatedUid);
  });

  it(`should add to queue refresh when different late joiner added and fetch is in progress - no uid ready yet`, function () {

    // given
    const uid = sinon.stub();
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1
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
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, uid);
    leader._dispatcher.emit(ApiEvent.USER_ID_FETCH_COMPLETED);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);
    expect(follower3.notifyUidReady).to.be.calledWith(uid);


    // then
    expect(uidFetcher.getId).to.be.calledTwice;
    expect(uidFetcher.getId.secondCall).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 2
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 2
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id,
        requestCount: 1
      },
    ], true);

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();

    const updatedUid = stub();
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, updatedUid);
    leader._dispatcher.emit(ApiEvent.USER_ID_FETCH_COMPLETED);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower3.notifyUidReady).to.be.calledWith(updatedUid);
  });

  it(`should trigger fetch when different late joiner added`, function () {

    // given
    const uid = sinon.stub();
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledOnce;
    expect(uidFetcher.getId.firstCall).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1
      }], false);

    // when
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, uid);
    leader._dispatcher.emit(ApiEvent.USER_ID_FETCH_COMPLETED);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);

    // when
    follower3.isSimilarTo.onFirstCall().returns(false);
    follower3.isSimilarTo.onSecondCall().returns(false);
    let result = leader.addFollower(follower3);

    // then
    expect(result).to.be.eql(new AddFollowerResult(true, true));
    expect(follower3.isSimilarTo).to.be.calledTwice;
    expect(follower3.isSimilarTo.firstCall).to.be.calledWith(follower1);
    expect(follower3.isSimilarTo.secondCall).to.be.calledWith(follower1);

    expect(uidFetcher.getId).to.be.calledTwice;
    expect(uidFetcher.getId.secondCall).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 2
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 2
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id,
        requestCount: 1
      },
    ], true);

    // when
    follower1.notifyUidReady.reset();
    follower2.notifyUidReady.reset();

    const updatedUid = stub();
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, updatedUid);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower2.notifyUidReady).to.be.calledWith(updatedUid);
    expect(follower3.notifyUidReady).to.be.calledWith(updatedUid);
  });

  it(`should add follower's storage as replica if follower form different window`, function () {
    // given
    const otherWindow = sinon.stub();
    const follower1Storage = sinon.stub();
    const follower2Storage = sinon.stub();
    follower1.getWindow.reset();
    follower1.getWindow.returns(leaderWindow);
    follower1.getStorage.returns(follower1Storage)
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

  it('should notify followers when uid fetch canceled', function () {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    const dispatcher = leader._dispatcher;
    const cancel = {
      reason: 'no consent'
    };

    // when
    dispatcher.emit(ApiEvent.USER_ID_FETCH_CANCELED, cancel);

    // then
    expect(follower1.notifyFetchUidCanceled).to.be.calledWith(cancel);
    expect(follower2.notifyFetchUidCanceled).to.be.calledWith(cancel);
  });

  it('should notify followers when uid fetch failed', function () {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    const dispatcher = leader._dispatcher;

    // when
    dispatcher.emit(ApiEvent.USER_ID_FETCH_FAILED, new Error('some-error'));

    // then
    expect(follower1.notifyFetchUidCanceled).to.be.calledWith({reason: 'error'});
    expect(follower2.notifyFetchUidCanceled).to.be.calledWith({reason: 'error'});
  });

  [
    ApiEvent.USER_ID_FETCH_FAILED,
    ApiEvent.USER_ID_FETCH_CANCELED,
    ApiEvent.USER_ID_FETCH_COMPLETED
  ].forEach(event => {
    it(`should schedule refresh uid when in progress and execute when previous is done (${event})`, function () {

      // given
      const dispatcher = leader._dispatcher;
      leader.addFollower(follower1);
      leader.addFollower(follower2);

      // when
      leader.start();

      // then
      expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 1
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 1
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
      dispatcher.emit(event, {});

      // then
      expect(consentManager.resetConsentData).to.be.calledWith(true);
      expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 2
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 2
        }], true);
    });
  });

  it('should refresh uid', function () {

    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    // when
    leader.refreshUid();

    // then
    expect(consentManager.resetConsentData).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1
      }], false);
  });

  [true, false, undefined].forEach(forceAllowLocalStorageGrant => {
    it(`should refresh uid and reset consent if required forceAllowLocalStorageGrant=${forceAllowLocalStorageGrant}`, function () {

      // given
      leader.addFollower(follower1);
      leader.addFollower(follower2);

      // when
      leader.refreshUid({
        forceAllowLocalStorageGrant: forceAllowLocalStorageGrant,
        resetConsent: true
      });

      // then
      expect(consentManager.resetConsentData).to.be.calledWith(forceAllowLocalStorageGrant === true);
      expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
        {
          ...follower1FetchIdData,
          integrationId: follower1Id,
          requestCount: 1
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id,
          requestCount: 1
        }], false);
    });
  });

  it('should refresh uid with force fetch', function () {
    // given
    leader.addFollower(follower1);
    leader.addFollower(follower2);

    // when
    leader.refreshUid({
      forceFetch: true
    });

    // then
    expect(consentManager.resetConsentData).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id,
        requestCount: 1
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id,
        requestCount: 1
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
      consentString: 'string',
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
    leader.updateFetchIdData(follower2Id, {updated: 'data'})

    // then
    expect(follower2.updateFetchIdData).to.be.calledWith({updated: 'data'});
    expect(follower1.updateFetchIdData).to.not.be.called;
  });

  it('should notify about cascade if eligible follower present', function () {
    // given
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

    const cascade = sinon.stub();
    leader.addFollower(follower1);
    leader.addFollower(follower2);
    leader.addFollower(follower3);

    // when
    leader._dispatcher.emit(ApiEvent.CASCADE_NEEDED, cascade);

    // then
    expect(follower1.canDoCascade).to.have.been.calledWith(cascade);
    expect(follower1.notifyCascadeNeeded).to.have.not.been.called;
    expect(follower2.canDoCascade).to.have.been.calledWith(cascade);
    expect(follower2.notifyCascadeNeeded).to.have.not.been.called;
    expect(follower3.canDoCascade).to.have.been.calledWith(cascade);
    expect(follower3.notifyCascadeNeeded).to.have.been.calledWith(cascade);
  });

  it('should return properties when asked', function () {
    // when/then
    expect(leader.getProperties()).to.be.eq(leaderProperties);
  });
});
