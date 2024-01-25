import * as ID5Integration from '../../src/instance.js';
import sinon from 'sinon';
import {Id5CommonMetrics} from '@id5io/diagnostics';
import {NoopLogger} from '../../src/logger.js';
import {version} from '../../generated/version.js';
import {MultiplexingEvent} from '../../src/apiEvent.js';
import {StorageApi} from '../../src/localStorage.js';
import {ElectionState} from '../../src/instance.js';

/**
 * @param {ID5Integration.Instance} instance
 * @param {string} event
 */
function eventPromise(instance, event) {
  return new Promise((resolve) => {
    instance.on(event, (...args) => resolve(args));
  });
}

function instanceJoinedPromise(instance, expectedJoiner) {
  return new Promise((resolve) => {
    instance.on(MultiplexingEvent.ID5_INSTANCE_JOINED, joiner => {
      if (joiner.id === expectedJoiner.properties.id) {
        resolve(joiner);
      }
    });
  });
}

function instancesKnowEachOtherPromise(instanceA, instanceB) {
  const aJoinedB = instanceJoinedPromise(instanceB, instanceA);
  const bJoinedA = instanceJoinedPromise(instanceA, instanceB);
  return Promise.all([aJoinedB, bJoinedA]);
}

describe('Leader election', () => {

  it('should elect only instance', function () {
    // given
    let instance = new ID5Integration.Properties('a', '1.2.3', 'api', '1.0.26', {});

    // when
    let leader = ID5Integration.electLeader([instance]);

    // then
    expect(leader).is.eq(instance);
  });

  it('should elect newest instance', function () {
    // given
    let instanceA = new ID5Integration.Properties('a', '1.1.3', 'api', '1.0.26', {});
    let instanceB = new ID5Integration.Properties('b', '1.3.15', 'api', '1.0.31', {});
    let instanceC = new ID5Integration.Properties('c', '1.3.3', 'pbjs', '6.10.0', {});

    // when
    let leader = ID5Integration.electLeader([instanceA, instanceB, instanceC]);

    // then
    expect(leader).is.eq(instanceB);
  });

  it('should elect instance from newest source', function () {
    // given
    let instanceA = new ID5Integration.Properties('a', '1.1.3', 'api', '1.0.26', {});
    let instanceB = new ID5Integration.Properties('b', '1.1.3', 'api', '1.0.27', {});
    let instanceC = new ID5Integration.Properties('c', '1.1.3', 'api', '1.0.28', {});

    // when
    let leader = ID5Integration.electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceC);
  });

  it('should elect api instance', function () {
    // given
    let instanceA = new ID5Integration.Properties('a', '1.1.3', 'pbjs', '7.0.29', {});
    let instanceB = new ID5Integration.Properties('b', '1.1.3', 'api', '1.0.27', {});
    let instanceC = new ID5Integration.Properties('c', '1.1.3', 'pbjs', '7.0.28', {});

    // when
    let leader = ID5Integration.electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceB);
  });

  it('should elect lexicographically first instance', function () {
    // given
    let instanceA = new ID5Integration.Properties('a', '1.1.3', 'api', '1.0.26', {});
    let instanceB = new ID5Integration.Properties('b', '1.1.3', 'api', '1.0.26', {});
    let instanceC = new ID5Integration.Properties('c', '1.1.3', 'api', '1.0.26', {});

    // when
    let leader = ID5Integration.electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceA);
  });

  [
    null,
    undefined,
    []
  ].forEach(instances => {
    it(`should elect none of (${instances})`, () => {
      // when
      let leader = ID5Integration.electLeader(instances);

      // then
      expect(leader).is.eq(undefined);
    });
  });
});

function knownInstances(instance1) {
  return Array.from(instance1._knownInstances.values()).map(i => i.properties);
}

describe('ID5 instance', function () {
  let metrics;
  let createdInstances;
  let logger = NoopLogger; // for debug purposes assign console `let logger = console`
  let performanceNowStub;
  let createInstance = (source, sourceVersion, sourceConfig, fetchIdData, metrics) => {
    const instance = new ID5Integration.Instance(window, {
      source: source,
      sourceVersion: sourceVersion,
      sourceConfiguration: sourceConfig,
      fetchIdData: fetchIdData
    }, sinon.createStubInstance(StorageApi),  metrics, logger);
    createdInstances.push(instance);
    return instance;
  }

  beforeEach(function () {
    const now = performance.now();
    performanceNowStub = sinon.stub(performance, 'now').returns(now);
    createdInstances = [];
    metrics = new Id5CommonMetrics('api', '1');
  });
  afterEach(function () {
    createdInstances.forEach(instance => instance.deregister());
    performanceNowStub.restore();
  })

  it('should create instance ', function () {
    // when
    let instance = createInstance('api', '1.3.5', {some: 'property'}, {partnerId: 99}, metrics);

    // then
    const id = instance.properties.id;
    expect(instance.properties).is.eql({
      id,
      version: version,
      source: 'api',
      sourceVersion: '1.3.5',
      sourceConfiguration: {some: 'property'},
      fetchIdData: {partnerId: 99},
      href: window.location.href,
      domain: window.location.hostname
    });
    expect(instance.role).is.eq(ID5Integration.Role.UNKNOWN);
  });

  [
    [
      {
        singletonMode: true,
        fetchIdData: {
          partnerId: 11,
          pd: 'a1'
        }
      },
      {
        fetchIdData: {
          partnerId: 11,
          pd: 'a1'
        },
        singletonMode: true
      }
    ],
    [
      {
        source: 'newSource',
        sourceVersion: '3.5.8'
      },
      {
        source: 'newSource',
        sourceVersion: '3.5.8'
      }
    ],
    [
      {
        sourceConfiguration: {
          p1: '1',
          p2: 2
        }
      },
      {
        sourceConfiguration: {
          p1: '1',
          p2: 2
        }
      }
    ]
  ].forEach(([config, expectedOverride]) => {
    it(`should update instance configuration ${JSON.stringify(config)}`, function () {

      // given
      const initialConfig = {
        version: version,
        source: 'api',
        sourceVersion: '1.3.5',
        sourceConfiguration: {some: 'property'},
        fetchIdData: {partnerId: 99},
        href: window.location.href,
        domain: window.location.hostname
      }

      // when
      let instance = createInstance(initialConfig.source, initialConfig.sourceVersion, initialConfig.sourceConfiguration, initialConfig.fetchIdData, metrics);

      instance.updateConfig(config)

      // then
      const id = instance.properties.id;
      expect(instance.properties).is.eql({
        id,
        ...initialConfig,
        ...expectedOverride
      });
    });
  });

  it('registered instances should eventually know each other and elect the same leader', function (done) {
    // given
    let electionDelayMsec = 100;


    let unregisteredInstance = createInstance('api', '1', {}, {}, metrics);
    let instance1 = createInstance('api', '1', {}, {}, metrics);
    let instance2 = createInstance('api', '2', {}, {}, metrics);
    let instance3 = createInstance('api', '3', {}, {}, metrics);

    // when
    [instance1, instance2, instance3].forEach(instance => {
      expect(instance._election._state).is.eql(ElectionState.AWAITING_SCHEDULE);
      instance.init(electionDelayMsec);
      expect(instance._election._state).is.eql(ElectionState.SCHEDULED);
    });

    setTimeout(() => {
      // then
      let expectedLeader = instance3.properties;
      expect(instance1._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance1.role).is.eq(ID5Integration.Role.FOLLOWER);
      expect(instance1._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance1)).to.eql([instance2.properties, instance3.properties]);

      expect(instance2._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance2.role).is.eq(ID5Integration.Role.FOLLOWER);
      expect(instance2._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance2)).to.eql([instance1.properties, instance3.properties]);

      expect(instance3._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance3.role).is.eq(ID5Integration.Role.LEADER); // newest source version
      expect(instance3._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance3)).to.eql([instance1.properties, instance2.properties]);

      expect(unregisteredInstance.role).is.eq(ID5Integration.Role.UNKNOWN);
      expect(unregisteredInstance._leader.getProperties()).is.eq(undefined);
      expect(unregisteredInstance._knownInstances).to.have.length(0);
      done();
    }, electionDelayMsec + 50);
  });

  it('late joiner should join to party and follow earlier elected leader', async () => {
    // given
    let electionDelayMsec = 20;


    let instance1 = createInstance('api', '1', {}, {}, metrics);
    let instance2 = createInstance('api', '2', {}, {}, metrics);
    let lateJoiner = createInstance('api', '3', {}, {}, metrics);
    let expectedLeaderProperties = instance2.properties;

    let instance1Election = eventPromise(instance1, MultiplexingEvent.ID5_LEADER_ELECTED);
    let instance2Election = eventPromise(instance2, MultiplexingEvent.ID5_LEADER_ELECTED);
    let lateJoinerElection = eventPromise(lateJoiner, MultiplexingEvent.ID5_LEADER_ELECTED);
    // when
    instance1.init(electionDelayMsec);
    instance2.init(electionDelayMsec);

    return Promise.all([instance1Election, instance2Election])
      .then(() => {
        expect(instance1._election._state).is.eql(ElectionState.COMPLETED);
        expect(instance1.role).is.eq(ID5Integration.Role.FOLLOWER);
        expect(instance1._leader.getProperties()).is.eql(expectedLeaderProperties);
        expect(knownInstances(instance1)).to.eql([instance2.properties]);

        expect(instance2._election._state).is.eql(ElectionState.COMPLETED);
        expect(instance2.role).is.eq(ID5Integration.Role.LEADER);
        expect(instance2._leader.getProperties()).is.eql(expectedLeaderProperties);
        expect(knownInstances(instance2)).to.eql([instance1.properties]);

        expect(lateJoiner._election._state).is.eql(ElectionState.AWAITING_SCHEDULE);
        expect(lateJoiner.role).is.eq(ID5Integration.Role.UNKNOWN);
        expect(lateJoiner._leader.getProperties()).is.undefined;
        expect(knownInstances(lateJoiner)).to.eql([]);
        // when
        let allKnowsEachOther = Promise.all([instancesKnowEachOtherPromise(instance1, lateJoiner), instancesKnowEachOtherPromise(instance2, lateJoiner)]);

        const addFollowerSpy  = sinon.spy(instance2._leader, 'addFollower');
        lateJoiner.init(electionDelayMsec);
        expect(lateJoiner._election._state).is.eql(ElectionState.SCHEDULED);
        return Promise.all([lateJoinerElection, allKnowsEachOther])
          .then(() => {
            expect(instance1.role).is.eq(ID5Integration.Role.FOLLOWER);
            expect(instance1._leader.getProperties()).is.eql(expectedLeaderProperties);
            expect(knownInstances(instance1)).to.eql([instance2.properties, lateJoiner.properties]);
            expect(addFollowerSpy).has.been.called;
            expect(addFollowerSpy.firstCall.args[0]._instanceProperties).is.eql(lateJoiner.properties);

            expect(instance2.role).is.eq(ID5Integration.Role.LEADER);
            expect(instance2._leader.getProperties()).is.eql(expectedLeaderProperties);
            expect(knownInstances(instance2)).to.eql([instance1.properties, lateJoiner.properties]);

            expect(lateJoiner._election._state).is.eql(ElectionState.CANCELED);
            expect(lateJoiner.role).is.eq(ID5Integration.Role.FOLLOWER);
            expect(lateJoiner._leader.getProperties()).is.eql(expectedLeaderProperties);
            expect(knownInstances(lateJoiner)).to.eql([instance1.properties, instance2.properties]);
          });
      });
  });


  it('should call listeners when instance joined to party', function (done) {

    // given
    let instance1 = createInstance('api', '1', {}, {}, metrics);
    let instance2 = createInstance('api', '2', {}, {}, metrics);

    let firstCallback = sinon.stub();
    let failingCallback = sinon.stub().throws('BOOM!');
    let thirdCallback = sinon.stub();
    instance1.on(MultiplexingEvent.ID5_INSTANCE_JOINED, firstCallback);
    instance1.on(MultiplexingEvent.ID5_INSTANCE_JOINED, failingCallback);
    instance1.on(MultiplexingEvent.ID5_INSTANCE_JOINED, thirdCallback);

    // when
    instance1.init(100);
    instance2.init(100);

    setTimeout(() => {
      // then
      let expectedJoinedInstance = instance2.properties;
      let verifyCallback = callback => {
        expect(callback).to.have.been.calledOnce;
        expect(callback.firstCall.firstArg).to.be.eql(expectedJoinedInstance);
      }

      verifyCallback(firstCallback);
      verifyCallback(failingCallback);
      verifyCallback(thirdCallback);
      done();
    }, 150);
  });

  it('should call listeners when message received', function (done) {

    // given
    let instance1 = createInstance('api', '1', {}, {}, metrics);
    let instance2 = createInstance('api', '2', {}, {}, metrics);

    let firstCallback = sinon.stub();
    let failingCallback = sinon.stub().throws('BOOM!');
    let thirdCallback = sinon.stub();
    instance1.on(MultiplexingEvent.ID5_MESSAGE_RECEIVED, firstCallback);
    instance1.on(MultiplexingEvent.ID5_MESSAGE_RECEIVED, failingCallback);
    instance1.on(MultiplexingEvent.ID5_MESSAGE_RECEIVED, thirdCallback);

    // when
    instance1.init(100);
    instance2.init(100);


    setTimeout(() => {
      // then
      let verifyCallback = callback => {
        expect(callback).to.have.been.calledTwice; // HELLO message and instance1's HELLO response
        expect(callback.firstCall.firstArg.src).to.be.eql(instance2.properties.id);
        expect(callback.secondCall.firstArg.src).to.be.eql(instance2.properties.id);
      }

      verifyCallback(firstCallback);
      verifyCallback(failingCallback);
      verifyCallback(thirdCallback);

      done();
    }, 150);
  });

  it('should call listeners when leader elected', function (done) {

    // given
    let instance1 = createInstance('api', '1', {}, {}, metrics);
    let instance2 = createInstance('api', '2', {}, {}, metrics);

    let firstCallback = sinon.stub();
    let failingCallback = sinon.stub().throws('BOOM!');
    let thirdCallback = sinon.stub();
    instance1.on(MultiplexingEvent.ID5_LEADER_ELECTED, firstCallback);
    instance1.on(MultiplexingEvent.ID5_LEADER_ELECTED, failingCallback);
    instance1.on(MultiplexingEvent.ID5_LEADER_ELECTED, thirdCallback);

    let instance2Callback = sinon.stub();
    instance2.on(MultiplexingEvent.ID5_LEADER_ELECTED, instance2Callback);

    // when
    instance1.init(100);
    instance2.init(100);


    setTimeout(() => {
      // then
      let verifyCallback = (callback, expectedRole) => {
        let expectedLeader = instance2.properties;
        expect(callback).to.have.been.calledOnce;
        expect(callback.firstCall.args[0]).to.be.eql(expectedRole);
        expect(callback.firstCall.args[1]).to.be.eql(expectedLeader);
      }

      verifyCallback(firstCallback, ID5Integration.Role.FOLLOWER);
      verifyCallback(failingCallback, ID5Integration.Role.FOLLOWER);
      verifyCallback(thirdCallback, ID5Integration.Role.FOLLOWER);
      verifyCallback(instance2Callback, ID5Integration.Role.LEADER);

      done();
    }, 150);
  });
})
