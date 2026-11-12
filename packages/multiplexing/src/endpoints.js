/*
 * Centralized ID5 endpoint URLs.
 *
 * Calls go to the default absolute hosts; only the endpoints built for a fallback api
 * base carry one, and then every endpoint except bounce and cascade is built on it.
 * Construct once from the api base and read the endpoint you need, instead of repeating
 * the base/default choice per call.
 *
 * FallbackEndpointsProvider lives here so both share how an api base is read.
 */

import {ALTERNATE_API_BASES} from '../generated/apiBases.js';

const DEFAULTS = {
  fetch: 'https://id5-sync.com/gm/v3',
  bounce: 'https://id5-sync.com/bounce',
  event: 'https://id5-sync.com/event',
  cascadeHost: 'https://id5-sync.com',
  analytics: 'https://api.id5-sync.com/analytics',
  diagnostics: 'https://diagnostics.id5-sync.com/measurements'
};

const DEFAULT_API_ORIGIN = new URL(DEFAULTS.fetch).origin;

/**
 * @param {string} [apiBase]
 * @returns {string} the api base without trailing slashes
 */
function trimApiBase(apiBase) {
  return (apiBase || '').replace(/\/+$/, '');
}

export class Id5Endpoints {
  constructor(apiBaseUrl = '') {
    const base = trimApiBase(apiBaseUrl);
    // the base the endpoints are built on; empty for the default absolute hosts
    this.apiBase = base;
    // true for endpoints built on a fallback api base, false for the default absolute hosts
    this.isFallback = !!base;
    // When a base is configured, append the path to it; otherwise use the endpoint's default absolute URL.
    const buildUrl = (path, defaultUrl) => base ? `${base}${path}` : defaultUrl;
    this.fetch = buildUrl('/gm/v3', DEFAULTS.fetch);
    // Bounce and cascade read and sync the id5-sync.com cookie, so they always go to id5-sync.com.
    this.bounce = DEFAULTS.bounce;
    this.event = buildUrl('/event', DEFAULTS.event);
    this.diagnostics = buildUrl('/diag/measurements', DEFAULTS.diagnostics);
    this._analytics = buildUrl('/analytics', DEFAULTS.analytics);
    this._cascade = DEFAULTS.cascadeHost;
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

/**
 * Endpoints are the same when they are built on the same api base.
 * @param {Id5Endpoints} [endpoints]
 * @param {Id5Endpoints} [other]
 * @returns {boolean} false unless both are given
 */
export function sameEndpoints(endpoints, other) {
  return endpoints != null && other != null && endpoints.apiBase === other.apiBase;
}

/**
 * The endpoints the calls switch to when the default host does not answer. They are built on the apiBaseUrl
 * configured by the publisher, otherwise on one of the alternate api bases.
 */
export class FallbackEndpointsProvider {
  /**
   * @param {string} [configuredApiBase] - apiBaseUrl configured by the publisher
   * @param {Array<string>} [alternateApiBases] - base64 encoded alternate api bases
   */
  constructor(configuredApiBase = '', alternateApiBases = ALTERNATE_API_BASES) {
    const base = trimApiBase(configuredApiBase);
    this._configuredApiBase = base === DEFAULT_API_ORIGIN ? '' : base;
    this._alternateApiBases = alternateApiBases.map(encoded => atob(encoded));
  }

  /**
   * @returns {Id5Endpoints|undefined} undefined when there is no api base to switch to
   */
  getEndpoints() {
    if (!this._endpoints) {
      const alternates = this._alternateApiBases;
      const apiBase = this._configuredApiBase ||
        (alternates.length > 0 ? alternates[Math.floor(Math.random() * alternates.length)] : '');
      if (!apiBase) {
        return undefined;
      }
      this._endpoints = new Id5Endpoints(apiBase);
    }
    return this._endpoints;
  }

  /**
   * A configured api base is the only one the calls switch to, so a cached alternate never
   * replaces it.
   * @param {*} apiBase
   * @returns {boolean}
   */
  #isUsable(apiBase) {
    if (typeof apiBase !== 'string') {
      return false;
    }
    return this._configuredApiBase
      ? apiBase === this._configuredApiBase
      : this._alternateApiBases.includes(apiBase);
  }

  /**
   * The endpoints a call switches to after it got no response: a fallback api base after the
   * default endpoints, the default endpoints after a fallback api base.
   * @param {Id5Endpoints} usedEndpoints - endpoints the failed call used
   * @returns {Id5Endpoints|undefined} undefined when there is no api base to switch to
   */
  retryFor(usedEndpoints) {
    return usedEndpoints.isFallback ? DEFAULT_ENDPOINTS : this.getEndpoints();
  }

  /**
   * @param {*} apiBase - usedApiBase stored with the cached extensions
   * @returns {Id5Endpoints|undefined} undefined when the calls may not be sent to that api base
   */
  endpointsForApiBase(apiBase) {
    if (apiBase === '') {
      return DEFAULT_ENDPOINTS;
    }
    if (!this.#isUsable(apiBase)) {
      return undefined;
    }
    // One api base for the whole page, so it replaces the one picked so far
    if (this.getEndpoints().apiBase !== apiBase) {
      this._endpoints = new Id5Endpoints(apiBase);
    }
    return this._endpoints;
  }
}
