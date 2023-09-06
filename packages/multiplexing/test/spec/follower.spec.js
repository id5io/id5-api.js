import * as chai from 'chai';
import {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {CrossInstanceMessenger, ProxyMethodCallTarget} from '../../src/messaging.js';
import {DirectFollower, Follower, ProxyFollower} from '../../src/follower.js';
import {DiscoveredInstance, Properties} from '../../src/instance.js';
import {ApiEvent, ApiEventsDispatcher} from '../../src/apiEvent.js';

chai.use(sinonChai);

const properties = new Properties('id', 'verison', 'source', 'sourceVersion', {}, window.location)
describe('ProxyFollower', function () {
  /**
   * @type CrossInstanceMessenger
   */
  let messenger;
  /**
   * @type ProxyFollower
   */
  let proxyFollower;

  beforeEach(function () {
    messenger = sinon.createStubInstance(CrossInstanceMessenger);
    proxyFollower = new ProxyFollower(new DiscoveredInstance(properties, window), messenger);
  });

  it('should sent message to call notifyUidReady', function () {
    // given
    const uid = sinon.stub();

    // when
    proxyFollower.notifyUidReady(uid);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(properties.id, ProxyMethodCallTarget.FOLLOWER, 'notifyUidReady', [uid]);
  });

  it('should sent message to call notifyFetchUidCanceled', function () {
    // given
    const cancel = sinon.stub();

    // when
    proxyFollower.notifyFetchUidCanceled(cancel);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(properties.id, ProxyMethodCallTarget.FOLLOWER, 'notifyFetchUidCanceled', [cancel]);
  });

  it('should sent message to call notifyCascadeNeeded', function () {
    // given
    const cascade = sinon.stub();

    // when
    proxyFollower.notifyCascadeNeeded(cascade);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(properties.id, ProxyMethodCallTarget.FOLLOWER, 'notifyCascadeNeeded', [cascade]);
  });
});


describe('Follower', function () {

  /**
   * @type {Follower}
   */
  let follower;
  beforeEach(() => {
    follower = new Follower(properties);
  })

  it('should return properties id', function () {
    expect(follower.getId()).to.be.eq(properties.id);
  })

  it('should return fetchId data', function () {
    // given
    properties.fetchIdData = {
      partnerId: 11,
      pd: 'pd'
    };

    // when
    expect(follower.getFetchIdData()).to.be.eql({
      partnerId: 11,
      pd: 'pd'
    });
  });


  [undefined, true, false].forEach(canDoCascade => {
    it(`should tell if handle cascade canDoCascade=${canDoCascade}, same partner`, function () {
      // given
      properties.canDoCascade = canDoCascade;
      properties.fetchIdData = {
        partnerId: 1
      };
      const cascade = {
        partnerId: 1
      };
      //
      expect(follower.canDoCascade(cascade)).to.be.eq(canDoCascade === true);
    });

    it(`should tell if handle cascade canDoCascade=${canDoCascade}, different partner`, function () {
      // given
      properties.canDoCascade = canDoCascade;
      properties.fetchIdData = {
        partnerId: 1
      };
      const cascade = {
        partnerId: 2
      };
      //
      expect(follower.canDoCascade(cascade)).to.be.eq(false);
    });
  });

  it('should update fetch id data', function () {
    // given
    properties.fetchIdData = {
      partnerId: 1,
      pd: 'pd'
    }

    // when
    follower.updateFetchIdData({
      pd: 'updatedPd',
      segments: ['seg1']
    })

    // then
    expect(follower.getFetchIdData()).to.be.eql({
      partnerId: 1,
      pd: 'updatedPd',
      segments: ['seg1']
    });
  });
});


describe('DirectFollower', () => {
  let follower;
  let dispatcher;
  beforeEach(() => {
    dispatcher = new ApiEventsDispatcher();
    follower = new DirectFollower(properties, dispatcher);
  });
  it('should emit event when notifyUidReady', function (done) {
    // given
    const uid = sinon.stub();

    dispatcher.on(ApiEvent.USER_ID_READY, received => {
      expect(received).to.be.eql(uid);
      done();
    });

    // when
    follower.notifyUidReady(uid);

  });

  it('should emit event when notifyFetchUidCanceled', function (done) {
    // given
    const cancel = sinon.stub();

    dispatcher.on(ApiEvent.USER_ID_FETCH_CANCELED, received => {
      expect(received).to.be.eql(cancel);
      done();
    });

    // when
    follower.notifyFetchUidCanceled(cancel);
  });

  it('should emit event when notifyCascadeNeeded', function (done) {
    // given
    const cascade = sinon.stub();

    dispatcher.on(ApiEvent.CASCADE_NEEDED, received => {
      expect(received).to.be.eql(cascade);
      done();
    });

    // when
    follower.notifyCascadeNeeded(cascade);
  });
});
