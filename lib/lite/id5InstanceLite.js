import {CoreId5Instance} from '../core/id5Instance.js';

export * from '../core/id5Instance.js'

export const API_LITE_ORIGIN = 'api-lite';
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
   */
  constructor(config, metrics, logger, multiplexingInstance, pageLevelInfo) {
    super(config, metrics, logger, multiplexingInstance, pageLevelInfo, API_LITE_ORIGIN, {
      canDoCascade: false
    });
  }

}
