import sinon from 'sinon';
import ID5 from '../../lib/id5-api';
import * as utils from '../../lib/utils';
import ClientStore from '../../lib/clientStore';
import {
  AJAX_RESPONSE_MS,
  CALLBACK_TIMEOUT_MS,
  ID5_FETCH_ENDPOINT,
  ID5_LB_ENDPOINT,
  JSON_RESPONSE_ID5_CONSENT,
  JSON_RESPONSE_NO_ID5_CONSENT,
  localStorage,
  STORED_JSON,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_ID5_PARTNER_ID,
  TEST_ID5_PARTNER_ID_ALT,
  TEST_LAST_STORAGE_CONFIG,
  TEST_NB_STORAGE_CONFIG,
  TEST_PD_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_DISALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_ID5ID_NO_CONSENT,
  TEST_RESPONSE_LINK_TYPE,
  TEST_RESPONSE_LINK_TYPE_NO_CONSENT,
  TEST_STORED_ID5ID,
  TEST_STORED_LINK_TYPE,
  stubDelayedResponse,
  resetAllInLocalStorage,
  defaultInitBypassConsent,
  defaultInit,
  execSequence
} from './test_utils';

describe('Async Responses', function () {
  const SHORT_CALLBACK_TIMEOUT_MS = 10;

  // arbitrary timeout to test the callbacks later in the process after any ajax call
  // or other async activities
  const LONG_TIMEOUT = 600;

  const testClientStore = new ClientStore(0,
    () => new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG, API_TYPE.NONE),
    localStorage);
  let clock;

  before(function () {
    resetAllInLocalStorage();
  });

  beforeEach(function () {
    clock = sinon.useFakeTimers(Date.now());
  });

  afterEach(function () {
    resetAllInLocalStorage();
    clock.restore();
  });

  describe('Callbacks with Single Instance', function () {
    let onAvailableSpy, onUpdateSpy, onRefreshSpy;
    let ajaxStub;

    beforeEach(function () {
      onAvailableSpy = sinon.spy();
      onUpdateSpy = sinon.spy();
      onRefreshSpy = sinon.spy();
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(stubDelayedResponse(JSON_RESPONSE_ID5_CONSENT));
    });

    afterEach(function () {
      onAvailableSpy.resetHistory();
      onUpdateSpy.resetHistory();
      onRefreshSpy.resetHistory();
      ajaxStub.restore();
    });

    it('should call back onAvailable then onUpdate with consent bypass', function (done) {
      const id5Status = ID5.init(defaultInitBypassConsent())
      id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy).onRefresh(onRefreshSpy);

      sinon.assert.calledTwice(ajaxStub);
      expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
      expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
      expect(id5Status.getUserId()).to.be.undefined;
      expect(id5Status.getLinkType()).to.be.undefined;

      execSequence(clock, {
        timeout: AJAX_RESPONSE_MS,
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

    describe('No Stored Value, No Consent Override', function () {
      describe('Empty Stored Privacy', function() {
        it('should call onAvailable then onUpdate upon server response', function (done) {
          const id5Status = ID5.init(defaultInit());
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          execSequence(clock, {
            timeout: AJAX_RESPONSE_MS,
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

        it('should call onAvailable if no time-out', function (done) {
          const id5Status = ID5.init(defaultInit());
          id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          execSequence(clock, {
            timeout: AJAX_RESPONSE_MS,
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
              done();
            }
          });
        });
      });

      describe('No Consent in Stored Privacy', function () {
        beforeEach(function() {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);
        });

        it('should call onAvailable at time-out, but not onUpdate', function (done) {
          const id5Status = ID5.init(defaultInit());
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          execSequence(clock, {
            timeout: AJAX_RESPONSE_MS,
            fn: () => {
              sinon.assert.notCalled(onAvailableSpy);
              sinon.assert.notCalled(onUpdateSpy);
            }
          }, {
            timeout: CALLBACK_TIMEOUT_MS - AJAX_RESPONSE_MS,
            fn: () => {
              sinon.assert.notCalled(ajaxStub);
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

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(ajaxStub);
            sinon.assert.notCalled(onAvailableSpy);
            sinon.assert.notCalled(onUpdateSpy);
            expect(id5Status.getUserId()).to.be.undefined;
            expect(id5Status.getLinkType()).to.be.undefined;
            done();
          }, LONG_TIMEOUT);
          clock.tick(LONG_TIMEOUT);
        });
      });
    });

    describe('Stored Value, No Consent Override, Consent in Stored Privacy', function () {
      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
      });

      it('should call onAvailable immediately even with time-out', function (done) {
        const id5Status = ID5.init(defaultInit());
        id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

        sinon.assert.notCalled(ajaxStub);
        execSequence(clock, {
          timeout: 1,
          fn: () => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
          }
        }, {
          timeout: LONG_TIMEOUT,
          fn: () => {
            // Make sure the watchdog doesn't trigger callbacks again
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            done();
          }
        });
      });

      it('should call onAvailable immediately without time-out set', function (done) {
        const id5Status = ID5.init(defaultInit());
        id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

        sinon.assert.notCalled(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          done();
        }, 1);
        clock.tick(1);
      });
    });

    describe('Stored Value, No Refresh, With Override', function () {
      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
      });

      it('should call onAvailable and onUpdate immediately even with time-out set', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());
        id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

        sinon.assert.notCalled(ajaxStub);

        execSequence(clock, {
          timeout: 1,
          fn: () => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
          }
        }, {
          timeout: LONG_TIMEOUT,
          fn: () => {
            // Make sure the watchdog doesn't trigger callbacks again
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            done();
          }
        });
      });

      it('should call onAvailable and onUpdate immediately without time-out set', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());
        id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

        sinon.assert.notCalled(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          done();
        }, 1);
        clock.tick(1);
      });
    });

    describe('No Stored Value, With Consent Override', function () {
      it('should call onAvailable after server response with time-out set', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());
        id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        execSequence(clock, {
          timeout: AJAX_RESPONSE_MS,
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

      it('should call onAvailable after timeout set if server response takes too long', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());
        id5Status.onAvailable(onAvailableSpy, SHORT_CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        execSequence(clock, {
          timeout: SHORT_CALLBACK_TIMEOUT_MS - 1,
          fn: () => {
            // Ajax not answered, watchdog not triggered
            sinon.assert.notCalled(onAvailableSpy);
          }
        }, {
          timeout: 1,
          fn: () => {
            // Ajax not answered, watchdog triggered
            sinon.assert.calledOnce(onAvailableSpy);
            expect(id5Status.getUserId()).to.be.undefined;
            expect(id5Status.getLinkType()).to.be.undefined;
            sinon.assert.notCalled(onUpdateSpy);
          }
        }, {
          timeout: LONG_TIMEOUT,
          fn: () => {
            // make sure callback are not fired again
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            done();
          }
        });
      });
    });

    describe('Stored Value, Refresh Needed, With Consent Override', function () {
      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
      });

      it('should call onAvailable immediately and only once with time-out set', function (done) {
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          refreshInSeconds: 10
        });
        id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        execSequence(clock, {
          timeout: 1,
          fn: () => {
            // onAvailable & onUpdate must be called for cached response
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
          }
        }, {
          timeout: AJAX_RESPONSE_MS + 1,
          fn: () => {
            // onUpdate must be called for ajax response
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledTwice(onUpdateSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
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

      it('should call onAvailable immediately and only once without time-out set', function (done) {
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          refreshInSeconds: 10
        });
        id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy).onRefresh(onRefreshSpy);

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        execSequence(clock, {
          timeout: 1,
          fn: () => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            sinon.assert.notCalled(onRefreshSpy);
            }
        }, {
          timeout: AJAX_RESPONSE_MS + 1,
          fn: () => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledTwice(onUpdateSpy);
            sinon.assert.notCalled(onRefreshSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          }
        });
      });
    });

    describe('Stored Value, No Refresh, With RefreshId', function () {
      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
      });

      describe('No Fetch Required on Refresh', function () {
        it('should call onAvailable from refresh immediately with time-out set', function (done) {
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.notCalled(ajaxStub);

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
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(id5Status).onRefresh(onRefreshSpy, CALLBACK_TIMEOUT_MS);

              sinon.assert.notCalled(ajaxStub);
            }
          }, {
            timeout: 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy); // User id did not change on update
              sinon.assert.calledOnce(onRefreshSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
            }
          }, {
            timeout: LONG_TIMEOUT,
            fn: () => {
              // make sure the watchdog timeout from refresh is cleared before moving on
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              sinon.assert.calledOnce(onRefreshSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
              done();
            }
          });
        });

        it('should call onAvailable from refresh immediately without time-out set', function (done) {
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

          sinon.assert.notCalled(ajaxStub);

          execSequence(clock, {
            timeout: 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(id5Status).onRefresh(onRefreshSpy);

              sinon.assert.notCalled(ajaxStub);
            }
          }, {
            timeout: 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onRefreshSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
              done();
            }
          });
        });
      });

      describe('Fetch Required on Refresh', function () {
        it('should call onRefresh from refresh after server response with time-out set', function (done) {
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.notCalled(ajaxStub);

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
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy);

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            }
          }, {
            timeout: 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.notCalled(onRefreshSpy);
              sinon.assert.calledOnce(onUpdateSpy);
            }
          }, {
            timeout: AJAX_RESPONSE_MS + 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onRefreshSpy);
              sinon.assert.calledTwice(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            }
          }, {
            timeout: LONG_TIMEOUT,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onRefreshSpy);
              sinon.assert.calledTwice(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
              done();
            }
          });
        });

        it('should call onRefresh from refresh after timeout set if server response takes too long', function (done) {
          // ID5.debug = true;
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy, SHORT_CALLBACK_TIMEOUT_MS);

          sinon.assert.notCalled(ajaxStub);

          execSequence(clock, {
            timeout: 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
            }
          }, {
            timeout: LONG_TIMEOUT,
            fn: () => {
              // make sure the watchdog timeout from init is cleared before moving on
              sinon.assert.calledOnce(onAvailableSpy);

              ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy, SHORT_CALLBACK_TIMEOUT_MS);

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            }
          }, {
            timeout: SHORT_CALLBACK_TIMEOUT_MS + 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onRefreshSpy);
              // Should callback with stored value a ajax response was not received
              expect(onAvailableSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(onAvailableSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
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

          sinon.assert.notCalled(ajaxStub);

          execSequence(clock, {
            timeout: 1,
            fn: () => {
              sinon.assert.calledOnce(onAvailableSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy);
              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
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
    });
  });

  describe('Callbacks with Multiple Instances', function () {
    let onAvailableSpyOne, onUpdateSpyOne, onRefreshSpyOne;
    let onAvailableSpyTwo, onUpdateSpyTwo, onRefreshSpyTwo;
    let ajaxStub;

    beforeEach(function () {
      onAvailableSpyOne = sinon.spy();
      onUpdateSpyOne = sinon.spy();
      onRefreshSpyOne = sinon.spy();
      onAvailableSpyTwo = sinon.spy();
      onUpdateSpyTwo = sinon.spy();
      onRefreshSpyTwo = sinon.spy();
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(stubDelayedResponse(JSON_RESPONSE_ID5_CONSENT));
    });

    afterEach(function() {
      onAvailableSpyOne.resetHistory();
      onUpdateSpyOne.resetHistory();
      onRefreshSpyOne.resetHistory();
      onAvailableSpyTwo.resetHistory();
      onUpdateSpyTwo.resetHistory();
      onRefreshSpyTwo.resetHistory();
      ajaxStub.restore();
    });

    describe('Check callback are fired with consent override', function () {
      it('should call back onAvailable then onUpdate for each instance separately with consent bypass', function (done) {
        const id5StatusOne = ID5.init(defaultInitBypassConsent());
        const id5StatusTwo = ID5.init(defaultInitBypassConsent(TEST_ID5_PARTNER_ID_ALT));
        id5StatusOne.onAvailable(onAvailableSpyOne).onUpdate(onUpdateSpyOne).onRefresh(onRefreshSpyOne);
        id5StatusTwo.onAvailable(onAvailableSpyTwo).onUpdate(onUpdateSpyTwo).onRefresh(onRefreshSpyTwo);

        expect(id5StatusOne.getUserId()).to.be.undefined;
        expect(id5StatusOne.getLinkType()).to.be.undefined;
        expect(id5StatusTwo.getUserId()).to.be.undefined;
        expect(id5StatusTwo.getLinkType()).to.be.undefined;

        execSequence(clock, {
          timeout: AJAX_RESPONSE_MS,
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
        const id5StatusOne = ID5.init(defaultInitBypassConsent());
        const id5StatusTwo = ID5.init(defaultInitBypassConsent(TEST_ID5_PARTNER_ID_ALT));
        id5StatusOne.onAvailable(onAvailableSpyOne).onUpdate(onUpdateSpyOne).onRefresh(onRefreshSpyOne);
        id5StatusTwo.onAvailable(onAvailableSpyTwo).onUpdate(onUpdateSpyTwo).onRefresh(onRefreshSpyTwo);

        expect(id5StatusOne.getUserId()).to.be.undefined;
        expect(id5StatusOne.getLinkType()).to.be.undefined;
        expect(id5StatusTwo.getUserId()).to.be.undefined;
        expect(id5StatusTwo.getLinkType()).to.be.undefined;

        execSequence(clock, {
          timeout: AJAX_RESPONSE_MS,
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
          }
        }, {
          timeout: AJAX_RESPONSE_MS + 2,
          fn: () => {
            sinon.assert.notCalled(onRefreshSpyOne);
            sinon.assert.calledOnce(onRefreshSpyTwo);
            done();
          }
        });
      });
    });
  });

  describe('Setting ID5.userId', function () {
    let ajaxStub;

    describe('Consent in Response', function() {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(stubDelayedResponse(JSON_RESPONSE_ID5_CONSENT));
      });
      afterEach(function () {
        ajaxStub.restore();
      })

      it('should never set userId with no stored value, no consent override, no-consent in privacy data', function (done) {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

        const id5Status = ID5.init(defaultInit());

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId immediately and not change, with stored value, no refresh, no consent override, consent in privacy data', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        const id5Status = ID5.init(defaultInit());

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId immediately and not change, with stored value, no refresh, consent override', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

        const id5Status = ID5.init(defaultInitBypassConsent());

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId after the response with no stored value, consent override', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId after the response with no stored value, consent in privacy data', function (done) {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        const id5Status = ID5.init(defaultInit());

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId immediately and update it after response received with stored value, consent override', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          refreshInSeconds: 10
        });

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId immediately and update it after response received with stored value, consent in privacy data', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          refreshInSeconds: 10
        });

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });
    });

    describe('No-Consent in Response', function() {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(stubDelayedResponse(JSON_RESPONSE_NO_ID5_CONSENT));
      });
      afterEach(function () {
        ajaxStub.restore();
      })

      it('should set userId after the response with no stored value, consent override', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_NO_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId after the response with no stored value, consent in privacy data', function (done) {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        const id5Status = ID5.init(defaultInit());

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId immediately and update it after response received with stored value, consent override', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          refreshInSeconds: 10 });

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_NO_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should set userId immediately and update it after response received with stored value, consent in privacy data', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        const id5Status = ID5.init({
          ...defaultInit(),
          refreshInSeconds: 10
        });

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });

      it('should clear stored values after receiving no-consent response', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 1);
        testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'pd');
        localStorage.setItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG, 'consent_data');
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        const id5Status = ID5.init({
          ...defaultInit(),
          pd: 'pd',
          refreshInSeconds: 10
        });

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
        expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(STORED_JSON);
        expect(localStorage.getItemWithExpiration(TEST_LAST_STORAGE_CONFIG)).to.not.be.null;
        expect(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG)).to.not.be.null;
        expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.not.be.null;
        expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.not.be.null;
        expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);

        setTimeout(() => {
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_LAST_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
          done();
        }, LONG_TIMEOUT);
        clock.tick(LONG_TIMEOUT);
      });
    });
  });
});
