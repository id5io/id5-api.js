import {NO_OP_LOGGER} from '@id5io/multiplexing';
import {isArray} from "../utils.js";

/**
 * @typedef {Object} PrebidGlobal
 * @property {string} [version]
 * @property {string[]} [installedModules]
 * @property {Array<Function>} [que]
 * @property {function(string, Function):void} [onEvent]
 * @property {function(string, Function):void} [offEvent]
 * @property {function(): Object[]} [getEvents]
 */

export function getPbjsGlobal(scope) {
  if (scope.pbjs) {
    return scope.pbjs;
  } else if (isArray(scope._pbjsGlobals) && scope._pbjsGlobals.length > 0) {
    return scope[scope._pbjsGlobals[0]];
  }
}

/**
 * Detects when window.pbjs becomes available.
 **/
export class PbjsDetector {
  /**
   * @param {Window} [windowObj=window] - Window object to monitor
   * @param logger
   */
  constructor(windowObj = window, logger = NO_OP_LOGGER) {
    this._window = windowObj;
    this._pbjsPromise = null;
    this._pbjs = null;
    this._logger = logger;
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
    let pbjsGlobal = getPbjsGlobal(scope);
    if (!pbjsGlobal) {
      // there is no pbjs yet, initialize a default global object `pbjs`
      pbjsGlobal = scope.pbjs = scope.pbjs || {};
    }
    const que = pbjsGlobal.que = pbjsGlobal.que || [];
    que.push(() => {
      detector._pbjs = getPbjsGlobal(scope);
      resolve(detector._pbjs);
    });
  } catch (error) {
    detector._logger.error('PbjsDetector: Failed to setup detection:', error);
    resolve(null);
  }
}
