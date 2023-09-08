import {NoopLogger} from './logger.js';

export const ApiEvent = Object.freeze({
  CONSENT_UPDATED: 'consent_updated',
  USER_ID_READY: 'user_id_ready',
  CASCADE_NEEDED: 'fire_sync_pixel',
  USER_ID_FETCH_CANCELED: 'user_id_fetch_canceled'
});

export const MultiplexingEvent = Object.freeze({
  ID5_MESSAGE_RECEIVED: 'message',
  ID5_INSTANCE_JOINED: 'instance-joined',
  ID5_LEADER_ELECTED: 'leader-elected'
});

const SUPPORTED_EVENTS = Object.freeze([...Object.values(MultiplexingEvent), ...Object.values(ApiEvent)]);

export class ApiEventsDispatcher {
  /**
   *
   * @private
   */
  _handlers;

  /**
   * @type {Logger}
   * @private
   */
  _log;

  constructor(log = NoopLogger) {
    this._log = log;
    this._handlers = {};
  }

  _dispatch(event, ...args) {
    const handlers = this._handlers[event];
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (e) {
          this._log.error(`Event ${event} handler execution failed.`, e);
        }
      }
    }
  }

  emit(event, ...args) {
    if (event !== undefined && SUPPORTED_EVENTS.includes(event)) {
      this._dispatch(event, ...args);
    } else {
      this._log.warn('Unsupported event', event);
    }
  }

  on(event, callback) {
    if (event !== undefined && SUPPORTED_EVENTS.includes(event)) {
      if (!this._handlers[event]) {
        this._handlers[event] = [];
      }
      this._handlers[event].push(callback);
    } else {
      this._log.warn('Unsupported event', event);
    }
  }
}
