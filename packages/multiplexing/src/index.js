import {ApiEventsDispatcher} from './apiEvent.js';
import {UidFetcher} from './fetch.js';
import {Instance as MultiplexInstance} from './instance.js';
export * from './logger.js';
export {ApiEventsDispatcher, ApiEvent} from './apiEvent.js';

class Instance {
  _window;
  _dispatcher;
  _logger;
  _metrics;
  _uidFetcher;

  constructor(wnd, logger, dispatcher, metrics, cm, cs) {
    this._window = wnd;
    this._logger = logger;
    this._dispatcher = dispatcher;
    this._metrics = metrics;
    this._uidFetcher = new UidFetcher(dispatcher, cm, cs, metrics, logger);
    this._cm = cm;
    // TODO merge this instances with MultiplexInstance
    this._instance = new MultiplexInstance(wnd, {}, this._metrics, this._logger);
  }

  on(apiEvent, callback) {
    this._dispatcher.on(apiEvent, callback);
    return this;
  }

  _getId(fetchIdData, forceFetch) {
    this._uidFetcher.getId(fetchIdData, forceFetch);
  }

  /**
   * @param {FetchIdData} fetchIdData
   * @param {Object} additional instance specific configuration
   */
  register(fetchIdData, configuration = {}) {
    try {
      this._instance.updateConfig({
        source: fetchIdData.origin,
        sourceVersion: fetchIdData.originVersion,
        sourceConfiguration: configuration,
        sourceWindow: this._window,
        fetchIdData: fetchIdData
      });
      this._instance.register();
    } catch (e) {
      this._logger.error('Failed to register integration instance', e);
    }
    // TODO submit getId, this will be moved onLeader election event
    this._getId(fetchIdData, false);
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
      this._cm.resetConsentData(options.forceAllowLocalStorageGrant === true);
    }
    this._getId(fetchIdData, options.forceFetch === true);
    return this;
  }

  updateConsent(consentData) {
    // TODO for multiplexing send to leader
    this._cm.setConsentData(consentData);
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
