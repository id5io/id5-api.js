/**
 * The referer detection module attempts to gather referer information from the current page that id5-api.js resides in.
 * The information that it tries to collect includes:
 * The detected top origin,
 * Whether it was able to reach the top most window (if for example it was embedded in several iframes),
 * The number of iframes it was embedded in if applicable,
 * A list of the origins of each embedded window if applicable.
 *
 * Only origins (scheme + host + port) are collected. Full URLs (path, query, fragment) are never kept.
 */
import {toOrigin} from '@id5io/multiplexing/utils';

export function detectReferer(win) {
  /**
   * Returns number of frames to reach top from current frame
   * @returns {Array} levels
   */
  function getLevels() {
    let levels = walkUpWindows();
    let ancestors = getAncestorOrigins();

    if (ancestors) {
      for (let i = 0, l = ancestors.length; i < l; i++) {
        // opaque ancestors (sandboxed, no-referrer) are reported as the string "null"
        levels[i].ancestor = toOrigin(ancestors[i]);
      }
    }
    return levels;
  }

  /**
   * This function would return a read-only array of hostnames for all the parent frames.
   * win.location.ancestorOrigins is only supported in webkit browsers. For non-webkit browsers it will return undefined.
   * @returns {(undefined|Array)} Ancestor origins or undefined
   */
  function getAncestorOrigins() {
    try {
      if (!win.location.ancestorOrigins) {
        return;
      }
      return win.location.ancestorOrigins;
    } catch (e) {
      // Ignore error
    }
  }

  /**
   * This function would try to get referer and urls for all parent frames in case of win.location.ancestorOrigins undefined.
   * @param {Array} levels
   * @returns {Object} urls for all parent frames and top most detected referer url
   */
  function getPubUrlStack(levels) {
    let stack = [];
    let defUrl = null;
    let frameLocation = null;
    let prevFrame = null;
    let prevRef = null;
    let ancestor = null;
    let detectedRefererUrl = null;

    let i;
    for (i = levels.length - 1; i >= 0; i--) {
      try {
        frameLocation = levels[i].location;
      } catch (e) {
        // Ignore error
      }

      if (frameLocation) {
        stack.push(frameLocation);
        if (!detectedRefererUrl) {
          detectedRefererUrl = frameLocation;
        }
      } else if (i !== 0) {
        prevFrame = levels[i - 1];
        try {
          prevRef = prevFrame.referrer;
          ancestor = prevFrame.ancestor;
        } catch (e) {
          // Ignore error
        }

        if (prevRef) {
          stack.push(prevRef);
          if (!detectedRefererUrl) {
            detectedRefererUrl = prevRef;
          }
        } else if (ancestor) {
          stack.push(ancestor);
          if (!detectedRefererUrl) {
            detectedRefererUrl = ancestor;
          }
        } else {
          stack.push(defUrl);
        }
      } else {
        stack.push(defUrl);
      }
    }
    return {
      stack,
      detectedRefererUrl
    };
  }

  /**
   * Walk up to the top of the window to detect origins and number of iframes
   */
  function walkUpWindows() {
    let acc = [];
    let currentWindow;
    do {
      try {
        currentWindow = currentWindow ? currentWindow.parent : win;
        try {
          acc.push({
            referrer: toOrigin(currentWindow.document.referrer),
            location: toOrigin(currentWindow.location.href),
            isTop: (currentWindow === win.top)
          });
        } catch (e) {
          acc.push({
            referrer: null,
            location: null,
            isTop: (currentWindow === win.top)
          });
        }
      } catch (e) {
        acc.push({
          referrer: null,
          location: null,
          isTop: false
        });
        return acc;
      }
    } while (currentWindow !== win.top);
    return acc;
  }

  /**
   * Referer info
   * @typedef {Object} RefererInfo
   * @property {string|null} topmostLocation - detected top origin
   * @property {string|null} ref the origin of the top window referrer (document.referrer), or null if not available (due to cross-origin restrictions)
   * @property {boolean} reachedTop - whether it was possible to walk upto top window or not
   * @property {number} numIframes - number of iframes
   * @property {Array<string|null>} stack - origins of all windows from top to current
   */

  /**
   * Get referer info
   * @returns {RefererInfo}
   */
  function refererInfo() {
    try {
      let levels = getLevels();
      let numIframes = levels.length - 1;
      let reachedTop = (levels[numIframes].location !== null ||
        (numIframes > 0 && levels[numIframes - 1].referrer !== null));
      let stackInfo = getPubUrlStack(levels);
      let ref;
      try {
        ref = toOrigin(win.top.document.referrer);
      } catch (e) {
        // Continue ignoring the error
      }
      return {
        topmostLocation: stackInfo.detectedRefererUrl,
        ref: ref || null,
        reachedTop,
        numIframes,
        stack: stackInfo.stack
      };
    } catch (e) {
      // Ignore error
    }
  }

  return refererInfo;
}

export const getRefererInfo = detectReferer(window);

/**
 * Reduces referer info provided by an external source (e.g. Prebid.js `refererInfo`, which carries full page URLs)
 * to the {@link RefererInfo} fields used by ID5, with origins only.
 * @param {Object} [refererInfo]
 * @return {RefererInfo|undefined}
 */
export function toOriginsOnlyRefererInfo(refererInfo) {
  if (!refererInfo) {
    return undefined;
  }
  return {
    topmostLocation: toOrigin(refererInfo.topmostLocation),
    ref: toOrigin(refererInfo.ref),
    reachedTop: refererInfo.reachedTop,
    numIframes: refererInfo.numIframes,
    stack: Array.isArray(refererInfo.stack) ? refererInfo.stack.map(toOrigin) : []
  };
}
