const EXP_SUFFIX = '_exp';
const DAY_MS = 60 * 60 * 24 * 1000;

export class LocalStorage {
  /** @type {boolean} */
  available = false;
  /** @type {StorageApi} */
  storage;

  /**
   * Builds a new abstraction of the localStorage associated with
   * the passed window object
   * @param {StorageApi} storage the window object to use
   */
  constructor(storage) {
    this.storage = storage;

    // Test for availability
    const test = '__id5test';
    try {
      this.storage.setItem(test, test);
      this.storage.removeItem(test);
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
      return this.storage.getItem(key);
    }
  }

  /**
   * Puts a string in local storage
   *
   * @param {string} key the key of the item
   * @param {string} value the value to store
   * @returns {undefined}
   */
  setItem(key, value) {
    if (this.available) {
      this.storage.setItem(key, value);
    }
  }

  /**
   * Removes a string from local storage
   * @param {string} key the key of the item
   */
  removeItem(key) {
    if (this.available) {
      this.storage.removeItem(key);
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
   * @param {string} value
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

/**
 * @interface
 */
export class StorageApi {
  /**
   * Returns the current value associated with the given key, or null if the given key does not exist.
   * @property {string} key
   * @returns {string}
   */
  getItem(key) {}
  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists.
   * @property {string} key
   */
  removeItem(key) {}
  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
   * @property {string} key
   * @property {string} value
   */
  setItem(key, value) {}
}

export const NoopStorage = new StorageApi();

export class WindowStorage extends StorageApi {
  _writingEnabled;
  _underlying;

  constructor(window, writingEnabled = true) {
    super();
    this._writingEnabled = writingEnabled;
    try {
      this._underlying = window.localStorage;
    } catch (e) {
    }
  }

  getItem(key) {
    try {
      return this._underlying.getItem(key);
    } catch (e) {
    }
  }

  removeItem(key) {
    try {
      this._underlying.removeItem(key);
    } catch (e) {
    }
  }

  setItem(key, value) {
    try {
      if (this._writingEnabled) {
        this._underlying.setItem(key, value);
      }
    } catch (e) {
    }
  }
}
/**
 * @implements {StorageApi}
 */
export class ReplicatingStorage {
  /**
   * @type {Array<StorageApi>} storage replicas to write to
   * @private
   */
  _replicas = [];

  /**
   * last modification made on key,  memorized to be replayed on newly added replica
   * @private
   */
  _lastKeyOperation = {};

  /**
   * @type {StorageApi | Storage}
   * @private
   */
  _primaryStorage;

  /**
   *
   * @param {StorageApi|Storage} primaryStorage
   */
  constructor(primaryStorage) {
    this._primaryStorage = primaryStorage;
  }

  getItem(key) {
    return this._primaryStorage.getItem(key);
  }

  removeItem(key) {
    this._primaryStorage.removeItem(key);
    const replicaOp = (replica) => { replica.removeItem(key); };
    this._replicas.forEach(replicaOp);
    this._lastKeyOperation[key] = replicaOp;
  }

  setItem(key, value) {
    this._primaryStorage.setItem(key, value);
    const replicaOp = (replica) => { replica.setItem(key, value); };
    this._replicas.forEach(replicaOp);
    this._lastKeyOperation[key] = replicaOp;
  }

  /**
   *
   * @param replica
   */
  addReplica(replica) {
    Object.values(this._lastKeyOperation).forEach(operation => operation(replica));
    this._replicas.push(replica);
  }
}
