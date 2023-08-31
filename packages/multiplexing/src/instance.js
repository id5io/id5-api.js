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
import {AwaitedLeader, ActualLeader, ProxyLeader} from './leader.js';
import {ApiEventsDispatcher, MultiplexingEvent} from './apiEvent.js';
import {DirectFollower, ProxyFollower} from './follower.js';

export const Role = Object.freeze({
  UNKNOWN: 'unknown',
  LEADER: 'leader',
  FOLLOWER: 'follower'
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
   * @type {Map<string, Properties>}
   * @private
   */
  _knownInstances = new Map();
  role;
  _leaderInstance;
  /**
   * @type Leader
   * @private
   */
  _leader;
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
   * @param {Window} wnd
   * @param {Properties} configuration
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   * @param {UidFetcher} uidFetcher
   * @param {ConsentManager} consentManager
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
    this._leader = new AwaitedLeader(); // AwaitedLeader buffers request to leader in case some events happened before leader is elected (i.e. consent update)
    this._dispatcher = new ApiEventsDispatcher(this._logger);
    this._uidFetcher = uidFetcher;
    this._consentManager = consentManager;
    this._follower = new DirectFollower(this.properties, this._dispatcher);
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
    instance._instanceCounters.addInstance(instance.properties);
    this._messenger = new CrossInstanceMessenger(instance.properties.id, window, instance._logger);
    this._proxyMethodCallHandler = new ProxyMethodCallHandler(this._messenger);
    this._messenger
      .onAnyMessage((message) => {
        let deliveryTimeMsec = (performance.now() - message.timestamp) | 0;
        instance._metrics.instanceMsgDeliveryTimer().record(deliveryTimeMsec);
        instance._logger.debug('Message received', message);
        instance._doFireEvent(MultiplexingEvent.ID5_MESSAGE_RECEIVED, message);
      })
      .onMessage(HelloMessage.TYPE, message => {
        let hello = Object.assign(new HelloMessage(), message.payload);
        instance._handleHelloMessage(hello, message);
      });
    if (instance.properties.singletonMode === true) {
      // to provision uid ASAP
      instance._actAsLeader(true);
    } else {
      instance._scheduleLeaderElection(electionDelayMSec);
    }
    instance._messenger.broadcastMessage(new HelloMessage(instance.properties), HelloMessage.TYPE);
    if (window.__id5_instances === undefined) {
      window.__id5_instances = [];
    }
    window.__id5_instances.push(this);
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
   * @param message
   * @private
   */
  _handleHelloMessage(hello, message) {
    const instance = this;
    instance._joinInstance(hello, message);
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
   * @private
   */
  _joinInstance(hello, message) {
    const joiningInstance = hello.instance;
    if (!this._knownInstances.get(joiningInstance.id)) {
      this._knownInstances.set(joiningInstance.id, joiningInstance);
      this._instanceCounters.addInstance(joiningInstance);
      if (message.dst === DST_BROADCAST) {
        // this is init message , so respond back to introduce itself
        // we need to respond ASAP to get this info available for potential follower
        // to let it know in case this instance is the leader and before joinig instance is added to followers
        // in case uid is ready, the leader will try to deliver it but follower may not be ready to receive/handle msg
        this._messenger.sendResponseMessage(message, new HelloMessage(this.properties, this._leaderInstance), HelloMessage.TYPE);
      }
      this._metrics.instanceJoinDelayTimer().record((performance.now() - this._loadTime) | 0);
      if (this.role !== Role.UNKNOWN) { // after election
        this._logger.info('Late joiner detected', joiningInstance);
        this._metrics.instanceLateJoinCounter(this.properties.id).inc();
        if (this.role === Role.LEADER) {
          if (!joiningInstance.singletonMode) {
            this._leader.addFollower(new ProxyFollower(joiningInstance, this._messenger));
          }
        }
      } else {
        const providedLeader = hello.leaderInstance;
        if (providedLeader !== undefined) { // I'm late joiner
          this._logger.info('Joined late, elected leader is', providedLeader);
          if (this._scheduledElection !== undefined) { // if election is still awaiting
            // cancel election
            clearTimeout(this._scheduledElection);
            this._scheduledElection = undefined;
            // act as follower
            this._onLeaderElected(providedLeader);
            // TODO what if another instance will provide another leader instance
            // TODO what if it will never get HELLO from leader
            // TODO should accept only if hello.leader === hello.instance -> this may guarantee that  leader will join follower ?
          }
        }
      }
      this._logger.debug('Instance joined', joiningInstance.id);
      this._doFireEvent(MultiplexingEvent.ID5_INSTANCE_JOINED, joiningInstance);
    }
  }

  _doFireEvent(event, ...args) {
    this._dispatcher.emit(event, ...args);
  }

  _actAsLeader(singletonMode = false) {
    const leader = new ActualLeader(this._uidFetcher, this._consentManager, [this._follower], this._logger);
    if (!singletonMode) {
      Array.from(this._knownInstances.values())
        .filter(instance => !instance.singletonMode) // exclude all instances operating in singleton mode
        .map(instance => leader.addFollower(new ProxyFollower(instance, this._messenger)));
      this._proxyMethodCallHandler.register(ProxyMethodCallTarget.LEADER, leader);
    }
    this._assignLeader(leader);
    leader.start();
  }

  _followRemoteLeader(leaderInstance) {
    this._assignLeader(new ProxyLeader(this._messenger, leaderInstance.id)); // remote leader
    this._proxyMethodCallHandler.register(ProxyMethodCallTarget.FOLLOWER, this._follower);
  }

  _assignLeader(newLeader) {
    let oldLeader = this._leader;
    oldLeader.onLeaderChange(newLeader);
    this._leader = newLeader;
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

  _scheduleLeaderElection(electionDelay) {
    const instance = this;
    instance._scheduledElection = setTimeout(() => {
      if (instance._scheduledElection) { // if not canceled
        let instances = Array.from(instance._knownInstances.values());
        instances.push(instance.properties);
        instance._onLeaderElected(electLeader(instances));
        instance._scheduledElection = undefined;
      }
    }, electionDelay);
  }

  _onLeaderElected(leader) {
    const instance = this;
    instance._leaderInstance = leader;
    instance.role = (leader.id === instance.properties.id) ? Role.LEADER : Role.FOLLOWER;
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
