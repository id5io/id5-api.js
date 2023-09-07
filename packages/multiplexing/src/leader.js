import {ApiEvent, ApiEventsDispatcher} from './apiEvent.js';
import {NoopLogger} from './logger.js';
import {ProxyMethodCallTarget} from './messaging.js';

/**
 * @interface
 */
export class Leader {
  updateConsent(consentData) {
  }

  updateFetchIdData(instanceId, fetchIdData) {
  }

  /**
   *
   * @param {RefreshOptions} refreshOptions
   */
  refreshUid(refreshOptions) {
  }

  /**
   *
   * @param {Follower} follower
   */
  addFollower(follower) {
  }

  /**
   *
   * @return {Properties | undefined}
   */
  getProperties() {
    return undefined;
  }
}

export class ActualLeader extends Leader {
  /**
   * @type Array<Follower>
   * @private
   */
  _followers;

  /**
   * @type {UidFetcher}
   * @private
   */
  _fetcher;

  /**
   * @type {ApiEventsDispatcher}
   * @private
   */
  _dispatcher;

  /**
   * @type {Logger}
   * @private
   */
  _log;

  /**
   * @type {ConsentManagement}
   * @private
   */
  _consentManager;

  _lastUid;

  /**
   * @type {ConsentData}
   * @private
   */
  _lastConsentDataSet;
  /**
   * @type Id5CommonMetrics
   * @private
   */
  _metrics;

  /**
   * @param {UidFetcher} fetcher
   * @param {ConsentManagement} consentManager
   * @param {Properties} properties
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   */
  constructor(fetcher, consentManager, properties, metrics, logger = NoopLogger) {
    super();
    this._followers = [];
    this._fetcher = fetcher;
    this._properties = properties;
    this._consentManager = consentManager;
    this._metrics = metrics;
    const leader = this;
    this._dispatcher = new ApiEventsDispatcher(logger);
    this._dispatcher.on(ApiEvent.USER_ID_READY, uid => leader._handleUidReady(uid));
    this._dispatcher.on(ApiEvent.USER_ID_FETCH_CANCELED, cancel => leader._handleCancel(cancel));
    this._dispatcher.on(ApiEvent.CASCADE_NEEDED, cascade => leader._handleCascade(cascade));
    this._log = logger;
  }

  _handleUidReady(uid) {
    for (const follower of this._followers) {
      this._log.debug('Notify uid ready.', 'Follower:', follower.getId(), 'Uid:', uid);
      follower.notifyUidReady(uid);
    }
    this._lastUid = uid;
  }

  /**
   *
   * @param {CascadePixelCall} cascade
   * @private
   */
  _handleCascade(cascade) {
    const cascadeEligible =
      this._followers.filter(follower => follower.canDoCascade(cascade))
        .sort((followerA, followerB) => {
          const getDepth = function (f) {
            return f.getFetchIdData().refererInfo?.stack?.length || Number.MAX_SAFE_INTEGER;
          };
          return getDepth(followerA) - getDepth(followerB);
        });
    if (cascadeEligible.length > 0) {
      cascadeEligible[0].notifyCascadeNeeded(cascade);
    } else {
      this._log.error(`Couldn't find cascade eligible follower`);
    }
  }

  _handleCancel(cancel) {
    for (const follower of this._followers) {
      follower.notifyFetchUidCanceled(cancel);
    }
  }

  _getId(forceRefresh = false) {
    const fetchIds = this._followers.map(follower => {
      return {
        ...follower.getFetchIdData(),
        integrationId: follower.getId()
      };
    });
    this._fetcher.getId(this._dispatcher, fetchIds, forceRefresh);
  }

  start() {
    // TODO handle in progress
    this._getId(false);
  }

  refreshUid(options = {}) {
    if (options.resetConsent === true) {
      this._consentManager.resetConsentData(options.forceAllowLocalStorageGrant === true);
    }
    this._getId(options.forceFetch === true);
  }

  /**
   *
   * @param {ConsentData} newConsentData
   */
  updateConsent(newConsentData) {
    const prevConsentData = this._lastConsentDataSet;
    if (prevConsentData) {
      const apiChanged = newConsentData?.api !== prevConsentData.api;
      const consentStringChanged = newConsentData?.consentString !== prevConsentData.consentString;
      const usPrivacyChanged = newConsentData?.ccpaString !== prevConsentData.ccpaString;
      if (apiChanged || consentStringChanged || usPrivacyChanged) {
        this._metrics.consentChangeCounter({
          apiChanged: apiChanged,
          consentStringChanged: consentStringChanged,
          usPrivacyChanged: usPrivacyChanged
        });
      }
    }
    this._consentManager.setConsentData(newConsentData);
    this._lastConsentDataSet = newConsentData;
  }

  updateFetchIdData(instanceId, fetchIdData) {
    const toUpdate = this._followers.find(instance => instance.getId() === instanceId);
    toUpdate.updateFetchIdData(fetchIdData);
    // TODO should refreshId ??
  }

  addFollower(follower) {
    this._log.debug('Added follower', follower.getId(), 'last uid', this._lastUid);
    if (this._lastUid) { // late joiner
      // if redy just notify follower
      follower.notifyUidReady(this._lastUid);
    }
    this._followers.push(follower);
  }

  getProperties() {
    return this._properties;
  }
}

export class ProxyLeader extends Leader {
  /**
   * @type {CrossInstanceMessenger}
   * @private
   */
  _messenger;
  /**
   * @type {Properties}
   * @private
   */
  _leaderInstanceProperties;

  /**
   *
   * @param {CrossInstanceMessenger} messenger
   * @param {Properties} leaderInstanceProperties
   */
  constructor(messenger, leaderInstanceProperties) {
    super();
    this._messenger = messenger;
    this._leaderInstanceProperties = leaderInstanceProperties;
  }

  /**
   * @private
   */
  _sendToLeader(methodName, args) {
    this._messenger.callProxyMethod(this._leaderInstanceProperties.id, ProxyMethodCallTarget.LEADER, methodName, args);
  }

  updateConsent(consentData) {
    this._sendToLeader('updateConsent', [consentData]);
  }

  refreshUid(options) {
    this._sendToLeader('refreshUid', [options]);
  }

  updateFetchIdData(instanceId, fetchIdData) {
    this._sendToLeader('updateFetchIdData', [instanceId, fetchIdData]);
  }

  getProperties() {
    return this._leaderInstanceProperties;
  }
}

export class AwaitedLeader extends Leader {
  _callsQueue = [];
  _assignedLeader;

  updateConsent(consentData) {
    this._callOrBuffer('updateConsent', [consentData]);
  }

  updateFetchIdData(instanceId, fetchIdData) {
    this._callOrBuffer('updateFetchIdData', [instanceId, fetchIdData]);
  }

  refreshUid(refreshOptions) {
    this._callOrBuffer('refreshUid', [refreshOptions]);
  }

  addFollower(follower) {
    this._callOrBuffer('addFollower', [follower]);
  }

  getProperties() {
    if (this._assignedLeader) {
      return this._assignedLeader.getProperties();
    }
    return undefined;
  }

  /**
   *
   * @param {Leader} newLeader
   */
  assignLeader(newLeader) {
    this._assignedLeader = newLeader;
    for (const methodCall of this._callsQueue) {
      this._callAssignedLeader(methodCall.name, methodCall.args);
    }
    this._callsQueue = [];
  }

  _callOrBuffer(name, args) {
    if (this._assignedLeader) {
      this._callAssignedLeader(name, args);
    } else { // add to queue
      this._callsQueue.push({
        name: name,
        args: args
      });
    }
  }

  _callAssignedLeader(methodName, methodArgs) {
    this._assignedLeader[methodName](...methodArgs);
  }
}
