import {MultiplexingInstance} from '../index-core.mjs';
import {OperatingMode, Role} from './instanceCore.js';
import {ProxyMethodCallHandler, ProxyMethodCallTarget} from './messaging.js';


export class PassiveMultiplexingInstance extends MultiplexingInstance {
  constructor(wnd, configuration, metrics, logger) {
    super(wnd, configuration, metrics, logger);
  }

  init() {
    super.init();
    const instance = this;
    instance._mode = OperatingMode.MULTIPLEXING_PASSIVE;
    instance.role = Role.FOLLOWER;
    instance._messenger
      .onProxyMethodCall(
        new ProxyMethodCallHandler(instance._logger).registerTarget(ProxyMethodCallTarget.FOLLOWER, instance._followerRole)
      );
  }
}
