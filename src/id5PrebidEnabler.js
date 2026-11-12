/*
 * id5-prebid-enabler.js — configures the ID5 User ID submodule in Prebid.js.
 *
 *   <script>
 *     window.id5Prebid = window.id5Prebid || {};
 *     window.id5Prebid.enabler = window.id5Prebid.enabler || {que: []};
 *     window.id5Prebid.enabler.que.push(enabler => enabler.configureUserIdModule({partner: 173}));
 *   </script>
 *   <script async src="https://<cdn>/id5-prebid-enabler.js"></script>
 *
 * configureUserIdModule() builds the submodule configuration from the partner ID and the defaults;
 * reconfigureUserIdModule() keeps the configuration already on the page and updates the targets in it.
 */

import {InvocationLogger, isGlobalDebug, setGlobalDebug} from '../lib/utils.js';
import {getPbjsGlobal, PbjsDetector} from '../lib/prebid/pbjsUtils.js';
import {version as currentVersion} from '../generated/version.js';
import {semanticVersionCompare} from '@id5io/multiplexing/utils';

const SOURCE = 'id5-prebid-enabler';
const GLOBAL_NAME = 'id5Prebid';
const ENABLER_KEY = 'enabler';
const SUBMODULE_NAME = 'id5Id';
const MODULE_URL = 'https://cdn.delivrfy.cloud/api/1.0/id5PrebidModule.js';
const CONFIG_URL = 'https://prebid.id5-tech.io/v1/config';

const DEFAULT_SETTINGS = Object.freeze({
  externalModuleUrl: undefined,
  configUrl: CONFIG_URL,
  useExternalModule: true,
  refreshOnReconfigure: false,
  waitForConfigMs: 3000
});

const CONFIG_POLL_MS = 100;

const DEFAULT_STORAGE = Object.freeze({type: 'html5', name: 'id5id', expires: 90});

/** Top level keys of a Prebid user ID configuration entry; every other key given to the enabler is a submodule param. */
const ENTRY_KEYS = ['params', 'storage', 'bidders', 'value', 'auctionDelay', 'syncDelay'];

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
 * @property {boolean} [refreshOnReconfigure] - refresh the submodule right after `reconfigureUserIdModule()`; false by default
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
    this._log = new InvocationLogger(SOURCE, 0);
    this._pbjsDetector = new PbjsDetector(windowObj, this._log);
    this._settings = {...DEFAULT_SETTINGS};
  }

  /**
   * Overrides the enabler's settings for every later call. This is the only way the settings
   * are given; the entry points take the submodule configuration alone.
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
    await this._applyEntry(entry, config);
    this._log.info('configured the ID5 submodule', entry);
    return true;
  }

  /**
   * Keeps the ID5 submodule configuration already on the page and updates the targets in it.
   * Any parameter given here overrides the one on the page; the rest is left as it is.
   *
   * @param {Id5EnablerConfig & Id5SubmoduleParams} [config]
   * @returns {Promise<boolean>} whether a configuration was pushed to Prebid
   */
  async reconfigureUserIdModule(config = {}) {
    const existing = await this._awaitEntry(this._settings.waitForConfigMs);
    if (!existing) {
      this._log.error(`no ${SUBMODULE_NAME} configuration found on the page; use configureUserIdModule() instead`);
      return false;
    }
    // Prebid compares a submodule's new configuration against the previous one by value,
    // so the params it already holds are replaced rather than modified.
    const entry = {...existing, params: {...existing.params, ...paramsOf(config)}};
    applyTargets(entry.params, this._configuredTargets(this._settings), true);
    applyEnablerVersion(entry.params);
    if (!this._settings.useExternalModule) {
      delete entry.params.externalModuleUrl;
    }
    await this._applyEntry(entry, config);
    this._log.info('reconfigured the ID5 submodule', entry);
    if (this._settings.refreshOnReconfigure) {
      await this._refreshSubmodule();
    }
    return true;
  }

  /**
   * @returns {Promise<string|undefined>} a URL the external module can be loaded from
   */
  async getExternalModuleUrl() {
    return this._targets(this._settings).externalModuleUrl;
  }

  /**
   * @returns {Promise<string|undefined>} the ID5 config endpoint
   */
  async getConfigUrl() {
    return this._targets(this._settings).configUrl;
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
   * The targets to start with: what the caller set, falling back to the module and config
   * endpoint this release ships with. The submodule calls the config endpoint on every flow and
   * loads the external module on top of it, so both are configured.
   *
   * @private
   * @param {Id5EnablerSettings} settings
   * @returns {Object}
   */
  _configuredTargets(settings) {
    const targets = {};
    if (settings.useExternalModule) {
      targets.externalModuleUrl = settings.externalModuleUrl || MODULE_URL;
    }
    if (settings.configUrl) {
      targets.configUrl = settings.configUrl;
    }
    return targets;
  }

  /**
   * The targets a call is given. Network-bound resolution is layered on top of this.
   *
   * @private
   * @param {Id5EnablerSettings} settings
   * @returns {Object}
   */
  _targets(settings) {
    return this._configuredTargets(settings);
  }

  /**
   * Pushes the submodule configuration to Prebid. `setConfig` replaces a topic rather than
   * merging into it, so the whole `userSync` the page has is carried over with only the ID5
   * entry of `userIds` replaced. Runs as soon as Prebid is available, without waiting on any network call.
   *
   * @private
   * @param {Object} entry
   * @param {Id5EnablerConfig} config
   * @returns {Promise<void>}
   */
  async _applyEntry(entry, config) {
    const pbjs = await this._pbjsDetector.getPbjs();
    if (!pbjs || typeof pbjs.setConfig !== 'function') {
      this._log.error('Prebid.js is not available, the ID5 submodule was not configured');
      return;
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
  }

  /**
   * The page may configure the submodule through a tag manager or a wrapper, at a point this
   * script has no say over, so the configuration is awaited rather than read once. Resolves as
   * soon as it appears, through a `userSync` subscription with a poll behind it, and with
   * `undefined` once the deadline passes.
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
    this._log.info(`waiting up to ${timeoutMs}ms for the page to configure ${SUBMODULE_NAME}`);
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
      const poll = setInterval(check, CONFIG_POLL_MS);
      const deadline = setTimeout(() => settle(undefined), timeoutMs);
    });
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async _refreshSubmodule() {
    const pbjs = getPbjsGlobal(this._window);
    if (typeof pbjs?.refreshUserIds !== 'function') {
      this._log.warn('this version of Prebid.js cannot refresh a single submodule');
      return;
    }
    await pbjs.refreshUserIds({submoduleNames: [SUBMODULE_NAME]});
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
  ENTRY_KEYS.forEach(key => delete params[key]);
  return params;
}

/**
 * @param {Id5EnablerConfig & Id5SubmoduleParams} config
 * @returns {Object} a Prebid user ID configuration entry
 */
function buildEntry(config) {
  const entry = {
    name: SUBMODULE_NAME,
    params: paramsOf(config),
    storage: {...(config.storage || DEFAULT_STORAGE)}
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
 * Reports which enabler release configured the submodule. The release doing the configuring is
 * the one reported, so a value found on the page is replaced.
 *
 * @param {Id5SubmoduleParams} params - modified in place
 */
function applyEnablerVersion(params) {
  params.enablerVersion = currentVersion;
}

/**
 * @param {Object} entry
 * @returns {boolean}
 */
function isId5Entry(entry) {
  return typeof entry?.name === 'string' && entry.name.toLowerCase() === SUBMODULE_NAME.toLowerCase();
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

if (!window[GLOBAL_NAME]) {
  window[GLOBAL_NAME] = {};
}

// `integration` and `version` on this object belong to the external module; the enabler is
// installed under its own key and carries its own version there.
const existing = window[GLOBAL_NAME][ENABLER_KEY];
if (!existing?.version || semanticVersionCompare(existing.version, currentVersion) <= 0) {
  const enabler = new Id5PrebidEnabler(window);
  window[GLOBAL_NAME][ENABLER_KEY] = enabler;
  (existing?.que || []).forEach(command => enabler._run(command));
}
