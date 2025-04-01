// eslint-disable-next-line no-unused-vars
import {Follower} from './follower.js';
import {cachedUserIdAge} from './metrics.js';


export class CachedUserIdProvisioner {

  /**
   * @type {Store} store
   * @private
   */
  _store;
  /**
   * @type {Logger} store
   * @private
   */
  _log;
  /**
   * @type {string} store
   * @private
   */
  _provisioner;

  /**
   * @type {MeterRegistry}
   * @private
   */
  _meter;

  constructor(provisioner, store, log, meter) {
    this._provisioner = provisioner;
    this._store = store;
    this._log = log;
    this._meter = meter;
  }

  /**
   * @typedef {Object} ProvisioningResult
   * @property {string} cacheId
   * @property {CachedResponse} responseFromCache
   * @property {boolean} refreshRequired
   * @property {boolean} provisioned
   */
  /**
   *
   * @param {Follower} follower
   * @param {Object} tags - additional tags
   * @return {ProvisioningResult}
   */
  provisionFromCache(follower, tags = undefined) {
    try {
      const logger = this._log;
      const cacheId = follower.getCacheId();
      const responseFromCache = this._store.getCachedResponse(cacheId);
      const refreshRequired = !responseFromCache || !responseFromCache.isValid() || responseFromCache.isExpired();
      let provisioned = false;
      if (responseFromCache) {
        const responseAge = responseFromCache.getAgeSec();
        cachedUserIdAge(this._meter, {
          expired: responseFromCache.isExpired(),
          valid: responseFromCache.isValid(),
          provisioner: this._provisioner,
          maxAge: responseFromCache.getMaxAge()
        }).record(isNaN(responseAge) ? 0 : responseAge);
      }
      if (responseFromCache && responseFromCache.isValid()) {
        logger.info('Found valid cached response for instance ', JSON.stringify({
          id: follower.getId(),
          cacheId: follower.getCacheId(),
          provisioner: this._provisioner,
          responseFromCache
        }));

        follower.notifyUidReady({
          timestamp: responseFromCache.timestamp,
          responseObj: responseFromCache.response,
          isFromCache: true,
          consents: responseFromCache.consents,
          willBeRefreshed: !!refreshRequired
        }, {
          timestamp: Date.now(),
          provisioner: this._provisioner,
          tags: {
            callType: follower.callType,
            ...tags
          }
        });
        provisioned = true;
      } else {
        logger.info(`Couldn't find response for cacheId`, follower.getCacheId());
      }
      return {
        cacheId,
        responseFromCache,
        refreshRequired,
        provisioned
      };
    } catch (e) {
      this._log.error('Cached UserId provisioning failure', e);
      return {
        refreshRequired: true,
        provisioned: false
      };
    }
  }
}
