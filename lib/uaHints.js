import { isArray, isDefined, isStr } from "@id5io/multiplexing/utils";
export class UaHints {
  /**
   * Gathers UA Hints from the browser if possible and enabled adn returns them
   * after filtering them for known unneeded values
   * @param {boolean} disableUaHints
   * @param {Logger} log
   * @returns {Promise<Object>} The filtered UA hints
   */
  static async gatherUaHints(disableUaHints, log) {
    if (!isDefined(window.navigator.userAgentData) || disableUaHints) {
      return undefined;
    }

    let hints;

    try {
      hints = await window.navigator.userAgentData.getHighEntropyValues(['architecture', 'fullVersionList', 'model', 'platformVersion']);
    } catch (error) {
      log.error('Error while calling navigator.userAgentData.getHighEntropyValues()', error);
      return undefined;
    }

    return UaHints.filterUaHints(hints);
  }

  /**
   * removes in place GREASE-like UA brands from the user agent hints brands and
   * fullVersionList lists
   * https://wicg.github.io/ua-client-hints/#grease
   * @param {object} uaHints
   * @returns {object} the filterd uaHints
   */
  static filterUaHints(uaHints) {
    if (!isDefined(uaHints)) {
      return undefined;
    }
    const GREASE_REGEX = /[()-.:;=?_/]/g;
    if (isArray(uaHints.brands)) {
      uaHints.brands = uaHints.brands.filter(element =>
        isStr(element.brand) && element.brand.search(GREASE_REGEX) < 0);
    }
    if (isArray(uaHints.fullVersionList)) {
      uaHints.fullVersionList = uaHints.fullVersionList.filter(element =>
        isStr(element.brand) && element.brand.search(GREASE_REGEX) < 0);
    }
    return uaHints;
  }
}
