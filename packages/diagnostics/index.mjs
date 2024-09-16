import {MeasurementsPublisher, IS_PUBLISHING_SUPPORTED} from './src/publisher.js';
import {MeterRegistry} from './src/registry.js';
import {Timer, Counter, Summary, TimeMeasurement} from './src/meters.js';

export {MeterRegistry, Timer, Counter, Summary, TimeMeasurement};

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
    }, 'id5.api');
  }

  loadDelayTimer(tags = {}) {
    return this.timer('instance.load.delay', tags);
  }

  fetchCallTimer(status, tags = {}) {
    return this.timer('fetch.call.time', {
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

  extensionsCallTimer(extensionType, success, tags = {}) {
    return this.timer('extensions.call.time', {
      extensionType: extensionType,
      status: success ? 'success' : 'fail',
      ...tags
    });
  }

  consentRequestTimer(requestType, tags = {}) {
    return this.timer('consent.request.time', {requestType: requestType, ...tags});
  }

  invocationCountSummary(tags = {}) {
    return this.summary('invocation.count', tags);
  }

  /**
   * Counting number of unique instances discovered
   * @param instanceId - unique instance id tag to make sure instances sharing window/meter registry  will count independently
   * @param tags
   * @return {Counter|Meter}
   */
  instanceCounter(instanceId, tags = {}) {
    return this.counter('instance.count', {instanceId: instanceId, ...tags});
  }

  /**
   * Counting number of unique domains discovered
   * @param instanceId - unique instance id tag to make sure instances sharing window/meter registry  will count independently
   * @param tags - optional tags
   * @return {Counter|Meter}
   */
  instanceUniqueDomainsCounter(instanceId, tags = {}) {
    return this.counter('instance.domains.count', {instanceId: instanceId, ...tags});
  }

  /**
   * Counting number of unique windows discovered
   * @param instanceId
   * @param tags
   * @return {Counter|Meter}
   */
  instanceUniqWindowsCounter(instanceId, tags = {}) {
    return this.counter('instance.windows.count', {instanceId: instanceId, ...tags});
  }

  /**
   * Counting number of unique partners discovered
   * @param instanceId
   * @param tags
   * @return {Counter|Meter}
   */
  instanceUniqPartnersCounter(instanceId, tags = {}) {
    return this.counter('instance.partners.count', {instanceId: instanceId, ...tags});
  }

  instanceJoinDelayTimer(tags = {}) {
    return this.timer('instance.join.delay.time', tags);
  }

  instanceLateJoinCounter(instanceId, tags = {}) {
    return this.counter('instance.lateJoin.count', {instanceId: instanceId, ...tags});
  }

  instanceLateJoinDelayTimer(tags = {}) {
    return this.timer('instance.lateJoin.delay', {...tags});
  }

  instanceLastJoinDelayTimer(tags = {}) {
    return this.timer('instance.lastJoin.delay', {...tags});
  }

  instanceMsgDeliveryTimer(tags = {}) {
    return this.timer('instance.message.delivery.time', tags);
  }

  userIdProvisioningDelayTimer(fromCache, tags = {}) {
    return this.timer('userid.provisioning.delay', {
      cachedResponseUsed: fromCache,
      ...tags
    });
  }

  userIdNotificationDeliveryDelayTimer(tags = {}) {
    return this.timer('userid.provisioning.delivery.delay', {
      ...tags
    });
  }

  userIdProvisioningDuplicateTimer(tags = {}) {
    return this.timer('userid.provisioning.duplicate', {
      ...tags
    });
  }

  cachedUserIdAge(tags = {}) {
    return this.summary('userid.cached.age', {
      ...tags
    });
  }

  consentChangeCounter(tags = {}) {
    return this.counter('leader.consent.change.count', tags);
  }

  consentIgnoreCounter(tags = {}) {
    return this.counter('leader.consent.ignore.count', tags);
  }

  storageAllKeysCounter(tags = {}) {
    return this.summary('storage.keys.all.count', tags);
  }

  storageExpiredKeysCounter(tags = {}) {
    return this.summary('storage.keys.expired.count', tags);
  }

  instanceSurvivalTime(tags = {}) {
    return this.timer('instance.survival.time', tags);
  }

  localStorageGrantCounter(tags = {}) {
    return this.counter('consent.lsg.count', tags);
  }

  consentDiscrepancyCounter(tags = {}) {
    return this.counter('consent.discrepancy.count', tags);
  }

  refreshCallCounter(target, tags = {}) {
    return this.counter('refresh.call.count', {
      target: target,
      ...tags
    });
  }
}
