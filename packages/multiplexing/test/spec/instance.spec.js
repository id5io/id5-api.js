import * as ID5Integration from '../../src/instance.js';
import {expect} from 'chai';
import * as Utils from '../../src/utils.js'
import sinon from 'sinon';
import * as chai from 'chai';
import {generateId} from 'karma/common/util.js';
import {Id5CommonMetrics} from '@id5io/diagnostics';
import sinonChai from 'sinon-chai';
import {NoopLogger} from '../../src/logger.js';
import {version} from '../../generated/version.js';

chai.use(sinonChai);

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

describe('ID5 instance', function () {
  let metrics;
  let createdInstances;
  let generateIdStub;
  let logger = NoopLogger; // for debug purposes assign console `let logger = console`
  let createInstance = (source, sourceVersion, sourceConfig, fetchIdData, metrics) => {
    const instance = new ID5Integration.Instance(window,{
      source: source,
      sourceVersion: sourceVersion,
      sourceConfiguration: sourceConfig,
      fetchIdData: fetchIdData
    }, metrics, logger);
    createdInstances.push(instance);
    return instance;
  }

  beforeEach(function () {
    createdInstances = [];
    metrics = new Id5CommonMetrics('api', '1');
  });
  afterEach(function () {
    if (generateIdStub) {
      generateIdStub.restore();
    }
    createdInstances.forEach(instance => instance.deregister());
  })

  it('should create instance ', function () {

    // given
    generateIdStub = sinon.stub(Utils, 'generateId');
    let id = crypto.randomUUID();
    generateIdStub.returns(id);

    // when
    let instance = createInstance('api', '1.3.5', {some: 'property'}, {partnerId: 99}, metrics);

    // then
    expect(instance.properties).is.deep.eq({
      id: id,
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

  it('registered instances should eventually know each other and elect the same leader', function (done) {
    // given
    let electionDelayMsec = 100;


    let unregisteredInstance = createInstance('api', '1', {}, {}, metrics);
    let instance1 = createInstance('api', '1', {}, {}, metrics);
    let instance2 = createInstance('api', '2', {}, {}, metrics);
    let instance3 = createInstance('api', '3', {}, {}, metrics);

    // when
    instance1.register(electionDelayMsec);
    instance2.register(electionDelayMsec);
    instance3.register(electionDelayMsec);

    setTimeout(() => {
      // then
      let expectedLeader = instance3.properties;
      expect(instance1.role).is.eq(ID5Integration.Role.FOLLOWER);
      expect(instance1._leader).is.deep.eq(expectedLeader);
      expect(Array.from(instance1._knownInstances.values())).to.deep.eq([instance2.properties, instance3.properties]);

      expect(instance2.role).is.eq(ID5Integration.Role.FOLLOWER);
      expect(instance2._leader).is.deep.eq(expectedLeader);
      expect(Array.from(instance2._knownInstances.values())).to.deep.eq([instance1.properties, instance3.properties]);

      expect(instance3.role).is.eq(ID5Integration.Role.LEADER); // newest source version
      expect(instance3._leader).is.deep.eq(expectedLeader);
      expect(Array.from(instance3._knownInstances.values())).to.deep.eq([instance1.properties, instance2.properties]);

      expect(unregisteredInstance.role).is.eq(ID5Integration.Role.UNKNOWN);
      expect(unregisteredInstance._leader).is.eq(undefined);
      expect(unregisteredInstance._knownInstances).to.have.length(0);
      done();
    }, electionDelayMsec + 50);
  });

  it('should call listeners when instance joined to party', function (done) {

    // given
    let instance1 = createInstance('api', '1', {}, {}, metrics);
    let instance2 = createInstance('api', '2', {}, {}, metrics);

    let firstCallback = sinon.stub();
    let failingCallback = sinon.stub().throws('BOOM!');
    let thirdCallback = sinon.stub();
    instance1.on(ID5Integration.Event.ID5_INSTANCE_JOINED, firstCallback);
    instance1.on(ID5Integration.Event.ID5_INSTANCE_JOINED, failingCallback);
    instance1.on(ID5Integration.Event.ID5_INSTANCE_JOINED, thirdCallback);

    // when
    instance1.register(100);
    instance2.register(100);

    setTimeout(() => {
      // then
      let expectedJoinedInstance = instance2.properties;
      let verifyCallback = callback => {
        expect(callback).to.have.been.calledOnce;
        expect(callback.firstCall.firstArg).to.be.deep.eq(expectedJoinedInstance);
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
    instance1.on(ID5Integration.Event.ID5_MESSAGE_RECEIVED, firstCallback);
    instance1.on(ID5Integration.Event.ID5_MESSAGE_RECEIVED, failingCallback);
    instance1.on(ID5Integration.Event.ID5_MESSAGE_RECEIVED, thirdCallback);

    // when
    instance1.register(100);
    instance2.register(100);


    setTimeout(() => {
      // then
      let verifyCallback = callback => {
        expect(callback).to.have.been.calledTwice; // HELLO message and instance1's HELLO response
        expect(callback.firstCall.firstArg.src).to.be.deep.eq(instance2.properties.id);
        expect(callback.secondCall.firstArg.src).to.be.deep.eq(instance2.properties.id);
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
    instance1.on(ID5Integration.Event.ID5_LEADER_ELECTED, firstCallback);
    instance1.on(ID5Integration.Event.ID5_LEADER_ELECTED, failingCallback);
    instance1.on(ID5Integration.Event.ID5_LEADER_ELECTED, thirdCallback);

    let instance2Callback = sinon.stub();
    instance2.on(ID5Integration.Event.ID5_LEADER_ELECTED, instance2Callback);

    // when
    instance1.register(100);
    instance2.register(100);


    setTimeout(() => {
      // then
      let verifyCallback = (callback, expectedRole) => {
        let expectedLeader = instance2.properties;
        expect(callback).to.have.been.calledOnce;
        expect(callback.firstCall.args[0]).to.be.deep.eq(expectedRole);
        expect(callback.firstCall.args[1]).to.be.deep.eq(expectedLeader);
      }

      verifyCallback(firstCallback, ID5Integration.Role.FOLLOWER);
      verifyCallback(failingCallback, ID5Integration.Role.FOLLOWER);
      verifyCallback(thirdCallback, ID5Integration.Role.FOLLOWER);
      verifyCallback(instance2Callback, ID5Integration.Role.LEADER);

      done();
    }, 150);
  });
})
