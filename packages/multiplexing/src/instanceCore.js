import {CrossInstanceMessenger, DST_BROADCAST, HelloMessage} from './messaging.js';
import * as Utils from './utils.js';
import {version} from '../generated/version.js';
import {Logger, NO_OP_LOGGER} from './logger.js';
import {ApiEventsDispatcher, MultiplexingEvent} from './events.js';
import {instanceMsgDeliveryTimer} from './metrics.js';

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
  SINGLETON: 'singleton',
  MULTIPLEXING_PASSIVE: 'multiplexing-passive'
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
   * @type {string} source where this instance were loaded from (api/api-lite/id5-prebid-ext-module other)
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
  /**
   * @type {boolean}
   */
  canDoCascade;
  /**
   *
   * @type {boolean}
   */
  forceAllowLocalStorageGrant;
  /**
   *
   * @type {number|undefined}
   */
  storageExpirationDays;

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
   * @type {WindowProxy}
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
    const operatingMode = this.knownState?.operatingMode;
    return operatingMode === OperatingMode.MULTIPLEXING || operatingMode === OperatingMode.MULTIPLEXING_PASSIVE;
  }

  getInstanceMultiplexingLeader() {
    if (this.knownState?.operatingMode !== OperatingMode.MULTIPLEXING) {
      return undefined;
    }
    return this.knownState?.multiplexing?.leader;
  }

  getWindow() {
    return this._window;
  }
}

export class MultiplexingInstance {
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
   * @type MultiplexingRole
   */
  role;

  /**
   * @type OperatingMode
   */
  _mode;
  /**
   * @type {MeterRegistry}
   * @private
   */
  _metrics;
  /**
   * @type {MultiplexingLogger}
   * @private
   */
  _logger;

  /**
   * @type {Window} instance window
   * @private
   */
  _window;

  /**
   * @param {Window} wnd
   * @param {Properties} configuration
   * @param {MeterRegistry} metrics
   * @param {Logger} logger
   */
  constructor(wnd, configuration, metrics, logger) {
    const id = Utils.generateId();
    this.properties = Object.assign({
      id: id,
      version: version,
      href: wnd.location?.href,
      domain: wnd.location?.hostname
    }, configuration);
    this.role = Role.UNKNOWN;
    this._metrics = metrics;
    this._loadTime = performance.now();
    this._logger = new MultiplexingLogger(logger, this);
    this._window = wnd;
    this._dispatcher = new ApiEventsDispatcher(this._logger);
  }

  /**
   *
   * @param {Object} configuration properties
   */
  updateConfig(configuration) {
    Object.assign(this.properties, configuration);
  }

  /**
   * @param {Properties} properties
   */
  register(properties) {
    try {
      this.updateConfig(properties);
      this.init();
      // ready to introduce itself to other instances
      this._messenger.broadcastMessage(this._createHelloMessage(false), HelloMessage.TYPE);
    } catch (e) {
      this._logger.error('Failed to register integration instance', e);
    }
    return this;
  }

  init() {
    let instance = this;
    let window = instance._window;
    instance._mode = OperatingMode.MULTIPLEXING_PASSIVE;
    instance._messenger = new CrossInstanceMessenger(instance.properties.id, window, instance._logger, instance._metrics);
    instance._messenger
      .onAnyMessage((message, source) => {
        let deliveryTimeMsec = (Date.now() - message.timestamp) | 0;
        instanceMsgDeliveryTimer(instance._metrics,{
          messageType: message.type,
          sameWindow: window === source
        }).record(deliveryTimeMsec);
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
      });
  }

  /**
   *
   * @param {HelloMessage} hello
   * @param {Id5Message} message - id5 message object which delivered  this hello
   * @param {WindowProxy} srcWindow
   * @private
   */
  _handleHelloMessage(hello, message, srcWindow) {
    const isResponse = hello.isResponse;
    const joiningInstance = new DiscoveredInstance(hello.instance, hello.instanceState, srcWindow);
    if (!this._knownInstances.get(joiningInstance.getId())) {
      this._knownInstances.set(joiningInstance.getId(), joiningInstance);
      if (!isResponse) { // new instance on the page
        // this is init message , so respond back to introduce itself
        // we need to respond ASAP to get this info available for potential follower
        // to let it know in case this instance is the leader and before joining instance is added to followers
        // in case uid is ready, the leader will try to deliver it but follower may not be ready to receive/handle msg
        this._messenger.sendResponseMessage(message, this._createHelloMessage(true), HelloMessage.TYPE);
      }
      this._logger.debug('Instance joined', joiningInstance.getId());
      this._doFireEvent(MultiplexingEvent.ID5_INSTANCE_JOINED, joiningInstance.properties);
      this._onInstanceDiscovered(hello, joiningInstance);
    } else {
      this._logger.debug('Instance already known', joiningInstance.getId());
    }
  }

  unregister() {
    this._logger.info('Unregistering');
    if (this._messenger) {
      this._messenger.unregister();
    }
  }

  on(event, callback) {
    this._dispatcher.on(event, callback);
    return this;
  }

  /**
   *
   * @private
   */
  _onInstanceDiscovered() {
  }

  _createHelloMessage(isResponse = false) {
    /**
     * @type InstanceState
     */
    let state = {
      operatingMode: this._mode,
      knownInstances: Array.from(this._knownInstances.values()).map(i => i.properties)
    };

    return new HelloMessage(this.properties, isResponse, state);
  }


  _doFireEvent(event, ...args) {
    this._dispatcher.emit(event, ...args);
  }

  getId() {
    return this.properties.id;
  }
}

class MultiplexingLogger extends Logger {
  /**
   * @type {MultiplexingInstance}
   * @private
   */
  _instance;

  constructor(logger, instance) {
    super();
    this._delegate = logger ? logger : NO_OP_LOGGER;
    this._instance = instance;
  }

  _prefix() {
    return `Instance(id=${this._instance.getId()}, role=${this._instance.role})`;
  }

  debug(...args) {
    this._delegate.debug(new Date().toISOString(), this._prefix(), ...args);
  }

  info(...args) {
    this._delegate.info(new Date().toISOString(), this._prefix(), ...args);
  }

  warn(...args) {
    this._delegate.warn(new Date().toISOString(), this._prefix(), ...args);
  }

  error(...args) {
    this._delegate.error(new Date().toISOString(), this._prefix(), ...args);
  }
}
