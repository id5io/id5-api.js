import {MeterRegistry, ObjectRegistry} from '@id5io/diagnostics';

export function partnerTag(partnerId) {
  return {partner: partnerId};
}

export class Id5CommonMetrics extends MeterRegistry {
  constructor(source, version, partnerId = undefined, tags = undefined, registry = new ObjectRegistry()) {
    super(registry, {
      source: source,
      version: version,
      ...partnerTag(partnerId),
      ...tags
    }, 'id5.api');
  }
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function instanceSurvivalTime(metrics, tags) {
  return metrics.timer('instance.survival.time', tags);
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function userIdNotificationDeliveryDelayTimer(metrics, tags) {
  return metrics.timer('userid.provisioning.delivery.delay', tags);
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Boolean} fromCache
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function userIdProvisioningDelayTimer(metrics, fromCache, tags = {}) {
  return metrics.timer('userid.provisioning.delay', {
    cachedResponseUsed: fromCache,
    ...tags
  });
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {String} target
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function refreshCallCounter(metrics, target, tags = {}) {
  return metrics.counter('refresh.call.count', {
    target: target,
    ...tags
  });
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function consentDiscrepancyCounter(metrics, tags = {}) {
  return metrics.counter('consent.discrepancy.count', tags);
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {String} requestType
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function consentRequestTimer(metrics,requestType, tags = {}) {
  return metrics.timer('consent.request.time', {requestType: requestType, ...tags});
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Summary|Meter}
 */
export function invocationCountSummary(metrics, tags = {}) {
  return metrics.summary('invocation.count', tags);
}
/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function loadDelayTimer(metrics, tags = {}) {
  return metrics.timer('instance.load.delay', tags);
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function pbjsDetectedCounter(metrics, tags = {}) {
  return metrics.counter('pbjs.detected', tags);
}
