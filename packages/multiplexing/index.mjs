import {Instance as MultiplexInstance} from './src/instance.js';
export {LazyValue} from './src/promise.js';
export {EXTENSIONS, Extensions} from './src/extensions.js';
export * from './src/logger.js';
export * from './src/consent.js';
export {ConsentManagement} from './src/consentManagement.js';
export {StorageConfig, StoreItemConfig} from './src/store.js';
export {LocalStorage, WindowStorage, StorageApi} from './src/localStorage.js';
export {ClientStore} from './src/clientStore.js';
export {ApiEventsDispatcher, ApiEvent, MultiplexingEvent} from './src/apiEvent.js';
export * as utils from './src/utils.js';
export {default as CONSTANTS} from './src/constants.js';
export {ConsentSource} from './src/data.js'

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
