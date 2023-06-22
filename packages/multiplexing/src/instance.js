import {CrossInstanceMessenger, DST_BROADCAST} from './messaging.js';
import * as Utils from './utils.js';
import {version} from '../generated/version.js';
import {NamedLogger, NoopLogger} from './logger.js';

export const Role = Object.freeze({
  UNKNOWN: 'unknown',
  LEADER: 'leader',
  FOLLOWER: 'follower'
});

export const Event = Object.freeze({
  ID5_MESSAGE_RECEIVED: 'message',
  ID5_INSTANCE_JOINED: 'instance-joined',
  ID5_LEADER_ELECTED: 'leader-elected'
});

const SUPPORTED_EVENTS = Object.freeze(Object.values(Event));

export class Properties {
  id;
  version;
  source;
  sourceVersion;
  sourceConfiguration;
  href;
  domain;

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
    this.addInstance(properties);
  }

  /**
   *
   * @param {Properties} properties
   */
  addInstance(properties) {
    this._instancesCounter.inc();
    this._partnersCounter.add(properties?.sourceConfiguration?.options?.partnerId);
    this._domainsCounter.add(properties?.domain);
    this._windowsCounter.add(properties?.href);
  }
}

export class Instance {
  properties;
  /**
   * @type {CrossInstanceMessenger}
   * @private
   */
  _messenger;
  _knownInstances = new Map();
  role;
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

  _callbacks = new Map();

  /**
   * @type {InstancesCounters}
   * @private
   */
  _instanceCounters;

  /**
   * // TODO replace with object for future compatibility changes
   * @param source
   * @param sourceVersion
   * @param configuration
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   */
  constructor(window, source, sourceVersion, configuration, metrics, logger = NoopLogger) {
    const id = Utils.generateId();
    this.properties = new Properties(
      id,
      version,
      source,
      sourceVersion,
      configuration,
      window.location);
    this.role = Role.UNKNOWN;
    this._metrics = metrics;
    this._instanceCounters = new InstancesCounters(metrics, this.properties);
    this._loadTime = performance.now();
    this._logger = (logger !== undefined) ? new NamedLogger(`Instance(id=${id})`, logger) : NoopLogger;
    this._logger.debug('Instance created');
    this._window = window;
  }

  register(electionDelayMSec = 3000) {
    let instance = this;
    let window = instance._window;
    this._messenger = new CrossInstanceMessenger(instance.properties.id, window, instance._logger);
    this._messenger.onMessageReceived((message) => {
      let deliveryTimeMsec = (performance.now() - message.timestamp) | 0;
      instance._metrics.instanceMsgDeliveryTimer().record(deliveryTimeMsec);
      instance._logger.debug('Message received', message);
      switch (message.type) {
        case HelloMessage.TYPE:
          let hello = message.payload;
          instance._addInstance(hello.instance);
          if (message.dst === DST_BROADCAST) { // this init message , so respond back to introduce myself
            instance._messenger.sendResponseMessage(message, new HelloMessage(instance.properties), HelloMessage.TYPE);
          }
      }
      instance._doFireEvent(Event.ID5_MESSAGE_RECEIVED, message);
    });
    setTimeout(() => {
      let instances = Array.from(instance._knownInstances.values());
      instances.push(instance.properties);
      let leader = electLeader(instances);
      instance._leader = leader;
      instance.role = (leader.id === instance.properties.id) ? Role.LEADER : Role.FOLLOWER;
      instance._doFireEvent(Event.ID5_LEADER_ELECTED, instance.role, instance._leader);
      instance._logger.debug('Leader elected', leader.id, 'my role', instance.role);
    }, electionDelayMSec);
    instance._messenger.broadcastMessage(new HelloMessage(instance.properties), HelloMessage.TYPE);
    if (window.__id5_instances === undefined) {
      window.__id5_instances = [];
    }
    window.__id5_instances.push(this);
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

  getRole() {
    return this.role;
  }

  on(event, callback) {
    if (event !== undefined && SUPPORTED_EVENTS.includes(event)) {
      let eventCallbacks = this._callbacks.get(event);
      if (eventCallbacks) {
        eventCallbacks.push(callback);
      } else {
        this._callbacks.set(event, [callback]);
      }
    }
    return this;
  }

  _addInstance(instanceProperties) {
    if (!this._knownInstances.get(instanceProperties.id)) {
      this._knownInstances.set(instanceProperties.id, instanceProperties);
      this._instanceCounters.addInstance(instanceProperties);
      this._metrics.instanceJoinDelayTimer().record((performance.now() - this._loadTime) | 0);
      if (this._leader !== undefined) {
        this._metrics.instanceLateJoinCounter(this.properties.id).inc();
      }
      this._logger.debug('Instance joined', instanceProperties.id);
      this._doFireEvent(Event.ID5_INSTANCE_JOINED, instanceProperties);
    }
  }

  _doFireEvent(event, ...args) {
    const eventListeners = this._callbacks.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (e) {
          this._logger.error('Failed to call event listener', event, e);
        }
      });
    }
  }
}

/**
 *
 * @param {Array<Properties>} instances
 * @returns {Properties} leader instance
 */
export function

electLeader(instances) {
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

class HelloMessage {
  static TYPE = 'HelloMessage';
  instance;

  constructor(instanceProperties) {
    this.instance = instanceProperties;
  }
}
