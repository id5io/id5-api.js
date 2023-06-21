/**
 * @interface
 */
export class Logger {
  debug(...args) {
  }

  info(...args) {
  }

  warn(...args) {
  }

  error(...args) {
  }
}

/**
 *
 * @type {Logger}
 */
export const NoopLogger = new Logger();

export class NamedLogger extends Logger {
  constructor(prefix, delegate) {
    super();
    this._prefix = prefix;
    this._delegate = delegate;
  }

  debug(...args) {
    this._delegate.debug(this._prefix, ...args);
  }

  info(...args) {
    this._delegate.info(this._prefix, ...args);
  }

  warn(...args) {
    this._delegate.warn(this._prefix, ...args);
  }

  error(...args) {
    this._delegate.error(this._prefix, ...args);
  }
}
