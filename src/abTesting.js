/*
 * Module for managing A/B Testing
 */

import { config } from './config';
import { isBoolean, isNumber } from './utils';

let controlGroup;

export function init() {
  const abConfig = config.getConfig().abTesting;
  if (
    abConfig.enabled === true &&
    (!isNumber(abConfig.controlGroupPct) ||
      abConfig.controlGroupPct < 0 ||
      abConfig.controlGroupPct > 1)
  ) {
    throw new Error('A/B Testing controlGroupPct must be a number >= 0 and <= 1');
  }

  controlGroup = abConfig.enabled === true && Math.random() < abConfig.controlGroupPct;
}

export function exposeId() {
  if (!isBoolean(controlGroup)) {
    init();
  }
  return !controlGroup;
}
