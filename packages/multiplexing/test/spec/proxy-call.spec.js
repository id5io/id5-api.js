import {
  CrossInstanceMessenger,
  ProxyMethodCallHandler,
  ProxyMethodCallMessage,
  ProxyMethodCallTarget
} from '../../src/messaging.js';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chai, {expect} from 'chai';
import {Follower, ProxyFollower} from "../../src/follower.js";
import {DiscoveredInstance, Properties} from '../../src/instance.js';
import {Leader, ProxyLeader} from "../../src/leader.js";

chai.use(sinonChai);


function pcmMessagesReceived(receiver, expectedCount) {
  return new Promise((resolve, reject) => {
    const messages = [];
    receiver.onMessage(ProxyMethodCallMessage.TYPE, msg => {
      messages.push(msg);
      if (messages.length === expectedCount) {
        resolve();
      }
    });
  });
}

describe('Proxy Method Call', function () {

  it('Proxy follower calls', function () {

    // given
    const callerId = 'leader';
    const targetId = 'follower';
    const callerMessenger = new CrossInstanceMessenger(callerId, window);
    const targetFollowerMessenger = new CrossInstanceMessenger(targetId, window);

    const properties = new Properties(targetId, 'v', 's', 'sv', {}, {});
    const targetFollower = sinon.createStubInstance(Follower);
    targetFollowerMessenger.onProxyMethodCall(
      new ProxyMethodCallHandler()
        .registerTarget(ProxyMethodCallTarget.FOLLOWER, targetFollower)
    )

    const proxyFollower = new ProxyFollower(new DiscoveredInstance(properties, undefined, window), callerMessenger);

    // when
    proxyFollower.notifyCascadeNeeded({cascade: 'something'});
    proxyFollower.notifyFetchUidCanceled({cancel: 'reason'});
    proxyFollower.notifyUidReady({uid: 'id'});

    // then
    return pcmMessagesReceived(targetFollowerMessenger, 3).then(() => {
      expect(targetFollower.notifyCascadeNeeded).has.been.calledWith({cascade: 'something'});
      expect(targetFollower.notifyFetchUidCanceled).has.been.calledWith({cancel: 'reason'});
      expect(targetFollower.notifyUidReady).has.been.calledWith({uid: 'id'});
    });
  });

  it('Proxy leader calls', function () {
// given
    const callerId = 'follower';
    const targetId = 'leader';
    const callerMessenger = new CrossInstanceMessenger(callerId, window);
    const targetLeaderMessenger = new CrossInstanceMessenger(targetId, window);

    const targetLeader = sinon.createStubInstance(Leader);
    targetLeaderMessenger.onProxyMethodCall(
      new ProxyMethodCallHandler()
        .registerTarget(ProxyMethodCallTarget.LEADER, targetLeader)
    );

    const proxyLeader = new ProxyLeader(callerMessenger, targetId);

    // when
    proxyLeader.refreshUid({refresh: 'options'});
    proxyLeader.updateConsent({consent: 'updated'});
    proxyLeader.updateFetchIdData({instance: 'id'}, {fetch: 'id_data'});

    // then
    return pcmMessagesReceived(targetLeaderMessenger, 3).then(() => {
      expect(targetLeader.refreshUid).has.been.calledWith({refresh: 'options'});
      expect(targetLeader.updateConsent).has.been.calledWith({consent: 'updated'});
      expect(targetLeader.updateFetchIdData).has.been.calledWith({instance: 'id'}, {fetch: 'id_data'});
    });
  });
});
