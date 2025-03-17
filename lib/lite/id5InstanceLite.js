import {CoreId5Instance} from '../core/id5Instance.js';

export * from '../core/id5Instance.js'

/*
 * Class representing and instance of the ID5 API obtained through ID5.init()
 */
export class Id5InstanceLite extends CoreId5Instance {

  /**
   * @param {Config} config
   * @param {MeterRegistry} metrics
   * @param {Logger} logger
   * @param {Instance} multiplexingInstance multiplexing instance reference
   * @param {PageLevelInfo} pageLevelInfo
   * @param {string} origin
   */
  constructor(config, metrics, logger, multiplexingInstance, pageLevelInfo, origin) {
    super(config, metrics, logger, multiplexingInstance, pageLevelInfo, origin);
  }

}
