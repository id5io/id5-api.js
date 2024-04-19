import {isPlainObject} from "./utils.js";

export class TrueLinkAdapter {

  isBooted() {
    return isPlainObject(window.id5Bootstrap)
  }

  /**
   * @return {TrueLink}
   */
  getTrueLink() {
    if (this.isBooted()) {
      return window.id5Bootstrap.getTrueLinkInfo()
    } else {
      return {
        booted: false
      }
    }
  }
}