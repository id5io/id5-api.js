/*
 * Module for managing A/B Testing
 */

import { isNumber } from './utils';

export class AbTesting {
  /** @type boolean */
  controlGroup = false;

  /**
   * @typedef {Object} AbTestConfig
   * @property {boolean|false} [enabled] - Enable control group
   * @property {number} [controlGroupPct] - Ratio of users in control group [0,1]
   */

  /** @param {AbTestConfig} [abConfig] */
  constructor(abConfig) {
    if (abConfig && abConfig.enabled === true &&
      (!isNumber(abConfig.controlGroupPct) ||
        abConfig.controlGroupPct < 0 ||
        abConfig.controlGroupPct > 1)
    ) {
      throw new Error('A/B Testing controlGroupPct must be a number >= 0 and <= 1');
    }

    if (abConfig && abConfig.enabled === true) {
      this.controlGroup = Math.random() < abConfig.controlGroupPct;
    }
  }

  exposeId() {
    return typeof this.controlGroup !== 'boolean' || this.controlGroup === false;
  }
}

export default AbTesting;
