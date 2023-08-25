import * as chai from 'chai';
import {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {CrossInstanceMessenger, MethodCallTarget, ProxyMethodCallMessage} from '../../src/messaging.js';
import {AwaitedLeader, LeaderApi, LeaderProxy} from '../../src/leader.js';

chai.use(sinonChai);

describe('LeaderProxy', function () {
  /**
   * @type CrossInstanceMessenger
   */
  let messenger;
  /**
   * @type LeaderProxy
   */
  let leaderProxy;
  const leaderId = 'LEADER_ID';

  beforeEach(function () {
    messenger = sinon.createStubInstance(CrossInstanceMessenger);
    leaderProxy = new LeaderProxy(messenger, leaderId);
  });

  it('should sent message to call consnetData', function () {
    // given
    const consentData = sinon.stub();

    // when
    leaderProxy.updateConsent(consentData);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, MethodCallTarget.LEADER, 'updateConsent', [consentData]);
  });

  it('should sent message to call refreshUid', function () {
    // given
    const forceFetch = sinon.stub();

    // when
    leaderProxy.refreshUid(forceFetch);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, MethodCallTarget.LEADER,'refreshUid', [forceFetch]);
  });

  it('should sent message to call fetchDataUpdate', function () {
    // given
    const fetchData = sinon.stub();

    // when
    leaderProxy.updateFetchIdData('id', fetchData);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(leaderId, MethodCallTarget.LEADER,'updateFetchIdData', ['id', fetchData]);
  });
});

describe('AwaitedLeader', function () {

  it('should buffer called method and call them when leader change', function () {
    // given
    const consentData = sinon.stub();
    const fetchData = sinon.stub();
    const refreshOptions = sinon.stub();

    const  awaitedLeader = new AwaitedLeader();
    const  newLeader = sinon.createStubInstance(LeaderApi);

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
