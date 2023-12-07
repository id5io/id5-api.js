/**
 * @typedef FetchRequestData
 * @property {number} partnerId
 * @property {ConsentData} consentData
 *
 */

/**
 * @typedef Id5UserId
 * @property {Date} timestamp
 * @property {Object} responseObj
 * @property {boolean} isFromCache
 */

/**
 * @typedef FetchId5UidCanceled
 * @property {string} reason
 */

/**
 * @typedef CascadePixelCall
 * @property {number} partnerId
 * @property {string} consentString
 * @property {boolean} gdprApplies
 * @property {string} userId
 * @property {string} gppString
 * @property {string} gppSid
 */
/**
 * Referer info
 * @typedef {Object} RefererInfo
 * @property {string} topmostLocation - detected top url
 * @property {string|null} ref the referrer (document.referrer) to the current page, or null if not available (due to cross-origin restrictions)
 * @property {boolean} reachedTop - whether it was possible to walk upto top window or not
 * @property {number} numIframes - number of iframes
 * @property {string} stack - comma separated urls of all origins
 * @property {string} canonicalUrl - canonical URL refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
 */

/**
 * @typedef {Object} AbTestConfig
 * @property {boolean|false} [enabled] - Enable control group
 * @property {number} [controlGroupPct] - Ratio of users in control group [0,1]
 */

/**
 * FetchIdData data provided by instance when registering to multiplexing
 * @typedef {Object} FetchIdData
 * @property {string} origin
 * @property {string} originVersion
 * @property {number} partnerId
 * @property {RefererInfo} refererInfo
 * @property {boolean} isUsingCdn
 * @property {number} att - Indication of whether the event came from an Apple ATT event (value of 1 is yes)
 * @property {Object} [uaHints] - user agent high entropy values
 * @property {AbTestConfig} [abTesting]
 * @property {string} [pd] - Partner Data that can be passed to help with cross-domain reconciliation of the ID5 ID
 * @property {string} [partnerUserId] - User ID for the platform deploying the API, to be stored by ID5 for further cookie matching if provided
 * @property {string} [provider] - Defines who is deploying the API on behalf of the partner. A hard-coded value that will be provided by ID5 when applicable
 * @property {Array<Segment>} [segments] - A list of segments to push to partners.
 * @property {number} [invalidSegmentsCount] - Monitoring server side for excluded invalid segments
 * @property {number} [refreshInSeconds] - Default operating uid refresh time in seconds
 * @property {number} [providedRefreshInSeconds] - Configured uid refresh time in seconds
 * @property {boolean} [trace]
 */

/**
 * Refresh Options
 * @typedef {Object} RefreshOptions
 * @property {boolean} forceFetch
 * @property {boolean} resetConsent
 * @property {boolean} forceAllowLocalStorageGrant
 */

/**
 * Storage Options
 * @typedef {Object} StorageOptions
 * @property {Storage} storage - storage where leader will store data. It can be window.localStorage, window.top.localStorage or any other defined by api using multiplexing implementing Web Storage API interface.
 * @property {boolean} applyCreativeRestrictions - When true some restrictions are applied, for example avoid writing to localStorage and avoid cookie syncing.
 * @property {number} [storageExpirationDays] - Number of days that the ID5 ID and associated metadata will be stored in local storage before expiring (default 90 days).
 * @property {boolean} forceAllowLocalStorageGrant
 */
