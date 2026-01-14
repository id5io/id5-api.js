import {deepEqual} from './utils.js';

/**
 * Class for handling Targeting tags, both for Google Ad Manager (GAM) targeting tags and other targeting solutions
 * This class is responsible for updating GAM targeting based on the ID5 response.
 */
export class TargetingTags {
  /**
   * Updates targeting with ID5-specific tags
   * @param {Id5UserId} userId - The ID5 user ID object
   * @param {string|undefined} gamTargetingPrefix
   * @param {boolean} exposeTargeting
   */
  static updateTargeting(userId, gamTargetingPrefix, exposeTargeting) {
    const tags = userId.responseObj.tags;
    if (tags && gamTargetingPrefix) {
      // Update GAM targeting
      if (typeof window !== 'undefined') {
        window.googletag = window.googletag || {cmd: []};
        window.googletag.cmd = window.googletag.cmd || [];
        window.googletag.cmd.push(() => {
          for (const tag in tags) {
            window.googletag.setConfig({targeting: {[gamTargetingPrefix + '_' + tag]: tags[tag]}});
          }
        });
      }
    }
    if (tags && exposeTargeting && !deepEqual(window?.id5tags?.tags, tags)) {
      window.id5tags = window.id5tags || {cmd: []};
      window.id5tags.cmd = window.id5tags.cmd || [];
      window.id5tags.cmd.forEach(tagsCallback => {
        setTimeout(() => tagsCallback(tags), 0);
      });
      window.id5tags.cmd.push = function (tagsCallback) {
        tagsCallback(tags)
        Array.prototype.push.call(window.id5tags.cmd, tagsCallback);
      };
      window.id5tags.tags = tags
    }
  }
}
