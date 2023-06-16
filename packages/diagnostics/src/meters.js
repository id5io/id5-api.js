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
    try {
      return new TimeMeasurement(this);
    } catch (e) {
      return undefined;
    }
  }

  record(value) {
    try {
      this.values.push({
        value: value,
        timestamp: Date.now()
      });
    } catch (e) {
    }
  }

  /**
   * Records the time elapsed since Performance.timeOrigin (the time when navigation has started in window contexts, or the time when the worker is run in Worker and ServiceWorker contexts).
   */
  recordNow() {
    try {
      this.record(performance?.now() | 0);
    } catch (e) {
    }
  }
}

export class TimeMeasurement {
  constructor(timer = undefined) {
    this.timer = timer;
    this.startTime = performance.now();
  }

  record(timer = undefined) {
    try {
      let endTime = performance.now();
      let durationMillis = (endTime - this.startTime) | 0;
      let meterToRecord = timer || this.timer;
      if (meterToRecord) {
        meterToRecord.record(durationMillis);
      }
      return durationMillis;
    } catch (e) {
      return undefined;
    }
  }
}

export class Counter extends Meter {
  constructor(name, tags = undefined) {
    super(name, tags, MeterType.COUNTER);
  }

  inc(value = 1.0) {
    try {
      if (this.values.length === 0) {
        this.values.push({value: value, timestamp: Date.now()});
      } else {
        this.values[0].value += value;
        this.values[0].timestamp = Date.now();
      }
    } catch (e) {
    }
  }
}

export class Summary extends Meter {
  constructor(name, tags = undefined) {
    super(name, tags, MeterType.SUMMARY);
  }

  record(value) {
    try {
      this.values.push({
        value: value,
        timestamp: Date.now()
      });
    } catch (e) {
    }
  }
}
