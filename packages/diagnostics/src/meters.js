import Tags from './tags.js';

export const MeterType = Object.freeze({
  TIMER: 'TIMER',
  SUMMARY: 'SUMMARY',
  COUNTER: 'COUNTER'
});

export class Meter {
  /**
   * @type {string}
   */
  name;

  /**
   *
   * @type {Object}
   */
  tags;

  /**
   * @type {Array<MeasurementValue>}
   */
  values;

  /**
   *
   * @param {string} name
   * @param {Object} tags
   * @param {String} type
   */
  constructor(name, tags, type) {
    this.name = name;
    this.tags = Tags.from(tags);
    this.type = type;
    this.values = [];
  }

  reset() {
    this.values = [];
  }
}

export class Timer extends Meter {
  constructor(name, tags = undefined) {
    super(name, tags, MeterType.TIMER);
  }

  startMeasurement() {
    return new TimeMeasurement(this);
  }

  record(value) {
    this.values.push({
      value: value,
      timestamp: Date.now()
    });
  }

  /**
   * Records the time elapsed since Performance.timeOrigin (the time when navigation has started in window contexts, or the time when the worker is run in Worker and ServiceWorker contexts).
   */
  recordNow() {
    this.record(performance?.now() | 0);
  }
}

export class TimeMeasurement {
  constructor(timer) {
    this.timer = timer;
    this.startTime = performance.now();
  }

  stop() {
    let endTime = performance.now();
    let durationMillis = (endTime - this.startTime) | 0;
    this.timer.record(durationMillis);
  }
}

export class Counter extends Meter {
  constructor(name, tags = undefined) {
    super(name, tags, MeterType.COUNTER);
  }

  inc(value = 1.0) {
    if (this.values.length === 0) {
      this.values.push({value: value, timestamp: Date.now()});
    } else {
      this.values[0].value += value;
      this.values[0].timestamp = Date.now();
    }
  }
}

export class Summary extends Meter {
  constructor(name, tags = undefined) {
    super(name, tags, MeterType.SUMMARY);
  }

  record(value) {
    this.values.push({
      value: value,
      timestamp: Date.now()
    });
  }
}
