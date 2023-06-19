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

export function startTimeMeasurement() {
  return new TimeMeasurement();
}

export function partnerTag(partnerId) {
  return {partner: partnerId};
}

export class Id5CommonMetrics extends MeterRegistry {
  constructor(source, version, partnerId = undefined, tags = undefined) {
    super({
      source: source,
      version: version,
      ...partnerTag(partnerId),
      ...tags
    });
  }

  loadDelayTimer(tags = {}) {
    return this.timer('id5.api.instance.load.delay', tags);
  }

  fetchCallTimer(status, tags = {}) {
    return this.timer('id5.api.fetch.call.time', {
      status: status,
      ...tags
    });
  }

  fetchFailureCallTimer(tags = {}) {
    return this.fetchCallTimer('fail', tags);
  }

  fetchSuccessfulCallTimer(tags = {}) {
    return this.fetchCallTimer('success', tags);
  }

  extensionsCallTimer(tags = {}) {
    return this.timer('id5.api.extensions.call.time', tags);
  }

  consentRequestTimer(requestType, tags = {}) {
    return this.timer('id5.api.consent.request.time', {requestType: requestType, ...tags});
  }

  invocationCountSummary(tags = {}) {
    return this.summary('id5.api.invocation.count', tags);
  }
}
