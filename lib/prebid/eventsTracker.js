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
const ID5_REDACTED = '__ID5_REDACTED__';
const isArray = Array.isArray;
const SOURCE = 'id5-api-js';

class EventsTracker {
  constructor(partnerId, sampling, ingestUrl, pbjsVersion, cleanupRules = DEFAULT_CLEANUP_RULES, logger = NO_OP_LOGGER) {
    this._partnerId = partnerId;
    this._sampling = sampling;
    this._ingestUrl = ingestUrl;
    this._pbjsVersion = pbjsVersion;
    this._cleanupRules = cleanupRules;
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
    const filteredPayload = deepTransformingClone(payload,
      transformFnFromCleanupRules(event, this._cleanupRules[event] || []));
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
    this.sendEvent([
      this.makeEvent('analyticsError', {
        message: error.message,
        stack: error.stack
      })
    ]);
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
    return Promise.reject("prebidGlobal is not defined");
  }

  if (isArray(prebidGlobal.installedModules) && prebidGlobal.installedModules.indexOf('id5AnalyticsAdapter') >= 0) {
    logger.info('pbjsEventsTracker: id5AnalyticsAdapter module is already installed. Skipping.');
    return Promise.reject('id5AnalyticsAdapter module is already installed');
  }

  if (typeof partnerId !== 'number') {
    logger.error('pbjsEventsTracker: partnerId in must be a number representing the id5 partner ID');
    return Promise.reject('missing partnerId');
  }

  return fetch(`${CONFIG_URL_PREFIX}/${partnerId}/${SOURCE}`)
    .then((resp) => resp.json())
    .then((configFromServer) => {
      logger.info('pbjsEventsTracker: Received from configuration endpoint', configFromServer);

      const sampling = typeof configFromServer.sampling === 'number' ? configFromServer.sampling : 0;

      if (typeof configFromServer.ingestUrl !== 'string') {
        logger.error('pbjsEventsTracker: cannot find ingestUrl in config endpoint response; no analytics will be available');
        return;
      }
      const ingestUrl = configFromServer.ingestUrl;

      const eventsToTrack = isArray(configFromServer.eventsToTrack) ? configFromServer.eventsToTrack : STANDARD_EVENTS_TO_TRACK;

      if (sampling > 0 && Math.random() < (1 / sampling)) {
        // Init the module only if we got lucky
        logger.info('pbjsEventsTracker: Selected by sampling. Starting up!');

        let cleanupRules = deepCopy(DEFAULT_CLEANUP_RULES);
        // allow for overriding of cleanup rules - remove existing ones and apply from server
        if (configFromServer.overrideCleanupRules) {
          cleanupRules = {};
        }
        // Merge in additional cleanup rules
        if (configFromServer.additionalCleanupRules) {
          const newRules = configFromServer.additionalCleanupRules;
          eventsToTrack.forEach((key) => {
            // Some protective checks in case we mess up server side
            if (
              isArray(newRules[key]) &&
              newRules[key].every((eventRules) =>
                isArray(eventRules.match) &&
                (eventRules.apply in TRANSFORM_FUNCTIONS))
            ) {
              logger.info('pbjsEventsTracker: merging additional cleanup rules for event ' + key);
              if (!Array.isArray(cleanupRules[key])) {
                cleanupRules[key] = newRules[key];
              } else {
                cleanupRules[key].push(...newRules[key]);
              }
            }
          });
        }

        const eventsTracker = new EventsTracker(partnerId, sampling, ingestUrl, prebidGlobal.version, cleanupRules, logger);

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
      }
    })
    .catch((err) => {
      logger.error('pbjsEventsTracker: Failed to fetch configuration', err);
    });
};

function redact(obj, key) {
  obj[key] = ID5_REDACTED;
}

function erase(obj, key) {
  delete obj[key];
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// The transform function matches against a path and applies
// required transformation if match is found.
function deepTransformingClone(obj, transform, currentPath = []) {
  const result = isArray(obj) ? [] : {};
  const recursable = typeof obj === 'object' && obj !== null;
  if (recursable) {
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      keys.forEach((key) => {
        const newPath = currentPath.concat(key);
        result[key] = deepTransformingClone(obj[key], transform, newPath);
        transform(newPath, result, key);
      });
      return result;
    }
  }
  return obj;
}

// Every set of rules is an object where "match" is an array and
// "apply" is the function to apply in case of match. The function to apply
// takes (obj, prop) and transforms property "prop" in object "obj".
// The "match" is an array of path parts. Each part is either a string or an array.
// In case of array, it represents alternatives which all would match.
// Special path part '*' matches any subproperty or array index.
// Prefixing a part with "!" makes it negative match (doesn't work with multiple alternatives)
const CLEANUP_RULES = {};
CLEANUP_RULES[PREBID_EVENTS.AUCTION_END] = [{
  match: [['adUnits', 'bidderRequests'], '*', 'bids', '*', ['userId', 'crumbs'], '!id5id'],
  apply: 'redact'
}, {
  match: [['adUnits', 'bidderRequests'], '*', 'bids', '*', ['userId', 'crumbs'], 'id5id', 'uid'],
  apply: 'redact'
}, {
  match: [['adUnits', 'bidderRequests'], '*', 'bids', '*', 'userIdAsEids', '*', 'uids', '*', ['id', 'ext']],
  apply: 'redact'
}, {
  match: ['bidderRequests', '*', 'gdprConsent', 'vendorData'],
  apply: 'erase'
}, {
  match: ['bidsReceived', '*', ['ad', 'native']],
  apply: 'erase'
}, {
  match: ['noBids', '*', ['userId', 'crumbs'], '*'],
  apply: 'redact'
}, {
  match: ['noBids', '*', 'userIdAsEids', '*', 'uids', '*', ['id', 'ext']],
  apply: 'redact'
}];

CLEANUP_RULES[PREBID_EVENTS.BID_WON] = [{
  match: [['ad', 'native']],
  apply: 'erase'
}];
const DEFAULT_CLEANUP_RULES = Object.freeze(CLEANUP_RULES);

const TRANSFORM_FUNCTIONS = {
  'redact': redact,
  'erase': erase
};

// Builds a rule function depending on the event type
function transformFnFromCleanupRules(eventType, rules) {
  return (path, obj, key) => {
    for (let i = 0; i < rules.length; i++) {
      let match = true;
      const ruleMatcher = rules[i].match;
      const transformation = rules[i].apply;
      if (ruleMatcher.length !== path.length) {
        continue;
      }
      for (let fragment = 0; fragment < ruleMatcher.length && match; fragment++) {
        const choices = makeSureArray(ruleMatcher[fragment]);
        match = !choices.every((choice) => choice !== '*' &&
          (choice.charAt(0) === '!'
            ? path[fragment] === choice.substring(1)
            : path[fragment] !== choice));
      }
      if (match) {
        const transformfn = TRANSFORM_FUNCTIONS[transformation];
        transformfn(obj, key);
        break;
      }
    }
  };
}

function makeSureArray(object) {
  return isArray(object) ? object : [object];
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
