const DEFAULT_URL = 'https://diagnostics.id5-sync.com/measurements';

export const IS_PUBLISHING_SUPPORTED = typeof Promise !== 'undefined' && typeof fetch !== 'undefined';

export class MeasurementsPublisher {
  constructor(url, metadata = undefined) {
    this.url = url || DEFAULT_URL;
    this._metadata = metadata;
  }

  publish(measurements, metadata = undefined) {
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
          metadata: {
            ...this._metadata,
            ...metadata
          },
          measurements: measurements
        })
      });
    }
    return Promise.resolve();
  }
}

export class MeterRegistryPublisher {

  /**
   * @param {function(Array<Measurement>) : Promise|any} publisher - publisher function, default noop
   */
  _publisher;

  /**
   *
   * @param {MeterRegistry} meterRegistry
   * @param {function(Array<Measurement>) : Promise|any} publisherFn
   */
  constructor(meterRegistry, publisherFn) {
    this.meterRegistry = meterRegistry;
    this._publisher = publisherFn;
    const thisPublisher = this;
    this.meterRegistry.onUnregister(function () {
        const abortController = thisPublisher._onUnloadPublishAbortController;
        if (abortController) {
          abortController.abort();
          return thisPublisher.publish({trigger: 'unregister'});
        }
    });
  }

  /**
   * @type {boolean}
   * @private
   */
  _scheduled;

  /**
   * @return {Promise}
   *
   * @param {Object} metadata - optional data to pass to publisher, default undefined
   */
  publish(metadata = undefined) {
    return Promise.resolve(this.meterRegistry.getAllMeasurements())
      .then(m => this._publisher(m, metadata))
      .then(() => this.meterRegistry.reset());
  }

  /**
   * @param msec
   * @return {MeterRegistryPublisher}
   */
  schedulePublishAfterMsec(msec) {
    const self = this;
    if (!self._scheduled) {
      setTimeout(() => {
        self._scheduled = false;
        return self.publish({
          trigger: 'fixed-time',
          fixed_time_msec: msec
        });
      }, msec);
      self._scheduled = true;
    }
    return this;
  }

  /**
   * @return {MeterRegistryPublisher}
   */
  schedulePublishBeforeUnload() {
    const self = this;
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    if (abortController) {
      addEventListener('beforeunload', () => self.publish({trigger: 'beforeunload'}),
        {
          capture: false,
          signal: abortController.signal
        }
      );
      this._onUnloadPublishAbortController = abortController;
    }
    return this;
  }
}
