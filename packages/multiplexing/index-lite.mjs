import {PassiveMultiplexingInstance} from './src/instancePassive.js';

class MultiplexingRegistry {

  /**
   *
   * @param wnd
   * @param logger
   * @param metrics
   * @return {MultiplexingInstance}
   */
  createPassiveInstance(wnd, logger, metrics) {
    return new PassiveMultiplexingInstance(wnd, {}, metrics, logger);
  }
}

const multiplexing = new MultiplexingRegistry();
export default multiplexing;
