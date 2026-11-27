import {NO_OP_LOGGER} from '@id5io/multiplexing/logger';
import {isArray} from "../utils.js";

/**
 * Marks the global installed while Prebid.js is awaited, so a Prebid.js running under a name of
 * its own takes precedence over it.
 */
const PLACEHOLDER_KEY = '_id5Placeholder';

/**
 * @typedef {Object} PrebidGlobal
 * @property {string} [version]
 * @property {string[]} [installedModules]
 * @property {Array<Function>} [que]
 * @property {function(string, Function):void} [onEvent]
 * @property {function(string, Function):void} [offEvent]
 * @property {function(): Object[]} [getEvents]
 */

/**
 * @param {Window} scope
 * @param {string|PrebidGlobal} [pbjsRef] - the Prebid.js to use: the name of the global it is
 * installed under, or the instance itself. Detection runs when it is not given.
 * @returns {PrebidGlobal|undefined}
 */
export function getPbjsInstance(scope, pbjsRef) {
  if (pbjsRef) {
    return givenPbjsInstance(scope, pbjsRef);
  }
  const renamed = renamedPbjsInstance(scope);
  const pbjs = scope.pbjs;
  if (pbjs && !(renamed && pbjs[PLACEHOLDER_KEY])) {
    return pbjs;
  }
  return renamed;
}

/**
 * The Prebid.js the caller pointed at: the global under the name given, or the instance given. A
 * name the page has nothing under resolves to `undefined`, so a Prebid.js belonging to someone
 * else is left alone.
 *
 * @param {Window} scope
 * @param {string|PrebidGlobal} pbjsRef
 * @returns {PrebidGlobal|undefined}
 */
function givenPbjsInstance(scope, pbjsRef) {
  return typeof pbjsRef === 'string' ? scope[pbjsRef] : pbjsRef;
}

/**
 * The object the Prebid.js the caller pointed at is awaited on. An instance is awaited on itself.
 * A name is awaited on the global under it: a name the page has nothing under gets a stub, and
 * Prebid.js drains the `que` it finds under its global as it loads. A value under the name that is
 * not an object is left as it is.
 *
 * @param {Window} scope
 * @param {string|PrebidGlobal} pbjsRef
 * @returns {PrebidGlobal|undefined} what to queue on, `undefined` when there is nothing to wait for
 */
function awaitedPbjsInstance(scope, pbjsRef) {
  if (typeof pbjsRef !== 'string') {
    return isObject(pbjsRef) ? pbjsRef : undefined;
  }
  if (scope[pbjsRef] === undefined) {
    scope[pbjsRef] = {};
  }
  return isObject(scope[pbjsRef]) ? scope[pbjsRef] : undefined;
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function isObject(value) {
  return value !== null && typeof value === 'object';
}

/**
 * Prebid.js registers the name it runs under in `_pbjsGlobals` as it loads, and a build carrying
 * a name of its own leaves `pbjs` to whatever else is on the page.
 *
 * @param {Window} scope
 * @returns {PrebidGlobal|undefined} the Prebid.js global installed under a name other than `pbjs`
 */
function renamedPbjsInstance(scope) {
  if (!isArray(scope._pbjsGlobals)) {
    return undefined;
  }
  const name = scope._pbjsGlobals.find(candidate => candidate !== 'pbjs' && scope[candidate]);
  return name ? scope[name] : undefined;
}

/**
 * Detects when window.pbjs becomes available.
 **/
export class PbjsDetector {
  /**
   * @param {Window} [windowObj=window] - Window object to monitor
   * @param logger
   * @param {string|PrebidGlobal} [pbjsRef] - the Prebid.js to use: the name of the global it is
   * installed under, or the instance itself. Detection runs when it is not given.
   */
  constructor(windowObj = window, logger = NO_OP_LOGGER, pbjsRef = undefined) {
    this._window = windowObj;
    this._pbjsPromise = null;
    this._pbjs = null;
    this._logger = logger;
    this._pbjsRef = pbjsRef;
  }

  /**
   * Returns a promise that resolves to pbjs instance.
   * If already detected, resolves immediately.
   *
   * @returns {Promise<PrebidGlobal>} Promise that resolves with pbjs instance
   */
  async getPbjs() {
    // If already detected, return it (will be wrapped in resolved promise)
    if (this._pbjs) {
      return this._pbjs;
    }

    // If promise already exists, return it
    if (this._pbjsPromise) {
      return this._pbjsPromise;
    }

    // Setup detection and return new promise
    this._pbjsPromise = new Promise((resolve) => {
      setupPbjsDetection(this, resolve);
    });

    return this._pbjsPromise;
  }
}

/**
 *
 * @param {PbjsDetector} detector
 * @param {function} resolve
 * @private
 */
function setupPbjsDetection(detector, resolve) {
  try {
    const scope = detector._window;
    const pbjsRef = detector._pbjsRef;
    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        detector._pbjs = getPbjsInstance(scope, pbjsRef);
        resolve(detector._pbjs);
      }
    };
    const queueOn = (pbjsGlobal, command) => {
      pbjsGlobal.que = pbjsGlobal.que || [];
      pbjsGlobal.que.push(command);
    };
    if (pbjsRef) {
      // The caller pointed at the Prebid.js to use, so no other global is looked at.
      const awaited = awaitedPbjsInstance(scope, pbjsRef);
      if (!awaited) {
        detector._logger.error('PbjsDetector: there is no Prebid.js to wait for at', pbjsRef);
        resolve(null);
        return;
      }
      queueOn(awaited, settle);
      return;
    }
    const pbjsGlobal = getPbjsInstance(scope);
    if (pbjsGlobal) {
      queueOn(pbjsGlobal, settle);
      return;
    }
    // There is no pbjs yet, so a placeholder is installed under the default name and the callback
    // queued on it. A Prebid.js build carrying a name of its own drains the queue it brings along
    // instead, so the name it registers in `_pbjsGlobals` is awaited as well.
    const placeholder = scope.pbjs = {[PLACEHOLDER_KEY]: true};
    queueOn(placeholder, () => {
      delete placeholder[PLACEHOLDER_KEY];
      settle();
    });
    onRenamedPbjsInstance(scope, renamed => queueOn(renamed, settle));
  } catch (error) {
    detector._logger.error('PbjsDetector: Failed to setup detection:', error);
    resolve(null);
  }
}

/**
 * Calls back once Prebid.js registers a global name of its own. `_pbjsGlobals` is created here
 * when the page has none, and Prebid.js keeps the array it finds, so the registration passes
 * through this push.
 *
 * @param {Window} scope
 * @param {function(PrebidGlobal): void} onDetected
 * @private
 */
function onRenamedPbjsInstance(scope, onDetected) {
  const globals = scope._pbjsGlobals = isArray(scope._pbjsGlobals) ? scope._pbjsGlobals : [];
  const push = globals.push.bind(globals);
  globals.push = (...names) => {
    const length = push(...names);
    const renamed = renamedPbjsInstance(scope);
    if (renamed) {
      globals.push = push;
      onDetected(renamed);
    }
    return length;
  };
}
