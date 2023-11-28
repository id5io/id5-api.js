import {ApiEvent} from './apiEvent.js';
import {ProxyMethodCallTarget} from './messaging.js';
import {NoopLogger} from './logger.js';
import {NoopStorage, StorageApi} from './localStorage.js';
/**
 * @typedef {string} FollowerCallType
 */

/**
 * @typedef {Object} NotificationContext
 * @param {number} timestamp
 * @param {tags} tags
 */

/**
 * @enum {FollowerCallType}
 */
export const FollowerCallType = Object.freeze({
  DIRECT_METHOD: 'direct_method',
  POST_MESSAGE: 'post_message'
});

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
  /**
   *
   * @type {FollowerCallType}
   */
  callType;

  /**
   * @type {Window}
   * @private
   */
  _instanceWindow;
  /**
   *
   * @param {FollowerCallType} callType
   * @param {Window} window
   * @param {Properties} properties
   * @param {Logger} logger
   */
  constructor(callType, window, properties, logger = NoopLogger) {
    this._instanceWindow = window;
    this._instanceProperties = properties;
    this._log = logger;
    this.callType = callType;
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
    const samePd = otherData.pd === thisData.pd;
    const sameProvider = otherData.provider === thisData.provider;
    const sameAbTesting = JSON.stringify(otherData.abTesting) === JSON.stringify(thisData.abTesting);
    const sameSegments = JSON.stringify(otherData.segments) === JSON.stringify(thisData.segments);
    const sameProvidedRefresh = otherData.providedRefreshInSeconds === thisData.providedRefreshInSeconds;
    const isSimilar = samePartner && sameAtt && samePd && sameProvider && sameAbTesting && sameSegments && sameProvidedRefresh;
    this._log.debug('Comparing followers this:', this.getId(), 'other:', other.getId(), 'areSimilar:', isSimilar, 'reason:', {
      samePartner,
      sameAtt,
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
   * @param {NotificationContext} notificationContext
   */
  notifyUidReady(uid, notificationContext) {
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

  canDoCascade() {
    return this._instanceProperties.canDoCascade === true;
  }

  /**
   *
   * @return {StorageApi}
   */
  getStorage() {
    return NoopStorage; // noop storage
  }

  /**
   *
   * @return {Window}
   */
  getWindow() {
    return this._instanceWindow;
  }
}

export class DirectFollower extends Follower {
  /**
   * @type {ApiEventsDispatcher}
   * @private
   */
  _dispatcher;

  constructor(window, properties, dispatcher, logger = NoopLogger) {
    super(FollowerCallType.DIRECT_METHOD, window, properties, logger);
    this._dispatcher = dispatcher;
  }

  notifyUidReady(uid, notificationContext) {
    this._dispatcher.emit(ApiEvent.USER_ID_READY, uid, notificationContext);
  }

  notifyFetchUidCanceled(cancelInfo) {
    this._dispatcher.emit(ApiEvent.USER_ID_FETCH_CANCELED, cancelInfo);
  }

  notifyCascadeNeeded(cascadeData) {
    this._dispatcher.emit(ApiEvent.CASCADE_NEEDED, cascadeData);
  }
}

export class ProxyStorage extends StorageApi {
  /**
   * @type {CrossInstanceMessenger}
   * @private
   */
  _messenger;

  /**
   * @type {string}
   * @private
   */
  _destinationId;

  constructor(messenger, destinationId) {
    super();
    this._messanger = messenger;
    this._destinationId = destinationId;
  }

  getItem(key) {
    // proxy storage calls are only to trigger writing
    return undefined;
  }

  removeItem(key) {
    this._remoteCall('removeItem', [key]);
  }

  setItem(key, value) {
    this._remoteCall('setItem', [key, value]);
  }

  _remoteCall(name, args) {
    this._messanger.callProxyMethod(this._destinationId, ProxyMethodCallTarget.STORAGE, name, args);
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
    super(FollowerCallType.POST_MESSAGE, knownInstance.getWindow(), knownInstance.properties, logger);
    this._messenger = messenger;
  }

  /**
   * @private
   */
  _callProxy(methodName, args) {
    this._messenger.callProxyMethod(this.getId(), ProxyMethodCallTarget.FOLLOWER, methodName, args);
  }

  notifyUidReady(uid, notificationContext) {
    this._callProxy('notifyUidReady', [uid, notificationContext]);
  }

  notifyFetchUidCanceled(cancelInfo) {
    this._callProxy('notifyFetchUidCanceled', [cancelInfo]);
  }

  notifyCascadeNeeded(cascadeData) {
    this._callProxy('notifyCascadeNeeded', [cascadeData]);
  }

  getStorage() {
    return new ProxyStorage(this._messenger, this.getId());
  }
}
