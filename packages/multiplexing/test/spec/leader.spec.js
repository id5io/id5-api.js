import * as chai from 'chai';
import {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {CrossInstanceMessenger, ProxyMethodCallTarget} from '../../src/messaging.js';
import {AwaitedLeader, ActualLeader, Leader, ProxyLeader} from '../../src/leader.js';
import {UidFetcher} from "../../src/fetch.js";
import {ApiEvent, ConsentManagement, NoopLogger} from '../../src/index.js';
import {Follower} from '../../src/follower.js';

chai.use(sinonChai);

describe('ProxyLeader', function () {
  /**
   * @type CrossInstanceMessenger
   */
  let messenger;
  /**
   * @type ProxyLeader
   */
  let leaderProxy;
  const leaderId = 'LEADER_ID';

  beforeEach(function () {
    messenger = sinon.createStubInstance(CrossInstanceMessenger);
    leaderProxy = new ProxyLeader(messenger, leaderId);
  });

  it('should sent message to call consnetData', function () {
    // given
    const consentData = sinon.stub();

    // when
    leaderProxy.updateConsent(consentData);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'updateConsent', [consentData]);
  });

  it('should sent message to call refreshUid', function () {
    // given
    const forceFetch = sinon.stub();

    // when
    leaderProxy.refreshUid(forceFetch);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'refreshUid', [forceFetch]);
  });

  it('should sent message to call fetchDataUpdate', function () {
    // given
    const fetchData = sinon.stub();

    // when
    leaderProxy.updateFetchIdData('id', fetchData);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, ProxyMethodCallTarget.LEADER, 'updateFetchIdData', ['id', fetchData]);
  });
});

describe('AwaitedLeader', function () {

  it('should buffer called method and call them when leader change', function () {
    // given
    const consentData = sinon.stub();
    const fetchData = sinon.stub();
    const refreshOptions = sinon.stub();

    const awaitedLeader = new AwaitedLeader();
    const newLeader = sinon.createStubInstance(Leader);

    // when
    awaitedLeader.updateConsent(consentData);
    awaitedLeader.refreshUid(refreshOptions);
    awaitedLeader.updateFetchIdData('1', fetchData);
    awaitedLeader.onLeaderChange(newLeader);

    // then
    expect(newLeader.updateConsent).to.have.been.calledWith(consentData);
    expect(newLeader.updateConsent).to.have.been.calledBefore(newLeader.refreshUid);
    expect(newLeader.refreshUid).to.have.been.calledWith(refreshOptions);
    expect(newLeader.refreshUid).to.have.been.calledBefore(newLeader.updateFetchIdData);
    expect(newLeader.updateFetchIdData).to.have.been.calledWith('1', fetchData);
  });
});

describe('ActualLeader', () => {
  /**
   * @type {UidFetcher}
   */
  let uidFetcher;
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

  beforeEach(() => {
    uidFetcher = sinon.createStubInstance(UidFetcher);
    consentManager = sinon.createStubInstance(ConsentManagement);
    follower1 = sinon.createStubInstance(Follower);
    follower1.getId.returns(follower1Id);
    follower1.getFetchIdData.returns(follower1FetchIdData);
    follower2 = sinon.createStubInstance(Follower);
    follower2.getId.returns(follower2Id);
    follower2.getFetchIdData.returns(follower2FetchIdData);
    follower3 = sinon.createStubInstance(Follower);
    follower3.getId.returns(follower3Id);
    follower3.getFetchIdData.returns(follower3FetchIdData);
    leader = new ActualLeader(uidFetcher, consentManager, [follower1, follower2], NoopLogger);
  });

  it('should getId on start and notify followers when uid ready', function () {

    // given
    const uid = sinon.stub();

    // when
    leader.start();

    // then
    expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id
      }], false);

    // when
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, uid);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);
  });

  it('should notify late joiners when uid already received and include them for other updates', function () {

    // given
    const uid = sinon.stub();

    // when
    leader._dispatcher.emit(ApiEvent.USER_ID_READY, uid);

    // then
    expect(follower1.notifyUidReady).to.be.calledWith(uid);
    expect(follower2.notifyUidReady).to.be.calledWith(uid);

    // when
    leader.addFollower(follower3);

    // then
    expect(follower3.notifyUidReady).to.be.calledWith(uid);

    // when
    leader.refreshUid();

    // then
    expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id
      },
      {
        ...follower3FetchIdData,
        integrationId: follower3Id
      }], false);
  });

  it('should notify followers when uid canceled', function () {

    // given
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

  it('should refresh uid ', function () {

    // when
    leader.refreshUid();

    // then
    expect(consentManager.resetConsentData).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id
      }], false);
  });

  [true, false, undefined].forEach(forceAllowLocalStorageGrant => {
    it(`should refresh uid and reset consent if required forceAllowLocalStorageGrant=${forceAllowLocalStorageGrant}`, function () {

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
          integrationId: follower1Id
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id
        }], false);
    });
  });

  it('should refresh uid with force fetch', function () {
    // when
    leader.refreshUid({
      forceFetch: true
    });

    // then
    expect(consentManager.resetConsentData).to.not.be.called;
    expect(uidFetcher.getId).to.be.calledWith(leader._dispatcher, [
      {
        ...follower1FetchIdData,
        integrationId: follower1Id
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id
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

  it('should update follower data', function () {
    // when
    leader.updateFetchIdData(follower2Id, {updated: 'data'})
    leader.refreshUid();

    // then
    expect(follower2.updateFetchIdData).to.be.calledWith({updated: 'data'});
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

    leader = new ActualLeader(uidFetcher, consentManager, [follower1, follower2, follower3]);
    const cascade = sinon.stub();

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

});
