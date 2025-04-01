import {Instance as StandardInstance, electLeader} from '../../src/instance.js';
import {OperatingMode} from '../../src/instanceCore.js';
import {PassiveMultiplexingInstance as PassiveInstance} from '../../src/instancePassive.js';
import {Properties, Role} from '../../src/instanceCore.js';
import sinon from 'sinon';
import {MeterRegistry} from '@id5io/diagnostics';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {version} from '../../generated/version.js';
import {MultiplexingEvent} from '../../src/events.js';
import {StorageApi} from '../../src/localStorage.js';
import {ElectionState} from '../../src/instanceCore.js';
import {TrueLinkAdapter} from '../../src/trueLink.js';
import {ClientStore} from '../../src/clientStore.js';
import {FollowerType} from '../../src/follower.js';

/**
 * @param {StandardInstance} instance
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
    let instance = new Properties('a', '1.2.3', 'api', '1.0.26', {});

    // when
    let leader = electLeader([instance]);

    // then
    expect(leader).is.eq(instance);
  });

  it('should elect newest instance', function () {
    // given
    let instanceA = new Properties('a', '1.1.3', 'api', '1.0.26', {});
    let instanceB = new Properties('b', '1.3.15', 'api', '1.0.31', {});
    let instanceC = new Properties('c', '1.3.3', 'pbjs', '6.10.0', {});

    // when
    let leader = electLeader([instanceA, instanceB, instanceC]);

    // then
    expect(leader).is.eq(instanceB);
  });

  it('should elect instance from newest source', function () {
    // given
    let instanceA = new Properties('a', '1.1.3', 'api', '1.0.26', {});
    let instanceB = new Properties('b', '1.1.3', 'api', '1.0.27', {});
    let instanceC = new Properties('c', '1.1.3', 'api', '1.0.28', {});

    // when
    let leader = electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceC);
  });

  it('should elect api instance', function () {
    // given
    let instanceA = new Properties('a', '1.1.3', 'pbjs', '7.0.29', {});
    let instanceB = new Properties('b', '1.1.3', 'api', '1.0.27', {});
    let instanceC = new Properties('c', '1.1.3', 'pbjs', '7.0.28', {});

    // when
    let leader = electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceB);
  });

  it('should elect lexicographically first instance if each has the same frame depth', function () {
    // given
    let instanceA = new Properties('a', '1.1.3', 'api', '1.0.26', {});
    instanceA.fetchIdData = {
      refererInfo: {
        numIframes: 1
      }
    };
    let instanceB = new Properties('b', '1.1.3', 'api', '1.0.26', {});
    instanceB.fetchIdData = {
      refererInfo: {
        numIframes: 1
      }
    };
    let instanceC = new Properties('c', '1.1.3', 'api', '1.0.26', {});
    instanceC.fetchIdData = {
      refererInfo: {
        numIframes: 1
      }
    };

    // when
    let leader = electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceA);
  });

  it('should elect lexicographically first instance if source version not comparable', function () {
    // given
    let instanceA = new Properties('a', '1.1.3', 'pbjs', '1.0.26', {});
    let instanceB = new Properties('b', '1.1.3', 'pbjs', 'v1.0.26-pre', {});
    let instanceC = new Properties('c', '1.1.3', 'pbjs', 'v1.0.26', {});

    // when
    let leader = electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceA);
  });

  it('should prefer instances with depth info', function () {
    // given
    let instanceA = new Properties('a', '1.1.3', 'api', '1.0.26', {});
    instanceA.fetchIdData = {};
    let instanceB = new Properties('b', '1.1.3', 'api', '1.0.26', {});
    instanceB.fetchIdData = {
      refererInfo: {
        numIframes: 1
      }
    };
    let instanceC = new Properties('c', '1.1.3', 'api', '1.0.26', {});
    instanceC.fetchIdData = {
      refererInfo: {
        numIframes: 1
      }
    };

    // when
    let leader = electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceB); // b as lexicographically  smallest among these closest to the top
  });

  it('should elect instance which is closest to the top', function () {
    // given
    let instanceA = new Properties('a', '1.1.3', 'api', '1.0.26', {});
    instanceA.fetchIdData = {
      refererInfo: {
        numIframes: 2
      }
    };
    let instanceB = new Properties('b', '1.1.3', 'api', '1.0.26', {});
    instanceB.fetchIdData = {
      refererInfo: {
        numIframes: 3
      }
    };

    let instanceC = new Properties('c', '1.1.3', 'api', '1.0.26', {});
    instanceC.fetchIdData = {
      refererInfo: {
        numIframes: 1
      }
    };

    // when
    let leader = electLeader([instanceB, instanceC, instanceA]);

    // then
    expect(leader).is.eq(instanceC);
  });

  [
    null,
    undefined,
    []
  ].forEach(instances => {
    it(`should elect none of (${instances})`, () => {
      // when
      let leader = electLeader(instances);

      // then
      expect(leader).is.eq(undefined);
    });
  });
});

/**
 *
 * @param instance
 * @param {(di:DiscoveredInstance) => boolean} filter
 * @return {Properties[]}
 */
function knownInstances(instance, filter = function ()  {return true} ) {
  return Array.from(instance._knownInstances.values()).filter(i => filter(i)).map(i => i.properties);
}

describe('ID5 instance', function () {
  let metrics;
  let createdInstances;
  let logger = NO_OP_LOGGER; // for debug purposes assign console `let logger = console`
  let performanceNowStub;
  let createStandardInstance = (source, sourceVersion, sourceConfig, fetchIdData, metrics) => {
    const instance = new StandardInstance(window, {
        source: source,
        sourceVersion: sourceVersion,
        sourceConfiguration: sourceConfig,
        fetchIdData: fetchIdData
      }, sinon.createStubInstance(StorageApi), metrics, logger, new TrueLinkAdapter(),
      sinon.createStubInstance(ClientStore));
    createdInstances.push(instance);
    return instance;
  };

  let createPassiveInstance = (source, sourceVersion, sourceConfig, fetchIdData, metrics) => {
    const instance = new PassiveInstance(window, {
      source: source,
      sourceVersion: sourceVersion,
      sourceConfiguration: sourceConfig,
      fetchIdData: fetchIdData
    },metrics, logger);
    createdInstances.push(instance);
    return instance;
  };

  beforeEach(function () {
    const now = performance.now();
    performanceNowStub = sinon.stub(performance, 'now').returns(now);
    createdInstances = [];
    metrics = new MeterRegistry();
  });
  afterEach(function () {
    createdInstances.forEach(instance => instance.unregister());
    performanceNowStub.restore();
  });

  it('should create instance', function () {
    // when
    let instance = createStandardInstance('api', '1.3.5', {some: 'property'}, {partnerId: 99}, metrics);

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

    // when
    instance.init();

    // then
    expect(instance.role).is.eq(Role.UNKNOWN);
    expect(instance._mode).is.eq(OperatingMode.MULTIPLEXING)
  });

  it('should create passive instance', function () {
    // when
    let instance = createPassiveInstance('api-lite', '1.3.5', {some: 'property'}, {partnerId: 99}, metrics);

    // then
    const id = instance.properties.id;
    expect(instance.properties).is.eql({
      id,
      version: version,
      source: 'api-lite',
      sourceVersion: '1.3.5',
      sourceConfiguration: {some: 'property'},
      fetchIdData: {partnerId: 99},
      href: window.location.href,
      domain: window.location.hostname
    });

    // when
    instance.init();

    // then
    expect(instance.role).is.eq(Role.FOLLOWER);
    expect(instance._mode).is.eq(OperatingMode.MULTIPLEXING_PASSIVE)
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
      };

      // when
      let instance = createStandardInstance(initialConfig.source, initialConfig.sourceVersion, initialConfig.sourceConfiguration, initialConfig.fetchIdData, metrics);

      instance.updateConfig(config);

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
    let electionDelayMSec = 100;


    let unregisteredInstance = createStandardInstance('api', '1', {}, {}, metrics);
    let instance1 = createStandardInstance('api', '1', {}, {}, metrics);
    let instance2 = createStandardInstance('api', '2', {}, {}, metrics);
    let instance3 = createStandardInstance('api', '3', {}, {}, metrics);

    // when
    [instance1, instance2, instance3].forEach(instance => {
      expect(instance._election._state).is.eql(ElectionState.AWAITING_SCHEDULE);
      instance.register({electionDelayMSec: electionDelayMSec});
      expect(instance._election._state).is.eql(ElectionState.SCHEDULED);
    });

    setTimeout(() => {
      // then
      let expectedLeader = instance3.properties;
      expect(instance1._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance1.role).is.eq(Role.FOLLOWER);
      expect(instance1._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance1)).to.eql([instance2.properties, instance3.properties]);

      expect(instance2._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance2.role).is.eq(Role.FOLLOWER);
      expect(instance2._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance2)).to.eql([instance1.properties, instance3.properties]);

      expect(instance3._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance3.role).is.eq(Role.LEADER); // newest source version
      expect(instance3._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance3)).to.eql([instance1.properties, instance2.properties]);

      expect(unregisteredInstance.role).is.eq(Role.UNKNOWN);
      expect(unregisteredInstance._leader.getProperties()).is.eq(undefined);
      expect(unregisteredInstance._knownInstances).to.have.length(0);
      done();
    }, electionDelayMSec + 50);
  });

  it('registered instances should eventually know each other including passive', function (done) {
    // given
    let electionDelayMSec = 100;

    let instance1 = createStandardInstance('api', '1', {}, {}, metrics);
    let instance2 = createStandardInstance('api', '2', {}, {}, metrics);
    let instance3 = createStandardInstance('api', '3', {}, {}, metrics);
    let passiveInstance1 = createPassiveInstance('api', '2', {}, {}, metrics);
    let passiveInstance2 = createPassiveInstance('api', '2', {}, {}, metrics);


    // when
    [instance1, instance2, instance3, passiveInstance1, passiveInstance2].forEach(instance => {
      instance.register({electionDelayMSec: electionDelayMSec});
    });


    setTimeout(() => {

      // then
      let expectedLeader = instance3.properties;
      expect(instance1._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance1.role).is.eq(Role.FOLLOWER);
      expect(instance1._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance1)).to.eql([instance2.properties, instance3.properties, passiveInstance1.properties, passiveInstance2.properties]);
      expect(knownInstances(instance2, i => {return i.isPassive()})).to.be.eql([passiveInstance1.properties, passiveInstance2.properties])

      expect(instance2._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance2.role).is.eq(Role.FOLLOWER);
      expect(instance2._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance2)).to.eql([instance1.properties, instance3.properties, passiveInstance1.properties, passiveInstance2.properties]);
      expect(knownInstances(instance2, i => {return i.isPassive()})).to.be.eql([passiveInstance1.properties, passiveInstance2.properties])

      expect(instance3._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance3.role).is.eq(Role.LEADER); // newest source version
      expect(instance3._leader.getProperties()).is.eql(expectedLeader);
      expect(knownInstances(instance3)).to.eql([instance1.properties, instance2.properties, passiveInstance1.properties, passiveInstance2.properties]);
      expect(knownInstances(instance3, i => {return i.isPassive()})).to.be.eql([passiveInstance1.properties, passiveInstance2.properties])
      // leader needs to know it's passive
      const followers = instance3._leader._assignedLeader._followers;
      expect(followers.filter(f => f.getId() === passiveInstance1.getId()).map(f=>f.type).at(0)).to.be.eql(FollowerType.PASSIVE);
      expect(followers.filter(f => f.getId() === passiveInstance2.getId()).map(f=>f.type).at(0)).to.be.eql(FollowerType.PASSIVE);
      expect(followers.filter(f => f.getId() === instance1.getId()).map(f=>f.type).at(0)).to.be.eql(FollowerType.STANDARD);
      expect(followers.filter(f => f.getId() === instance2.getId()).map(f=>f.type).at(0)).to.be.eql(FollowerType.STANDARD);
      expect(followers.filter(f => f.getId() === instance3.getId()).map(f=>f.type).at(0)).to.be.eql(FollowerType.STANDARD);

      expect(passiveInstance1.role).is.eq(Role.FOLLOWER);
      expect(passiveInstance1._leader).is.eq(undefined); // it does not have leader
      expect(knownInstances(passiveInstance1)).to.eql([instance1.properties, instance2.properties, instance3.properties, passiveInstance2.properties]);

      expect(passiveInstance2.role).is.eq(Role.FOLLOWER);
      expect(passiveInstance2._leader).is.eq(undefined); // it does not have leader
      expect(knownInstances(passiveInstance2)).to.eql([instance1.properties, instance2.properties, instance3.properties, passiveInstance1.properties]);

      done();
    }, electionDelayMSec + 50);
  });

  it('passive instance can not be the leader', function (done) {
    // given
    let electionDelayMSec = 100;

    let instance1 = createStandardInstance('api', '1', {}, {}, metrics);
    let instance2 = createStandardInstance('api', '2', {}, {}, metrics);
    let instance3 = createStandardInstance('api', '3', {}, {}, metrics);
    let passiveInstance = createPassiveInstance('api', '4', {}, {}, metrics); // highest version but excluded from election


    // when
    [instance1, instance2, instance3].forEach(instance => {
      instance.register({electionDelayMSec: electionDelayMSec});
    });
    passiveInstance.register({})

    setTimeout(() => {
      // then
      expect(instance1._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance1.role).is.eq(Role.FOLLOWER);
      expect(knownInstances(instance1)).to.eql([instance2.properties, instance3.properties, passiveInstance.properties]);

      expect(instance2._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance2.role).is.eq(Role.FOLLOWER);
      expect(knownInstances(instance2)).to.eql([instance1.properties, instance3.properties, passiveInstance.properties]);

      expect(instance3._election._state).is.eql(ElectionState.COMPLETED);
      expect(instance3.role).is.eq(Role.LEADER); // newest source version
      expect(knownInstances(instance3)).to.eql([instance1.properties, instance2.properties, passiveInstance.properties]);

      expect(knownInstances(passiveInstance)).to.eql([instance1.properties, instance2.properties, instance3.properties]);
      done();
    }, electionDelayMSec + 50);
  });

  it('late joiner should join to party and follow earlier elected leader', async () => {
    // given
    let electionDelayMsec = 20;


    let instance1 = createStandardInstance('api', '1', {}, {}, metrics);
    let instance2 = createStandardInstance('api', '2', {}, {}, metrics);
    let lateJoiner = createStandardInstance('api', '3', {}, {}, metrics);
    let expectedLeaderProperties = instance2.properties;

    let instance1Election = eventPromise(instance1, MultiplexingEvent.ID5_LEADER_ELECTED);
    let instance2Election = eventPromise(instance2, MultiplexingEvent.ID5_LEADER_ELECTED);
    let lateJoinerElection = eventPromise(lateJoiner, MultiplexingEvent.ID5_LEADER_ELECTED);
    // when
    instance1.register({electionDelayMSec: electionDelayMsec});
    instance2.register({electionDelayMSec: electionDelayMsec});

    return Promise.all([instance1Election, instance2Election])
      .then(() => {
        expect(instance1._election._state).is.eql(ElectionState.COMPLETED);
        expect(instance1.role).is.eq(Role.FOLLOWER);
        expect(instance1._leader.getProperties()).is.eql(expectedLeaderProperties);
        expect(knownInstances(instance1)).to.eql([instance2.properties]);

        expect(instance2._election._state).is.eql(ElectionState.COMPLETED);
        expect(instance2.role).is.eq(Role.LEADER);
        expect(instance2._leader.getProperties()).is.eql(expectedLeaderProperties);
        expect(knownInstances(instance2)).to.eql([instance1.properties]);

        expect(lateJoiner._election._state).is.eql(ElectionState.AWAITING_SCHEDULE);
        expect(lateJoiner.role).is.eq(Role.UNKNOWN);
        expect(lateJoiner._leader.getProperties()).is.undefined;
        expect(knownInstances(lateJoiner)).to.eql([]);
        // when
        let allKnowsEachOther = Promise.all([instancesKnowEachOtherPromise(instance1, lateJoiner), instancesKnowEachOtherPromise(instance2, lateJoiner)]);

        const addFollowerSpy = sinon.spy(instance2._leader, 'addFollower');
        lateJoiner.register({electionDelayMSec: electionDelayMsec});
        expect(lateJoiner._election._state).is.eql(ElectionState.SCHEDULED);
        return Promise.all([lateJoinerElection, allKnowsEachOther])
          .then(() => {
            expect(instance1.role).is.eq(Role.FOLLOWER);
            expect(instance1._leader.getProperties()).is.eql(expectedLeaderProperties);
            expect(knownInstances(instance1)).to.eql([instance2.properties, lateJoiner.properties]);
            expect(addFollowerSpy).has.been.called;
            expect(addFollowerSpy.firstCall.args[0]._instanceProperties).is.eql(lateJoiner.properties);

            expect(instance2.role).is.eq(Role.LEADER);
            expect(instance2._leader.getProperties()).is.eql(expectedLeaderProperties);
            expect(knownInstances(instance2)).to.eql([instance1.properties, lateJoiner.properties]);

            expect(lateJoiner._election._state).is.eql(ElectionState.CANCELED);
            expect(lateJoiner.role).is.eq(Role.FOLLOWER);
            expect(lateJoiner._leader.getProperties()).is.eql(expectedLeaderProperties);
            expect(knownInstances(lateJoiner)).to.eql([instance1.properties, instance2.properties]);
          });
      });
  });


  it('should call listeners when instance joined to party', function (done) {

    // given
    let instance1 = createStandardInstance('api', '1', {}, {}, metrics);
    let instance2 = createStandardInstance('api', '2', {}, {}, metrics);

    let firstCallback = sinon.stub();
    let failingCallback = sinon.stub().throws('BOOM!');
    let thirdCallback = sinon.stub();
    instance1.on(MultiplexingEvent.ID5_INSTANCE_JOINED, firstCallback);
    instance1.on(MultiplexingEvent.ID5_INSTANCE_JOINED, failingCallback);
    instance1.on(MultiplexingEvent.ID5_INSTANCE_JOINED, thirdCallback);

    // when
    instance1.register({electionDelayMSec: 100});
    instance2.register({electionDelayMSec: 100});

    setTimeout(() => {
      // then
      let expectedJoinedInstance = instance2.properties;
      let verifyCallback = callback => {
        expect(callback).to.have.been.calledOnce;
        expect(callback.firstCall.firstArg).to.be.eql(expectedJoinedInstance);
      };

      verifyCallback(firstCallback);
      verifyCallback(failingCallback);
      verifyCallback(thirdCallback);
      done();
    }, 150);
  });

  it('should call listeners when message received', function (done) {

    // given
    let instance1 = createStandardInstance('api', '1', {}, {}, metrics);
    let instance2 = createStandardInstance('api', '2', {}, {}, metrics);

    let firstCallback = sinon.stub();
    let failingCallback = sinon.stub().throws('BOOM!');
    let thirdCallback = sinon.stub();
    instance1.on(MultiplexingEvent.ID5_MESSAGE_RECEIVED, firstCallback);
    instance1.on(MultiplexingEvent.ID5_MESSAGE_RECEIVED, failingCallback);
    instance1.on(MultiplexingEvent.ID5_MESSAGE_RECEIVED, thirdCallback);

    // when
    instance1.register({electionDelayMSec: 100});
    instance2.register({electionDelayMSec: 100});


    setTimeout(() => {
      // then
      let verifyCallback = callback => {
        expect(callback).to.have.been.calledTwice; // HELLO message and instance1's HELLO response
        expect(callback.firstCall.firstArg.src).to.be.eql(instance2.properties.id);
        expect(callback.secondCall.firstArg.src).to.be.eql(instance2.properties.id);
      };

      verifyCallback(firstCallback);
      verifyCallback(failingCallback);
      verifyCallback(thirdCallback);

      done();
    }, 150);
  });

  it('should call listeners when leader elected', function (done) {

    // given
    let instance1 = createStandardInstance('api', '1', {}, {}, metrics);
    let instance2 = createStandardInstance('api', '2', {}, {}, metrics);

    let firstCallback = sinon.stub();
    let failingCallback = sinon.stub().throws('BOOM!');
    let thirdCallback = sinon.stub();
    instance1.on(MultiplexingEvent.ID5_LEADER_ELECTED, firstCallback);
    instance1.on(MultiplexingEvent.ID5_LEADER_ELECTED, failingCallback);
    instance1.on(MultiplexingEvent.ID5_LEADER_ELECTED, thirdCallback);

    let instance2Callback = sinon.stub();
    instance2.on(MultiplexingEvent.ID5_LEADER_ELECTED, instance2Callback);

    // when
    instance1.register({electionDelayMSec: 100});
    instance2.register({electionDelayMSec: 100});


    setTimeout(() => {
      // then
      let verifyCallback = (callback, expectedRole) => {
        let expectedLeader = instance2.properties;
        expect(callback).to.have.been.calledOnce;
        expect(callback.firstCall.args[0]).to.be.eql(expectedRole);
        expect(callback.firstCall.args[1]).to.be.eql(expectedLeader);
      };

      verifyCallback(firstCallback, Role.FOLLOWER);
      verifyCallback(failingCallback, Role.FOLLOWER);
      verifyCallback(thirdCallback, Role.FOLLOWER);
      verifyCallback(instance2Callback, Role.LEADER);

      done();
    }, 150);
  });
});
