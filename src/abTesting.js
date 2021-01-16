/*
 * Module for managing A/B Testing
 */

import { isNumber, cyrb53Hash } from './utils';

const ABTEST_RESOLUTION = 10000;

/**
 * Return a consistant random number between 0 and ABTEST_RESOLUTION-1 for this user
 * Falls back to plain random if no user provided
 * @param {string} [userId]
 * @returns {number}
 */
function abTestBucket(userId) {
  if (userId) {
    return ((cyrb53Hash(userId) % ABTEST_RESOLUTION) + ABTEST_RESOLUTION) % ABTEST_RESOLUTION;
  } else {
    return Math.floor(Math.random() * ABTEST_RESOLUTION);
  }
}

/**
 * Return a consistant boolean if this user is within the control group ratio provided
 * @param {string} [userId]
 * @param {number} controlGroupRatio - Ratio [0,1] of users expected to be in the control group
 * @returns {boolean}
 */
export function isInControlGroup(userId, controlGroupRatio) {
  if (!isNumber(controlGroupRatio) || controlGroupRatio < 0 || controlGroupRatio > 1) {
    throw new Error('A/B Testing controlGroupRatio must be a number >= 0 and <= 1');
  }
  return abTestBucket(userId) < controlGroupRatio * ABTEST_RESOLUTION;
}

export default isInControlGroup;
