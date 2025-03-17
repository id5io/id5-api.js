import {
  CrossInstanceMessenger,
  ProxyMethodCallHandler,
  ProxyMethodCallMessage,
  ProxyMethodCallTarget
} from '../../src/messaging.js';
import sinon from 'sinon';
import {Follower, ProxyFollower, ProxyStorage} from '../../src/follower.js';
import {DiscoveredInstance, Properties} from '../../src/instanceCore.js';
import {Leader, ProxyLeader} from '../../src/leader.js';
import {StorageApi} from '../../src/localStorage.js';

function pcmMessagesReceived(receiver, expectedCount) {
  return new Promise((resolve) => {
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
    );

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

    const proxyLeader = new ProxyLeader(callerMessenger, {id: targetId});

    // when
    proxyLeader.refreshUid({refresh: 'legacy'});
    proxyLeader.refreshUid({refresh: 'options'}, 'requester-id');
    proxyLeader.updateConsent({consent: 'updated'});
    proxyLeader.updateFetchIdData({instance: 'id'}, {fetch: 'id_data'});

    // then
    return pcmMessagesReceived(targetLeaderMessenger, 4).then(() => {
      expect(targetLeader.refreshUid).has.been.calledWith({refresh: 'legacy'});
      expect(targetLeader.refreshUid).has.been.calledWith({refresh: 'options'}, 'requester-id');
      expect(targetLeader.updateConsent).has.been.calledWith({consent: 'updated'});
      expect(targetLeader.updateFetchIdData).has.been.calledWith({instance: 'id'}, {fetch: 'id_data'});
    });
  });

  it('Proxy storage calls', function () {

    // given
    const callerId = 'leader';
    const targetId = 'follower';
    const callerMessenger = new CrossInstanceMessenger(callerId, window);
    const targetMessenger = new CrossInstanceMessenger(targetId, window);

    const targetStorage = sinon.createStubInstance(StorageApi);
    targetMessenger.onProxyMethodCall(
      new ProxyMethodCallHandler().registerTarget(ProxyMethodCallTarget.STORAGE, targetStorage)
    );

    const proxyStorage = new ProxyStorage(callerMessenger, targetId);

    // when
    proxyStorage.setItem('key', 'value');
    proxyStorage.removeItem('key1');
    proxyStorage.getItem('key3');

    // then
    return pcmMessagesReceived(targetMessenger, 2).then(() => {
      expect(targetStorage.setItem).has.been.calledWith('key', 'value');
      expect(targetStorage.removeItem).has.been.calledWith('key1');
      // getItem is not called
    });
  });
});
