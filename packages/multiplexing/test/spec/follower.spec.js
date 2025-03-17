import sinon from 'sinon';
import {CrossInstanceMessenger, ProxyMethodCallTarget} from '../../src/messaging.js';
import {DirectFollower, Follower, FollowerCallType, ProxyFollower} from '../../src/follower.js';
import {DiscoveredInstance, Properties} from '../../src/instanceCore.js';
import {ApiEvent, ApiEventsDispatcher} from '../../src/events.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {MeterRegistry, Timer} from '@id5io/diagnostics';

const properties = new Properties('id', 'verison', 'source', 'sourceVersion', {}, window.location);
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
    const context = sinon.stub();
    // when
    proxyFollower.notifyUidReady(uid, context);

    // then
    expect(messenger.callProxyMethod).to.have.been.calledWith(properties.id, ProxyMethodCallTarget.FOLLOWER, 'notifyUidReady', [uid, context]);
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
    follower = new Follower(FollowerCallType.POST_MESSAGE, window, properties);
  });

  it('should return properties id', function () {
    expect(follower.getId()).to.be.eq(properties.id);
  });

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

  it('should return window', function () {
    // when/then
    expect(follower.getWindow()).to.be.eql(window);
  });

  [undefined, true, false].forEach(canDoCascade => {
    it(`should tell if handle cascade canDoCascade=${canDoCascade}`, function () {
      // given
      properties.canDoCascade = canDoCascade;
      //
      expect(follower.canDoCascade()).to.be.eq(canDoCascade === true);
    });
  });

  it('should update fetch id data', function () {
    // given
    properties.fetchIdData = {
      partnerId: 1,
      pd: 'pd'
    };

    // when
    follower.updateFetchIdData({
      pd: 'updatedPd',
      segments: ['seg1']
    });

    // then
    expect(follower.getFetchIdData()).to.be.eql({
      partnerId: 1,
      pd: 'updatedPd',
      segments: ['seg1']
    });
  });

  [
    ['similar - only partnerId',
      {partnerId: 1},
      {partnerId: 1},
      true
    ],
    ['similar - partnerId and pd',
      {partnerId: 1, pd: 'a'},
      {partnerId: 1, pd: 'a'},
      true
    ],
    ['similar - partnerId and att',
      {partnerId: 1, att: 2},
      {partnerId: 1, att: 2},
      true
    ],
    ['similar - partnerId and provider',
      {partnerId: 1, provider: 'provider'},
      {partnerId: 1, provider: 'provider'},
      true
    ],
    ['similar - partnerId and abTesting',
      {partnerId: 1, abTesting: {enabled: true, controlGroupPct: 0.8}},
      {partnerId: 1, abTesting: {enabled: true, controlGroupPct: 0.8}},
      true
    ],
    ['similar - partnerId and segments',
      {partnerId: 1, segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}]},
      {partnerId: 1, segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}]},
      true
    ],
    ['similar - partnerId and refresh time',
      {partnerId: 1, providedRefreshInSeconds: 7200},
      {partnerId: 1, providedRefreshInSeconds: 7200},
      true
    ],
    ['similar - all',
      {
        partnerId: 1,
        pd: 'a',
        att: 2,
        provider: 'provider',
        abTesting: {enabled: true, controlGroupPct: 0.8},
        segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}],
        providedRefreshInSeconds: 7200
      },
      {
        partnerId: 1,
        pd: 'a',
        att: 2,
        provider: 'provider',
        abTesting: {enabled: true, controlGroupPct: 0.8},
        segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}],
        providedRefreshInSeconds: 7200
      },
      true
    ],
    ['different - partnerId',
      {partnerId: 1},
      {partnerId: 2},
      false
    ],
    ['different - partnerId missing',
      {partnerId: 1},
      {},
      false
    ],
    ['different - pd',
      {partnerId: 1, pd: 'a'},
      {partnerId: 1, pd: 'aa'},
      false
    ],
    ['different - pd missing',
      {partnerId: 1, pd: 'a'},
      {partnerId: 1},
      false
    ],
    ['different - att',
      {partnerId: 1, att: 2},
      {partnerId: 1, att: 22},
      false
    ],
    ['different - att missing',
      {partnerId: 1, att: 2},
      {partnerId: 1},
      false
    ],
    ['different - provider',
      {partnerId: 1, provider: 'provider'},
      {partnerId: 1, provider: 'provider2'},
      false
    ],
    ['different - provider missing',
      {partnerId: 1, provider: 'provider'},
      {partnerId: 1},
      false
    ],
    ['different - abTesting',
      {partnerId: 1, abTesting: {enabled: true, controlGroupPct: 0.8}},
      {partnerId: 1, abTesting: {enabled: true, controlGroupPct: 0.7}},
      false
    ],
    ['different - abTesting missing',
      {partnerId: 1, abTesting: {enabled: true, controlGroupPct: 0.8}},
      {partnerId: 1},
      false
    ],
    ['different - segments',
      {partnerId: 1, segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}]},
      {partnerId: 1, segments: [{destination: '22', ids: ['abc']}, {destination: '24', ids: ['a', 'b', 'c']}]},
      false
    ],
    ['different - segments missing',
      {partnerId: 1, segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}]},
      {partnerId: 1},
      false
    ],
    ['different - refresh time',
      {partnerId: 1, providedRefreshInSeconds: 7200},
      {partnerId: 1, providedRefreshInSeconds: 3600},
      false
    ],
    ['different - refresh time missing',
      {partnerId: 1, providedRefreshInSeconds: 7200},
      {partnerId: 1},
      false
    ],
    ['different - all vs none',
      {
        partnerId: 1,
        pd: 'a',
        att: 2,
        provider: 'provider',
        abTesting: {enabled: true, controlGroupPct: 0.8},
        segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}],
        providedRefreshInSeconds: 7200
      },
      {},
      false
    ]
  ].forEach(([descr, aData, bData, expectedResult]) => {

    it(`should generate cacheId - ${descr}`, function () {
      // given
      let followerA = new DirectFollower(window, {
        id: 'a',
        fetchIdData: aData
      }, sinon.stub());
      let followerB = new ProxyFollower(new DiscoveredInstance({
        id: 'b',
        fetchIdData: bData
      }, sinon.stub(), sinon.stub()), sinon.stub());

      // when
      const cacheIdA = followerA.getCacheId();
      const cacheIdB = followerB.getCacheId();

      // then
      expect(cacheIdA).to.not.be.undefined;
      expect(typeof cacheIdA).to.be.eq('string');
      expect(cacheIdA.length).to.be.greaterThan(0);

      expect(cacheIdB).to.not.be.undefined;
      expect(typeof cacheIdB).to.be.eq('string');
      expect(cacheIdB.length).to.be.greaterThan(0);

      expect(cacheIdB === cacheIdA).to.be.eq(expectedResult);
    });
  });
});


describe('DirectFollower', () => {
  let follower;
  let dispatcher;
  /** @type {MeterRegistry}*/
  let metrics;
  let nowStub;
  beforeEach(() => {
    dispatcher = new ApiEventsDispatcher();
    metrics = sinon.createStubInstance(MeterRegistry);
    follower = new DirectFollower(window, properties, dispatcher, NO_OP_LOGGER, metrics);
    nowStub = sinon.stub(performance, 'now');
  });

  afterEach(() => {
    nowStub.restore();
  });

  it('should emit event when notifyUidReady', function () {
    // given
    /** @type {Id5UserId} */
    const uid = {
      responseObj: {universal_uid: 'ID5*xyz'}
    };

    /** @type NotificationContext*/
    const context = {
      provisioner: 'leader'
    };

    const uidReadyCallBack = sinon.stub();
    dispatcher.on(ApiEvent.USER_ID_READY, uidReadyCallBack);

    // when
    follower.notifyUidReady(uid, context);

    //then
    expect(uidReadyCallBack).to.be.calledWith(uid, context);
  });

  it('should deduplicate provisioned uids ', function () {
    // given
    const duplicateTimer = sinon.createStubInstance(Timer);
    metrics.timer.withArgs('userid.provisioning.duplicate', {
      firstProvisioner: 'self',
      provisioner: 'leader'
    }).returns(duplicateTimer);
    const uidReadyCallBack = sinon.stub();
    /** @type {Id5UserId} */
    const uid = {
      responseObj: {universal_uid: 'ID5*xyz'}
    };

    /** @type NotificationContext*/
    const context = {
      provisioner: 'self'
    };

    dispatcher.on(ApiEvent.USER_ID_READY, uidReadyCallBack);

    // when
    nowStub.returns(1);
    follower.notifyUidReady(uid, context);

    //then
    expect(uidReadyCallBack).to.be.called;

    // when
    nowStub.returns(10);
    follower.notifyUidReady(uid, {
      provisioner: 'leader'
    });

    //then
    expect(uidReadyCallBack).to.be.calledOnce;
    expect(duplicateTimer.record).to.be.calledWith(9);
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
