/*
 * id5-prebid-enabler.js — configures the ID5 User ID submodule in Prebid.js.
 *
 *   <script>
 *     window.id5PrebidEnabler = window.id5PrebidEnabler || {que: []};
 *     window.id5PrebidEnabler.que.push(enabler => enabler.configureUserIdModule({partner: 173}));
 *   </script>
 *   <script async src="https://<cdn>/id5-prebid-enabler.js"></script>
 *
 * configureUserIdModule() builds the submodule configuration from the partner ID and the defaults;
 * reconfigureUserIdModule() keeps the configuration already on the page and updates the targets in it.
 */

import {InvocationLogger, isArray, isGlobalDebug, setGlobalDebug} from '../lib/utils.js';
import {PbjsDetector} from '../lib/prebid/pbjsUtils.js';
import {version as currentVersion} from '../generated/version.js';
import {semanticVersionCompare} from '@id5io/multiplexing/utils';

const SOURCE = 'id5-prebid-enabler';
const ENABLER_GLOBAL_NAME = 'id5PrebidEnabler';
/** The global the ID5 external module installs its integration on. */
const ID5_EXTERNAL_MODULE_GLOBAL_NAME = 'id5Prebid';
const PBJS_ID5_USER_ID_MODULE_NAME = 'id5Id';
const ID5_EXTERNAL_MODULE_DEFAULT_URL = 'https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js';
const ID5_DEFAULT_CONFIG_URL = 'https://prebid.id5-tech.io/v1/config';

const REFRESH_AUTO = 'auto';

const DEFAULT_SETTINGS = Object.freeze({
  externalModuleUrl: undefined,
  configUrl: ID5_DEFAULT_CONFIG_URL,
  useExternalModule: true,
  refreshOnReconfigure: REFRESH_AUTO,
  waitForConfigMs: 3000
});

const PBJS_CONFIG_POLL_INTERVAL_MS = 100;

/**
 * How long `refreshOnReconfigure: 'auto'` waits for the User ID module before deciding without
 * it: a submodule that never calls back must not hold back the refresh.
 */
const PBJS_USER_IDS_SETTLE_TIMEOUT_MS = 3000;

const PBJS_DEFAULT_STORAGE = Object.freeze({type: 'html5', name: 'id5id', expires: 90});

/** Top level keys of a Prebid user ID configuration entry; every other key given to the enabler is a submodule param. */
const PBJS_USER_ID_ENTRY_KEYS = ['params', 'storage', 'bidders', 'value', 'auctionDelay', 'syncDelay'];

/**
 * Every parameter the ID5 submodule accepts. Any other key given by the publisher is passed
 * through untouched.
 *
 * @typedef {Object} Id5SubmoduleParams
 * @property {number} partner - the ID5 partner ID
 * @property {string} [pd] - partner-supplied data used to link ID5 IDs across domains
 * @property {string} [provider] - identifier of the technology partner managing the setup
 * @property {Object} [abTesting] - `{enabled, controlGroupPct}`, withholds the ID from a share of requests
 * @property {boolean} [disableExtensions] - turns the extensions call off
 * @property {boolean} [canCookieSync] - allows cookie syncing with other ID5 partners
 * @property {string} [gamTargetingPrefix] - prefix for the GAM pubads targeting tags
 * @property {boolean} [exposeTargeting] - enables the `window.id5tags` targeting consumer
 * @property {string} [externalModuleUrl] - where the ID5 external module is loaded from
 * @property {string} [configUrl] - the ID5 config endpoint
 * @property {string} [id5ApiBaseUrl] - base URL prepended to every ID5 endpoint
 * @property {Object} [multiplexing] - `{disabled}`, external module only
 * @property {Object} [diagnostics] - diagnostics publishing options, external module only
 * @property {Array<Object>} [segments] - segments to push to partners, external module only
 * @property {boolean} [disableUaHints] - stops the lookup of high entropy user agent hints
 * @property {boolean} [idLookupMode] - runs the API in ID lookup mode
 * @property {string} [enablerVersion] - the enabler release that configured the submodule, set by the enabler
 * @property {string} [enablerSrc] - URL this enabler script was loaded from, set by the enabler
 * @property {string} [enablerFallback] - how this enabler address was found when the page fell back from the primary host, set by the enabler
 */

/**
 * @typedef {Object} Id5EnablerConfig
 * @property {Id5SubmoduleParams} [params] - submodule parameters; may also be given flat on this object
 * @property {Object} [storage] - Prebid storage configuration, defaults to html5 `id5id` for 90 days
 * @property {string[]} [bidders] - bidder codes the ID may be sent to
 * @property {Object} [value] - a user ID the page stores itself, passed to adapters as is
 * @property {number} [auctionDelay] - set `userSync.auctionDelay`; left alone when omitted
 * @property {number} [syncDelay] - set `userSync.syncDelay`; left alone when omitted
 */

/**
 * @typedef {Object} Id5EnablerSettings
 * @property {string} [externalModuleUrl] - where the ID5 external module is loaded from; defaults to
 * `https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js`
 * @property {string} [configUrl] - the ID5 config endpoint the submodule calls; defaults to
 * `https://prebid.id5-tech.io/v1/config`
 * @property {boolean} [useExternalModule] - configure `externalModuleUrl` so the submodule runs the
 * ID5 external module; true by default, false leaves the submodule on its own implementation
 * @property {boolean|'auto'} [refreshOnReconfigure] - whether `reconfigureUserIdModule()` calls
 * `pbjs.refreshUserIds()`; `'auto'` by default, which decides from the state of the page
 * @property {number} [waitForConfigMs] - how long `reconfigureUserIdModule()` waits for the page to configure
 * the submodule; 3000 by default, 0 reads the configuration once
 */

export class Id5PrebidEnabler {
  /** @type {string} */
  version = currentVersion;

  /**
   * Commands pushed here run straight away, so the same snippet works before and after this
   * script has loaded.
   *
   * @type {{push: function(function(Id5PrebidEnabler): void): void}}
   */
  que = {push: command => this._run(command)};

  /** @type {boolean} */
  set debug(isDebug) {
    setGlobalDebug(isDebug);
  }

  get debug() {
    return isGlobalDebug();
  }

  constructor(windowObj = window) {
    this._window = windowObj;
    // the script element is readable while this script executes synchronously, which is where
    // installEnabler() runs from
    const script = windowObj.document?.currentScript;
    this._scriptSrc = script?.src || undefined;
    // how this address was found when the page fell back from the primary host
    this._scriptFallback = script?.fallback || undefined;
    this._log = new InvocationLogger(SOURCE, 0);
    this._pbjsDetector = new PbjsDetector(windowObj, this._log);
    this._settings = {...DEFAULT_SETTINGS};
  }

  /**
   * Overrides the settings for every later call; the entry points take the submodule
   * configuration alone.
   *
   * @param {Id5EnablerSettings} settings
   * @returns {Id5PrebidEnabler}
   */
  setup(settings = {}) {
    this._settings = {...this._settings, ...settings};
    return this;
  }

  /**
   * Configures the ID5 submodule from scratch.
   *
   * @param {Id5EnablerConfig & Id5SubmoduleParams} config
   * @returns {Promise<boolean>} whether a configuration was pushed to Prebid
   */
  async configureUserIdModule(config = {}) {
    const entry = buildEntry(config);
    if (entry.params.partner === undefined) {
      this._log.error('partner is required to configure the ID5 submodule');
      return false;
    }
    applyTargets(entry.params, this._configuredTargets(this._settings), false);
    applyEnablerVersion(entry.params);
    this._applyEnablerSource(entry.params);
    if (!await this._applyEntry(entry, config)) {
      return false;
    }
    this._log.info('configured the ID5 submodule', entry);
    return true;
  }

  /**
   * Keeps the configuration already on the page and updates the targets in it. A parameter given
   * here overrides the one on the page, the partner aside: a call for another partner is refused.
   *
   * @param {Id5EnablerConfig & Id5SubmoduleParams} [config]
   * @returns {Promise<boolean>} whether a configuration was pushed to Prebid
   */
  async reconfigureUserIdModule(config = {}) {
    const existing = await this._awaitEntry(this._settings.waitForConfigMs);
    if (!existing) {
      this._log.error(`no ${PBJS_ID5_USER_ID_MODULE_NAME} configuration found on the page; use configureUserIdModule() instead`);
      return false;
    }
    const given = paramsOf(config);
    const partnerOnPage = existing.params?.partner;
    // The submodule keys its stored response by partner, so another partner is a new setup rather
    // than a reconfiguration of the one on the page.
    if (given.partner !== undefined && partnerOnPage !== undefined && !samePartner(given.partner, partnerOnPage)) {
      this._log.error(`the page configures ${PBJS_ID5_USER_ID_MODULE_NAME} for partner ${partnerOnPage}; use configureUserIdModule() to configure partner ${given.partner}`);
      return false;
    }
    // Prebid compares a submodule's configuration against the previous one by value, so the params
    // are replaced rather than modified. Targets take over the page's values, the call's take over both.
    const params = {...existing.params};
    applyTargets(params, this._configuredTargets(this._settings), true);
    const entry = {...existing, params: {...params, ...given}};
    applyEnablerVersion(entry.params);
    this._applyEnablerSource(entry.params);
    if (!this._settings.useExternalModule) {
      delete entry.params.externalModuleUrl;
    }
    if (!await this._applyEntry(entry, config)) {
      return false;
    }
    this._log.info('reconfigured the ID5 submodule', entry);
    await this._refreshIfNeeded();
    return true;
  }

  /**
   * @returns {Promise<string|undefined>} a URL the external module can be loaded from
   */
  async getExternalModuleUrl() {
    return this._configuredTargets(this._settings).externalModuleUrl;
  }

  /**
   * @returns {Promise<string|undefined>} the ID5 config endpoint
   */
  async getConfigUrl() {
    return this._configuredTargets(this._settings).configUrl;
  }

  /**
   * @private
   * @param {function(Id5PrebidEnabler): void} command
   */
  _run(command) {
    try {
      command(this);
    } catch (error) {
      this._log.error('queued command failed', error);
    }
  }

  /**
   * Reports where this enabler script was loaded from, so the submodule sends it with the identity
   * fetch. The two describe the script that configured the submodule, alongside the version this
   * release reports, so they are written as one pair: values from an earlier enabler or from the
   * page are replaced, and both go when this script element carries no address.
   *
   * @private
   * @param {Id5SubmoduleParams} params - modified in place
   */
  _applyEnablerSource(params) {
    delete params.enablerSrc;
    delete params.enablerFallback;
    if (this._scriptSrc === undefined) {
      return;
    }
    params.enablerSrc = this._scriptSrc;
    if (this._scriptFallback !== undefined) {
      params.enablerFallback = this._scriptFallback;
    }
  }

  /**
   * The targets a call applies: what the caller set, falling back to the module and config
   * endpoint this release ships with.
   *
   * @private
   * @param {Id5EnablerSettings} settings
   * @returns {Object}
   */
  _configuredTargets(settings) {
    const targets = {};
    if (settings.useExternalModule) {
      targets.externalModuleUrl = settings.externalModuleUrl || ID5_EXTERNAL_MODULE_DEFAULT_URL;
    }
    if (settings.configUrl) {
      targets.configUrl = settings.configUrl;
    }
    return targets;
  }

  /**
   * Pushes the submodule configuration to Prebid as soon as Prebid is available. `setConfig`
   * replaces a topic rather than merging into it, so the whole `userSync` on the page is carried
   * over with only the ID5 entry of `userIds` replaced, and a later `setConfig({userSync})` from
   * the page replaces this entry in turn.
   *
   * @private
   * @param {Object} entry
   * @param {Id5EnablerConfig} config
   * @returns {Promise<boolean>} whether the configuration was pushed to Prebid
   */
  async _applyEntry(entry, config) {
    const pbjs = await this._pbjsDetector.getPbjs();
    if (!pbjs || typeof pbjs.setConfig !== 'function') {
      this._log.error('Prebid.js is not available, the ID5 submodule was not configured');
      return false;
    }
    const current = currentUserSync(pbjs) || {};
    const userSync = {...current, userIds: otherUserIds(current).concat([entry])};
    if (config.auctionDelay !== undefined) {
      userSync.auctionDelay = config.auctionDelay;
    }
    if (config.syncDelay !== undefined) {
      userSync.syncDelay = config.syncDelay;
    }
    pbjs.setConfig({userSync});
    return true;
  }

  /**
   * The ID5 configuration on the page, awaited rather than read once, since a tag manager or a
   * wrapper may push it at any point. Resolves through a `userSync` subscription with a poll
   * behind it, and with `undefined` once the deadline passes.
   *
   * @private
   * @param {number} timeoutMs
   * @returns {Promise<Object|undefined>} the ID5 submodule configuration on the page
   */
  async _awaitEntry(timeoutMs) {
    const pbjs = await this._pbjsDetector.getPbjs();
    const entryOnPage = () => (currentUserSync(pbjs)?.userIds || []).find(isId5Entry);
    const present = entryOnPage();
    if (present || !timeoutMs) {
      return present;
    }
    this._log.info(`waiting up to ${timeoutMs}ms for the page to configure ${PBJS_ID5_USER_ID_MODULE_NAME}`);
    return new Promise(resolve => {
      let settled = false;
      const settle = entry => {
        if (!settled) {
          settled = true;
          unsubscribe();
          clearInterval(poll);
          clearTimeout(deadline);
          resolve(entry);
        }
      };
      const check = () => {
        const entry = entryOnPage();
        if (entry) {
          settle(entry);
        }
      };
      const unsubscribe = onUserSyncChange(pbjs, check);
      const poll = setInterval(check, PBJS_CONFIG_POLL_INTERVAL_MS);
      const deadline = setTimeout(() => settle(undefined), timeoutMs);
    });
  }

  /**
   * @private
   * @returns {Promise<boolean>} whether the submodule is refreshed
   */
  async _refreshNeeded() {
    if (this._settings.refreshOnReconfigure === REFRESH_AUTO) {
      return this._autoRefreshNeeded();
    }
    return Boolean(this._settings.refreshOnReconfigure);
  }

  /**
   * `'auto'` refreshes where a refresh leads to a fetch and leaves the submodule alone where it
   * does not: `userSync.autoRefresh` already re-runs every submodule whose configuration changed,
   * and an ID5 ID the page already holds is one a refresh would only reproduce. A refresh asked
   * for before the User ID module's first run is dropped by Prebid, and that run takes the
   * configuration pushed here.
   *
   * @private
   * @returns {Promise<boolean>} whether the submodule is refreshed
   */
  async _autoRefreshNeeded() {
    const pbjs = await this._pbjsDetector.getPbjs();
    if (currentUserSync(pbjs)?.autoRefresh === true) {
      this._log.info('auto: userSync.autoRefresh fetches again for the configuration that changed');
      return false;
    }
    const userIds = await this._settledUserIds(pbjs);
    if (this._idAlreadyHeld(userIds)) {
      this._log.info('auto: an ID5 ID is already in place, leaving the submodule alone');
      return false;
    }
    this._log.info('auto: no ID5 ID is in place, refreshing');
    return true;
  }

  /**
   * Whether the page already holds an ID5 ID a refresh would only reproduce: with the ID5 module,
   * the one it provided here, since an ID Prebid replays from its own storage can be days old.
   * Prebid's own implementation fetches on every run, so there a served ID is taken as held.
   *
   * @private
   * @param {Object|undefined} userIds - the IDs Prebid serves
   * @returns {boolean}
   */
  _idAlreadyHeld(userIds) {
    return this._settings.useExternalModule
      ? this._moduleProvidedId()
      : Boolean(userIds?.id5id?.uid);
  }

  /**
   * The IDs Prebid serves, read once its User ID module has finished, for up to
   * `PBJS_USER_IDS_SETTLE_TIMEOUT_MS`, so a module given the chance to provide an ID has taken it.
   *
   * @private
   * @param {Object} pbjs
   * @returns {Promise<Object|undefined>}
   */
  async _settledUserIds(pbjs) {
    if (typeof pbjs?.getUserIdsAsync !== 'function') {
      this._log.warn('this version of Prebid.js cannot report when its User ID module has finished');
      return undefined;
    }
    return withTimeout(pbjs.getUserIdsAsync(), PBJS_USER_IDS_SETTLE_TIMEOUT_MS);
  }

  /**
   * Whether the ID5 module has provisioned an ID on this page view.
   *
   * @private
   * @returns {boolean}
   */
  _moduleProvidedId() {
    return this._window[ID5_EXTERNAL_MODULE_GLOBAL_NAME]?.integration?.userIdReady === true;
  }

  /**
   * Refreshes the submodule on the Prebid the enabler configured, where the settings ask for it.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _refreshIfNeeded() {
    if (!await this._refreshNeeded()) {
      return;
    }
    const pbjs = await this._pbjsDetector.getPbjs();
    if (typeof pbjs?.refreshUserIds !== 'function') {
      this._log.warn('this version of Prebid.js cannot refresh a single submodule');
      return;
    }
    await pbjs.refreshUserIds({submoduleNames: [PBJS_ID5_USER_ID_MODULE_NAME]});
  }
}

/**
 * Accepts the parameters either under `params` or flat on the configuration object.
 *
 * @param {Id5EnablerConfig & Id5SubmoduleParams} config
 * @returns {Id5SubmoduleParams}
 */
function paramsOf(config) {
  if (config.params) {
    return {...config.params};
  }
  const params = {...config};
  PBJS_USER_ID_ENTRY_KEYS.forEach(key => delete params[key]);
  return params;
}

/**
 * @param {Id5EnablerConfig & Id5SubmoduleParams} config
 * @returns {Object} a Prebid user ID configuration entry
 */
function buildEntry(config) {
  const entry = {
    name: PBJS_ID5_USER_ID_MODULE_NAME,
    params: paramsOf(config),
    storage: {...(config.storage || PBJS_DEFAULT_STORAGE)}
  };
  if (config.bidders) {
    entry.bidders = config.bidders;
  }
  if (config.value) {
    entry.value = config.value;
  }
  return entry;
}

/**
 * @param {Id5SubmoduleParams} params - modified in place
 * @param {Object} targets
 * @param {boolean} override - whether a target replaces a value the publisher already set
 */
function applyTargets(params, targets, override) {
  Object.entries(targets).forEach(([key, value]) => {
    if (value !== undefined && (override || params[key] === undefined)) {
      params[key] = value;
    }
  });
}

/**
 * Reports which enabler release configured the submodule, replacing a value found on the page.
 *
 * @param {Id5SubmoduleParams} params - modified in place
 */
function applyEnablerVersion(params) {
  params.enablerVersion = currentVersion;
}

/**
 * @param {Promise} promise
 * @param {number} timeoutMs
 * @returns {Promise<*>} what the promise resolves with, or `undefined` once the deadline passes
 * or the promise rejects
 */
function withTimeout(promise, timeoutMs) {
  return new Promise(resolve => {
    const deadline = setTimeout(() => resolve(undefined), timeoutMs);
    const settle = value => {
      clearTimeout(deadline);
      resolve(value);
    };
    promise.then(settle, () => settle(undefined));
  });
}

/**
 * The submodule keys the stored ID by partner, so 173 and '173' are the same partner.
 *
 * @param {number|string} one
 * @param {number|string} other
 * @returns {boolean}
 */
function samePartner(one, other) {
  return String(one) === String(other);
}

/**
 * @param {Object} entry
 * @returns {boolean}
 */
function isId5Entry(entry) {
  return typeof entry?.name === 'string' && entry.name.toLowerCase() === PBJS_ID5_USER_ID_MODULE_NAME.toLowerCase();
}

/**
 * @param {Object} userSync
 * @returns {Object[]} the user ID entries of other providers
 */
function otherUserIds(userSync) {
  return (userSync?.userIds || []).filter(entry => !isId5Entry(entry));
}

/**
 * Prebid's `getConfig(topic, listener)` subscribes to configuration changes and hands back the
 * function that cancels the subscription.
 *
 * @param {Object} pbjs
 * @param {function(): void} listener
 * @returns {function(): void}
 */
function onUserSyncChange(pbjs, listener) {
  try {
    const unsubscribe = pbjs?.getConfig?.('userSync', listener);
    return typeof unsubscribe === 'function' ? unsubscribe : () => {};
  } catch (error) {
    return () => {};
  }
}

/**
 * @param {Object} pbjs
 * @returns {Object|undefined}
 */
function currentUserSync(pbjs) {
  try {
    return typeof pbjs?.getConfig === 'function' ? pbjs.getConfig('userSync') : undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Installs the enabler on `window.id5PrebidEnabler`, the one global it owns, replacing one already
 * there only with a newer release, which takes over its settings and runs the queued commands.
 *
 * @param {Window} scope
 * @returns {Id5PrebidEnabler} the enabler the page is left with
 */
export function installEnabler(scope) {
  const existing = scope[ENABLER_GLOBAL_NAME];
  if (typeof existing?.version === 'string' && semanticVersionCompare(existing.version, currentVersion) >= 0) {
    return existing;
  }
  const enabler = new Id5PrebidEnabler(scope);
  if (existing?._settings) {
    enabler.setup(existing._settings);
  }
  scope[ENABLER_GLOBAL_NAME] = enabler;
  if (isArray(existing?.que)) {
    existing.que.forEach(command => enabler._run(command));
  }
  return enabler;
}

installEnabler(window);
