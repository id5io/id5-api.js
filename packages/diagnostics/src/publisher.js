
const DEFAULT_URL = 'https://diagnostics.id5-sync.com/measurements';

export const IS_PUBLISHING_SUPPORTED = typeof Promise !== 'undefined' && typeof fetch !== 'undefined';

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
      return fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        mode: 'no-cors',
        body: JSON.stringify({
          measurements: measurements
        })
      });
    }
    return Promise.resolve();
  }
}
