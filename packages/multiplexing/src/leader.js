import {ApiEvent, ApiEventsDispatcher} from './apiEvent.js';
import {NoopLogger} from './logger.js';
import {ProxyMethodCallTarget} from './messaging.js';

export class AddFollowerResult {
  lateJoiner = false;
  uniqueLateJoiner = false;
  constructor(lateJoiner = false, uniqueLateJoiner = false) {
    this.lateJoiner = lateJoiner;
    this.uniqueLateJoiner = uniqueLateJoiner;
  }
}

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
   * @return {AddFollowerResult | undefined}
   */
  addFollower(follower) {
    return undefined;
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
  _followersRequests = {};

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

  /**
   * @type {Id5UserId}
   * @private
   */
  _cachedResponse;
  /**
   * @type {boolean}
   * @private
   */
  _inProgressFetch;
  /**
   * @type {RefreshOptions}
   * @private
   */
  _queuedRefreshOptions;
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
    this._dispatcher.on(ApiEvent.USER_ID_FETCH_FAILED, event => leader._handleFailed(event));
    this._dispatcher.on(ApiEvent.USER_ID_FETCH_COMPLETED, event => leader._handleFetchCompleted(event));
    this._dispatcher.on(ApiEvent.CASCADE_NEEDED, cascade => leader._handleCascade(cascade));
    this._log = logger;
  }

  /**
   *
   * @param {Id5UserId} uid
   * @private
   */
  _handleUidReady(uid) {
    for (const follower of this._followers) {
      this._log.debug('Notify uid ready.', 'Follower:', follower.getId(), 'Uid:', uid);
      this._notifyUidReady(follower, uid);
    }
    this._cachedResponse = uid;
  }
  _notifyUidReady(follower, uid, lateJoiner = false) {
    const notificationContext = {
      timestamp: Date.now(),
      tags: {
        lateJoiner: lateJoiner,
        callType: follower.callType
      }
    };
    follower.notifyUidReady(uid, notificationContext);
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
    this._handleFetchCompleted();
  }

  _getId(forceRefresh = false) {
    const fetchIds = this._followers.map(follower => {
      const followerId = follower.getId();
      const requestCount = this._followersRequests[followerId] = (this._followersRequests[followerId] || 0) + 1;
      return {
        ...follower.getFetchIdData(),
        integrationId: followerId,
        requestCount: requestCount
      };
    });
    this._inProgressFetch = true;
    this._fetcher.getId(this._dispatcher, fetchIds, forceRefresh);
  }

  start() {
    if (this._started !== true) {
      this._getId(false);
      this._started = true;
    }
  }

  /**
   *
   * @param {RefreshOptions} options
   */
  refreshUid(options = {}) {
    if (this._inProgressFetch) {
      this._queuedRefreshOptions = options;
      return;
    }
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
        }).inc();
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

  addFollower(newFollower) {
    const newJoinerId = newFollower.getId();
    const cachedResponse = this._cachedResponse;
    const logger = this._log;
    this._followers.push(newFollower);
    logger.debug('Added follower', newJoinerId, 'last uid', cachedResponse);
    let result = new AddFollowerResult();
    if (cachedResponse || this._inProgressFetch) { // late joiner
      result.lateJoiner = true;
      if (cachedResponse) {
        // notify new joiner immediately
        this._notifyUidReady(newFollower, {
          ...cachedResponse,
          isFromCache: true // to let follower know it's from cache
        }, true);
      }

      const isSimilarToAnyOther = this._followers
        .filter(follower => follower.getId() !== newJoinerId)
        .some(follower => newFollower.isSimilarTo(follower));

      if (!isSimilarToAnyOther) { // if new require refresh
        logger.debug('Will refresh uid for new joiner', newJoinerId);
        this.refreshUid({
          forceFetch: true
        }); // this will be added to queue if in progress
        result.uniqueLateJoiner = true;
      }
    }
    // TODO nbPage increase when provide UID to any instance
    // TODO nbPage reset when refreshUID received
    return result;
  }

  /**
   * @return {Properties}
   */
  getProperties() {
    return this._properties;
  }

  _handleFetchCompleted() {
    this._inProgressFetch = undefined;
    if (this._queuedRefreshOptions) {
      this.refreshUid(this._queuedRefreshOptions);
      this._queuedRefreshOptions = undefined;
    }
  }

  _handleFailed(fail) {
    this._log.error('Fetch id failed', fail);
    for (const follower of this._followers) {
      follower.notifyFetchUidCanceled({reason: 'error'});
    }
    this._handleFetchCompleted();
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
    return this._callOrBuffer('addFollower', [follower]);
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
      return this._callAssignedLeader(name, args);
    } else { // add to queue
      this._callsQueue.push({
        name: name,
        args: args
      });
      return undefined;
    }
  }

  _callAssignedLeader(methodName, methodArgs) {
    return this._assignedLeader[methodName](...methodArgs);
  }
}
