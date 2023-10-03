import {Instance as MultiplexInstance} from './instance.js';
export {default as Promise, LazyValue} from './promise.js';
export {EXTENSIONS} from './extensions.js';
export * from './logger.js';
export * from './consent.js';
export {ConsentManagement} from './consentManagement.js';
export {StorageConfig, StoreItemConfig} from './store.js';
export {LocalStorage, WindowStorage, StorageApi} from './localStorage.js';
export {ClientStore} from './clientStore.js';
export {ApiEventsDispatcher, ApiEvent, MultiplexingEvent} from './apiEvent.js';
export * as utils from './utils.js';
export {default as CONSTANTS} from './constants.js';

class MultiplexingRegistry {
  /**
   *
   * @param wnd
   * @param logger
   * @param metrics
   * @param {StorageApi} storage
   * @return {MultiplexInstance}
   */
  createInstance(wnd, logger, metrics, storage) {
    return new MultiplexInstance(wnd, {}, storage, metrics, logger);
  }
}

const multiplexing = new MultiplexingRegistry();

export default multiplexing;
