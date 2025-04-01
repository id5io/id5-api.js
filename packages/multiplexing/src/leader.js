import {
  /* eslint-disable-next-line no-unused-vars */
  Logger,
  NO_OP_LOGGER
} from './logger.js';
import {ProxyMethodCallTarget} from './messaging.js';
import {ConsentSource} from './consent.js';
import {API_TYPE} from './consent.js';
/* eslint-disable no-unused-vars */
import {ConsentData} from './consent.js';
import {Store} from './store.js';
import {WindowStorage} from './localStorage.js';
import {RefreshedResponse} from './fetch.js';
import {CachedUserIdProvisioner} from './cachedUserId.js';
import {consentChangeCounter, consentIgnoreCounter, refreshCallCounter} from './metrics.js';

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
   * @type {Array}
   * @private
   */
  _queuedRefreshArgs;
  /**
   * @type {ConsentData}
   * @private
   */
  _lastConsentDataSet;
  /**
   * @type {MeterRegistry}
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
   * @param {MeterRegistry} metrics
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
    this._cachedIdProvider = new CachedUserIdProvisioner('leader', this._store, this._log, this._metrics);
  }

  /**
   *
   * @param {Array<FetchIdRequestData>} requestData
   * @param {Map<string, CachedResponse>} cachedData
   * @param {ConsentData} consentData
   * @param {RefreshedResponse} refreshedResponse
   * @private
   */
  _handleRefreshResult(requestData, cachedData, consentData, refreshedResponse) {
    const log = this._log;
    const consentManager = this._consentManager;
    const store = this._store;
    if (refreshedResponse !== undefined) {
      // privacy has to be stored first, so we can use it when storing other values
      consentManager.setStoredPrivacy(refreshedResponse.getGenericResponse()?.privacy);
      const localStorageGrant = consentManager.localStorageGrant('fetcher-after-response');
      if (localStorageGrant.isDefinitivelyAllowed()) {
        log.info('Storing ID and request hashes in cache');
        store.updateNbs(cachedData);
        store.storeResponse(requestData, refreshedResponse);
      } else {
        log.info('Cannot use local storage to cache ID', localStorageGrant);
        store.clearAll(requestData);
      }

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
      if (consentData !== undefined) {
        if (cascadeRequested.length > 0 && this._consentManager.localStorageGrant('leader-before-cascade').isDefinitivelyAllowed()) {
          this._handleCascade(cascadeRequested, refreshedResponse, consentData);
        }
      }
    }
  }

  _notifyUidReady(follower, uid) {
    const notificationContext = {
      timestamp: Date.now(),
      provisioner: 'leader',
      tags: {
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
    const log = this._log;
    this._waitForConsent().then(consentData => {
      const localStorageGrant = this._consentManager.localStorageGrant('fetch-before-request');
      log.info('Local storage grant', localStorageGrant);
      if (!localStorageGrant.allowed) {
        log.info('No legal basis to use ID5', consentData);
        this._store.clearAll(this._followers.map(follower => {
          return {cacheId: follower.getCacheId()};
        }));
        this._handleCancel('No legal basis to use ID5');
      } else {
        const consentHasChanged = this._store.hasConsentChanged(consentData);
        // store hashed consent data for future page loads if local storage allowed
        if (localStorageGrant.isDefinitivelyAllowed()) {
          this._store.storeConsent(consentData);
        }

        // with given consent we can check if it is accessible
        const isLocalStorageAvailable = WindowStorage.checkIfAccessible();

        /** @type {Map<string, CachedResponse>} */
        const cacheData = new Map();
        let shouldRefresh = forceRefresh;
        const fetchRequestData = this._followers.map(follower => {
          const followerId = follower.getId();
          const requestCount = (this._followersRequests[followerId] || 0) + 1;
          const leaderId = this._properties.id;
          const refreshRequired = this._refreshRequired[follower.getId()] === true;
          shouldRefresh = shouldRefresh || refreshRequired;
          const cacheId = follower.getCacheId();
          if (!cacheData.has(cacheId)) {
            const cachedResponse = this._store.getCachedResponse(cacheId);
            if (cachedResponse) {
              cacheData.set(cacheId, cachedResponse);
            }
          }
          return {
            ...follower.getFetchIdData(),
            integrationId: followerId,
            requestCount: requestCount,
            refresh: refreshRequired,
            role: leaderId === follower.getId() ? 'leader' : (follower.type || 'follower'),
            cacheId: cacheId,
            cacheData: cacheData.get(cacheId),
            sourceVersion: follower.getSourceVersion(),
            source: follower.getSource()
          };
        });

        // make a call to fetch a new ID5 ID if:
        // - consent has changed since the last ID was fetched
        if (consentHasChanged || shouldRefresh) {
          log.info(`Decided to fetch a fresh ID5 ID`, {
            consentHasChanged,
            shouldRefresh
          });

          log.info(`Fetching ID5 ID (forceFetch:${forceRefresh})`);
          this._inProgressFetch = true;
          this._firstFetchTriggered = true; // after first any new follower will be recognized as late joiner
          this._fetcher.fetchId(fetchRequestData, consentData, isLocalStorageAvailable)
            .then(refreshResult => {
              this._handleRefreshResult(fetchRequestData, cacheData, consentData, refreshResult);
              this._handleFetchCompleted();
            })
            .catch(error => {
              this._handleFailed(error);
              this._handleFetchCompleted();
            });
        } else {
          log.info('Not decided to refresh ID5 ID', {consentHasChanged, shouldRefresh});
          // to let caller know it's done
          this._handleFetchCompleted();
        }
      }
    });
  }

  _waitForConsent() {
    const log = this._log;
    const consentManager = this._consentManager;
    const metrics = this._metrics;

    log.info('Waiting for consent');
    const waitForConsentTimer = metrics.timer('fetch.consent.wait.time');
    return consentManager.getConsentData().then(consentData => {
      log.info('Consent received', consentData);
      if (waitForConsentTimer) {
        waitForConsentTimer.recordNow();
      }
      return consentData;
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
   * @param {String} followerId
   */
  refreshUid(options = {}, followerId) {
    const forceRefresh = options.forceFetch === true;
    if (followerId) { // to be backward compatible
      if (forceRefresh) {
        this._refreshRequired[followerId] = true;
      } else {
        const requestingFollower = this._followers.find((follower) => follower.getId() === followerId);
        if (requestingFollower) {
          this._provisionFromCache(requestingFollower);
        }
      }
    }
    refreshCallCounter(this._metrics, 'leader', {
      overwrites: this._queuedRefreshArgs === undefined
    }).inc();
    this._callRefresh(options, followerId);
  }

  _callRefresh(options = {}, followerId) {
    if (this._inProgressFetch) {
      this._queuedRefreshArgs = [options, followerId];
      return;
    }
    if (options.resetConsent === true) {
      this._consentManager.resetConsentData(options.forceAllowLocalStorageGrant === true);
      this._awaitedConsentFrom = followerId;
    }
    this._getId(options.forceFetch === true);
  }

  /**
   *
   * @param {ConsentData} newConsentData
   * @param {string} followerId
   */
  updateConsent(newConsentData, followerId) {
    if (!this._consentManager.hasConsentSet()) {
      const declaredConsentSources = new Set(this._followers.map(follower => follower.getDeclaredConsentSource())
       .filter(consentSource => consentSource !== ConsentSource.none) // ignore none
      );
      const receivedConsentSource = newConsentData.source || ConsentSource.cmp;
      const onlyPartnerDeclared = declaredConsentSources.size === 1 && declaredConsentSources.has(ConsentSource.partner);
      if (this._awaitedConsentFrom) { // follower called refresh and requested consent reset
        if (this._awaitedConsentFrom === followerId) {
          this._consentManager.setConsentData(newConsentData);
          this._awaitedConsentFrom = undefined;
        } else {
          this._handleIgnoredConsent(newConsentData, 'awaited');
        }
      } else if (receivedConsentSource !== ConsentSource.partner || onlyPartnerDeclared) {
        this._consentManager.setConsentData(newConsentData);
      } else {
        this._handleIgnoredConsent(newConsentData, 'partner');
      }
    } else {
      this._handleIgnoredConsentUpdate(newConsentData);
    }
    // TODO update? compare? refresh?
  }

  _handleIgnoredConsentUpdate(newConsentData) {
    try {
      const prevConsentData = this._consentManager._consentDataHolder.getValue();
      if (prevConsentData) {
        const tags = {};
        const receivedConsentData = ConsentData.createFrom(newConsentData);
        Object.values(API_TYPE).forEach(apiType => {
          if (receivedConsentData.apiTypes.includes(apiType) && prevConsentData.apiTypes.includes(apiType)) {
            const prevApiData = JSON.stringify(prevConsentData.getApiTypeData(apiType));
            const receivedApiData = JSON.stringify(receivedConsentData.getApiTypeData(apiType));
            tags[apiType] = prevApiData === receivedApiData ? 'same' : 'different';
          } else if (receivedConsentData.apiTypes.includes(apiType)) {
            tags[apiType] = 'added';
          } else if (prevConsentData.apiTypes.includes(apiType)) {
            tags[apiType] = 'missed';
          }
        });
        consentChangeCounter(this._metrics, tags).inc();
      }
    } catch (e) {
      this._log.error(e);
    }
  }

  _handleIgnoredConsent(newConsentData, reason) {
    try {
      const tags = {
        reason: reason,
        source: newConsentData.source
      };
      newConsentData.apiTypes.forEach(apiType => tags[apiType] = true);
      consentIgnoreCounter(this._metrics, tags).inc();
    } catch (e) {
      this._log.error(e);
    }
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

  /**
   *
   * @param {Follower} newFollower
   * @return {AddFollowerResult}
   */
  addFollower(newFollower) {
    const logger = this._log;
    const isUnique = this._followers.find((follower) => follower.getCacheId() === newFollower.getCacheId()) === undefined;
    this._followers.push(newFollower);
    logger.debug('Added follower', newFollower.getId(), 'cacheId', newFollower.getCacheId());
    if (this._window !== newFollower.getWindow()) {
      const followerStorage = newFollower.getStorage();
      logger.debug(`Adding follower's`, newFollower.getId(), 'storage as replica');
      this._leaderStorage.addReplica(followerStorage);
    }
    const refreshRequired = this._provisionFromCache(newFollower);

    let result = new AddFollowerResult();
    const isLateJoiner = this._firstFetchTriggered === true;
    if (isLateJoiner) {
      result.lateJoiner = true;
      result.uniqueLateJoiner = isUnique;
      if (refreshRequired) {
        this._callRefresh({
          forceFetch: true
        }); // this will be added to queue if in progress
      }
    }
    return result;
  }

  _provisionFromCache(newFollower) {
    const provisionResult = this._cachedIdProvider.provisionFromCache(newFollower);
    this._refreshRequired[newFollower.getId()] = provisionResult.refreshRequired;
    if (provisionResult.provisioned) {
      this._store.incNb(provisionResult.cacheId);
    }
    return provisionResult.refreshRequired;
  }

  /**
   * @return {Properties}
   */
  getProperties() {
    return this._properties;
  }

  _handleFetchCompleted() {
    this._inProgressFetch = undefined;
    if (this._queuedRefreshArgs) {
      this._callRefresh(...this._queuedRefreshArgs);
      this._queuedRefreshArgs = undefined;
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

  updateConsent(consentData, followerId) {
    this._sendToLeader('updateConsent', [consentData, followerId]);
  }

  refreshUid(options, requester) {
    this._sendToLeader('refreshUid', [options, requester]);
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
   * @param {string} followerId - consent data sender
   */
  updateConsent(consentData, followerId) {
    this._callOrBuffer('updateConsent', [consentData, followerId]);
  }

  updateFetchIdData(instanceId, fetchIdData) {
    this._callOrBuffer('updateFetchIdData', [instanceId, fetchIdData]);
  }

  refreshUid(refreshOptions, requester) {
    this._callOrBuffer('refreshUid', [refreshOptions, requester]);
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
