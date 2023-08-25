import {UidFetcher} from './fetch.js';
import {ApiEvent, ApiEventsDispatcher} from './apiEvent.js';
import {Logger, NoopLogger} from './logger.js';
import {CrossInstanceMessenger, MethodCallTarget} from './messaging.js';

/**
 * @interface
 */
export class LeaderApi {
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

  onLeaderChange(newLeader) {
  }
}

export class Leader extends LeaderApi {

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
   * @type {ConsentManager}
   * @private
   */
  _consentManager;

  /**
   * @param {UidFetcher} fetcher
   * @param Array{Follower} followers
   */
  constructor(fetcher, consentManager, followers, logger = NoopLogger) {
    super();
    this._dispatcher = new ApiEventsDispatcher(logger);
    this._fetcher = fetcher;
    this._followers = followers;
    this._consentManager = consentManager;
    const leader = this;
    this._dispatcher.on(ApiEvent.USER_ID_READY, uid => leader._handleUidReady(uid));
    this._dispatcher.on(ApiEvent.USER_ID_FETCH_CANCELED, cancel => leader._handleCancel(cancel));
    this._dispatcher.on(ApiEvent.CASCADE_NEEDED, cascade => leader._handleCascade(cascade));
  }

  _handleUidReady(uid) {
    for (const follower of this._followers) {
      follower.notifyUidReady(uid);
    }
  }

  /**
   *
   * @param {CascadePixelCall} cascade
   * @private
   */
  _handleCascade(cascade) {
    const cascadeEligible = this._followers.filter(follower => follower.canDoCascade(cascade));
    if (cascadeEligible.length > 0) {
      const anyTopWindow = cascadeEligible.find(follower => follower.getFetchIdData().isTopWindow);
      if (anyTopWindow) {
        anyTopWindow.notifyCascadeNeeded(cascade);
      } else {
        // couldn't find top window get first
        cascadeEligible[0].notifyCascadeNeeded(cascade);
      }
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
      }
    });
    this._fetcher.getId(this._dispatcher, fetchIds, forceRefresh);
  }

  start() {
    this._getId(false);
  }

  refreshUid(options) {
    if (options.resetConsent === true) {
      this._consentManager.resetConsentData(options.forceAllowLocalStorageGrant === true);
    }
    this._getId(options.forceFetch === true);
  }

  updateConsent(consentData) {
    // TODO check if changed , maybe retrigger getId ???
    this._consentManager.setConsentData(consentData);
  }

  updateFetchIdData(instanceId, fetchIdData) {
    const toUpdate = this._followers.find(instance => instance.getId() === instanceId);
    toUpdate.updateFetchIdData(fetchIdData);
  }
}

export class LeaderProxy extends LeaderApi {
  /**
   * @type {CrossInstanceMessenger}
   * @private
   */
  _messenger;
  _leaderInstanceId;

  /**
   *
   * @param {CrossInstanceMessenger} messenger
   * @param {String} leaderInstanceId
   */
  constructor(messenger, leaderInstanceId) {
    super();
    this._messenger = messenger;
    this._leaderInstanceId = leaderInstanceId;
  }

  /**
   * @private
   */
  _sendToLeader(methodName, args) {
    this._messenger.callProxyMethod(this._leaderInstanceId, MethodCallTarget.LEADER, methodName, args);
  }

  updateConsent(consentData) {
    this._sendToLeader(this.updateConsent.name, [consentData]);
  }

  refreshUid(options) {
    this._sendToLeader(this.refreshUid.name, [options]);
  }

  updateFetchIdData(instanceId, fetchIdData) {
    this._sendToLeader(this.updateFetchIdData.name, [instanceId, fetchIdData]);
  }
}


export class AwaitedLeader extends LeaderApi {

  _callsQueue = [];

  constructor() {
    super();
  }


  updateConsent(consentData) {
    this._add(this.updateConsent.name, [consentData]);
  }

  updateFetchIdData(instanceId, fetchIdData) {
    this._add(this.updateFetchIdData.name, [instanceId, fetchIdData]);
  }

  refreshUid(refreshOptions) {
    this._add(this.refreshUid.name, [refreshOptions]);
  }

  _add(name, args) {
    this._callsQueue.push({
      name,
      args
    })
  }

  /**
   *
   * @param {Leader} newLeader
   */
  onLeaderChange(newLeader) {
    for (const methodCall of this._callsQueue) {
      newLeader[methodCall.name](...methodCall.args);
    }
  }
}
