import {NoopLogger} from './logger.js';

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
    return new Id5Message(performance.now(), this._senderId, DST_BROADCAST, ++this._messageSeqNb, payload, type || payload.constructor.name);
  }

  createResponse(message, payload, type = payload.constructor.name) {
    return new Id5Message(performance.now(), this._senderId, message.src, ++this._messageSeqNb, payload, type || payload.constructor.name, message);
  }

  createUnicastMessage(dst, payload, type = payload.constructor.name) {
    return new Id5Message(performance.now(), this._senderId, dst, ++this._messageSeqNb, payload, type || payload.constructor.name);
  }
}

export class HelloMessage {
  static TYPE = 'HelloMessage';
  instance;

  constructor(instanceProperties) {
    this.instance = instanceProperties;
  }
}

export const MethodCallTarget = Object.freeze({
  THIS: "this",
  LEADER: "leader",
  FOLLOWER: "follower"
});

export class ProxyMethodCallMessage {
  static TYPE = "RemoteMethodCallMessage";
  target;
  methodName;
  methodArguments;

  constructor(target, methodName, methodArguments) {
    this.target = target;
    this.methodName = methodName;
    this.methodArguments = methodArguments;
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
   *
   * @type {function}
   * @private
   */
  _onMessageCallBackFunction = undefined;

  constructor(id, window, logger = NoopLogger) {
    this._id = id;
    this._messageFactory = new Id5MessageFactory(this._id);
    this._log = logger;
    this._window = window;
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
      if (msg !== undefined && msg._isId5Message) { // is ID5 message
        if (event.data.src === messenger._id) { // is loopback message
          messenger._log.debug(`Ignore loopback msg`);
          return;
        }
        if (event.data.dst !== undefined && event.data.dst !== messenger._id) {
          messenger._log.debug(`Ignore msg not to me`);
          return;
        }
        if (messenger._onMessageCallBackFunction && typeof messenger._onMessageCallBackFunction === 'function') {
          // TODO add window from msg was received - response will not have to broadcast
          messenger._onMessageCallBackFunction(msg);
        }
      }
    };
    messenger._window.addEventListener('message', handleMessage, {
      capture: false,
      signal: abortSignal
    });
  }

  deregister() {
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  /**
   *
   * @param {function} onMessageCallback
   */
  onMessageReceived(onMessageCallback) {
    this._onMessageCallBackFunction = onMessageCallback;
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
    this._log.debug('Sending response to', dst, type, payload);
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
  };

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
    this.unicastMessage(dst, new ProxyMethodCallMessage(target, name, args), ProxyMethodCallMessage.TYPE);
  }
}
