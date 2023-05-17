import {Counter, Summary, Timer} from './meters.js';
import Tags from './tags.js';

/**
 * @typedef {Object} MeasurementValue
 * @property {number} timestamp
 * @property {number} value
 */

/**
 * @typedef {Object} Measurement
 * @property {string} name - measurement name
 * @property {Object} tags - measurement tags
 * @property {Array<MeasurementValue>} values
 */
export class MeterRegistry {
  /**
   * @type {Map<string, Meter>}
   */
  registry;

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
    this.registry = new Map();
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
    if (!this.registry.has(key)) {
      this.registry.set(key, createFn(name, mergedTags));
    }
    return this.registry.get(key);
  }

  /**
   *
   * @return {Array<Measurement>}
   */
  getAllMeasurements() {
    return Array.from(this.registry, ([k, meter]) => ({
      name: meter.name,
      type: meter.type,
      tags: meter.tags,
      values: meter.values
    })).filter(function (m) {
      return m.values && m.values.length > 0;
    });
  }

  reset() {
    this.registry.forEach((value, key) => value.reset());
  }

  /**
   *
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
      .then(measurements => {
        this.reset();
        return publisher(measurements);
      });
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
