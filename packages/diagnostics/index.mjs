import {MeasurementsPublisher, IS_PUBLISHING_SUPPORTED} from './src/publisher.js';
import {TimeMeasurement} from './src/meters.js';

export {Timer, Counter, Summary, TimeMeasurement} from './src/meters.js';
export {MeterRegistry, Registry, ObjectRegistry} from './src/registry.js';

export function startTimeMeasurement() {
  return new TimeMeasurement();
}

export function createPublisher(sampleRate, url) {

  if (Math.random() < sampleRate && IS_PUBLISHING_SUPPORTED) {
    return (m, md) => new MeasurementsPublisher(url, {
      sampling: sampleRate
    }).publish(m, md);
  }
  return (m) => {
    return m;
  };
}
export {MeterRegistryPublisher} from './src/publisher.js';
