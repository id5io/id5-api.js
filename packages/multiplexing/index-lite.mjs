import {MultiplexingInstance} from './src/instanceCore.js';

class MultiplexingRegistry {

  /**
   *
   * @param wnd
   * @param logger
   * @param metrics
   * @return {MultiplexingInstance}
   */
  createPassiveInstance(wnd, logger, metrics) {
    return new MultiplexingInstance(wnd, {}, metrics, logger);
  }
}

const multiplexing = new MultiplexingRegistry();

export default multiplexing;
