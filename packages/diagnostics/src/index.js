import {MeasurementsPublisher, IS_PUBLISHING_SUPPORTED} from './publisher.js';
import {MeterRegistry} from './registry.js';
import {Timer, Counter, Summary, TimeMeasurement} from './meters.js';

export {MeterRegistry, Timer, Counter, Summary, TimeMeasurement};

export function createPublisher(sampleRate, url) {
  if (Math.random() < sampleRate && IS_PUBLISHING_SUPPORTED) {
    return (m) => new MeasurementsPublisher(url).publish(m);
  }
  return (m) => {
    return m;
  };
}

export class Id5CommonTags {
  source;
  partner;
  version;

  constructor(source, version, partner = undefined) {
    this.source = source;
    this.version = version;
    this.partner = partner;
  }
}

export function startTimeMeasurement() {
  return new TimeMeasurement();
}

export class Id5CommonMetrics {
  /**
   * @type {MeterRegistry}
   */
  registry;

  constructor(registry) {
    this.registry = registry;
  }

  loadDelay(tags = {}) {
    return this.timer('id5.api.instance.load.delay', tags);
  }

  fetchCallTime(status, tags = {}) {
    return this.timer('id5.api.fetch.call.time', {
      status: status,
      ...tags
    });
  }

  fetchFailureCallTime(tags = {}) {
    return this.fetchCallTime('fail', tags);
  }

  fetchSuccessfulCallTime(tags = {}) {
    return this.fetchCallTime('success', tags);
  }

  extensionsCallTime(tags = {}) {
    return this.timer('id5.api.extensions.call.time', tags);
  }

  consentRequestTime(requestType, tags = {}) {
    return this.timer('id5.api.consent.request.time', {requestType: requestType, ...tags});
  }

  invocationCount(tags = {}) {
    return this.counter('id5.api.invocation.count', tags);
  }

  timer(name, tags = {}) {
    return this.registry.timer(name, tags);
  }

  counter(name, tags = {}) {
    return this.registry.counter(name, tags);
  }

  summary(name, tags = {}) {
    return this.registry.summary(name, tags);
  }
}
