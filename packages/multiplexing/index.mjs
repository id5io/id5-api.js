import {Instance as MultiplexInstance} from './src/instance.js';
export {LazyValue} from './src/promise.js';
export {EXTENSIONS, Extensions} from './src/extensions.js';
export * from './src/logger.js';
export * from './src/consent.js';
export {ConsentManagement} from './src/consentManagement.js';
export {StorageConfig, StoreItemConfig, Store} from './src/store.js';
export {LocalStorage, WindowStorage, StorageApi} from './src/localStorage.js';
export {ClientStore} from './src/clientStore.js';
export {ApiEventsDispatcher, ApiEvent, MultiplexingEvent} from './src/events.js';
export * as utils from './src/utils.js';
export {CONSTANTS} from './src/constants.js';

class MultiplexingRegistry {
  /**
   *
   * @param wnd
   * @param logger
   * @param metrics
   * @param {StorageApi} storage
   * @param {TrueLinkAdapter} trueLinkAdapter
   * @param {ClientStore} clientStore
   * @return {MultiplexInstance}
   */
  createInstance(wnd, logger, metrics, storage, trueLinkAdapter, clientStore) {
    return new MultiplexInstance(wnd, {}, storage, metrics, logger, trueLinkAdapter, clientStore);
  }
}

const multiplexing = new MultiplexingRegistry();

export default multiplexing;
