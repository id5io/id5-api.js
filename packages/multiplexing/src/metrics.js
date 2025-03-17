/**
 *
 * @param {MeterRegistry} metrics
 * @param {String} status
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function fetchCallTimer(metrics, status, tags = {}) {
  return metrics.timer('fetch.call.time', {
    status: status,
    ...tags
  });
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function fetchFailureCallTimer(metrics, tags = {}) {
  return fetchCallTimer(metrics, 'fail', tags);
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function fetchSuccessfulCallTimer(metrics, tags = {}) {
  return fetchCallTimer(metrics, 'success', tags);
}

/**
 *
 * @param {MeterRegistry} metrics
 * @param {String} extensionType
 * @param {Boolean} success
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function extensionsCallTimer(metrics, extensionType, success, tags = {}) {
  return metrics.timer('extensions.call.time', {
    extensionType: extensionType,
    status: success ? 'success' : 'fail',
    ...tags
  });
}

/**
 * Counting number of unique instances discovered
 * @param {MeterRegistry} metrics
 * @param {String} instanceId - unique instance id tag to make sure instances sharing window/meter registry  will count independently
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function instanceCounter(metrics, instanceId, tags = {}) {
  return metrics.counter('instance.count', {instanceId: instanceId, ...tags});
}

/**
 * Counting number of unique domains discovered
 * @param {MeterRegistry} metrics
 * @param {String} instanceId - unique instance id tag to make sure instances sharing window/meter registry  will count independently
 * @param {Object} tags - optional tags
 * @return {Counter|Meter}
 */
export function instanceUniqueDomainsCounter(metrics, instanceId, tags = {}) {
  return metrics.counter('instance.domains.count', {instanceId: instanceId, ...tags});
}

/**
 * Counting number of unique windows discovered
 * @param {MeterRegistry} metrics
 * @param instanceId
 * @param tags
 * @return {Counter|Meter}
 */
export function instanceUniqWindowsCounter(metrics, instanceId, tags = {}) {
  return metrics.counter('instance.windows.count', {instanceId: instanceId, ...tags});
}

/**
 * Counting number of unique partners discovered
 * @param {MeterRegistry} metrics
 * @param instanceId
 * @param tags
 * @return {Counter|Meter}
 */
export function instanceUniqPartnersCounter(metrics, instanceId, tags = {}) {
  return metrics.counter('instance.partners.count', {instanceId: instanceId, ...tags});
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function instanceJoinDelayTimer(metrics, tags = {}) {
  return metrics.timer('instance.join.delay.time', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param instanceId
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function instanceLateJoinCounter(metrics, instanceId, tags = {}) {
  return metrics.counter('instance.lateJoin.count', {instanceId: instanceId, ...tags});
}


/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function instanceLateJoinDelayTimer(metrics, tags = {}) {
  return metrics.timer('instance.lateJoin.delay', {...tags});
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function instanceLastJoinDelayTimer(metrics, tags = {}) {
  return metrics.timer('instance.lastJoin.delay', {...tags});
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function instanceMsgDeliveryTimer(metrics, tags = {}) {
  return metrics.timer('instance.message.delivery.time', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function instanceInvalidMsgCounter(metrics, tags = {}) {
  return metrics.counter('instance.message.invalid.count', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function instanceUnexpectedMsgCounter(metrics, tags = {}) {
  return metrics.counter('instance.message.unexpected.count', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Timer|Meter}
 */
export function userIdProvisioningDuplicateTimer(metrics, tags = {}) {
  return metrics.timer('userid.provisioning.duplicate', {
    ...tags
  });
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Summary|Meter}
 */
export function cachedUserIdAge(metrics, tags = {}) {
  return metrics.summary('userid.cached.age', {
    ...tags
  });
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function consentChangeCounter(metrics, tags = {}) {
  return metrics.counter('leader.consent.change.count', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function consentIgnoreCounter(metrics, tags = {}) {
  return metrics.counter('leader.consent.ignore.count', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Summary|Meter}
 */
export function storageAllKeysCounter(metrics, tags = {}) {
  return metrics.summary('storage.keys.all.count', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Summary|Meter}
 */
export function storageExpiredKeysCounter(metrics, tags = {}) {
  return metrics.summary('storage.keys.expired.count', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function localStorageGrantCounter(metrics, tags = {}) {
  return metrics.counter('consent.lsg.count', tags);
}

/**
 * @param {MeterRegistry} metrics
 * @param target
 * @param {Object} tags
 * @return {Counter|Meter}
 */
export function refreshCallCounter(metrics, target, tags = {}) {
  return metrics.counter('refresh.call.count', {
    target: target,
    ...tags
  });
}
