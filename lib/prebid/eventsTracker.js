import {isFn} from '../utils.js';
import {NO_OP_LOGGER} from '@id5io/multiplexing';
import {version} from '../../generated/version.js';

/**
 * Enum of Prebid event names.
 * @readonly
 * @enum {string}
 */
const PREBID_EVENTS = Object.freeze({
  AUCTION_END: 'auctionEnd',
  BID_WON: 'bidWon',
  TCF2_ENFORCEMENT: 'tcf2Enforcement'
});

/**
 * @callback PrebidEventHandler
 * @param {Object} data
 * @returns {void}
 */

/**
 * @typedef {Object} PrebidGlobal
 * @property {string} [version]
 * @property {string[]} [installedModules]
 * @property {function(string, PrebidEventHandler):void} onEvent
 * @property {function(string, PrebidEventHandler):void} offEvent
 * @property {function(): Object[]} [getEvents]
 */

/**
 * Names of available transform functions for cleanup rules.
 * @typedef {'redact'|'erase'} TransformFunctionName
 */

/**
 * One cleanup rule definition used to transform event payloads before sending.
 * - match: array of path fragments, where each fragment is either a string or an array of alternative strings.
 *   Special values supported by implementation: '*' (wildcard) and strings prefixed with '!' for negative match.
 * - apply: name of the transform function to apply when the path matches.
 * @typedef {Object} CleanupRule
 * @property {(Array<string>|string)[]} match
 * @property {TransformFunctionName} apply
 */

/**
 * Mapping of the event name to an array of cleanup rules.
 * The event name is typically a PREBID_EVENTS value, but the server may send plain strings too.
 * @typedef {Object<string, CleanupRule[]>} AdditionalCleanupRules
 */

/**
 * Configuration object fetched from the server analytics endpoint.
 * Defined according to usage in ENABLE_FUNCTION.
 * @typedef {Object} ConfigFromServer
 * @property {number} [sampling]
 * @property {string} ingestUrl
 * @property {(Array<PREBID_EVENTS>|Array<string>)} [eventsToTrack]
 * @property {boolean} [overrideCleanupRules]
 * @property {AdditionalCleanupRules} [additionalCleanupRules]
 */

const STANDARD_EVENTS_TO_TRACK = [
  PREBID_EVENTS.AUCTION_END,
  PREBID_EVENTS.BID_WON
];

const CONFIG_URL_PREFIX = 'https://api.id5-sync.com/analytics'
const TZ = new Date().getTimezoneOffset();
const isArray = Array.isArray;
const SOURCE = 'id5-api-js';

const EVENT_PAYLOAD_BUILDERS = {}
EVENT_PAYLOAD_BUILDERS[PREBID_EVENTS.AUCTION_END] = copyAuctionEnd;
EVENT_PAYLOAD_BUILDERS[PREBID_EVENTS.BID_WON] = copyBidWon;
EVENT_PAYLOAD_BUILDERS['analyticsError'] = (payload) => payload;

class EventsTracker {
  constructor(partnerId, sampling, ingestUrl, pbjsVersion, logger = NO_OP_LOGGER) {
    this._partnerId = partnerId;
    this._sampling = sampling;
    this._ingestUrl = ingestUrl;
    this._pbjsVersion = pbjsVersion;
    this._logger = logger;
  }

  track(eventType, payload) {
    if (!payload) {
      return;
    }

    try {
      this._logger.debug('pbjsEventsTracker: Tracking event', eventType, payload);
      this.sendEvent(this.makeEvent(eventType, payload));
    } catch (error) {
      this._logger.error('pbjsEventsTracker: ERROR', error);
      this.sendErrorEvent(error);
    }
  }

  sendEvent(eventToSend) {
    try {
      fetch(this._ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        mode: 'no-cors',
        body: JSON.stringify(eventToSend)
      }).catch((e) => {
        this._logger.error('pbjsEventsTracker: sendEvent failed', e);
      });
    } catch (e) {
      // In case fetch itself is not available or throws synchronously
      this._logger.error('pbjsEventsTracker: sendEvent failed (sync)', e);
    }
  }

  makeEvent(event, payload) {
    const filteredPayload = EVENT_PAYLOAD_BUILDERS[event] ? EVENT_PAYLOAD_BUILDERS[event](payload) : {}
    return {
      source: SOURCE,
      event,
      payload: filteredPayload,
      partnerId: this._partnerId,
      meta: {
        sampling: this._sampling,
        pbjs: this._pbjsVersion,
        version: version,
        tz: TZ
      }
    };
  }

  sendErrorEvent(error) {
    this.sendEvent(
      this.makeEvent('analyticsError', {
        message: error.message,
        stack: error.stack
      })
    );
  }
}

/**
 *
 * @param {PrebidGlobal} prebidGlobal
 * @param {number} partnerId
 * @param {Logger} logger
 */
const registerEventsTracker = (prebidGlobal, partnerId, logger = NO_OP_LOGGER) => {

  if (!prebidGlobal) {
    logger.error('pbjsEventsTracker: prebidGlobal is not defined');
    return Promise.resolve(false);
  }

  if (isArray(prebidGlobal.installedModules) && prebidGlobal.installedModules.indexOf('id5AnalyticsAdapter') >= 0) {
    logger.info('pbjsEventsTracker: id5AnalyticsAdapter module is already installed. Skipping.');
    return Promise.resolve(false);
  }

  if (typeof partnerId !== 'number') {
    logger.error('pbjsEventsTracker: partnerId in must be a number representing the id5 partner ID');
    return Promise.resolve(false);
  }

  return fetch(`${CONFIG_URL_PREFIX}/${partnerId}/${SOURCE}`)
    .then((resp) => resp.json())
    .then((configFromServer) => {
      logger.info('pbjsEventsTracker: Received from configuration endpoint', configFromServer);

      const sampling = typeof configFromServer.sampling === 'number' ? configFromServer.sampling : 0;

      if (typeof configFromServer.ingestUrl !== 'string') {
        logger.error('pbjsEventsTracker: cannot find ingestUrl in config endpoint response; no analytics will be available');
        return false;
      }
      const ingestUrl = configFromServer.ingestUrl;

      const eventsToTrack = isArray(configFromServer.eventsToTrack) ? configFromServer.eventsToTrack : STANDARD_EVENTS_TO_TRACK;

      if (sampling > 0 && Math.random() < (1 / sampling)) {
        // Init the module only if we got lucky
        logger.info('pbjsEventsTracker: Selected by sampling. Starting up!');

        const eventsTracker = new EventsTracker(partnerId, sampling, ingestUrl, prebidGlobal.version, logger);

        if (isFn(prebidGlobal.getEvents) && isArray(prebidGlobal.getEvents())) {
          prebidGlobal.getEvents().forEach((event) => {
            logger.debug('pbjsEventsTracker: Past event found', event);
            if (event && eventsToTrack.indexOf(event.eventType) >= 0) {
              eventsTracker.track(event.eventType, event.args);
            } else {
              logger.debug('pbjsEventsTracker: Past event ignored', event);
            }
          })
        }
        logger.info('pbjsEventsTracker: Register event handlers for', eventsToTrack);
        eventsToTrack.forEach((eventType) => {
          const handler = (args) => eventsTracker.track(eventType, args);
          prebidGlobal.onEvent(eventType, handler);
        });
        return true;
      } else {
        return false;
      }
    })
    .catch((err) => {
      logger.error('pbjsEventsTracker: Failed to fetch configuration', err);
      return false;
    });
};

function copyAuctionEnd(payload) {
  const copy = {auctionId: payload.auctionId, timestamp: payload.timestamp, auctionEnd: payload.auctionEnd};
  if (isArray(payload.bidsReceived)) {
    copy.bidsReceived = payload.bidsReceived.map(copyReceivedBid);
  }
  if (isArray(payload.noBids)) {
    copy.noBids = payload.noBids.map(copyNoBid);
  }
  if (isArray(payload.bidderRequests)) {
    copy.bidderRequests = payload.bidderRequests.map(copyBidderRequest);
  }
  return copy;
}

function copyBidderRequest(obj) {
  if (obj) {
    const copy = {};
    if (obj.bidderCode) {
      copy.bidderCode = obj.bidderCode;
    }
    if (isArray(obj.bids)) {
      copy.bids = obj.bids.map(copyBid);
    }
    if (obj.ortb2) {
      copy.ortb2 = copyOrtb2(obj.ortb2);
    }
    return copy;
  }
  return undefined;
}

function copyUserId(obj) {
  if (obj) {
    const copy = {};
    Object.keys(obj).forEach(key => {
      if (key === 'id5id') {
        copy.id5id = copyId5Id(obj[key]);
      } else {
        copy[key] = 1;
      }
    })
    return copy;
  }
  return undefined;
}

function copyId5Id5Ext(obj) {
  if (obj) {
    return {
      linkType: obj.linkType,
      pba: obj.pba,
      abTestingControlGroup: obj.abTestingControlGroup
    };
  }
  return undefined;
}

function copyId5Id(obj) {
  if (obj) {
    const copy = {}
    if (obj.ext) {
      copy.ext = copyId5Id5Ext(obj.ext)
    }
    return copy;
  }
  return undefined;
}

function copyNoBid(obj) {
  if (obj) {
    const copy = {}
    copy.bidId = obj.bidId;
    return copy;
  }
  return undefined;
}

function copyBid(obj) {
  if (obj) {
    const copy = {};
    if (obj.adUnitCode) {
      copy.adUnitCode = obj.adUnitCode;
    }
    if (obj.bidId) {
      copy.bidId = obj.bidId;
    }
    if (obj.userId) {
      copy.userId = copyUserId(obj.userId);
    }
    if (obj.ortb2) {
      copy.ortb2 = copyOrtb2(obj.ortb2);
    }
    if (isArray(obj.userIdAsEids)) {
      copy.userIdAsEids = obj.userIdAsEids.map(copyEid);
    }
    return copy;
  }
  return undefined;
}

function copyReceivedBid(obj) {
  if (obj) {
    const copy = {};
    ["adUnitCode", "bidderCode", "requestId", "creativeId", "dealId", "responseTimestamp", "requestTimestamp", "width", "height", "netRevenue", "mediaType", "originalCpm", "originalCurrency", "cpm", "currency"].forEach(key => {
      let src = obj[key];
      if (src) {
        copy[key] = src;
      }
    })
    return copy
  }
  return undefined;
}

function copyBidWon(obj) {
  if (obj) {
    const copy = {};
    ["auctionId", "adUnitCode", "bidderCode", "requestId", "creativeId", "dealId", "responseTimestamp", "requestTimestamp", "width", "height", "netRevenue", "mediaType", "originalCpm", "originalCurrency", "cpm", "currency"].forEach(key => {
      let src = obj[key];
      if (src) {
        copy[key] = src;
      }
    })
    return copy
  }
  return undefined;
}

function copyOrtb2(obj) {
  if (obj) {
    const copy = {};
    if (obj.user) {
      copy.user = copyUser(obj.user);
    }
    return copy;
  }
  return undefined;
}

function copyUser(obj) {
  if (obj) {
    const copy = {};
    if (obj.ext) {
      copy.ext = copyUserExt(obj.ext);
    }
    return copy;
  }
  return undefined;
}

function copyUserExt(obj) {
  if (obj) {
    const copy = {}
    if (isArray(obj.eids)) {
      copy.eids = obj.eids.map(copyEid)
    }
    return copy;
  }
  return undefined;
}

function copyEid(obj) {
  if (obj) {
    const copy = {};
    if (obj.source) {
      copy.source = obj.source;
    }
    if (isArray(obj.uids)) {
      if (obj.source === "id5-sync.com") {
        copy.uids = obj.uids.map(copyId5Id);
      }
    }
    return copy;
  }
  return undefined;
}

export default function (partnerId, logger = NO_OP_LOGGER) {
  try {
    window.id5_pbjs_et = window.id5_pbjs_et || {};
    if (window.id5_pbjs_et[partnerId] !== true) {
      window.id5_pbjs_et[partnerId] = true;
      const pbjs = window.pbjs = window.pbjs || {};
      pbjs.que = pbjs.que || [];
      // pbjs may not be loaded yet, so push to que
      pbjs.que.push(() => {
        registerEventsTracker(window.pbjs, partnerId, logger);
      });
    }
  } catch (e) {
    logger.error('pbjsEventsTracker: Failed to register', e);
  }
}

// Expose internals for unit testing without affecting default behavior
export {EventsTracker, registerEventsTracker};
