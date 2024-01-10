import sinon from 'sinon';
import {
  CrossInstanceMessenger,
  Id5Message,
  Id5MessageFactory,
  ProxyMethodCallHandler,
  ProxyMethodCallTarget,
  ProxyMethodCallMessage, HelloMessage
} from '../../src/messaging.js';

class Hello {
}

function messageReceivedPromise(messanger) {
  return new Promise((resolve, reject) => {
    messanger.onAnyMessage((message) => {
      resolve(message);
    })
    setTimeout(reject, 1000);
  });
}

describe('Id5MessageFactory', function () {
  let factory;
  let senderId = crypto.randomUUID();
  let NOW = 123.456;
  let clockStub;

  beforeEach(function () {
    factory = new Id5MessageFactory(senderId);
    clockStub = sinon.stub(Date, "now");

    clockStub.returns(NOW)
  });

  afterEach(function () {
    clockStub.restore();
  });

  it(`should create broadcast message`, function () {
    // given
    let payload = new Hello();
    let expectedMsg = {
      _isId5Message: true,
      id: 1,
      src: senderId,
      timestamp: NOW,
      dst: undefined,
      request: undefined,
      type: payload.constructor.name,
      payload: payload
    }

    // when
    let msg = factory.createBroadcastMessage(payload)


    // then
    expect(msg).is.deep.eq(expectedMsg);
  });

  it(`should create response message`, function () {
    // given
    let responsePayload = {
      a: 'A'
    };
    let requestMsg = new Id5Message(5678, "request_source_id", undefined, 777, new Hello(), Hello.constructor.name);

    let expectedMsg = {
      _isId5Message: true,
      id: 1,
      src: senderId,
      timestamp: NOW,
      dst: "request_source_id",
      request: requestMsg,
      type: responsePayload.constructor.name,
      payload: responsePayload
    }

    // when
    let msg = factory.createResponse(requestMsg, responsePayload)

    // then
    expect(msg).is.deep.eq(expectedMsg);
  });

  it(`should create unicast message`, function () {
    // given
    let payload = {
      a: 'A'
    };
    let dst = 10;

    let expectedMsg = {
      _isId5Message: true,
      id: 1,
      src: senderId,
      timestamp: NOW,
      dst: dst,
      request: undefined,
      type: payload.constructor.name,
      payload: payload
    }

    // when
    let msg = factory.createUnicastMessage(dst, payload)

    // then
    expect(msg).is.deep.eq(expectedMsg);
  });
});

describe('CrossInstanceMessenger', function () {
  it('should send & receive id5 broadcast message', async () => {

    // given
    let messengerA = new CrossInstanceMessenger('a', window);

    let messengerB = new CrossInstanceMessenger('b', window);

    let receivedByA = messageReceivedPromise(messengerA);

    let receivedByB = messageReceivedPromise(messengerB);

    // when
    messengerA.broadcastMessage(new Hello());
    messengerB.broadcastMessage(new Hello());

    // then
    return Promise.all([
      receivedByA.then(msg => {
        expect(msg.src).is.eq('b');
      }),
      receivedByB.then(msg => {
        expect(msg.src).is.eq('a');
      })]
    );
  });

  it('should receive and respond to message', async () => {

    // given
    let sender = new CrossInstanceMessenger('a', window);

    let responder = new CrossInstanceMessenger('b', window);

    let receivedBySender = messageReceivedPromise(sender);

    // when
    responder.onAnyMessage((message) => {
      responder.sendResponseMessage(message, {
        request: message.payload,
      }, message.type + '-response');
    });

    sender.broadcastMessage({some: 'Content'}, 'AD_HOC_MESSAGE');

    // then
    return receivedBySender.then(msg => {
        expect(msg.src).is.eq(responder._id);
        expect(msg.id).is.not.eq(undefined);
        expect(msg.dst).is.eq(sender._id);
        expect(msg.type).is.eq('AD_HOC_MESSAGE-response');
        expect(msg.payload).is.deep.eq({
          request: {some: 'Content'},
        });
        expect(msg.request).is.not.eq(undefined);
      }
    );
  });

  it('should ignore non id5 message', async () => {

    // given
    let messengerA = new CrossInstanceMessenger('a', window);
    let messageFactory = new Id5MessageFactory('b');
    let messages = [];
    let firstId5Message = messageFactory.createBroadcastMessage(new Hello());
    let secondId5Message = messageFactory.createBroadcastMessage('END', 'END');
    let receivedId5Message = new Promise((resolve, _) => {
      messengerA.onAnyMessage((message) => {
        if (message.payload === 'END') {
          resolve(message)
        }
        messages.push(message);
      });
    });

    // when
    window.postMessage('NON_ID5_MESSAGE', '*');
    window.postMessage(firstId5Message, '*');
    window.postMessage('ANOTHER_NON_ID5_MESSAGE', '*')
    window.postMessage(secondId5Message, '*');

    // then
    return receivedId5Message.then(_ => {
      // only id5 messages received
      expect(messages).to.be.deep.eq([firstId5Message, secondId5Message]);
    });
  });

  it('should send & receive id5 unicast message', async () => {

    // given
    let messengerA = new CrossInstanceMessenger('a', window);
    let messengerB = new CrossInstanceMessenger('b', window);
    let messengerC = new CrossInstanceMessenger('c', window)


    let receivedByA = messageReceivedPromise(messengerA);

    let receivedByB = messageReceivedPromise(messengerB);

    // when
    messengerC.unicastMessage('a', 'MESSAGE_TO_A');
    messengerC.unicastMessage('b', 'MESSAGE_TO_B');

    // then
    return Promise.all([
      receivedByA.then(msg => {
        expect(msg.src).is.eq('c');
        expect(msg.dst).is.eq('a')
        expect(msg.payload).is.eq('MESSAGE_TO_A')
      }),
      receivedByB.then(msg => {
        expect(msg.src).is.eq('c');
        expect(msg.dst).is.eq('b');
        expect(msg.payload).is.eq('MESSAGE_TO_B');
      })]
    );
  });

  it('should send proxy method call', function () {
    let messengerA = new CrossInstanceMessenger('a', window);
    let messengerB = new CrossInstanceMessenger('b', window);


    let pmcMessageReceived = messageReceivedPromise(messengerB);

    // when
    messengerA.callProxyMethod('b', ProxyMethodCallTarget.FOLLOWER, 'someMethod', ['arg1', 2, {arg: 3}, ['arg4']]);

    // then
    return pmcMessageReceived.then(message => {
      expect(message.payload).is.eql({
        target: ProxyMethodCallTarget.FOLLOWER,
        methodName: 'someMethod',
        methodArguments: ['arg1', 2, {arg: 3}, ['arg4']]
      });
    })
  });

  it('should handle callback for specific message type', function () {
    // given
    let messengerA = new CrossInstanceMessenger('a', window);
    let messengerB = new CrossInstanceMessenger('b', window);
    let hello = new HelloMessage({id: 'a'}, true, {id: 'leader'});

    let messageReceived = new Promise((resolve, reject) => {
      messengerB.onMessage(HelloMessage.TYPE, msg => resolve(msg))
    });

    // when
    messengerA.unicastMessage('b', hello, HelloMessage.TYPE);

    // then
    return messageReceived.then(message => {
      expect(message.type).to.be.eql(HelloMessage.TYPE);
      expect(message.src).to.be.eql('a');
      expect(message.payload).to.be.eql(hello);
    });
  });

  it('should handle callback for specific message type and any', function () {
    // given
    let messengerA = new CrossInstanceMessenger('a', window);
    let messengerB = new CrossInstanceMessenger('b', window);
    let hello = new HelloMessage({id: 'a'}, true, {id: 'leader'});

    let onAnyReceived = new Promise((resolve, reject) => {
      messengerB.onAnyMessage(msg => resolve(msg))
    });
    let onTypeReceived = new Promise((resolve, reject) => {
      messengerB.onMessage(HelloMessage.TYPE, msg => resolve(msg))
    });
    // when
    messengerA.unicastMessage('b', hello, HelloMessage.TYPE);

    // then
    return Promise.all([onAnyReceived, onTypeReceived]).then(messages => {
      messages.forEach(message => {
        expect(message.type).to.be.eql(HelloMessage.TYPE);
        expect(message.src).to.be.eql('a');
        expect(message.payload).to.be.eql(hello);
      });
    });
  });

  it('should handle multiple callbacks for specific message type', function () {
    // given
    let messengerA = new CrossInstanceMessenger('a', window);
    let messengerB = new CrossInstanceMessenger('b', window);
    let hello = new HelloMessage({id: 'a'}, true, {id: 'leader'});

    let handlerACalled = new Promise((resolve, reject) => {
      messengerB.onMessage(HelloMessage.TYPE, msg => resolve(msg));
    });
    let handlerBCalled = new Promise((resolve, reject) => {
      messengerB.onMessage(HelloMessage.TYPE, msg => resolve(msg));
    });
    // when
    messengerA.unicastMessage('b', hello, HelloMessage.TYPE);

    // then
    return Promise.all([handlerACalled, handlerBCalled]).then(messages => {
      messages.forEach(message => {
        expect(message.type).to.be.eql(HelloMessage.TYPE);
        expect(message.src).to.be.eql('a');
        expect(message.payload).to.be.eql(hello);
      });
    });
  });

  it('should handle multiple callbacks for any message', function () {
    // given
    let messengerA = new CrossInstanceMessenger('a', window);
    let messengerB = new CrossInstanceMessenger('b', window);
    let hello = new HelloMessage({id: 'a'}, true, {id: 'leader'});

    let handlerACalled = new Promise((resolve, reject) => {
      messengerB.onAnyMessage(msg => resolve(msg));
    });
    let handlerBCalled = new Promise((resolve, reject) => {
      messengerB.onAnyMessage(msg => resolve(msg));
    });
    // when
    messengerA.unicastMessage('b', hello, HelloMessage.TYPE);

    // then
    return Promise.all([handlerACalled, handlerBCalled]).then(messages => {
      messages.forEach(message => {
        expect(message.type).to.be.eql(HelloMessage.TYPE);
        expect(message.src).to.be.eql('a');
        expect(message.payload).to.be.eql(hello);
      });
    });
  });
});

describe('ProxyMethodCallHandler', function () {
  /**
   * @type {ProxyMethodCallHandler}
   */
  let handler;
  beforeEach(() => {
    handler = new ProxyMethodCallHandler();
  });

  it('should add target and call', () => {
    // given
    let followerTarget = sinon.spy({
      someMethod: function () {
      }
    });

    let leaderTarget = sinon.spy({
      someMethod: function () {
      }
    });
    handler
      .registerTarget(ProxyMethodCallTarget.FOLLOWER, followerTarget)
      .registerTarget(ProxyMethodCallTarget.LEADER, leaderTarget);

    // when
    handler._handle(new ProxyMethodCallMessage(ProxyMethodCallTarget.FOLLOWER, 'someMethod', ['arg1', 2]));
    handler._handle(new ProxyMethodCallMessage(ProxyMethodCallTarget.LEADER, 'someMethod', [3, {prop: 'A'}]));

    // then
    expect(followerTarget.someMethod).have.been.calledWith('arg1', 2);
    expect(leaderTarget.someMethod).have.been.calledWith(3, {prop: 'A'})
  });

  it('should be target exceptions resistant', () => {

    // given
    let leaderTarget = sinon.spy({
      someMethod: function () {
        throw  new Error();
      }
    });
    handler.registerTarget(ProxyMethodCallTarget.LEADER, leaderTarget);

    // when
    handler._handle(new ProxyMethodCallMessage(ProxyMethodCallTarget.LEADER, 'someMethod', [3, {prop: 'A'}]));

    // then
    expect(leaderTarget.someMethod).have.been.calledWith(3, {prop: 'A'})
  });

  it('should ignore when no target', () => {
    // given no targets registered

    // when
    handler._handle(new ProxyMethodCallMessage(ProxyMethodCallTarget.LEADER, 'someMethod', [3, {prop: 'A'}]));

    // then nothing happens (expect no error)
  });

});
