import {ApiEventsDispatcher} from './apiEvent.js';
import {UidFetcher} from './fetch.js';
import {Instance as MultiplexInstance} from './instance.js';
import {Store} from './store.js';
import {EXTENSIONS} from './extensions.js';

export {default as Promise, LazyValue} from './promise.js';
export {EXTENSIONS} from './extensions.js';
export * from './logger.js';
export * from './consent.js';
export {ApiEventsDispatcher, ApiEvent} from './apiEvent.js';

class Instance {
  _window;
  _dispatcher;
  _logger;
  _metrics;
  _uidFetcher;

  constructor(wnd, logger, dispatcher, metrics, consentManager, clientStore) {
    this._window = wnd;
    this._logger = logger;
    this._dispatcher = dispatcher;
    this._metrics = metrics;
    this._uidFetcher = new UidFetcher(dispatcher, consentManager, new Store(clientStore), metrics, logger, EXTENSIONS);
    this._consentManager = consentManager;
    // TODO merge this instances with MultiplexInstance
    this._instance = new MultiplexInstance(wnd, {}, this._metrics, this._logger);
  }

  on(apiEvent, callback) {
    this._dispatcher.on(apiEvent, callback);
    return this;
  }

  _getId(fetchIdData, forceFetch) {
    this._uidFetcher.getId([fetchIdData], forceFetch);
  }

  /**
   * @param {FetchIdData} fetchIdData
   * @param {Object} [configuration] - additional instance specific configuration
   */
  register(fetchIdData, configuration = {}) {
    let integrationId;
    try {
      this._instance.updateConfig({
        source: fetchIdData.origin,
        sourceVersion: fetchIdData.originVersion,
        sourceConfiguration: configuration,
        sourceWindow: this._window,
        fetchIdData: fetchIdData
      });
      this._instance.register();
      integrationId = this._instance.properties.id;
    } catch (e) {
      this._logger.error('Failed to register integration instance', e);
    }
    // TODO submit getId, this will be moved onLeader election event
    this._getId({
      ...fetchIdData,
      integrationId: integrationId
    }, false);
    return this;
  }

  /**
   *
   * @param {FetchIdData} fetchIdData
   * @param {RefreshOptions} options
   */
  refresh(fetchIdData, options = {}) {
    // TODO for multiplexing send to leader
    if (options.resetConsent === true) {
      this._consentManager.resetConsentData(options.forceAllowLocalStorageGrant === true);
    }
    this._getId(fetchIdData, options.forceFetch === true);
    return this;
  }

  updateConsent(consentData) {
    // TODO for multiplexing send to leader
    this._consentManager.setConsentData(consentData);
  }
}

class MultiplexingRegistry {
  createInstance(wnd, logger, metrics, cm, cs) {
    const dispatcher = new ApiEventsDispatcher(logger);
    return new Instance(wnd, logger, dispatcher, metrics, cm, cs);
  }
}

const multiplexing = new MultiplexingRegistry();

export default multiplexing;
