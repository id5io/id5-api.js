import {
  ProxyMethodCallHandler,
  ProxyMethodCallTarget
} from './messaging.js';
import * as Utils from './utils.js';
import {
  // eslint-disable-next-line no-unused-vars
  Logger
} from './logger.js';
import {ActualLeader, AwaitedLeader, Leader, ProxyLeader} from './leader.js';
import {MultiplexingEvent} from './events.js';
import {FollowerType} from './follower.js';
import {ProxyFollower} from './followerProxy.js';
import {
  LocalStorage, ReplicatingStorage,
  /* eslint-disable no-unused-vars */
  StorageApi
  /* eslint-enable no-unused-vars */
} from './localStorage.js';
import {StorageConfig, Store} from './store.js';
import {ConsentManagement} from './consentManagement.js';
import {UidFetcher} from './fetch.js';
import {ClientStore} from './clientStore.js';
import {EXTENSIONS} from './extensions.js';
import {CachedUserIdProvisioner} from './cachedUserId.js';
import {MultiplexingInstance as CoreInstance, Role, OperatingMode, ElectionState} from './instanceCore.js';
import {
  instanceCounter,
  instanceJoinDelayTimer,
  instanceLastJoinDelayTimer,
  instanceLateJoinCounter,
  instanceLateJoinDelayTimer, instanceUnexpectedMsgCounter,
  instanceUniqPartnersCounter,
  instanceUniqueDomainsCounter,
  instanceUniqWindowsCounter
} from './metrics.js';

const ELECTION_DELAY_MS = 500;

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
   * @param {MeterRegistry} metrics
   * @param {Properties} properties
   */
  constructor(metrics, properties) {
    let id = properties.id;
    this._instancesCounter = instanceCounter(metrics, properties.id);
    this._windowsCounter = new UniqCounter(instanceUniqWindowsCounter(metrics, id));
    this._partnersCounter = new UniqCounter(instanceUniqPartnersCounter(metrics, id));
    this._domainsCounter = new UniqCounter(instanceUniqueDomainsCounter(metrics, id));
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
 * @param {MultiplexingInstance} instance
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
  _delayMs;
  _instance;

  constructor(instance) {
    this._instance = instance;
  }

  schedule(delayMs) {
    const election = this;
    election._delayMs = delayMs;
    this._timeoutId = setTimeout(() => {
      if (election._timeoutId) {
        election._timeoutId = undefined;
        election._instance._doElection();
        election._closeWithState(ElectionState.COMPLETED);
      }
    }, election._delayMs);
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

export class Instance extends CoreInstance {
  /**
   * @type DiscoveredInstance
   * @private
   */
  _lastJoinedInstance;
  /**
   * @type AwaitedLeader
   * @private
   */
  _leader;

  /**
   * @type AwaitedLeader
   * @private
   */
  _remoteCallsToLeaderHandler;
  /**
   * @type {InstancesCounters}
   * @private
   */
  _instanceCounters;
  /**
   * @type {Election}
   * @private
   */
  _election;
  /**
   * @type {StorageApi}
   * @private
   */
  _storage;
  /**
   * @type {TrueLinkAdapter}
   * @private
   */
  _trueLinkAdapter;

  /**
   * @type {CachedUserIdProvisioner}
   * @private
   */
  _cachedIdProvider;

  /**
   * @param {Window} wnd
   * @param {StorageApi} storage
   * @param {Properties} configuration
   * @param {MeterRegistry} metrics
   * @param {Logger} logger
   * @param {TrueLinkAdapter} trueLinkAdapter
   * @param {ClientStore} clientStore
   */
  constructor(wnd, configuration, storage, metrics, logger, trueLinkAdapter, clientStore) {
    super(wnd, configuration, metrics, logger);
    this._leader = new AwaitedLeader(); // AwaitedLeader buffers self requests to leader in case some events happened before leader is elected (i.e. consent update)
    this._remoteCallsToLeaderHandler = new AwaitedLeader(); // AwaitedLeader buffers remoted requests to leader received by this instace in case some events happened before leader is elected (i.e. consent update)
    this._instanceCounters = new InstancesCounters(metrics, this.properties);
    this._storage = storage;
    this._trueLinkAdapter = trueLinkAdapter;
    this._cachedIdProvider = new CachedUserIdProvisioner('self', new Store(clientStore, trueLinkAdapter), this._logger, this._metrics);
    this._election = new Election(this);
  }

  init() {
    super.init();
    let instance = this;
    instance._mode = instance.properties.singletonMode === true ? OperatingMode.SINGLETON : OperatingMode.MULTIPLEXING;
    instance._instanceCounters.addInstance(instance.properties);
    collectPartySizeMetrics(instance);
    instance._messenger
      .onProxyMethodCall(
        new ProxyMethodCallHandler(instance._logger)
          // register now to receive leader calls before actual leader is assigned
          // it may happen that some followers will elect this instance as the leader before elected instance knows it acts as the leader
          // this way all calls will be buffered and executed when actual leader is elected
          .registerTarget(ProxyMethodCallTarget.LEADER, instance._remoteCallsToLeaderHandler)
          // register it now to receive calls to follower before election is completed
          // it may happen that leader instance will elect them self as a leader with followers before all followers are aware they have a remote leader
          // this is very likely and happens quite frequently for late joiner, where Hello response can be delivered and handled after `notifyUidReady` by leader is called
          // leader have no idea if follower is ready and sends UID immediately when it's available (calls `notifyUidReady` method)
          .registerTarget(ProxyMethodCallTarget.FOLLOWER, instance._followerRole)
          .registerTarget(ProxyMethodCallTarget.STORAGE, instance._storage)
      );
    if (instance._mode === OperatingMode.SINGLETON) {
      // to provision uid ASAP
      instance._election.skip();
      instance._onLeaderElected(instance.properties); // self-proclaimed leader
    } else if (instance._mode === OperatingMode.MULTIPLEXING) {
      let electionDelayMSec = instance.properties.electionDelayMSec || ELECTION_DELAY_MS;
      instance._election.schedule(electionDelayMSec);
    }
  }

  /**
   *
   * @param {HelloMessage} hello
   * @param {DiscoveredInstance} joiningInstance
   * @private
   */
  _onInstanceDiscovered(hello, joiningInstance) {
    const isResponse = hello.isResponse;
    this._lastJoinedInstance = joiningInstance;
    this._instanceCounters.addInstance(joiningInstance.properties);
    instanceJoinDelayTimer(this._metrics, {
      election: this._election._state
    }).record((performance.now() - this._loadTime) | 0);
    if (!isResponse) { // new instance on the page
      if (this._mode === OperatingMode.MULTIPLEXING && this.role !== Role.UNKNOWN) { // after election
        this._handleLateJoiner(joiningInstance);
      }
    } else { // response from earlier loaded instance
      const providedLeader = joiningInstance.getInstanceMultiplexingLeader(); //
      if (this._mode === OperatingMode.MULTIPLEXING &&
        this.role === Role.UNKNOWN && // leader not elected yet
        providedLeader !== undefined // discovered instance has leader assigned
      ) {
        // this means I'm late joiner, so cancel election and inherit leader
        this._logger.info('Joined late, elected leader is', providedLeader);
        this._election.cancel();
        // act as follower
        this._onLeaderElected(providedLeader);
        // TODO what if another instance will provide different leader instance
        // TODO what if it will never get HELLO from leader
        // TODO should accept only if hello.leader === hello.instance -> this may guarantee that  leader will join follower ?
      }
    }
  }

  _createHelloMessage(isResponse = false) {
    let helloMessage = super._createHelloMessage(isResponse);
    helloMessage.instanceState.multiplexing = {
      ...helloMessage.instanceState.multiplexing,
      role: this.role,
      electionState: this._election?._state,
      leader: this._leader.getProperties()
    };
    return helloMessage;
  }

  _handleLateJoiner(newInstance) {
    this._logger.info('Late joiner detected', newInstance.properties);
    const lateJoinersCount = instanceLateJoinCounter(this._metrics, this.properties.id, {
      scope: 'party'
    }).inc();
    instanceLateJoinDelayTimer(this._metrics, {
      election: this._election._state,
      isFirst: lateJoinersCount === 1
    }).record(performance.now() - this._election._closeTime);
    if (newInstance.isMultiplexingPartyAllowed() && this.role === Role.LEADER) {
      let result = this._leader.addFollower(new ProxyFollower(newInstance, this._messenger, this._logger));
      if (result?.lateJoiner === true) {
        instanceLateJoinCounter(this._metrics, this.properties.id, {
          scope: 'leader',
          unique: (result?.uniqueLateJoiner === true)
        }).inc();
      }
    }
  }

  _doFireEvent(event, ...args) {
    this._dispatcher.emit(event, ...args);
  }

  _actAsLeader() {
    const properties = this.properties;
    const logger = this._logger;
    const metrics = this._metrics;
    const replicatingStorage = new ReplicatingStorage(this._storage);
    const localStorage = new LocalStorage(replicatingStorage);
    const storageConfig = new StorageConfig(properties.storageExpirationDays);
    const consentManagement = new ConsentManagement(localStorage, storageConfig, properties.forceAllowLocalStorageGrant, logger, metrics);
    const grantChecker = () => consentManagement.localStorageGrant('client-store');
    const store = new Store(new ClientStore(grantChecker, localStorage, storageConfig, logger), this._trueLinkAdapter);
    const fetcher = new UidFetcher(metrics, logger, EXTENSIONS.createExtensions(metrics, logger, store));

    const leader = new ActualLeader(this._window, properties, replicatingStorage, store, consentManagement, metrics, logger, fetcher);
    leader.addFollower(this._followerRole); // add itself to be directly called
    this._leader.assignLeader(leader);
    this._remoteCallsToLeaderHandler.assignLeader(leader); // accept all buffered and future remote calls to leader
    if (this._mode === OperatingMode.MULTIPLEXING) { // in singleton mode ignore remote followers
      Array.from(this._knownInstances.values())
        .filter(instance => instance.isMultiplexingPartyAllowed())
        // TODO handle passive followers
        .map(instance => leader.addFollower(new ProxyFollower(instance, this._messenger, logger, instance.isPassive() ? FollowerType.PASSIVE : FollowerType.STANDARD)));
    }
    // all prepared let's start
    leader.start();
  }

  /**
   *
   * @param {Properties} leaderInstance
   * @private
   */
  _followRemoteLeader(leaderInstance) {
    this._leader.assignLeader(new ProxyLeader(this._messenger, leaderInstance)); // remote leader
    this._remoteCallsToLeaderHandler.assignLeader(new IgnoringLeader(leaderInstance.id, this._logger, this._metrics)); // just to ignore/log/measure received messages that were sent by other instances
    this._logger.info('Following remote leader ', leaderInstance);
  }

  updateConsent(consentData) {
    this._leader.updateConsent(consentData, this.properties.id);
  }

  updateFetchIdData(fetchIdDataUpdate) {
    // first notify leader then update (to let leader recognise change - if updated follower = leader then shared object used and change )
    this._leader.updateFetchIdData(this.properties.id, fetchIdDataUpdate);
    Object.assign(this.properties.fetchIdData, fetchIdDataUpdate);
  }

  refreshUid(options) {
    this._leader.refreshUid(options, this.properties.id);
  }

  _doElection() {
    const election = this._election;
    const knownInstances = this._knownInstances;
    let electionCandidates = Array.from(knownInstances.values())
      .filter(knownInstance => knownInstance.isMultiplexingPartyAllowed() && knownInstance.isLeaderCapable())
      .map(knownInstance => knownInstance.properties);
    electionCandidates.push(this.properties);
    this._onLeaderElected(electLeader(electionCandidates));
    const lastJoinedInstance = this._lastJoinedInstance;
    if (lastJoinedInstance) {
      instanceLastJoinDelayTimer(this._metrics).record(Math.max(lastJoinedInstance._joinTime - election._scheduleTime, 0));
    }
  }

  /**
   *
   * @param {Properties} leader
   * @private
   */
  _onLeaderElected(leader) {
    const instance = this;
    instance.role = (leader.id === instance.properties.id) ? Role.LEADER : Role.FOLLOWER;
    // in singleton mode we always act as a leader , it's role is activated on init to  deliver UID ASAP
    if (instance.role === Role.LEADER) {
      instance._actAsLeader();
    } else if (instance.role === Role.FOLLOWER) {
      instance._followRemoteLeader(leader);
    }
    instance._logger.debug('Leader elected', leader.id, 'my role', instance.role);
    instance._doFireEvent(MultiplexingEvent.ID5_LEADER_ELECTED, instance.role, instance._leader.getProperties());
  }

  /**
   * @return {ProvisioningResult}
   */
  lookupForCachedId() {
    this._logger.info('Self lookup for cachedId triggered');
    return this._cachedIdProvider.provisionFromCache(this._followerRole);
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
    let result = -(Utils.semanticVersionCompare(instance1.version, instance2.version) | 0);
    if (result === 0) {
      // compare source lexicographical, will prefer 'api' over 'pbjs'
      result = instance1.source.localeCompare(instance2.source);
      if (result === 0) { // same source compare it's version
        result = -(Utils.semanticVersionCompare(instance1.sourceVersion, instance2.sourceVersion) | 0);
      }
      // still undetermined, then compare by frame depth
      if (result === 0) {
        const instance1Depth = instance1.fetchIdData?.refererInfo?.numIframes || Number.MAX_SAFE_INTEGER;
        const instance2Depth = instance2.fetchIdData?.refererInfo?.numIframes || Number.MAX_SAFE_INTEGER;
        // then closer to main page the higher chance it will survive longer, so it's better candidate to be leader
        result = instance1Depth - instance2Depth;
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

class IgnoringLeader extends Leader {
  /**
   * @type {MeterRegistry}
   * @private
   */
  _metrics;
  /**
   * @type {Logger}
   * @private
   */
  _log;

  /**
   * @type {string}
   * @private
   */
  _actualLeaderId;

  /**
   * @param {string} actualLeaderId
   * @param {Logger} logger
   * @param {MeterRegistry} metrics
   */
  constructor(actualLeaderId, logger, metrics) {
    super();
    this._log = logger;
    this._metrics = metrics;
    this._actualLeaderId = actualLeaderId;
  }

  /**
   * @private
   */
  _handleMethod(methodName, callerId) {
    try {
      this._log.warn('Received unexpected call method', methodName, ' call to leader from instance', callerId);
      instanceUnexpectedMsgCounter(this._metrics, {
        'target': 'remoteLeader',
        'methodName': methodName,
        'callFromLeader': this._actualLeaderId === callerId //not good, that would mean caller elected this instance as a leader and this instance elected caller as a leader
      });
    } catch (e) {
      // do nothing
    }
  }

  updateConsent(consentData, followerId) {
    this._handleMethod('updateConsent', followerId);
  }

  refreshUid(options, requester) {
    this._handleMethod('refreshUid', requester);
  }

  updateFetchIdData(instanceId) {
    this._handleMethod('updateFetchIdData', instanceId);
  }
}
