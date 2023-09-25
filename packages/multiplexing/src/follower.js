import {ApiEvent} from './apiEvent.js';
import {ProxyMethodCallTarget} from './messaging.js';
import {NoopLogger} from './logger.js';

/**
 * @interface
 */
export class Follower {
  /**
   * @type {Properties}
   * @private
   */
  _instanceProperties;
  /**
   * @type {Logger}
   * @private
   */
  _log;

  constructor(properties, logger = NoopLogger) {
    this._instanceProperties = properties;
    this._log = logger;
  }

  getId() {
    return this._instanceProperties.id;
  }

  /**
   *
   * @return {FetchIdData}
   */
  getFetchIdData() {
    return this._instanceProperties.fetchIdData;
  }

  updateFetchIdData(newFetchIdData) {
    Object.assign(this._instanceProperties.fetchIdData, newFetchIdData);
  }

  /**
   * Compares important fetch data with other follower's data.
   * 'Important' means these than may have impact on UID generation on serverside like partner data, signals.
   *
   * @param {Follower} other
   * @returns {boolean} true - if this follower has same important fetch data as other follower
   */
  isSimilarTo(other) {
    const otherData = other._instanceProperties.fetchIdData;
    const thisData = this._instanceProperties.fetchIdData;
    const samePartner = otherData.partnerId === thisData.partnerId;
    const sameAtt = otherData.att === thisData.att;
    const sameLiveIntentId = otherData.liveIntentId === thisData.liveIntentId;
    const samePd = otherData.pd === thisData.pd;
    const sameProvider = otherData.provider === thisData.provider;
    const sameAbTesting = JSON.stringify(otherData.abTesting) === JSON.stringify(thisData.abTesting);
    const sameSegments = JSON.stringify(otherData.segments) === JSON.stringify(thisData.segments);
    const sameProvidedRefresh = otherData.providedRefreshInSeconds === thisData.providedRefreshInSeconds;
    const isSimilar = samePartner && sameAtt && sameLiveIntentId && samePd && sameProvider && sameAbTesting && sameSegments && sameProvidedRefresh;
    this._log.debug('Comparing followers this:', this.getId(), 'other:', other.getId(), 'areSimilar:', isSimilar, 'reason:', {
      samePartner,
      sameAtt,
      sameLiveIntentId,
      samePd,
      sameProvider,
      sameSegments,
      sameProvidedRefresh
    });
    return isSimilar;
  }

  /**
   *
   * @param {Id5UserId} uid
   */
  notifyUidReady(uid) {
  }

  /**
   * @param {FetchId5UidCanceled} cancelInfo
   */
  notifyFetchUidCanceled(cancelInfo) {
  }

  /**
   * @param {CascadePixelCall} cascadeData
   */
  notifyCascadeNeeded(cascadeData) {
  }

  /**
   * @param {CascadePixelCall} cascadeData
   */
  canDoCascade(cascadeData) {
    return this._instanceProperties.canDoCascade === true && cascadeData.partnerId === this._instanceProperties.fetchIdData.partnerId;
  }
}

export class DirectFollower extends Follower {
  /**
   * @type {ApiEventsDispatcher}
   * @private
   */
  _dispatcher;

  constructor(properties, dispatcher, logger = NoopLogger) {
    super(properties, logger);
    this._dispatcher = dispatcher;
  }

  notifyUidReady(uid) {
    this._dispatcher.emit(ApiEvent.USER_ID_READY, uid);
  }

  notifyFetchUidCanceled(cancelInfo) {
    this._dispatcher.emit(ApiEvent.USER_ID_FETCH_CANCELED, cancelInfo);
  }

  notifyCascadeNeeded(cascadeData) {
    this._dispatcher.emit(ApiEvent.CASCADE_NEEDED, cascadeData);
  }
}

export class ProxyFollower extends Follower {
  /**
   * @type {CrossInstanceMessenger}
   * @private
   */
  _messenger;

  /**
   * @param {DiscoveredInstance} knownInstance - leader instance properties
   * @param {CrossInstanceMessenger} messenger
   * @param {Logger} logger
   */
  constructor(knownInstance, messenger, logger = NoopLogger) {
    super(knownInstance.properties, logger);
    this._messenger = messenger;
  }

  /**
   * @private
   */
  _callProxy(methodName, args) {
    this._messenger.callProxyMethod(this.getId(), ProxyMethodCallTarget.FOLLOWER, methodName, args);
  }

  notifyUidReady(uid) {
    this._callProxy('notifyUidReady', [uid]);
  }

  notifyFetchUidCanceled(cancelInfo) {
    this._callProxy('notifyFetchUidCanceled', [cancelInfo]);
  }

  notifyCascadeNeeded(cascadeData) {
    this._callProxy('notifyCascadeNeeded', [cascadeData]);
  }
}
