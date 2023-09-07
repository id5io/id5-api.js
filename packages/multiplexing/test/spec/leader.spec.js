import * as chai from 'chai';
import {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {CrossInstanceMessenger, ProxyMethodCallTarget} from '../../src/messaging.js';
import {AwaitedLeader, ActualLeader, Leader, ProxyLeader} from '../../src/leader.js';
import {UidFetcher} from "../../src/fetch.js";
import {API_TYPE, ApiEvent, ConsentData, ConsentManagement, NoopLogger} from '../../src/index.js';
import {Follower} from '../../src/follower.js';
import {Properties} from "../../src/instance.js";
import {Id5CommonMetrics} from "@id5io/diagnostics";

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

    // when
    awaitedLeader.updateConsent(consentData);
    awaitedLeader.refreshUid(refreshOptions);
    awaitedLeader.updateFetchIdData('1', fetchData);
    awaitedLeader.assignLeader(newLeader);
    awaitedLeader.addFollower(follower);

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
    awaitedLeader.addFollower(follower);

    // then
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
    leader = new ActualLeader(uidFetcher, consentManager, leaderProperties, sinon.createStubInstance(Id5CommonMetrics), NoopLogger);
  });

  it('should getId on start and notify followers when uid ready', function () {

    // given
    const uid = sinon.stub();
    leader.addFollower(follower1);
    leader.addFollower(follower2);

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
    leader.addFollower(follower1);
    leader.addFollower(follower2);

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

  it('should refresh uid ', function () {

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
        integrationId: follower1Id
      },
      {
        ...follower2FetchIdData,
        integrationId: follower2Id
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
          integrationId: follower1Id
        },
        {
          ...follower2FetchIdData,
          integrationId: follower2Id
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

  it('should update consent data and measure change', function () {
    // given
    const consentData = Object.assign(new ConsentData(), {
      api: API_TYPE.TCF_V2,
      consentString: 'string',
    });

    const consentStringChagedData = Object.assign(new ConsentData(), {
      api: API_TYPE.TCF_V2,
      consentString: 'new-string'
    });

    const apiChangedConsentData = Object.assign(new ConsentData(), {
      api: API_TYPE.USP_V1,
      consentString: 'new-string',
      ccpaString: 'ccpa'
    });

    const metrics = leader._metrics;

    // when
    leader.updateConsent(consentData);

    // then
    expect(consentManager.setConsentData).to.be.calledWith(consentData);
    expect(metrics.consentChangeCounter).have.not.been.called;

    // when
    leader.updateConsent(consentStringChagedData);

    // then
    expect(consentManager.setConsentData).to.be.calledWith(consentStringChagedData);
    expect(metrics.consentChangeCounter).have.been.calledWith({
      apiChanged: false,
      consentStringChanged: true,
      usPrivacyChanged: false
    });

    // when
    metrics.consentChangeCounter.reset();
    leader.updateConsent(consentStringChagedData);

    // then
    expect(consentManager.setConsentData).to.be.calledWith(consentStringChagedData);
    expect(metrics.consentChangeCounter).have.not.been.called;

    // when
    metrics.consentChangeCounter.reset();
    leader.updateConsent(apiChangedConsentData);

    // then
    expect(consentManager.setConsentData).to.be.calledWith(consentStringChagedData);
    expect(metrics.consentChangeCounter).have.been.calledWith({
      apiChanged: true,
      consentStringChanged: false,
      usPrivacyChanged: true
    });

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
