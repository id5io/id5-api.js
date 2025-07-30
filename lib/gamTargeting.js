/**
 * Class for handling Google Ad Manager (GAM) targeting tags.
 * This class is responsible for updating GAM targeting based on the ID5 response.
 */
export class GamTargeting {
  /**
   * Updates Google Ad Manager targeting with ID5-specific tags
   * @param {Id5UserId} userId - The ID5 user ID object
   * @param {string|undefined} gamTargetingPrefix
   */
  static updateTargeting(userId, gamTargetingPrefix) {
    if (gamTargetingPrefix) {
      const fetchResponse = userId.responseObj;
      const tags = fetchResponse.tags;

      // Update GAM targeting
      if (typeof window !== 'undefined') {
        window.googletag = window.googletag || {cmd: []};
        window.googletag.cmd = window.googletag.cmd || [];
        window.googletag.cmd.push(() => {
          for (const tag in tags) {
            window.googletag.setConfig( {targeting: {[gamTargetingPrefix + '_' + tag]: tags[tag]}});
          }
        });
      }
    }
  }
}
