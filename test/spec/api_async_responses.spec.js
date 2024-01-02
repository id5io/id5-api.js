import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  CALLBACK_TIMEOUT_MS,
  defaultInit,
  defaultInitBypassConsent,
  execSequence,
  MultiplexingStub,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE
} from './test_utils.js';
import {ApiEvent} from '@id5io/multiplexing';

function stubDelayedUserIdReady(id5Status, timeout, data = {fromCache: false}) {
  setTimeout(() => {
    id5Status.instance._dispatcher.emit(ApiEvent.USER_ID_READY, {
      responseObj: data.response !== undefined ? data.response : JSON.parse(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)),
      isFromCache: data.fromCache !== undefined ? data.fromCache : false
    });
  }, timeout);
}

function stubUserIdReadyNow(id5Status, data = {fromCache: false}) {
  id5Status.instance._dispatcher.emit(ApiEvent.USER_ID_READY, {
    responseObj: data.response !== undefined ? data.response : JSON.parse(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)),
    isFromCache: data.fromCache !== undefined ? data.fromCache : false
  });
}

describe('Async Responses', function () {
  const SHORT_CALLBACK_TIMEOUT_MS = 10;
  const USER_ID_READY_DELAY_MS = 20;
  // arbitrary timeout to test the callbacks later in the process after any ajax call
  // or other async activities
  const LONG_TIMEOUT = 600;

  let clock;
  let multiplexingStub;


  beforeEach(function () {
    multiplexingStub = new MultiplexingStub();
    multiplexingStub.interceptInstance(instance => {
      sinon.stub(instance, 'register').returns(instance); // bypass instance operating
      return instance;
    })
    clock = sinon.useFakeTimers(Date.now());
  });

  afterEach(function () {
    clock.restore();
    multiplexingStub.restore();
  });

  describe('Callbacks with Single Instance', function () {
    let onAvailableSpy, onUpdateSpy, onRefreshSpy;

    beforeEach(function () {
      onAvailableSpy = sinon.spy();
      onUpdateSpy = sinon.spy();
      onRefreshSpy = sinon.spy();
    });

    afterEach(function () {
      onAvailableSpy.resetHistory();
      onUpdateSpy.resetHistory();
      onRefreshSpy.resetHistory();
    });

    it('should call back onAvailable then onUpdate', function (done) {
      const id5Status = ID5.init(defaultInit());
      stubDelayedUserIdReady(id5Status, USER_ID_READY_DELAY_MS);
      id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy).onRefresh(onRefreshSpy);

      expect(id5Status.getUserId()).to.be.undefined;
      expect(id5Status.getLinkType()).to.be.undefined;

      execSequence(clock, {
        timeout: USER_ID_READY_DELAY_MS,
        fn: () => {
          sinon.assert.notCalled(onAvailableSpy);
          sinon.assert.notCalled(onRefreshSpy);
          sinon.assert.notCalled(onUpdateSpy);
        }
      }, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.notCalled(onRefreshSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          sinon.assert.callOrder(onAvailableSpy, onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onAvailableSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onAvailableSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onUpdateSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onUpdateSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          done();
        }
      });
    });

    it('should call onAvailable then onUpdate upon response and clear timeout callback', function (done) {
      const id5Status = ID5.init(defaultInit());
      id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);
      stubDelayedUserIdReady(id5Status, USER_ID_READY_DELAY_MS);

      expect(id5Status.getUserId()).to.be.undefined;
      expect(id5Status.getLinkType()).to.be.undefined;

      execSequence(clock, {
        timeout: USER_ID_READY_DELAY_MS,
        fn: () => {
          sinon.assert.notCalled(onAvailableSpy);
          sinon.assert.notCalled(onUpdateSpy);
        }
      }, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          sinon.assert.callOrder(onAvailableSpy, onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onAvailableSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onAvailableSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onUpdateSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onUpdateSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // make sure callback are not fired again by the watchdog
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          done();
        }
      });
    });

    it('should call onAvailable at time-out, but not onUpdate', function (done) {
      const id5Status = ID5.init(defaultInit());
      id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);
      // USER_ID_READY will never be emitted , so timeout will happen

      expect(id5Status.getUserId()).to.be.undefined;
      expect(id5Status.getLinkType()).to.be.undefined;

      execSequence(clock, {
        timeout: 1,
        fn: () => {
          sinon.assert.notCalled(onAvailableSpy);
          sinon.assert.notCalled(onUpdateSpy);
        }
      }, {
        timeout: CALLBACK_TIMEOUT_MS - 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.notCalled(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // make sure not further calls are made
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.notCalled(onUpdateSpy);
          done();
        }
      });
    });

    it('should not call onAvailable without time-out set', function (done) {
      const id5Status = ID5.init(defaultInit());
      id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);
      // USER_ID_READY will never be emitted

      expect(id5Status.getUserId()).to.be.undefined;
      expect(id5Status.getLinkType()).to.be.undefined;

      setTimeout(() => {
        sinon.assert.notCalled(onAvailableSpy);
        sinon.assert.notCalled(onUpdateSpy);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;
        done();
      }, LONG_TIMEOUT);
      clock.tick(LONG_TIMEOUT);
    });

    it('should call onAvailable after timeout set, then onUpdate when user id ready if server response takes too long', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(onAvailableSpy, SHORT_CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);
      stubDelayedUserIdReady(id5Status, USER_ID_READY_DELAY_MS);

      expect(id5Status.getUserId()).to.be.undefined;
      expect(id5Status.getLinkType()).to.be.undefined;

      execSequence(clock, {
        timeout: SHORT_CALLBACK_TIMEOUT_MS - 1,
        fn: () => {
          // USER_ID_READY not emitted
          sinon.assert.notCalled(onAvailableSpy);
        }
      }, {
        timeout: 1,
        fn: () => {
          // // USER_ID_READY not emitted, watchdog triggered
          sinon.assert.calledOnce(onAvailableSpy);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;
          sinon.assert.notCalled(onUpdateSpy);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // // USER_ID_READY emitted, make sure callbacks are not fired again
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          done();
        }
      });
    });

    it('should call onAvailable immediately for cached response only once and then onUpdate upon response', function (done) {
      const id5Status = ID5.init(defaultInit());
      id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

      const stored_response = clone(TEST_RESPONSE_ID5_CONSENT);
      const updated_response = clone(TEST_RESPONSE_ID5_CONSENT);
      updated_response.ext.linkType = 1;
      updated_response.universal_uid = 'updated_uid';

      stubDelayedUserIdReady(id5Status, USER_ID_READY_DELAY_MS, {
        response: updated_response,
        fromCache: false
      });
      execSequence(clock, {
        timeout: 1,
        fn: () => {
          sinon.assert.notCalled(onAvailableSpy);
          sinon.assert.notCalled(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;
          stubUserIdReadyNow(id5Status, {
            response: stored_response,
            fromCache: true
          });
        }
      }, {
        timeout: 2,
        fn: () => {
          // onAvailable & onUpdate must be called for cached response
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(stored_response.universal_uid);
          expect(id5Status.getLinkType()).to.be.equal(stored_response.ext.linkType);
        }
      }, {
        timeout: USER_ID_READY_DELAY_MS,
        fn: () => {
          // onUpdate must be called for ajax response
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledTwice(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(updated_response.universal_uid);
          expect(id5Status.getLinkType()).to.be.equal(updated_response.ext.linkType);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // no one should be called on watch dog
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledTwice(onUpdateSpy);
          done();
        }
      });
    });

    it('should call onAvailable from refresh immediately with time-out set', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);
      stubUserIdReadyNow(id5Status, {
        response: {...TEST_RESPONSE_ID5_CONSENT},
        fromCache: true
      });

      execSequence(clock, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // make sure the watchdog timeout from init is cleared before moving on
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          ID5.refreshId(id5Status).onRefresh(onRefreshSpy, CALLBACK_TIMEOUT_MS);
          stubUserIdReadyNow(id5Status, {
            response: {...TEST_RESPONSE_ID5_CONSENT},
            fromCache: true
          });
        }
      }, {
        timeout: 2,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy); // User id did not change on update
          sinon.assert.calledOnce(onRefreshSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // make sure the watchdog timeout from refresh is cleared before moving on
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          sinon.assert.calledOnce(onRefreshSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          done();
        }
      });
    });

    it('should call onAvailable from refresh immediately without time-out set', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);
      stubUserIdReadyNow(id5Status, {
        response: {...TEST_RESPONSE_ID5_CONSENT},
        fromCache: true
      });


      execSequence(clock, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          ID5.refreshId(id5Status).onRefresh(onRefreshSpy);
          stubUserIdReadyNow(id5Status, {
            response: {...TEST_RESPONSE_ID5_CONSENT},
            fromCache: true
          });
        }
      }, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onRefreshSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          done();
        }
      });
    });

    it('should call onRefresh from refresh after server response with time-out set', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

      const stored_response = clone(TEST_RESPONSE_ID5_CONSENT);
      const updated_response = clone(TEST_RESPONSE_ID5_CONSENT);
      updated_response.ext.linkType = 2;
      updated_response.universal_uid = 'updated_uid';

      stubUserIdReadyNow(id5Status, {
        response: stored_response,
        fromCache: true
      });

      execSequence(clock, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // make sure the watchdog timeout from init is cleared before moving on
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(stored_response.universal_uid);
          expect(id5Status.getLinkType()).to.be.equal(stored_response.ext.linkType);

          ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy);
          stubDelayedUserIdReady(id5Status, USER_ID_READY_DELAY_MS, {
            response: updated_response,
            fromCache: false
          });
        }
      }, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.notCalled(onRefreshSpy);
          sinon.assert.calledOnce(onUpdateSpy);
        }
      }, {
        timeout: USER_ID_READY_DELAY_MS + 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onRefreshSpy);
          sinon.assert.calledTwice(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(updated_response.universal_uid);
          expect(id5Status.getLinkType()).to.be.equal(updated_response.ext.linkType);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onRefreshSpy);
          sinon.assert.calledTwice(onUpdateSpy);
          expect(id5Status.getUserId()).to.be.equal(updated_response.universal_uid);
          expect(id5Status.getLinkType()).to.be.equal(updated_response.ext.linkType);
          done();
        }
      });
    });

    it('should call onRefresh from refresh after timeout set if server response takes too long', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(onAvailableSpy, SHORT_CALLBACK_TIMEOUT_MS);

      stubUserIdReadyNow(id5Status, {
        response: {...TEST_RESPONSE_ID5_CONSENT},
        fromCache: true
      });

      execSequence(clock, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          // make sure the watchdog timeout from init is cleared before moving on
          sinon.assert.calledOnce(onAvailableSpy);

          ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy, SHORT_CALLBACK_TIMEOUT_MS);
          // do nothing id will not be delivered
        }
      }, {
        timeout: SHORT_CALLBACK_TIMEOUT_MS + 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onRefreshSpy);
          // Should callback with stored value a ajax response was not received
          expect(onAvailableSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onAvailableSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onRefreshSpy);
          done();
        }
      });
    });

    it('should call onRefresh from refreshId after server response without time-out set', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent());
      id5Status.onAvailable(onAvailableSpy);

      stubUserIdReadyNow(id5Status, {
        response: {...TEST_RESPONSE_ID5_CONSENT},
        fromCache: true
      });

      execSequence(clock, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy);
          stubDelayedUserIdReady(id5Status, USER_ID_READY_DELAY_MS);
        }
      }, {
        timeout: LONG_TIMEOUT,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onRefreshSpy);
          expect(onRefreshSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onRefreshSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          done();
        }
      });
    });
  });

  describe('Callbacks with Multiple Instances', function () {
    let onAvailableSpyOne, onUpdateSpyOne, onRefreshSpyOne;
    let onAvailableSpyTwo, onUpdateSpyTwo, onRefreshSpyTwo;

    beforeEach(function () {
      onAvailableSpyOne = sinon.spy();
      onUpdateSpyOne = sinon.spy();
      onRefreshSpyOne = sinon.spy();
      onAvailableSpyTwo = sinon.spy();
      onUpdateSpyTwo = sinon.spy();
      onRefreshSpyTwo = sinon.spy();
    });

    afterEach(function () {
      onAvailableSpyOne.resetHistory();
      onUpdateSpyOne.resetHistory();
      onRefreshSpyOne.resetHistory();
      onAvailableSpyTwo.resetHistory();
      onUpdateSpyTwo.resetHistory();
      onRefreshSpyTwo.resetHistory();
    });

    it('should call back onAvailable then onUpdate for each instance separately ', function (done) {
      const id5StatusOne = ID5.init(defaultInit());
      const id5StatusTwo = ID5.init(defaultInit());
      id5StatusOne.onAvailable(onAvailableSpyOne).onUpdate(onUpdateSpyOne).onRefresh(onRefreshSpyOne);
      id5StatusTwo.onAvailable(onAvailableSpyTwo).onUpdate(onUpdateSpyTwo).onRefresh(onRefreshSpyTwo);

      stubDelayedUserIdReady(id5StatusOne, USER_ID_READY_DELAY_MS);
      stubDelayedUserIdReady(id5StatusTwo, USER_ID_READY_DELAY_MS);

      execSequence(clock, {
        timeout: USER_ID_READY_DELAY_MS,
        fn: () => {
          sinon.assert.notCalled(onAvailableSpyOne);
          sinon.assert.notCalled(onRefreshSpyOne);
          sinon.assert.notCalled(onUpdateSpyOne);
          sinon.assert.notCalled(onAvailableSpyTwo);
          sinon.assert.notCalled(onRefreshSpyTwo);
          sinon.assert.notCalled(onUpdateSpyTwo);
        }
      }, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpyOne);
          sinon.assert.notCalled(onRefreshSpyOne);
          sinon.assert.calledOnce(onUpdateSpyOne);
          sinon.assert.callOrder(onAvailableSpyOne, onUpdateSpyOne);
          expect(id5StatusOne.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5StatusOne.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onAvailableSpyOne.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onAvailableSpyOne.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onUpdateSpyOne.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onUpdateSpyOne.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          sinon.assert.calledOnce(onAvailableSpyTwo);
          sinon.assert.notCalled(onRefreshSpyTwo);
          sinon.assert.calledOnce(onUpdateSpyTwo);
          sinon.assert.callOrder(onAvailableSpyTwo, onUpdateSpyTwo);
          expect(id5StatusTwo.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5StatusTwo.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onAvailableSpyTwo.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onAvailableSpyTwo.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(onUpdateSpyTwo.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(onUpdateSpyTwo.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          done();
        }
      });
    });

    it('should call back onRefresh for one instance only with consent bypass', function (done) {
      const id5StatusOne = ID5.init(defaultInit());
      const id5StatusTwo = ID5.init(defaultInit());
      id5StatusOne.onAvailable(onAvailableSpyOne).onUpdate(onUpdateSpyOne).onRefresh(onRefreshSpyOne);
      id5StatusTwo.onAvailable(onAvailableSpyTwo).onUpdate(onUpdateSpyTwo).onRefresh(onRefreshSpyTwo);

      stubDelayedUserIdReady(id5StatusOne, USER_ID_READY_DELAY_MS);
      stubDelayedUserIdReady(id5StatusTwo, USER_ID_READY_DELAY_MS);

      expect(id5StatusOne.getUserId()).to.be.undefined;
      expect(id5StatusOne.getLinkType()).to.be.undefined;
      expect(id5StatusTwo.getUserId()).to.be.undefined;
      expect(id5StatusTwo.getLinkType()).to.be.undefined;

      execSequence(clock, {
        timeout: USER_ID_READY_DELAY_MS,
        fn: () => {
          sinon.assert.notCalled(onAvailableSpyOne);
          sinon.assert.notCalled(onRefreshSpyOne);
          sinon.assert.notCalled(onUpdateSpyOne);
          sinon.assert.notCalled(onAvailableSpyTwo);
          sinon.assert.notCalled(onRefreshSpyTwo);
          sinon.assert.notCalled(onUpdateSpyTwo);
        }
      }, {
        timeout: 1,
        fn: () => {
          sinon.assert.calledOnce(onAvailableSpyOne);
          sinon.assert.notCalled(onRefreshSpyOne);
          sinon.assert.calledOnce(onUpdateSpyOne);
          sinon.assert.callOrder(onAvailableSpyOne, onUpdateSpyOne);

          sinon.assert.calledOnce(onAvailableSpyTwo);
          sinon.assert.notCalled(onRefreshSpyTwo);
          sinon.assert.calledOnce(onUpdateSpyTwo);
          sinon.assert.callOrder(onAvailableSpyTwo, onUpdateSpyTwo);

          ID5.refreshId(id5StatusTwo, true);
          stubDelayedUserIdReady(id5StatusTwo, USER_ID_READY_DELAY_MS);
        }
      }, {
        timeout: USER_ID_READY_DELAY_MS + 2,
        fn: () => {
          sinon.assert.notCalled(onRefreshSpyOne);
          sinon.assert.calledOnce(onRefreshSpyTwo);
          done();
        }
      });
    });
  });
});
