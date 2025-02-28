import {NO_OP_LOGGER} from './logger.js';

const ANY_MSG_TYPE = '*';
export const DST_BROADCAST = undefined;

export class Id5Message {
  _isId5Message = true;
  id;
  timestamp;
  type;
  src;
  dst;
  request;
  payload;

  constructor(timestamp, src, dst, id, payload, type, request = undefined) {
    this.id = id;
    this.timestamp = timestamp;
    this.src = src;
    this.dst = dst;
    this.type = type;
    this.request = request;
    this.payload = payload;
  }
}

export class Id5MessageFactory {
  /**
   * @type {string}
   * @private
   */
  _senderId;
  /**
   *
   * @type {number}
   * @private
   */
  _messageSeqNb = 0;

  constructor(senderId) {
    this._senderId = senderId;
    this._messageSeqNb = 0;
  }

  createBroadcastMessage(payload, type = payload.constructor.name) {
    return new Id5Message(Date.now(), this._senderId, DST_BROADCAST, ++this._messageSeqNb, payload, type || payload.constructor.name);
  }

  createResponse(message, payload, type = payload.constructor.name) {
    return new Id5Message(Date.now(), this._senderId, message.src, ++this._messageSeqNb, payload, type || payload.constructor.name, message);
  }

  createUnicastMessage(dst, payload, type = payload.constructor.name) {
    return new Id5Message(Date.now(), this._senderId, dst, ++this._messageSeqNb, payload, type || payload.constructor.name);
  }
}

export class HelloMessage {
  static TYPE = 'HelloMessage';
  /**
   * @type {Properties}
   */
  instance;
  /**
   * @type {InstanceState}
   */
  instanceState;
  /**
   * @type {boolean}
   */
  isResponse;

  /**
   *
   * @param {boolean} isResponse
   * @param {Properties} instance
   * @param {Object} instanceState
   */
  constructor(instance, isResponse = false, instanceState = undefined) {
    this.instance = instance;
    this.instanceState = instanceState;
    this.isResponse = isResponse;
  }
}

export const ProxyMethodCallTarget = Object.freeze({
  LEADER: 'leader',
  FOLLOWER: 'follower',
  STORAGE: 'storage'
});

export class ProxyMethodCallMessage {
  static TYPE = 'RemoteMethodCallMessage';
  target;
  methodName;
  methodArguments;

  constructor(target, methodName, methodArguments) {
    this.target = target;
    this.methodName = methodName;
    this.methodArguments = methodArguments;
  }
}

export class ProxyMethodCallHandler {
  _targets = {};
  _log;

  /**
   *
   * @param logger
   */
  constructor(logger = NO_OP_LOGGER) {
    this._log = logger;
  }

  /**
   *
   * @param {string} target
   * @param {Object} targetObject
   */
  registerTarget(target, targetObject) {
    this._targets[target] = targetObject;
    return this;
  }

  /**
   *
   * @param {ProxyMethodCallMessage} proxyMethodCallMessage
   */
  _handle(proxyMethodCallMessage) {
    const target = this._targets[proxyMethodCallMessage.target];
    if (target) {
      try {
        target[proxyMethodCallMessage.methodName](...proxyMethodCallMessage.methodArguments);
      } catch (e) {
        this._log.error('Error while handling method call ', proxyMethodCallMessage, e);
      }
    }
  }
}

export class CrossInstanceMessenger {
  /**
   * @type {string}
   * @private
   */
  _id;
  /**
   * @type {Id5MessageFactory}
   * @private
   */
  _messageFactory;
  /**
   *
   * @type {Logger}
   * @private
   */
  _log;

  /**
   * @type {Id5CommonMetrics}
   * @private
   */
  _metrics;

  /**
   *
   * @type {function}
   * @private
   */
  _onMessageCallBackFunction = undefined;

  constructor(id, window, logger = NO_OP_LOGGER, metrics) {
    this._id = id;
    this._messageFactory = new Id5MessageFactory(this._id);
    this._log = logger;
    this._window = window;
    this._handlers = {};
    this._metrics = metrics;
    this._register();
  }

  /**
   *
   * @private
   */
  _register() {
    const messenger = this;
    messenger._abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const abortSignal = messenger._abortController?.signal;
    const handleMessage = (event) => {
      let msg = event.data;
      if (event.data !== undefined && event.data._isId5Message) { // is ID5 message
        if (event.data.src === messenger._id) { // is loopback message
          // Ignore message sent by this instance
          return;
        }
        if (event.data.dst !== undefined && event.data.dst !== messenger._id) {
          // Ignore message not for this instance
          return;
        }
        try {
          [ANY_MSG_TYPE, msg.type].forEach(type => {
            let handlers = messenger._handlers[type];
            if (handlers) {
              // TODO add window which msg was received from - response will not have to broadcast
              handlers.forEach(handler => handler(msg, event.source));
            }
          });
        } catch (e) {
          messenger._log.error('Error while handling message', msg, e);
        }
      }
    };
    messenger._window.addEventListener('message', handleMessage, {
      capture: false,
      signal: abortSignal
    });
  }

  unregister() {
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  /**
   *
   * @param {function} onMessageCallback
   */
  onAnyMessage(onMessageCallback) {
    return this.onMessage(ANY_MSG_TYPE, onMessageCallback);
  }

  /**
   *
   * @param {String} messageType
   * @param {Function<Object>} handler - message handler
   */
  onMessage(messageType, handler) {
    const typeHandlers = this._handlers[messageType];
    if (typeHandlers) {
      typeHandlers.push(handler);
    } else {
      this._handlers[messageType] = [handler];
    }
    return this;
  }

  broadcastMessage(payload, type) {
    this._log.debug('Broadcasting message', type, payload);
    this._postMessage(this._messageFactory.createBroadcastMessage(payload, type));
  }

  sendResponseMessage(receivedMessage, payload, type = payload.constructor.name) {
    this._log.debug('Sending response message', receivedMessage, type, payload);
    this._postMessage(this._messageFactory.createResponse(receivedMessage, payload, type));
  }

  unicastMessage(dst, payload, type = payload.constructor.name) {
    this._log.debug('Sending message to', dst, type, payload);
    this._postMessage(this._messageFactory.createUnicastMessage(dst, payload, type));
  }

  /**
   * @param {Window} wnd
   * @param {Id5Message} msg
   * @private
   */
  _postToWindow(wnd, msg) {
    try {
      wnd.postMessage(msg, '*');
    } catch (e) {
      // avoid accessing `wnd` properties even for logging
      // they may not be accessible from current window and throw another exception
      this._log.error('Could not post message to window', e);
    }
  }

  /**
   * @param {Id5Message} msg
   * @private
   */
  _postMessage(msg) {
    let messenger = this;

    let broadcastMessage = function (wnd) {
      try {
        messenger._postToWindow(wnd, msg);
        let wndChildren = wnd.frames;
        if (wndChildren) {
          for (let i = 0; i < wndChildren.length; i++) {
            broadcastMessage(wndChildren[i]);
          }
        }
      } catch (e) {
        messenger._log.error('Could not broadcast message', e);
      }
    };
    broadcastMessage(messenger._window.top);
  }

  callProxyMethod(dst, target, name, args) {
    this._log.debug('Calling ProxyMethodCall', {target, name, args});
    this.unicastMessage(dst, new ProxyMethodCallMessage(target, name, args), ProxyMethodCallMessage.TYPE);
  }

  /**
   *
   * @param {ProxyMethodCallHandler} handler
   * @return {CrossInstanceMessenger}
   */
  onProxyMethodCall(handler) {
    return this.onMessage(ProxyMethodCallMessage.TYPE, message => {
      if (message.dst === undefined) {
        this._countInvalidMessage(message, "no-destination-proxy")
        this._log.error('Received invalid RemoteMethodCallMessage message', JSON.stringify(message), 'Ignoring it....');
        return;
      }
      handler._handle(Object.assign(new ProxyMethodCallMessage(), message.payload));
    });
  }

  /**
   *
   * @param message {Id5Message}
   * @param reason {string}
   * @private
   */
  _countInvalidMessage(message, reason) {
    const isPresent = field => {
      return field !== undefined && field !== null
    }

    if(this._metrics?.instanceInvalidMsgCounter !== undefined) {
      this._metrics.instanceInvalidMsgCounter({
        reason: reason,
        hasDestination: isPresent(message.dst),
        hasSource: isPresent(message.src),
        hasPayload: isPresent(message.payload),
        hasRequest: isPresent(message.request),
        hasTimestamp: isPresent(message.timestamp)
      }).inc()
    }
  }
}
