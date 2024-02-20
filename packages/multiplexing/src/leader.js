import {
  /* eslint-disable-next-line no-unused-vars */
  Logger,
  NO_OP_LOGGER
} from './logger.js';
import {ProxyMethodCallTarget} from './messaging.js';

/* eslint-disable no-unused-vars */
import {ConsentData, NoConsentError} from './consent.js';
import {Store} from './store.js';

/* eslint-enable no-unused-vars */

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
  updateConsent() {
    // Abstract function
  }

  updateFetchIdData() {
    // Abstract function
  }

  /**
   * @param {RefreshOptions} refreshOptions
   */
  refreshUid() {
    // Abstract function
  }

  /**
   * @param {Follower} follower
   * @return {AddFollowerResult | undefined}
   */
  addFollower() {
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
  _refreshRequired = {};

  /**
   * @type {UidFetcher}
   * @private
   */
  _fetcher;

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
   * @type {Id5CommonMetrics}
   * @private
   */
  _metrics;

  /**
   * @type {ReplicatingStorage}
   * @private
   */
  _leaderStorage;

  /**
   * @type {Store} store
   * @private
   */
  _store;

  /**
   * @param {Window} window
   * @param {Properties} properties
   * @param {ReplicatingStorage} storage
   * @param {Store} store
   * @param {ConsentManagement} consentManager
   * @param {Id5CommonMetrics} metrics
   * @param {Logger} logger
   * @param {UidFetcher} fetcher
   */
  constructor(window, properties, storage, store, consentManager, metrics, logger = NO_OP_LOGGER, fetcher) {
    super();
    this._followers = [];
    this._fetcher = fetcher;
    this._properties = properties;
    this._consentManager = consentManager;
    this._metrics = metrics;
    this._window = window;
    this._leaderStorage = storage;
    this._log = logger;
    this._store = store;
    this._firstFetchTriggered = false;
  }

  /**
   *
   * @param {Array<FetchIdRequestData>} requestData
   * @param {RefreshResult} refreshResult
   * @private
   */
  _handleRefreshResult(requestData, refreshResult) {
    const refreshedResponse = refreshResult.refreshedResponse;
    if (refreshedResponse !== undefined) {
      for (const followerData of requestData) {
        // increase requests count for followers
        const followerId = followerData.integrationId;
        this._followersRequests[followerId] = (this._followersRequests[followerId] || 0) + 1;
      }
      const cascadeRequested = [];
      for (const follower of this._followers) {
        const responseForFollower = refreshedResponse.getResponseFor(follower.getId());
        if (responseForFollower !== undefined) {
          this._log.debug('Notify uid ready.', 'Follower:', follower.getId(), 'Uid:', responseForFollower);
          this._refreshRequired[follower.getId()] = false;
          this._notifyUidReady(follower, {
            timestamp: refreshedResponse.timestamp,
            responseObj: responseForFollower,
            isFromCache: false
          });
          if (responseForFollower.cascade_needed === true) {
            cascadeRequested.push(follower.getId());
          }
        }
      }
      // handle cascades
      const consentData = refreshResult.consentData;
      if (consentData !== undefined) {
        if (cascadeRequested.length > 0 && this._consentManager.localStorageGrant().isDefinitivelyAllowed()) {
          this._handleCascade(cascadeRequested, refreshedResponse, consentData);
        }
      }
    }
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
   * @param {Array<string>} cascadeRequested - follower selected to do cascade
   * @param {RefreshedResponse} refreshedResponse
   * @param {ConsentData} consentData
   * @private
   */
  _handleCascade(cascadeRequested, refreshedResponse, consentData) {
    const cascadeEligible =
      this._followers
        .filter(follower => cascadeRequested.find(id => follower.getId() === id) !== undefined && follower.canDoCascade())
        .sort((followerA, followerB) => {
          const getDepth = function (f) {
            return f.getFetchIdData().refererInfo?.stack?.length || Number.MAX_SAFE_INTEGER;
          };
          return getDepth(followerA) - getDepth(followerB);
        });
    if (cascadeEligible.length > 0) {
      const cascadeHandler = cascadeEligible[0];
      cascadeHandler.notifyCascadeNeeded({
        partnerId: cascadeHandler.getFetchIdData().partnerId, // just for backward compatibility , older multiplexing instances may need this
        userId: refreshedResponse.getResponseFor(cascadeHandler.getId()).universal_uid,
        gdprApplies: consentData.gdprApplies,
        consentString: consentData.consentString,
        gppString: consentData.gppData?.gppString,
        gppSid: consentData.gppData?.applicableSections?.join(',')
      });
    } else {
      this._log.error(`Couldn't find cascade eligible follower`);
    }
  }

  _handleCancel(reason) {
    for (const follower of this._followers) {
      follower.notifyFetchUidCanceled({reason: reason});
    }
  }

  _getId(forceRefresh = false) {
    let shouldRefresh = forceRefresh;
    const fetchIds = this._followers.map(follower => {
      const followerId = follower.getId();
      const requestCount = (this._followersRequests[followerId] || 0) + 1;
      const leaderId = this._properties.id;
      shouldRefresh = shouldRefresh || (this._refreshRequired[follower.getId()] === true);
      return {
        ...follower.getFetchIdData(),
        integrationId: followerId,
        requestCount: requestCount,
        role: leaderId === follower.getId() ? 'leader' : 'follower',
        cacheId: follower.getCacheId()
      };
    });
    this._inProgressFetch = true;
    this._firstFetchTriggered = true; // after first any new follower will be recognized as late joiner
    this._fetcher.getId(fetchIds, shouldRefresh)
      .then(refreshResult => {
        this._handleRefreshResult(fetchIds, refreshResult);
        this._handleFetchCompleted();
      })
      .catch(error => {
        if (error instanceof NoConsentError) {
          this._handleCancel(error.message);
        } else {
          this._handleFailed(error);
        }
        this._handleFetchCompleted();
      });
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
    const oldCacheId = toUpdate.getCacheId();
    toUpdate.updateFetchIdData(fetchIdData);
    const newCacheId = toUpdate.getCacheId();
    if (newCacheId !== oldCacheId) {
      this._log.info('Follower', toUpdate.getId(), 'cacheId changed from', oldCacheId, ' to', newCacheId, 'required refresh');
      this._refreshRequired[toUpdate.getId()] = true;
    }
  }

  addFollower(newFollower) {
    const logger = this._log;
    this._followers.push(newFollower);
    logger.info('Added follower', newFollower.getId(), 'cacheId', newFollower.getCacheId());
    if (this._window !== newFollower.getWindow()) {
      const followerStorage = newFollower.getStorage();
      logger.info(`Adding follower's`, newFollower.getId(), 'storage as replica');
      this._leaderStorage.addReplica(followerStorage);
    }

    const cacheId = newFollower.getCacheId();
    const responseFromCache = this._store.getCachedResponse(cacheId);
    const refreshRequired = !responseFromCache || !responseFromCache.isValid() || responseFromCache.isExpired();
    this._refreshRequired[newFollower.getId()] = refreshRequired;
    if (responseFromCache !== undefined && responseFromCache.isValid()) {
      logger.info('Found valid cached response for follower', {
        id: newFollower.getId(),
        cacheId: newFollower.getCacheId()
      });
      this._notifyUidReady(newFollower, {
        timestamp: responseFromCache.timestamp,
        responseObj: responseFromCache.response,
        isFromCache: true,
        willBeRefreshed: !!refreshRequired
      });
      this._store.incNb(cacheId);
    } else {
      logger.info(`Couldn't find response for cacheId`, newFollower.getCacheId());
    }

    let result = new AddFollowerResult();
    if (this._firstFetchTriggered === true) {
      result.lateJoiner = true;
      result.uniqueLateJoiner = !responseFromCache;
      if (refreshRequired) {
        this.refreshUid({
          forceFetch: true
        }); // this will be added to queue if in progress
      }
    }
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

  /**
   * @param {ConsentData} consentData
   */
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
