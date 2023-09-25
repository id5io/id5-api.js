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
    ['similar - partnerId and liveIntentId',
      {partnerId: 1, liveIntentId: 'lid'},
      {partnerId: 1, liveIntentId: 'lid'},
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
        liveIntentId: 'lid',
        provider: 'provider',
        abTesting: {enabled: true, controlGroupPct: 0.8},
        segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}],
        providedRefreshInSeconds: 7200
      },
      {
        partnerId: 1,
        pd: 'a',
        att: 2,
        liveIntentId: 'lid',
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
    ['different - liveIntentId',
      {partnerId: 1, liveIntentId: 'lid'},
      {partnerId: 1, liveIntentId: 'lid2'},
      false
    ],
    ['different - liveIntentId missing',
      {partnerId: 1, liveIntentId: 'lid'},
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
        liveIntentId: 'lid',
        provider: 'provider',
        abTesting: {enabled: true, controlGroupPct: 0.8},
        segments: [{destination: '22', ids: ['abc']}, {destination: '23', ids: ['a', 'b', 'c']}],
        providedRefreshInSeconds: 7200
      },
      {},
      false
    ]
  ].forEach(([descr, aData, bData, expectedResult]) => {
    it(`should check if other is similar - ${descr}`, function () {
      // given
      let followerA = new Follower({
        id: 'a',
        fetchIdData: aData
      });
      let followerB = new Follower({
        id: 'b',
        fetchIdData: bData
      });

      // when
      const aToB = followerA.isSimilarTo(followerB);
      const bToA = followerB.isSimilarTo(followerA);

      // then
      expect(aToB).to.be.eq(expectedResult);
      expect(bToA).to.be.eq(expectedResult);
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
