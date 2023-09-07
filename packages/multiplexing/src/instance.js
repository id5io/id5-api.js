import {
  CrossInstanceMessenger,
  DST_BROADCAST,
  HelloMessage,
  ProxyMethodCallHandler,
  ProxyMethodCallTarget
} from './messaging.js';
import * as Utils from './utils.js';
import {version} from '../generated/version.js';
import {NamedLogger, NoopLogger} from './logger.js';
import {ActualLeader, AwaitedLeader, ProxyLeader} from './leader.js';
import {ApiEventsDispatcher, MultiplexingEvent} from './apiEvent.js';
import {DirectFollower, ProxyFollower} from './follower.js';

/**
 * @typedef {string} MultiplexingRole
 */

/**
 * @typedef {string} ElectionState
 */

/**
 * @typedef {string} OperatingMode
 */

/**
 * @typedef {Object} MultiplexingState
 * @property {MultiplexingRole} role
 * @property {ElectionState} electionState
 * @property {Properties} leader
 */

/**
 * @typedef {Object} InstanceState
 * @property {OperatingMode} operatingMode
 * @property {MultiplexingState} [multiplexing]
 * @property {Array<Properties>} [knownInstances]
 */

/**
 * @enum {MultiplexingRole}
 */
export const Role = Object.freeze({
  UNKNOWN: 'unknown',
  LEADER: 'leader',
  FOLLOWER: 'follower'
});

/**
 * @enum {OperatingMode}
 */
export const OperatingMode = Object.freeze({
  MULTIPLEXING: 'multiplexing',
  SINGLETON: 'singleton'
});

/**
 * @enum {ElectionState}
 */
export const ElectionState = Object.freeze({
  AWAITING_SCHEDULE: 'awaiting_schedule',
  SKIPPED: 'skipped',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELED: 'canceled'
});

export class Properties {
  /**
   * @type {string} unique instance id
   */
  id;
  /**
   * @type {string} multiplexing lib version which this instance was loaded with
   */
  version;
  /**
   * @type {string} source where this instance were loaded from (api/pbjs other)
   */
  source;
  /**
   * @type {string} source lib version which this instance were loaded with (i.e. id5-api.js version 1.0.22)
   */
  sourceVersion;
  /**
   * @type {Object} source specific configuration options
   */
  sourceConfiguration;
  /**
   * @type {FetchIdData} instance data required call fetch on its behalf
   */
  fetchIdData;
  href;
  domain;
  /**
   *@type {boolean} indicates if instance operates in singleton mode or not
   */
  singletonMode;
  canDoCascade;

  constructor(id, version, source, sourceVersion, sourceConfiguration, location) {
    this.id = id;
    this.version = version;
    this.source = source;
    this.sourceVersion = sourceVersion;
    this.sourceConfiguration = sourceConfiguration;
    this.href = location?.href;
    this.domain = location?.hostname;
  }
}

export class DiscoveredInstance {
  /**
   * @type {Properties}
   */
  properties;
  /**
   * @type {InstanceState}
   */
  knownState;
  /**
   * @type {DOMHighResTimeStamp}
   * @private
   */
  _joinTime;
  /**
   * @type WindowProxy
   * @private
   */
  _window;

  /**
   *
   * @param {Properties} properties
   * @param {InstanceState} state
   * @param {Window} wnd
   */
  constructor(properties, state, wnd) {
    this.properties = properties;
    this.knownState = state;
    this._window = wnd;
    this._joinTime = performance.now();
  }

  getId() {
    return this.properties.id;
  }

  isMultiplexingPartyAllowed() {
    // we want to exclude all instances working in SINGLETON mode
    // we want to exclude old multiplexing instances that only introduces themselves but will never play leader/follower role
    // such instances will never provide state (they send old HelloMessage version)
    return this.knownState?.operatingMode === OperatingMode.MULTIPLEXING;
  }

  getInstanceMultiplexingLeader() {
    if (this.knownState?.operatingMode !== OperatingMode.MULTIPLEXING) {
      return undefined;
    }
    return this.knownState?.multiplexing?.leader;
  }
}

class UniqCounter {
  _knownValues = [];
  /**
   * @type {Counter}
   * @private
   */
  _counter;

  /**
   * @param {Counter}counter
   */
  constructor(counter) {
    this._counter = counter;
  }

  add(value) {
    if (value && this._knownValues.indexOf(value) === -1) {
      this._counter.inc();
      this._knownValues.push(value);
    }
  }
}

class InstancesCounters {
  /**
   * @type {Counter}
   * @private
   */
  _instancesCounter;
  /**
   * @type {UniqCounter}
   * @private
   */
  _domainsCounter;
  /**
   * @type {UniqCounter}
   * @private
   */
  _windowsCounter;
  /**
   * @type {UniqCounter}
   * @private
   */
  _partnersCounter;

  /**
   *
   * @param {Id5CommonMetrics} metrics
   * @param {Properties} properties
   */
  constructor(metrics, properties) {
    let id = properties.id;
    this._instancesCounter = metrics.instanceCounter(properties.id);
    this._windowsCounter = new UniqCounter(metrics.instanceUniqWindowsCounter(id));
    this._partnersCounter = new UniqCounter(metrics.instanceUniqPartnersCounter(id));
    this._domainsCounter = new UniqCounter(metrics.instanceUniqueDomainsCounter(id));
  }

  /**
   *
   * @param {Properties} properties
   */
  addInstance(properties) {
    this._instancesCounter.inc();
    this._partnersCounter.add(properties?.fetchIdData?.partnerId | properties?.sourceConfiguration?.options?.partnerId);
    this._domainsCounter.add(properties?.domain);
    this._windowsCounter.add(properties?.href);
  }
}

/**
 *
 * @param {Instance} instance
 */
function collectPartySizeMetrics(instance) {
  const metrics = instance._metrics;
  [100, 200, 500, 1000, 2000, 3000, 5000].forEach(measurementPoint => {
    setTimeout(() => {
      const partySize = (instance._knownInstances?.size || 0) + 1;
      metrics.summary('instance.partySize', {
        after: measurementPoint,
        electionState: instance._election._state
      }).record(partySize);
    }, measurementPoint);
  });
}

class Election {
  _scheduleTime;
  _closeTime;
  _timeoutId;
  _state = ElectionState.AWAITING_SCHEDULE;
  _instance;

  constructor(instance) {
    this._instance = instance;
  }

  schedule(delayMs) {
    const election = this;
    this._timeoutId = setTimeout(() => {
      if (election._timeoutId) {
        election._timeoutId = undefined;
        election._instance._doElection();
        election._closeWithState(ElectionState.COMPLETED);
      }
    }, delayMs);
    election._state = ElectionState.SCHEDULED;
    election._scheduleTime = performance.now();
  }

  skip() {
    this._closeWithState(ElectionState.SKIPPED);
  }

  cancel() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = undefined;
    }
    this._closeWithState(ElectionState.CANCELED);
  }

  _closeWithState(state) {
    this._state = state;
    this._closeTime = performance.now();
  }
}

export class Instance {
  /**
   * @type {Properties}
   */
  properties;
  /**
   * @type {CrossInstanceMessenger}
   * @private
   */
  _messenger;
  /**
   *
   * @type {Map<string, DiscoveredInstance>}
   * @private
   */
  _knownInstances = new Map();
  /**
   * @type DiscoveredInstance
   * @private
   */
  _lastJoinedInstance;
  /**
   * @type MultiplexingRole
   */
  role;
  /**
   * @type AwaitedLeader
   * @private
   */
  _leader;
  /**
   * @type OperatingMode
   */
  _mode;
  /**
   * @type {Id5CommonMetrics}
   * @private
   */
  _metrics;
  /**
   * @type {Logger}
   * @private
   */
  _logger;

  /**
   * @type {InstancesCounters}
   * @private
   */
  _instanceCounters;
  /**
   * @type {ProxyMethodCallHandler}
   * @private
   */
  _proxyMethodCallHandler;
  /**
   * @type {Election}
   * @private
   */
  _election;
  _window;

  /**
   * @param {Window} wnd
   * @param {Properties} configuration
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   * @param {UidFetcher} uidFetcher
   * @param {ConsentManagement} consentManager
   */
  constructor(wnd, configuration, metrics, logger = NoopLogger, uidFetcher, consentManager) {
    const id = Utils.generateId();
    this.properties = Object.assign({
      id: id,
      version: version,
      href: wnd.location?.href,
      domain: wnd.location?.hostname
    }, configuration);
    this.role = Role.UNKNOWN;
    this._metrics = metrics;
    this._instanceCounters = new InstancesCounters(metrics, this.properties);
    this._loadTime = performance.now();
    this._logger = (logger !== undefined) ? new NamedLogger(`Instance(id=${id})`, logger) : NoopLogger;
    this._window = wnd;
    this._dispatcher = new ApiEventsDispatcher(this._logger);
    this._uidFetcher = uidFetcher;
    this._consentManager = consentManager;
    this._leader = new AwaitedLeader(); // AwaitedLeader buffers request to leader in case some events happened before leader is elected (i.e. consent update)
    this._followerRole = new DirectFollower(this.properties, this._dispatcher);
    this._election = new Election(this);
  }

  /**
   *
   * @param {Properties} configuration
   */
  updateConfig(configuration) {
    Object.assign(this.properties, configuration);
  }

  init(electionDelayMSec = 3000) {
    let instance = this;
    let window = instance._window;
    instance._mode = instance.properties.singletonMode === true ? OperatingMode.SINGLETON : OperatingMode.MULTIPLEXING;
    instance._instanceCounters.addInstance(instance.properties);
    collectPartySizeMetrics(instance);
    instance._messenger = new CrossInstanceMessenger(instance.properties.id, window, instance._logger);
    instance._messenger
      .onAnyMessage((message) => {
        let deliveryTimeMsec = (performance.now() - message.timestamp) | 0;
        instance._metrics.instanceMsgDeliveryTimer().record(deliveryTimeMsec);
        instance._logger.debug('Message received', message);
        instance._doFireEvent(MultiplexingEvent.ID5_MESSAGE_RECEIVED, message);
      })
      .onMessage(HelloMessage.TYPE, (message, source) => {
        let hello = Object.assign(new HelloMessage(), message.payload);
        if (hello.isResponse === undefined) {
          // patch messages received from older version instances
          hello.isResponse = (message.dst !== DST_BROADCAST);
        }
        instance._handleHelloMessage(hello, message, source);
      })
      .onProxyMethodCall(
        new ProxyMethodCallHandler(this._logger)
          // register now to receive leader calls before actual leader is assigned
          // it may happen that some followers will elect instance as the leader before instance knows it act as the leader
          // this way all calls will be buffered and executed when actual leader is elected
          .registerTarget(ProxyMethodCallTarget.LEADER, instance._leader)
          // register now to receive followers calls before election is completed
          // it may happen that leader instance will elect them self as a leader with followers before all followers are aware they have a remote leader
          // this is very likely and happens quite frequently for late joiner, where Hello response can be delivered and handled after `notifyUidReady` by leader is called
          // leader have no idea if follower is ready and sends UID immediately when it's available (calls `notifyUidReady` method)
          .registerTarget(ProxyMethodCallTarget.FOLLOWER, instance._followerRole)
      );
    if (instance._mode === OperatingMode.SINGLETON) {
      // to provision uid ASAP
      instance._election.skip();
      instance._onLeaderElected(instance.properties); // self-proclaimed leader
    } else if (instance._mode === OperatingMode.MULTIPLEXING) {
      instance._election.schedule(electionDelayMSec);
    }
    // ready to introduce itself to other instances
    instance._messenger.broadcastMessage(instance._createHelloMessage(false), HelloMessage.TYPE);
    if (window.__id5_instances === undefined) {
      window.__id5_instances = [];
    }
    window.__id5_instances.push(instance);
  }

  /**
   * @param {Properties} properties
   */
  register(properties) {
    try {
      this.updateConfig(properties);
      this.init();
    } catch (e) {
      this._logger.error('Failed to register integration instance', e);
    }
    return this;
  }

  /**
   *
   * @param {HelloMessage} hello
   * @param {Id5Message} message - id5 message object which delivered  this hello
   * @param {WindowProxy} srcWindow
   * @private
   */
  _handleHelloMessage(hello, message, srcWindow) {
    const instance = this;
    instance._joinInstance(hello, message, srcWindow);
  }

  deregister() {
    let window = this._window;
    let globalId5Instances = window.__id5_instances;
    if (globalId5Instances !== undefined) {
      globalId5Instances.splice(globalId5Instances.indexOf(this), 1);
    }
    if (this._messenger) {
      this._messenger.deregister();
    }
  }

  on(event, callback) {
    this._dispatcher.on(event, callback);
    return this;
  }

  /**
   *
   * @param {HelloMessage} hello
   * @param {Id5Message} message
   * @param {WindowProxy} srcWindow
   * @private
   */
  _joinInstance(hello, message, srcWindow) {
    const isResponse = hello.isResponse;
    const joiningInstance = new DiscoveredInstance(hello.instance, hello.instanceState, srcWindow);
    if (!this._knownInstances.get(joiningInstance.getId())) {
      this._knownInstances.set(joiningInstance.getId(), joiningInstance);
      this._lastJoinedInstance = joiningInstance;
      this._instanceCounters.addInstance(joiningInstance.properties);
      this._metrics.instanceJoinDelayTimer({
        election: this._election._state
      }).record((performance.now() - this._loadTime) | 0);
      if (!isResponse) { // new instance on the page
        // this is init message , so respond back to introduce itself
        // we need to respond ASAP to get this info available for potential follower
        // to let it know in case this instance is the leader and before joining instance is added to followers
        // in case uid is ready, the leader will try to deliver it but follower may not be ready to receive/handle msg
        this._messenger.sendResponseMessage(message, this._createHelloMessage(true), HelloMessage.TYPE);
        if (this.role !== Role.UNKNOWN) { // after election
          this._handleLateJoiner(joiningInstance);
        }
      } else { // response from earlier loaded instance
        const providedLeader = joiningInstance.getInstanceMultiplexingLeader(); //
        if (this._mode === OperatingMode.MULTIPLEXING &&
          this.role === Role.UNKNOWN && // leader not elected yet
          providedLeader !== undefined // discovered instance las leader assigned
        ) {
          // this means I'm late joiner, so cancel election and inherit leader
          this._logger.info('Joined late, elected leader is', providedLeader);
          this._election.cancel();
          // act as follower
          this._onLeaderElected(providedLeader);
          // TODO what if another instance will provide another leader instance
          // TODO what if it will never get HELLO from leader
          // TODO should accept only if hello.leader === hello.instance -> this may guarantee that  leader will join follower ?
        }
      }
      this._logger.debug('Instance joined', joiningInstance.getId());
      this._doFireEvent(MultiplexingEvent.ID5_INSTANCE_JOINED, joiningInstance.properties);
    } else {
      this._logger.debug('Instance already know', joiningInstance.getId());
    }
  }

  _createHelloMessage(isResponse = false) {
    /**
     * @type InstanceState
     */
    let state = {
      operatingMode: this._mode,
      knownInstances: Array.from(this._knownInstances.values()).map(i => i.properties)
    };

    if (this._mode === OperatingMode.MULTIPLEXING) {
      state.multiplexing = {
        role: this.role,
        electionState: this._election?._state,
        leader: this._leader.getProperties()
      };
    }

    return new HelloMessage(this.properties, isResponse, state);
  }

  _handleLateJoiner(newInstance) {
    this._logger.info('Late joiner detected', newInstance.properties);
    const lateJoinersCount = this._metrics.instanceLateJoinCounter(this.properties.id).inc();
    this._metrics.instanceLateJoinDelayTimer({
      election: this._election._state,
      isFirst: lateJoinersCount === 1
    }).record(performance.now() - this._election._closeTime);
    if (this._mode === OperatingMode.MULTIPLEXING && newInstance.isMultiplexingPartyAllowed() && this.role === Role.LEADER) {
      this._leader.addFollower(new ProxyFollower(newInstance, this._messenger));
    }
  }

  _doFireEvent(event, ...args) {
    this._dispatcher.emit(event, ...args);
  }

  _actAsLeader() {
    const leader = new ActualLeader(this._uidFetcher, this._consentManager, this.properties, this._metrics, this._logger);
    leader.addFollower(this._followerRole); // add itself to be directly called
    this._leader.assignLeader(leader);
    if (this._mode === OperatingMode.MULTIPLEXING) { // in singleton mode ignore remote followers
      Array.from(this._knownInstances.values())
        .filter(instance => instance.isMultiplexingPartyAllowed())
        .map(instance => leader.addFollower(new ProxyFollower(instance, this._messenger)));
    }
    // all prepared let's start
    leader.start();
  }

  _followRemoteLeader(leaderInstance) {
    this._leader.assignLeader(new ProxyLeader(this._messenger, leaderInstance)); // remote leader
    this._logger.info('Following remote leader ', leaderInstance);
  }

  updateConsent(consentData) {
    this._leader.updateConsent(consentData);
  }

  updateFetchIdData(fetchIdDataUpdate) {
    Object.assign(this.properties.fetchIdData, fetchIdDataUpdate);
    this._leader.updateFetchIdData(this.properties.id, this.properties.fetchIdData);
  }

  refreshUid(options) {
    this._leader.refreshUid(options);
  }

  _doElection() {
    const election = this._election;
    const knownInstances = this._knownInstances;
    const lastJoinedInstance = this._lastJoinedInstance;
    let electionCandidates = Array.from(knownInstances.values())
      .filter(knownInstance => knownInstance.isMultiplexingPartyAllowed())
      .map(knownInstance => knownInstance.properties);
    electionCandidates.push(this.properties);
    this._onLeaderElected(electLeader(electionCandidates));
    if (lastJoinedInstance) {
      this._metrics.instanceLastJoinDelayTimer().record(Math.max(lastJoinedInstance._joinTime - election._scheduleTime, 0));
    }
  }

  _onLeaderElected(leader) {
    const instance = this;
    instance._leaderInstance = leader;
    instance.role = (leader.id === instance.properties.id) ? Role.LEADER : Role.FOLLOWER;
    // in singleton mode we always act as a leader , it's role is activated on init to  deliver UID ASAP
    if (instance.role === Role.LEADER) {
      instance._actAsLeader();
    } else if (instance.role === Role.FOLLOWER) {
      instance._followRemoteLeader(leader);
    }
    instance._logger.debug('Leader elected', leader.id, 'my role', instance.role);
    instance._doFireEvent(MultiplexingEvent.ID5_LEADER_ELECTED, instance.role, instance._leaderInstance);
  }
}

/**
 *
 * @param {Array<Properties>} instances
 * @returns {Properties} leader instance
 */
export function electLeader(instances) {
  if (!instances || instances.length === 0) {
    return undefined;
  }
  let ordered = instances.sort((instance1, instance2) => {
    // newer  version preferred
    let result = -Utils.semanticVersionCompare(instance1.version, instance2.version);
    if (result === 0) {
      // compare source lexicographical, will prefer 'api' over 'pbjs'
      result = instance1.source.localeCompare(instance2.source);
      if (result === 0) { // same source compare it's version
        result = -Utils.semanticVersionCompare(instance1.sourceVersion, instance2.sourceVersion);
      }
      // still undetermined, then compare id lexicographically
      if (result === 0) {
        result = instance1.id.localeCompare(instance2.id);
      }
    }
    return result;
  });

  return ordered[0];
}
