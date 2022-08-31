/**
 * This class deals with the mechanics of accessing the local storage
 * on a certain window object
 */

const EXP_SUFFIX = '_exp';
const DAY_MS = 60 * 60 * 24 * 1000;

export default class LocalStorage {
  /** @type {boolean} */
  available = false;
  /** @type {Object} */
  win;
  /** @type {boolean} */
  writingEnabled;

  /**
   * Builds a new abstraction of the localStorage associated with
   * the passed window object
   * @param {Object} win the window object to use
   * @param {boolean} writingEnabled
   */
  constructor(win, writingEnabled = true) {
    this.win = win;
    this.writingEnabled = writingEnabled;

    // Test for availability
    const test = '__id5test';
    try {
      if (this.writingEnabled) {
        this.win.localStorage.setItem(test, test);
      }
      this.win.localStorage.removeItem(test);
      this.available = true;
    } catch (e) {
      // do nothing
    }
  }

  /**
   * @returns {boolean} true if the localStorage is available
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Gets a stored string from local storage
   *
   * @param {string} key
   * @returns {string|null|undefined} the stored value, null if no value or expired were stored, undefined if no localStorage
   */
  getItem(key) {
    if (this.available) {
      return this.win.localStorage.getItem(key);
    }
  }

  /**
   * Puts a string in local storage
   *
   * @param {string} key the key of the item
   * @param {string} value the vaule to store
   * @returns {undefined}
   */
  setItem(key, value) {
    if (this.available && this.writingEnabled) {
      this.win.localStorage.setItem(key, value);
    }
  }

  /**
   * Removes a string from local storage
   * @param {string} key the key of the item
   */
  removeItem(key) {
    if (this.available) {
      this.win.localStorage.removeItem(key);
    }
  }

  /**
   * Gets a stored item from local storage dealing with expiration policy.
   * @param {Object} config The item configuration
   * @param {string} config.name The item name
   * @returns {string|null} the stored value, null if no value, expired or no localStorage
   */
  getItemWithExpiration({ name }) {
    const storedValueExp = this.getItem(name + EXP_SUFFIX);
    if (storedValueExp && !isExpired(storedValueExp)) {
      return this.getItem(name);
    } else {
      this.removeItemWithExpiration({ name });
      return null;
    }
  }

  /**
   * Stores an item in local storage dealing with expiration policy.
   * @param {Object} config The item configuration
   * @param {string} config.name The item name
   * @param {number} config.expiresDays The expiration in days
   * @returns {undefined}
   */
  setItemWithExpiration({name, expiresDays}, value) {
    const expirationInMs = Date.now() + (expiresDays * DAY_MS);
    const expiresStr = (new Date(expirationInMs)).toUTCString();
    this.setItem(name + EXP_SUFFIX, expiresStr);
    this.setItem(name, value);
  }

  /**
   * Removes an item from local storage dealing with expiration policy.
   */
  removeItemWithExpiration({ name }) {
    this.removeItem(name);
    this.removeItem(name + EXP_SUFFIX);
  }
}

/**
 * Tells whether a stored expiration date has passed
 * @param {string} dateValue the .toUTCString() representation of the expiration date
 */
function isExpired(dateValue) {
  return (new Date(dateValue)).getTime() - Date.now() <= 0;
}
