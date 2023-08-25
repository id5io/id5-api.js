import {ApiEvent, ApiEventsDispatcher} from './apiEvent.js';
import {Properties} from './instance.js';
import {CrossInstanceMessenger, MethodCallTarget, ProxyMethodCallMessage} from './messaging.js';


/**
 * @interface
 */
export class Follower {

  /**
   * @type {Properties}
   * @private
   */
  _instanceProperties;

  constructor(properties) {
    this._instanceProperties = properties;
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
    const oldData = this._instanceProperties.fetchIdData;
    const mergedData = {
      ...oldData,
      ...newFetchIdData
    }
    this._instanceProperties.fetchIdData = mergedData;
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
  canDoCascade(cascadeData) {
    const fetchIdData = this._instanceProperties.fetchIdData;
    return fetchIdData.canDoCascade === true && cascadeData.partnerId === fetchIdData.partnerId;
  }

  /**
   * @param {CascadePixelCall} cascadeData
   */
  notifyCascadeNeeded(cascadeData) {
  }
}

export class DirectFollower extends Follower {

  /**
   * @type {ApiEventsDispatcher}
   * @private
   */
  _dispatcher;

  constructor(properties, dispatcher) {
    super(properties);
    this._dispatcher = dispatcher;
  }


  notifyUidReady(uid) {
    this._dispatcher.emit(ApiEvent.USER_ID_READY, uid);
  }

  notifyFetchUidCanceled(cancelInfo) {
    this._dispatcher.emit(ApiEvent.USER_ID_FETCH_CANCELED, cancelInfo)
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
   *
   * @param {CrossInstanceMessenger} messenger
   * @param {String} leaderInstanceId
   */
  constructor(properties, messenger) {
    super(properties);
    this._messenger = messenger;
  }

  /**
   * @private
   */
  _callProxy(methodName, args) {
    this._messenger.callProxyMethod(this.getId(), MethodCallTarget.FOLLOWER, methodName, args);
  }

  notifyUidReady(uid) {
    this._callProxy(this.notifyUidReady.name, uid);
  }

  notifyFetchUidCanceled(cancelInfo) {
    this._callProxy(this.notifyFetchUidCanceled.name, cancelInfo);
  }

  notifyCascadeNeeded(cascadeData) {
    this._callProxy(this.notifyCascadeNeeded.name, cascadeData);
  }
}
