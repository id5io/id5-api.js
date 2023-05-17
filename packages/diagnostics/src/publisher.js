/* global globalThis */

const DEFAULT_URL = 'https://diagnostics.id5-sync.com/measurements';

export const IS_PUBLISHING_SUPPORTED = typeof globalThis !== 'undefined' && globalThis.Promise !== undefined && globalThis.fetch !== undefined;

export class MeasurementsPublisher {
  constructor(url) {
    this.url = url || DEFAULT_URL;
  }

  publish(measurements) {
    let stringifyTags = function (tagsObj) {
      Object.keys(tagsObj).forEach(function (key) {
        let currentValue = tagsObj[key];
        if (currentValue) {
          if (currentValue instanceof Object) {
            tagsObj[key] = JSON.stringify(currentValue);
          } else {
            tagsObj[key] = `${currentValue}`;
          }
        }
      });
    };

    if (measurements && measurements.length > 0) {
      measurements.forEach(measurement => stringifyTags(measurement.tags));
      return globalThis.fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          measurements: measurements
        })
      });
    }
    return Promise.resolve();
  }
}
