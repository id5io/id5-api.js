import {
  CrossInstanceMessenger,
  DST_BROADCAST,
  HelloMessage,
  MethodCallTarget,
  ProxyMethodCallMessage
} from './messaging.js';
import * as Utils from './utils.js';
import {version} from '../generated/version.js';
import {NamedLogger, NoopLogger} from './logger.js';
import {AwaitedLeader, Leader, LeaderProxy} from './leader.js';
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
   * @type LeaderApi
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
   * @typedef {Object} InstanceConfiguration
   * @property {string} source - source lib where it was initialized from
   * @property {string} sourceVersion source lib version
   * @property {string} sourceConfiguration source lib specific configuration
   * @property {FetchIdData}  fetchIdData instance data required to call Fetch
   * @property {boolean} singletonMode if true indicates that this instance does not want to participate to multiplexing and acts for itself
   */

  /**
   * @param {Window} wnd
   * @param {InstanceConfiguration} configuration
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   * @param {UidFetcher} uidFetcher
   * @param {ConsentManager} consentManager
   */
  constructor(wnd, configuration, metrics, logger = NoopLogger, uidFetcher, consentManager) {
    const id = Utils.generateId();
    this.properties = {
      id: id,
      version: version,
      href: wnd.location?.href,
      domain: wnd.location?.hostname
    };
    this.updateConfig({
      ...configuration,
      sourceWindow: wnd
    });
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
   * @param {InstanceConfiguration} configuration
   */
  updateConfig(configuration) {
    if (configuration.source) {
      this.properties.source = configuration.source;
    }
    if (configuration.sourceVersion) {
      this.properties.sourceVersion = configuration.sourceVersion;
    }
    if (configuration.sourceConfiguration) {
      this.properties.sourceConfiguration = configuration.sourceConfiguration;
    }
    if (configuration.fetchIdData) {
      this.properties.fetchIdData = configuration.fetchIdData;
    }
    if (configuration.singletonMode !== undefined) {
      this.properties.singletonMode = (configuration.singletonMode === true);
    }
  }

  init(electionDelayMSec = 3000) {
    let instance = this;
    let window = instance._window;
    instance._instanceCounters.addInstance(instance.properties);
    this._messenger = new CrossInstanceMessenger(instance.properties.id, window, instance._logger);
    this._messenger.onMessageReceived((message) => {
      let deliveryTimeMsec = (performance.now() - message.timestamp) | 0;
      instance._metrics.instanceMsgDeliveryTimer().record(deliveryTimeMsec);
      instance._logger.debug('Message received', message);
      switch (message.type) {
        case HelloMessage.TYPE:
          let hello = new HelloMessage();
          Object.assign(hello, message.payload);
          instance._handleHelloMessage(hello, message);
          break;
        case ProxyMethodCallMessage.TYPE:
          let pmc = new ProxyMethodCallMessage();
          Object.assign(pmc, message.payload);
          instance._handleProxyMethodCall(pmc);
          break;
      }
      instance._doFireEvent(MultiplexingEvent.ID5_MESSAGE_RECEIVED, message);
    });
    if (instance.properties.singletonMode === true) {
      // to provision uid ASAP
      instance._actAsLeader([this._follower]);
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
   * @param {FetchIdData} fetchIdData
   * @param {Object} [sourceConfiguration] - additional instance specific configuration
   * @param {boolean} [singletonMode] - allow to registeer instance in singleton mode
   */
  register(fetchIdData, sourceConfiguration = {}, singletonMode = false) {
    try {
      this.updateConfig({
        source: fetchIdData.origin,
        sourceVersion: fetchIdData.originVersion,
        sourceConfiguration: sourceConfiguration,
        fetchIdData: fetchIdData,
        singletonMode: singletonMode
      });
      this.init();
    } catch (e) {
      this._logger.error('Failed to register integration instance', e);
    }
    return this;
  }

  _handleHelloMessage(hello, message) {
    const instance = this;
    instance._addInstance(hello.instance);
    if (message.dst === DST_BROADCAST) { // this init message , so respond back to introduce myself
      // TODO if already leader elected let new instance know it's late joiner
      instance._messenger.sendResponseMessage(message, new HelloMessage(instance.properties), HelloMessage.TYPE);
    }
  }

  _handleProxyMethodCall(pmc) {
    const instance = this;
    instance._logger.info('Received ProxyMethodCall', JSON.stringify(pmc));
    if (pmc.target === MethodCallTarget.LEADER &&
      instance.role === Role.LEADER) {
      instance._leader[pmc.methodName](pmc.methodArguments);
    } else if (pmc.target === MethodCallTarget.FOLLOWER) {
      instance._follower[pmc.methodName](pmc.methodArguments);
    } else if (pmc.target === MethodCallTarget.THIS) {
      instance[pmc.methodName](pmc.methodArguments);
    }
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

  _addInstance(instanceProperties) {
    if (!this._knownInstances.get(instanceProperties.id)) {
      this._knownInstances.set(instanceProperties.id, instanceProperties);
      this._instanceCounters.addInstance(instanceProperties);
      this._metrics.instanceJoinDelayTimer().record((performance.now() - this._loadTime) | 0);
      if (this._leaderInstance !== undefined) {
        this._metrics.instanceLateJoinCounter(this.properties.id).inc();
      }
      this._logger.debug('Instance joined', instanceProperties.id);
      this._doFireEvent(MultiplexingEvent.ID5_INSTANCE_JOINED, instanceProperties);
    }
  }

  _doFireEvent(event, ...args) {
    this._dispatcher.emit(event, ...args);
  }

  _actAsLeader(followers) {
    const leader = new Leader(this._uidFetcher, this._consentManager, followers, this._logger);
    this._assignLeader(leader);
    leader.start();
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
    const properties = this.properties;
    const updatedData = {
      ...properties.fetchIdData,
      ...fetchIdDataUpdate
    };
    this._leader.updateFetchIdData(properties.id, updatedData);
  }

  refreshUid(options) {
    this._leader.refreshUid(options);
  }

  _scheduleLeaderElection(electionDelay) {
    const instance = this;
    setTimeout(() => {
      let instances = Array.from(instance._knownInstances.values());
      instances.push(instance.properties);
      let leader = electLeader(instances);
      instance._leaderInstance = leader;
      instance.role = (leader.id === instance.properties.id) ? Role.LEADER : Role.FOLLOWER;
      instance._doFireEvent(MultiplexingEvent.ID5_LEADER_ELECTED, instance.role, instance._leaderInstance);
      instance._logger.debug('Leader elected', leader.id, 'my role', instance.role);
      if (instance.role === Role.LEADER) {
        const proxyFollowers = Array.from(this._knownInstances.values())
          .filter(instance => !instance.singletonMode) // exclude all instances operating in singleton mode
          .map(instance => new ProxyFollower(instance, this._messenger));
        instance._actAsLeader([this._follower, ...proxyFollowers]); // leader for itself and others
      } else if (instance.role === Role.FOLLOWER) {
        instance._assignLeader(new LeaderProxy(this._messenger, leader.id)); // remote leader
      }
    }, electionDelay);
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
