import {Counter, Summary, Timer} from './meters.js';
import Tags from './tags.js';

/**
 * @typedef {Object} MeasurementValue
 * @property {number} timestamp
 * @property {number} value
 */

class Registry {
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
    return Object.entries(this).map(([_, value]) => value);
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
   * @type {boolean}
   * @private
   */
  _scheduled;

  /**
   *
   * @param {Object} [commonTags] - common tags, default unknown
   */
  constructor(commonTags = undefined) {
    this._registry = new Registry();
    this.commonTags = Tags.from(commonTags);
  }

  /**
   * @param {string} name
   * @param {Object} tags
   * @param {function(string, Object) : T | Meter} createFn
   * @return {T | Meter}
   */
  getOrCreate(name, tags, createFn) {
    let mergedTags = {...tags, ...this.commonTags};
    const key = `${name}[${Tags.toString(mergedTags)}]`;
    if (!this._registry.has(key)) {
      this._registry.set(key, createFn(name, mergedTags));
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

  /**
   * @return {Promise}
   * @param {function(Array<Measurement>) : Promise|any} publisher - publisher function, default noop
   */
  publish(publisher = m => m) {
    return Promise.resolve(this.getAllMeasurements())
      .then(publisher)
      .then((_) => this.reset());
  }

  /**
   * @param {function(Array<Measurement>) : Promise|any} publisher - publisher function, default noop
   * @param msec
   * @return {MeterRegistry}
   */
  schedulePublishAfterMsec(msec, publisher) {
    if (!this._scheduled) {
      let registry = this;
      setTimeout(() => {
        registry._scheduled = false;
        return registry.publish(publisher);
      }, msec);
      this._scheduled = true;
    }
    return this;
  }

  /**
   * @param {function(Array<Measurement>) : Promise|any} publisher - publisher function, default noop
   * @return {MeterRegistry}
   */
  schedulePublishOnUnload(publisher) {
    let registry = this;
    addEventListener('unload', () => registry.publish(publisher));
    return this;
  }
}
