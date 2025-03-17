import {Counter, Summary, Timer} from './meters.js';
import Tags from './tags.js';

/**
 * @typedef {Object} MeasurementValue
 * @property {number} timestamp
 * @property {number} value
 * @interface
 */
export class Registry {
  // eslint-disable-next-line no-unused-vars
  has(key) {
    return false;
  }

  // eslint-disable-next-line no-unused-vars
  set(key, value) {
    return this;
  }

  // eslint-disable-next-line no-unused-vars
  get(key) {
    return undefined;
  }

  values() {
    return [];
  }
}

export class ObjectRegistry extends Registry {
  has(key) {
    return this[key] !== undefined;
  }

  set(key, value) {
    this[key] = value;
    return this;
  }

  get(key) {
    return this[key];
  }

  values() {
    return Object.entries(this).map(([, value]) => value);
  }
}

/**
 * @typedef {Object} Measurement
 * @property {string} name - measurement name
 * @property {Object} tags - measurement tags
 * @property {Array<MeasurementValue>} values
 */
export class MeterRegistry {
  /**
   * @type {Registry}
   */
  _registry;

  /**
   *
   * @type {Object}
   */
  commonTags;

  /**
   *
   * @private
   */
  _onUnregisterCallback;

  /**
   *
   * @param {Registry} [registry] - registry to store metrics
   * @param {Object} [commonTags] - common tags, default unknown
   * @param {string} [commonPrefix] - common prefix added to each meter name in this registry
   */
  constructor(registry = new Registry(), commonTags = undefined, commonPrefix = undefined) {
    this._registry = registry;
    this.commonTags = Tags.from(commonTags);
    this.commonPrefix = commonPrefix;
  }

  /**
   * @param {string} name
   * @param {Object} tags
   * @param {function(string, Object) : T | Meter} createFn
   * @return {T | Meter}
   */
  getOrCreate(name, tags, createFn) {
    let mergedTags = {...tags, ...this.commonTags};
    let prefixedName = this.commonPrefix ? (this.commonPrefix + '.' + name) : name;
    const key = `${prefixedName}[${Tags.toString(mergedTags)}]`;
    if (!this._registry.has(key)) {
      const value = createFn(prefixedName, mergedTags);
      this._registry.set(key, value);
      return value;
    }
    return this._registry.get(key);
  }

  /**
   *
   * @return {Array<Measurement>}
   */
  getAllMeasurements() {
    return this._registry.values().map(meter => {
      return {
        name: meter.name,
        type: meter.type,
        tags: meter.tags,
        values: meter.values
      };
    }).filter(function (m) {
      return m.values && m.values.length > 0;
    });
  }

  /**
   * Resets all already collected measurements for each meter registered
   */
  reset() {
    Array.from(this._registry.values()).forEach(meter => meter.reset());
  }

  /**
   * @param {object} commonTags - tags to add
   */
  addCommonTags(commonTags) {
    this.commonTags = {...this.commonTags, ...Tags.from(commonTags)};
  }

  /**
   * @param {String} name
   * @param {Object} tags
   * @return {Timer|Meter}
   */
  timer(name, tags = {}) {
    return this.getOrCreate(name, tags, (n, t) => new Timer(n, t));
  }

  /**
   * @param {String} name
   * @param {Object} tags
   * @return {Counter|Meter}
   */
  counter(name, tags = {}) {
    return this.getOrCreate(name, tags, (n, t) => new Counter(n, t));
  }

  /**
   * @param {String} name
   * @param {Object} tags
   * @return {Summary|Meter}
   */
  summary(name, tags = {}) {
    return this.getOrCreate(name, tags, (n, t) => new Summary(n, t));
  }

  unregister() {
    if (this._onUnregisterCallback !== undefined) {
      this._onUnregisterCallback(this);
    }
  }

  onUnregister(callback) {
    this._onUnregisterCallback = callback;
  }
}

