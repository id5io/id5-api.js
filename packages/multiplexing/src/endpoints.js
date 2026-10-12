/*
 * Centralized ID5 endpoint URLs.
 *
 * When an API base is configured, every endpoint is built on it; otherwise each
 * one uses its default absolute host. Construct once from the API base and read
 * the endpoint you need, instead of repeating the base/default choice per call.
 */

const DEFAULTS = {
  fetch: 'https://id5-sync.com/gm/v3',
  bounce: 'https://id5-sync.com/bounce',
  event: 'https://id5-sync.com/event',
  cascadeHost: 'https://id5-sync.com',
  analytics: 'https://api.id5-sync.com/analytics',
  diagnostics: 'https://diagnostics.id5-sync.com/measurements'
};

export class Id5Endpoints {
  constructor(apiBaseUrl = '') {
    const base = (apiBaseUrl || '').replace(/\/+$/, '');
    // When a base is configured, append the path to it; otherwise use the endpoint's default absolute URL.
    const buildUrl = (path, defaultUrl) => base ? `${base}${path}` : defaultUrl;
    this.fetch = buildUrl('/gm/v3', DEFAULTS.fetch);
    this.bounce = buildUrl('/bounce', DEFAULTS.bounce);
    this.event = buildUrl('/event', DEFAULTS.event);
    this.diagnostics = buildUrl('/diag/measurements', DEFAULTS.diagnostics);
    this._analytics = buildUrl('/analytics', DEFAULTS.analytics);
    this._cascade = base || DEFAULTS.cascadeHost;
  }

  /**
   * @param {string} [apiBaseUrl]
   * @returns {Id5Endpoints} the shared defaults when no base is given, otherwise endpoints on that base
   */
  static from(apiBaseUrl) {
    return apiBaseUrl ? new Id5Endpoints(apiBaseUrl) : DEFAULT_ENDPOINTS;
  }

  /**
   * @param {number|string} partnerId
   * @param {string} source
   * @returns {string} analytics config URL
   */
  analytics(partnerId, source) {
    return `${this._analytics}/${partnerId}/${source}`;
  }

  /**
   * @param {string} endpoint - 'i' or 's'
   * @param {number|string} partnerId
   * @param {number} maxCascades
   * @returns {URL} cascade pixel URL
   */
  cascade(endpoint, partnerId, maxCascades) {
    return new URL(`${this._cascade}/${endpoint}/${partnerId}/${maxCascades}.gif`);
  }
}

export const DEFAULT_ENDPOINTS = new Id5Endpoints();
