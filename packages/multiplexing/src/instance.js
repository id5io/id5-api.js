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

  constructor(id, version, source, sourceVersion, sourceConfiguration) {
    this.id = id;
    this.version = version;
    this.source = source;
    this.sourceVersion = sourceVersion;
    this.sourceConfiguration = sourceConfiguration;
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
   * // TODO replace with object for future compatibility changes
   * @param source
   * @param sourceVersion
   * @param configuration
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   */
  constructor(source, sourceVersion, configuration, metrics, logger = NoopLogger) {
    const id = Utils.generateId();
    this.properties = new Properties(
      id,
      version,
      source,
      sourceVersion,
      configuration);
    this.role = Role.UNKNOWN;
    this._metrics = metrics;
    this._metrics.instanceCounter(id).inc();
    this._loadTime = performance.now();
    this._logger = (logger === undefined) ? new NamedLogger(`Instance(id=${id})`, logger) : NoopLogger;
    this._logger.debug('Instance created');
  }

  register(window, electionDelayMSec = 3000) {
    let instance = this;
    this._messenger = new CrossInstanceMessenger(instance.properties.id, window);
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
    this._messenger.broadcastMessage(new HelloMessage(this.properties), HelloMessage.TYPE);
    if (window.__id5_instances === undefined) {
      window.__id5_instances = [];
    }
    window.__id5_instances.push(this);
  }

  deregister() {
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
      this._metrics.instanceCounter(this.properties.id).inc();
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
  static TYPE = HelloMessage.constructor.name;
  instance;

  constructor(instanceProperties) {
    this.instance = instanceProperties;
  }
}
