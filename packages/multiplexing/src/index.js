import {UidFetcher} from './fetch.js';
import {Instance as MultiplexInstance} from './instance.js';
import {Store} from './store.js';
import {EXTENSIONS} from './extensions.js';
export {LazyValue} from './promise.js';
export {EXTENSIONS} from './extensions.js';
export * from './logger.js';
export * from './consent.js';
export {ConsentManagement} from './consentManagement.js';
export {StorageConfig, StoreItemConfig} from './store.js';
export {ClientStore} from './clientStore.js';
export {ApiEventsDispatcher, ApiEvent, MultiplexingEvent} from './apiEvent.js';
export * as utils from './utils.js';
export {default as CONSTANTS} from './constants.js';

class MultiplexingRegistry {
  createInstance(wnd, logger, metrics, consentManager, clientStore) {
    return new MultiplexInstance(wnd, {}, metrics, logger, new UidFetcher(consentManager, new Store(clientStore), metrics, logger, EXTENSIONS), consentManager);
  }
}

const multiplexing = new MultiplexingRegistry();

export default multiplexing;
