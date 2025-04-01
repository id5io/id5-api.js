import {ProxyMethodCallTarget} from './messaging.js';
import {NO_OP_LOGGER} from './logger.js';
import {StorageApi} from './localStorage.js';
import {Follower, FollowerCallType, FollowerType} from './follower.js';


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

  getItem() {
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
   * @param {FollowerType} type
   */
  constructor(knownInstance, messenger, logger = NO_OP_LOGGER, type = FollowerType.STANDARD) {
    super(FollowerCallType.POST_MESSAGE, knownInstance.getWindow(), knownInstance.properties, logger, type);
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
