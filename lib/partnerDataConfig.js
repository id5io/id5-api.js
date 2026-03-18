/*
 * Module for handling partnerData with semantic keys
 */
import {isDefined} from '@id5io/multiplexing/utils';
import {isPlainObject, isStr} from './utils.js';

const toString = JSON.stringify;
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Partner data key constants for IDE autocompletion
 * Use these constants when setting partnerData to get autocompletion:
 *
 * @example
 * import { PARTNER_DATA_KEYS } from '@id5io/id5-api.js';
 *
 * partnerData: {
 *   [PARTNER_DATA_KEYS.HEM]: 'user@example.com',
 *   [PARTNER_DATA_KEYS.PHONE]: '+1234567890'
 * }
 */
export const PARTNER_DATA_KEYS = Object.freeze({
  OTHER: 'other',
  HEM: 'hem',                 // Hashed Email (auto-hash if needed)
  PHONE: 'phone',             // Hashed Phone (auto-hash if needed)
  XPUID: 'xpuid',             // Cross-Partner User ID Value
  XPUID_SOURCE: 'xpuidSource', // Cross-Partner User ID Source
  PUID: 'puid',               // Partner-Specific User ID Value
  IDFA: 'idfa',               // Apple IDFA
  GAID: 'gaid',               // Google GAID
  URL: 'url',                 // Full URL
  DOMAIN: 'domain',           // Domain
  IPV4: 'ipv4',               // IPv4
  IPV6: 'ipv6',               // IPv6
  UA: 'ua',                   // User Agent
  IS_BURNER_EMAIL: 'isBurnerEmail', // Is Burner Email
  IDFV: 'idfv',               // Apple IDFV
  CTV_ID: 'ctvId',            // DEPRECATED
  CTV_ID_TYPE: 'ctvIdType',   // DEPRECATED
  IAB_TOKEN: 'iabToken'       // IAB Token
});

/**
 * Mapping of semantic partner data keys to numeric IDs
 * Based on https://wiki.id5.io/docs/passing-partner-data-to-id5
 */
const PARTNER_DATA_KEY_MAP = Object.freeze({
  [PARTNER_DATA_KEYS.OTHER]: 0,
  [PARTNER_DATA_KEYS.HEM]: 1,             // Hashed Email (auto-hash if needed)
  [PARTNER_DATA_KEYS.PHONE]: 2,           // Hashed Phone (auto-hash if needed)
  [PARTNER_DATA_KEYS.XPUID]: 3,           // Cross-Partner User ID Value
  [PARTNER_DATA_KEYS.XPUID_SOURCE]: 4,    // Cross-Partner User ID Source
  [PARTNER_DATA_KEYS.PUID]: 5,            // Partner-Specific User ID Value
  [PARTNER_DATA_KEYS.IDFA]: 6,            // Apple IDFA
  [PARTNER_DATA_KEYS.GAID]: 7,            // Google GAID
  [PARTNER_DATA_KEYS.URL]: 8,             // Full URL
  [PARTNER_DATA_KEYS.DOMAIN]: 9,          // Domain
  [PARTNER_DATA_KEYS.IPV4]: 10,           // IPv4
  [PARTNER_DATA_KEYS.IPV6]: 11,           // IPv6
  [PARTNER_DATA_KEYS.UA]: 12,             // User Agent
  [PARTNER_DATA_KEYS.IS_BURNER_EMAIL]: 13, // Is Burner Email
  [PARTNER_DATA_KEYS.IDFV]: 14,           // Apple IDFV
  [PARTNER_DATA_KEYS.CTV_ID]: 15,         // DEPRECATED
  [PARTNER_DATA_KEYS.CTV_ID_TYPE]: 16,    // DEPRECATED
  [PARTNER_DATA_KEYS.IAB_TOKEN]: 17       // IAB Token
});

/**
 * Process partnerData with semantic keys and convert to pd string
 *
 * @param {Object} partnerData - Partner data object with semantic keys
 * @param {Logger} log - Logger instance
 * @return {Promise<string|undefined>} - Base64-encoded pd string, or undefined if no valid entries
 */
export async function convertPartnerDataToPd(partnerData, log) {
  if (!isDefined(partnerData)) {
    return undefined;
  }

  if (!isPlainObject(partnerData)) {
    log.error(`Config option partnerData must be of type Object but was ${toString.call(partnerData)}`);
    return undefined;
  }

  // Convert partnerData to pd string
  const queryParts = [];
  let invalidEntries = 0;

  // Process keys in order for consistent output
  const sortedKeys = Object.keys(partnerData).sort();

  for (const semanticKey of sortedKeys) {
    const value = partnerData[semanticKey];

    // Validate semantic key
    if (!hasOwnProperty.call(PARTNER_DATA_KEY_MAP, semanticKey)) {
      log.warn(`partnerData key "${semanticKey}" is not a recognized key. Skipping.`);
      invalidEntries += 1;
      continue;
    }

    // Validate value is string
    if (!isStr(value)) {
      log.warn(`partnerData value for key "${semanticKey}" must be a string but was ${toString.call(value)}. Skipping.`);
      invalidEntries += 1;
      continue;
    }

    // Process the semantic key
    const processedValue = await processSemanticKey(semanticKey, value, log);
    if (!processedValue) {
      invalidEntries += 1;
      continue;
    }

    // Add to query parts with URL-encoded value
    const numericKey = PARTNER_DATA_KEY_MAP[semanticKey];
    queryParts.push(`${numericKey}=${encodeURIComponent(processedValue)}`);
  }

  // If we have valid entries, convert to pd string
  if (queryParts.length > 0) {
    const queryString = queryParts.join('&');
    const encodedPd = btoa(queryString);

    log.info(`Converted partnerData with ${queryParts.length} entries to pd`);

    if (invalidEntries > 0) {
      log.warn(`Skipped ${invalidEntries} invalid partnerData entries`);
    }

    return encodedPd;
  } else {
    log.warn('partnerData provided but no valid entries found');
    if (invalidEntries > 0) {
      log.warn(`Skipped ${invalidEntries} invalid partnerData entries`);
    }
    return undefined;
  }
}

/**
 * Process a semantic key and its value, applying field-specific transformations
 * @param {string} semanticKey - The semantic key name
 * @param {string} value - The value to process
 * @param {Logger} log - Logger instance
 * @return {Promise<string|undefined>} - Processed value, or undefined if should be skipped
 */
async function processSemanticKey(semanticKey, value, log) {
  // Special processing for hashed email
  if (semanticKey === PARTNER_DATA_KEYS.HEM) {
    return await processHashedEmail(value, log);
  }

  // Special processing for phone
  if (semanticKey === PARTNER_DATA_KEYS.PHONE) {
    return await processHashedPhone(value, log);
  }

  // Lowercase MAID values
  if (semanticKey === PARTNER_DATA_KEYS.IDFA ||
      semanticKey === PARTNER_DATA_KEYS.GAID ||
      semanticKey === PARTNER_DATA_KEYS.IDFV) {
    return value.toLowerCase();
  }

  // Default: return value as-is
  return value;
}

/**
 * Process hashed email field (hem)
 * - Auto-hashes unhashed emails after normalization
 * - Validates email format
 * - Lowercases pre-hashed values
 * @param {string} value - Email value (raw or pre-hashed)
 * @param {Logger} log - Logger instance
 * @return {Promise<string|undefined>} - Processed hash, or undefined if invalid
 */
async function processHashedEmail(value, log) {
  if (!isSha256Hash(value)) {
    // Normalize and validate email
    const normalized = normalizeEmail(value);
    if (!normalized) {
      log.warn(`Invalid email format for hem field (missing '@' or empty parts). Skipping.`);
      return undefined;
    }

    // Hash the normalized email
    const hashed = await sha256(normalized);
    if (!hashed) {
      log.warn(`Empty email after normalization for hem field. Skipping.`);
      return undefined;
    }

    log.info(`Auto-hashed email for hem field`);
    return hashed;
  }

  // Pre-hashed: normalize to lowercase for consistency
  return value.toLowerCase();
}

/**
 * Process hashed phone field
 * - Auto-hashes unhashed phone numbers
 * - Lowercases pre-hashed values
 * @param {string} value - Phone value (raw or pre-hashed)
 * @param {Logger} log - Logger instance
 * @return {Promise<string|undefined>} - Processed hash, or undefined if invalid
 */
async function processHashedPhone(value, log) {
  if (!isSha256Hash(value)) {
    const hashed = await sha256(value.trim());
    if (!hashed) {
      log.warn(`Empty or invalid phone number for phone field. Skipping.`);
      return undefined;
    }

    log.info(`Auto-hashed phone number for phone field`);
    return hashed;
  }

  // Pre-hashed: normalize to lowercase for consistency
  return value.toLowerCase();
}

/**
 * Normalize email address following validator.js pattern
 * @param {string} email - Email address to normalize
 * @return {string|undefined} - Normalized email, or undefined if invalid
 */
function normalizeEmail(email) {
  if (!isStr(email)) {
    return undefined;
  }

  let normalized = email.trim().toLowerCase();
  const parts = normalized.split('@');

  // Validate: must have exactly one '@' and non-empty local/domain parts
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return undefined; // Invalid email format
  }

  let [localPart, domain] = parts;

  // Remove dots from Gmail addresses
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    localPart = localPart.replace(/\./g, '');
    // Remove plus addressing
    const plusIndex = localPart.indexOf('+');
    if (plusIndex !== -1) {
      localPart = localPart.substring(0, plusIndex);
    }
    domain = 'gmail.com'; // Normalize googlemail.com to gmail.com
  }

  return `${localPart}@${domain}`;
}

/**
 * SHA256 hash a string using Web Crypto API
 * @param {string} str - String to hash
 * @return {Promise<string|undefined>} - Hex-encoded SHA256 hash, or undefined if invalid input
 */
async function sha256(str) {
  if (!isStr(str) || str.length === 0) {
    return undefined; // Empty or invalid input should be skipped
  }

  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a string looks like a SHA256 hash
 * @param {string} str - String to check
 * @return {boolean} - True if looks like SHA256 (64 hex chars)
 */
function isSha256Hash(str) {
  return isStr(str) && /^[a-f0-9]{64}$/i.test(str);
}
