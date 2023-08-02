import {NoopLogger} from './logger.js';

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

  _dispatch(event, payload) {
    const handlers = this._handlers[event];
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (e) {
          this._log.error(`Event ${event} handler execution failed.`, e);
        }
      }
    }
  }

  emit(event, payload) {
    this._dispatch(event, payload);
  }

  on(event, callback) {
    if (!this._handlers[event]) {
      this._handlers[event] = [];
    }
    this._handlers[event].push(callback);
  }
}

export const ApiEvent = Object.freeze({
  CONSENT_UPDATED: 'consent_updated',
  USER_ID_READY: 'user_id_ready',
  CASCADE_NEEDED: 'fire_sync_pixel',
  USER_ID_FETCH_CANCELED: 'user_id_fetch_canceled'
});
