import {ApiEvent} from './events.js';
import {NO_OP_LOGGER} from './logger.js';
import {NoopStorage} from './localStorage.js';
import {cyrb53Hash} from './utils.js';
import {ConsentSource} from './consent.js';
import {userIdProvisioningDuplicateTimer} from './metrics.js';

/**
 * @typedef {FollowerCallType}
 * @enum
 */
export const FollowerCallType = Object.freeze({
  DIRECT_METHOD: 'direct_method',
  POST_MESSAGE: 'post_message'
});


/**
 * @typedef {FollowerType}
 * @enum
 */
export const FollowerType = Object.freeze({
  STANDARD: 'follower',
  PASSIVE: 'follower-passive' // aka lite
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
   * @type {FollowerType}
   * type;
   */

  /**
   *
   * @param {FollowerCallType} callType
   * @param {Window} window
   * @param {Properties} properties
   * @param {Logger} logger
   * @param {FollowerType} type
   */
  constructor(callType, window, properties, logger = NO_OP_LOGGER, type = FollowerType.STANDARD) {
    this._instanceWindow = window;
    this._instanceProperties = properties;
    this._log = logger;
    this.callType = callType;
    this.type = type;
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

  getCacheId() {
    const thisData = this._instanceProperties.fetchIdData;
    // take into account data that makes this instance unique on the page and cross-sessions consistent
    const uniqueData = {
      partnerId: thisData.partnerId,
      att: thisData.att,
      pd: thisData.pd,
      provider: thisData.provider,
      abTesting: thisData.abTesting,
      segments: JSON.stringify(thisData.segments),
      providedRefresh: thisData.providedRefreshInSeconds,
      trueLink: thisData.trueLink?.id
    };
    return cyrb53Hash(JSON.stringify(uniqueData));
  }

  /**
   * @return {ConsentSource}
   */
  getDeclaredConsentSource() {
    const consentSource = this._instanceProperties.fetchIdData.consentSource;
    return consentSource || ConsentSource.cmp; // by default for backward compatibility assume cmp
  }

  getSourceVersion() {
    return this._instanceProperties.sourceVersion;
  }

  getSource() {
    return this._instanceProperties.source;
  }

  /**
   *
   * @param {Id5UserId} uid
   * @param {NotificationContext} notificationContext
   */
  notifyUidReady() {
    // Abstract function
  }

  /**
   * @param {FetchId5UidCanceled} cancelInfo
   */
  notifyFetchUidCanceled() {
    // Abstract function
  }

  /**
   * @param {CascadePixelCall} cascadeData
   */
  notifyCascadeNeeded() {
    // Abstract function
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

  /**
   * @typedef {Object} UidProvionDetails
   * @property {DOMHighResTimeStamp} time
   * @property {string} provisioner
   * @private
   */

  /**
   * @type {Map<string, UidProvionDetails>}
   * @private
   */
  _provisionedUids;

  /**
   * @type {MeterRegistry}
   * @private
   */
  _metrics;

  /**
   *
   * @param window
   * @param properties
   * @param dispatcher
   * @param logger
   * @param {MeterRegistry} metrics
   */
  constructor(window, properties, dispatcher, logger = NO_OP_LOGGER, metrics) {
    super(FollowerCallType.DIRECT_METHOD, window, properties, logger, FollowerType.STANDARD);
    this._dispatcher = dispatcher;
    this._metrics = metrics;
    this._provisionedUids = new Map();
  }

  /**
   * @param {Id5UserId} uid
   * @param {NotificationContext} notificationContext
   */
  notifyUidReady(uid, notificationContext) {
    const id5Id = uid?.responseObj?.universal_uid;
    if (id5Id) {
      if (!this._provisionedUids.has(id5Id)) {
        this._provisionedUids.set(id5Id, {
          provisioner: notificationContext.provisioner,
          time: performance.now()
        });
        this._dispatcher.emit(ApiEvent.USER_ID_READY, uid, notificationContext);
      } else {
        const firstProvisionDetails = this._provisionedUids.get(id5Id);
        userIdProvisioningDuplicateTimer(this._metrics, {
          provisioner: notificationContext.provisioner,
          firstProvisioner: firstProvisionDetails.provisioner
        }).record(performance.now() - firstProvisionDetails.time);
      }
    }
  }

  notifyFetchUidCanceled(cancelInfo) {
    this._dispatcher.emit(ApiEvent.USER_ID_FETCH_CANCELED, cancelInfo);
  }

  notifyCascadeNeeded(cascadeData) {
    this._dispatcher.emit(ApiEvent.CASCADE_NEEDED, cascadeData);
  }
}
