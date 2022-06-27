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
  defaultInit
} from './test_utils';

describe('Async Responses', function () {
  const SHORT_CALLBACK_TIMEOUT_MS = 10;
  // arbitrary timeout to test the ID later in the call process after any ajax calls
  // or other async activities
  const LONG_TIMEOUT = 150;
  const testClientStore = new ClientStore(0,
    () => new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG, API_TYPE.NONE),
    localStorage);

  before(function () {
    resetAllInLocalStorage();
  });
  afterEach(function () {
    resetAllInLocalStorage();
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

    describe('Check callback are fired with consent override', function () {
      it('should call back onAvailable then onUpdate with consent bypass', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent())
        id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy).onRefresh(onRefreshSpy);

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        setTimeout(() => {
          sinon.assert.notCalled(onAvailableSpy);
          sinon.assert.notCalled(onRefreshSpy);
          sinon.assert.notCalled(onUpdateSpy);
          setTimeout(() => {
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
          }, 1);
        }, AJAX_RESPONSE_MS);
      });
    });

    describe('No Stored Value, No Consent Override', function () {
      describe('Empty Stored Privacy', function() {
        it('should call onAvailable then onUpdate on server response before time-out', function (done) {
          const id5Status = ID5.init(defaultInit());
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(onAvailableSpy);
            sinon.assert.notCalled(onUpdateSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              sinon.assert.callOrder(onAvailableSpy, onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
              expect(onAvailableSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(onAvailableSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
              expect(onUpdateSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(onUpdateSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

              // make sure callback are not fired by the watchdog
              setTimeout(() => {
                sinon.assert.calledOnce(onAvailableSpy);
                sinon.assert.calledOnce(onUpdateSpy);
                done();
              }, LONG_TIMEOUT);
            }, 1);
          }, AJAX_RESPONSE_MS);
        });

        it('should call onAvailable if no time-out', function (done) {
          const id5Status = ID5.init(defaultInit());
          id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(onAvailableSpy);
            sinon.assert.notCalled(onUpdateSpy);
            setTimeout(() => {
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
            }, 1);
          }, AJAX_RESPONSE_MS);
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

          setTimeout(() => {
            sinon.assert.notCalled(onAvailableSpy);
            sinon.assert.notCalled(onUpdateSpy);
            setTimeout(() => {
              sinon.assert.notCalled(ajaxStub);
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.notCalled(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.undefined;
              expect(id5Status.getLinkType()).to.be.undefined;

              // make sure not further calls are made
              setTimeout(() => {
                sinon.assert.calledOnce(onAvailableSpy);
                sinon.assert.notCalled(onUpdateSpy);
                done();
              }, LONG_TIMEOUT);
            }, (CALLBACK_TIMEOUT_MS - AJAX_RESPONSE_MS + 5));
          }, (AJAX_RESPONSE_MS + 5));
        });

        it('should not call onAvailable without time-out set', function (done) {
          const id5Status = ID5.init(defaultInit());
          id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(onAvailableSpy);
            sinon.assert.notCalled(onUpdateSpy);
            setTimeout(() => {
              sinon.assert.notCalled(ajaxStub);
              sinon.assert.notCalled(onAvailableSpy);
              sinon.assert.notCalled(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.undefined;
              expect(id5Status.getLinkType()).to.be.undefined;
              done();
            }, LONG_TIMEOUT);
          }, AJAX_RESPONSE_MS);
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
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);

          // make sure the watchdog timeout is cleared before moving on
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            done();
          }, LONG_TIMEOUT);
        }, 0);
      });

      it('should call onAvailable immediately without time-out set', function (done) {
        const id5Status = ID5.init(defaultInit());
        id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

        sinon.assert.notCalled(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          done();
        }, 0);
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
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);

          // make sure the watchdog timeout is cleared before moving on
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            done();
          }, LONG_TIMEOUT);
        }, 0);
      });

      it('should call onAvailable and onUpdate immediately without time-out set', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());
        id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

        sinon.assert.notCalled(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          done();
        }, 0);
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

        setTimeout(() => {
          sinon.assert.notCalled(onAvailableSpy);
          sinon.assert.notCalled(onUpdateSpy);
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            sinon.assert.callOrder(onAvailableSpy, onUpdateSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(onAvailableSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(onAvailableSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(onUpdateSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(onUpdateSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

            // make sure the watchdog timeout is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              done();
            }, LONG_TIMEOUT);
          }, 0);
        }, AJAX_RESPONSE_MS);
      });

      it('should call onAvailable after timeout set if server response takes too long', function (done) {
        const id5Status = ID5.init(defaultInitBypassConsent());
        id5Status.onAvailable(onAvailableSpy, SHORT_CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;

        setTimeout(() => {
          // Ajax not answered, watchdog not triggered
          sinon.assert.notCalled(onAvailableSpy);
          setTimeout(() => {
            // Ajax not answered, watchdog triggered
            sinon.assert.calledOnce(onAvailableSpy);
            expect(id5Status.getUserId()).to.be.undefined;
            expect(id5Status.getLinkType()).to.be.undefined;
            sinon.assert.notCalled(onUpdateSpy);

            setTimeout(() => {
              // Ajax answered, but watchdog already triggered
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              done();
            }, LONG_TIMEOUT);
          }, 4);
        }, SHORT_CALLBACK_TIMEOUT_MS - 2);
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

        // onAvailable & onUpdate must be called for cached response
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);

          // onUpdate must be called for ajax response
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledTwice(onUpdateSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

            // no one should be called on watch dog
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledTwice(onUpdateSpy);
              done();
            }, LONG_TIMEOUT);
          }, (AJAX_RESPONSE_MS + 5));
        }, 0);
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
        setTimeout(() => {
          sinon.assert.calledOnce(onAvailableSpy);
          sinon.assert.calledOnce(onUpdateSpy);
          sinon.assert.notCalled(onRefreshSpy);

          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledTwice(onUpdateSpy);
            sinon.assert.notCalled(onRefreshSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          }, (AJAX_RESPONSE_MS + 5));
        }, 0);
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
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);

            // make sure the watchdog timeout from init is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(id5Status).onRefresh(onRefreshSpy, CALLBACK_TIMEOUT_MS);

              sinon.assert.notCalled(ajaxStub);
              setTimeout(() => {
                sinon.assert.calledOnce(onAvailableSpy);
                sinon.assert.calledOnce(onUpdateSpy); // User id did not change on update
                sinon.assert.calledOnce(onRefreshSpy);
                expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
                expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

                // make sure the watchdog timeout from refresh is cleared before moving on
                setTimeout(() => {
                  sinon.assert.calledOnce(onAvailableSpy);
                  sinon.assert.calledOnce(onUpdateSpy);
                  sinon.assert.calledOnce(onRefreshSpy);
                  expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
                  expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
                  done();
                }, LONG_TIMEOUT);
              }, 0);
            }, LONG_TIMEOUT);
          }, 0);
        });

        it('should call onAvailable from refresh immediately without time-out set', function (done) {
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

            ID5.refreshId(id5Status).onRefresh(onRefreshSpy);

            sinon.assert.notCalled(ajaxStub);
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onRefreshSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
              done();
            }, 0);
          }, 0);
        });
      });

      describe('Fetch Required on Refresh', function () {
        it('should call onRefresh from refresh after server response with time-out set', function (done) {
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            sinon.assert.calledOnce(onUpdateSpy);

            // make sure the watchdog timeout from init is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onUpdateSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy);

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
              setTimeout(() => {
                sinon.assert.calledOnce(onAvailableSpy);
                sinon.assert.notCalled(onRefreshSpy);
                sinon.assert.calledOnce(onUpdateSpy);

                setTimeout(() => {
                  sinon.assert.calledOnce(onAvailableSpy);
                  sinon.assert.calledOnce(onRefreshSpy);
                  sinon.assert.calledTwice(onUpdateSpy);
                  expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
                  expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

                  // make sure the watchdog timeout from refresh is cleared before moving on
                  setTimeout(() => {
                    sinon.assert.calledOnce(onAvailableSpy);
                    sinon.assert.calledOnce(onRefreshSpy);
                    sinon.assert.calledTwice(onUpdateSpy);
                    expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
                    expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
                    done();
                  }, LONG_TIMEOUT);
                }, (AJAX_RESPONSE_MS + 5));
              }, 0);
            }, LONG_TIMEOUT);
          }, 1);
        });

        it('should call onRefresh from refresh after timeout set if server response takes too long', function (done) {
          // ID5.debug = true;
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy, SHORT_CALLBACK_TIMEOUT_MS);

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

            // make sure the watchdog timeout from init is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);

              ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy, SHORT_CALLBACK_TIMEOUT_MS);

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
              setTimeout(() => {
                sinon.assert.calledOnce(onAvailableSpy);
                sinon.assert.calledOnce(onRefreshSpy);
                // Should callback with stored value a ajax response was not received
                expect(onAvailableSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_STORED_ID5ID);
                expect(onAvailableSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

                // make sure the watchdog timeout from refresh is cleared before moving on
                setTimeout(() => {
                  sinon.assert.calledOnce(onAvailableSpy);
                  sinon.assert.calledOnce(onRefreshSpy);
                  done();
                }, LONG_TIMEOUT);
              }, (SHORT_CALLBACK_TIMEOUT_MS + 5));
            }, LONG_TIMEOUT);
          }, 0);
        });

        it('should call onRefresh from refreshId after server response without time-out set', function (done) {
          const id5Status = ID5.init(defaultInitBypassConsent());
          id5Status.onAvailable(onAvailableSpy);

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpy);
            expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

            ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy);
            sinon.assert.calledTwice(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
            expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            setTimeout(() => {
              utils.logInfo('here');
              sinon.assert.calledOnce(onAvailableSpy);
              sinon.assert.calledOnce(onRefreshSpy);
              expect(onRefreshSpy.getCall(0).args[0].getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(onRefreshSpy.getCall(0).args[0].getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
              done();
            }, LONG_TIMEOUT);
          }, 1);
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

        setTimeout(() => {
          sinon.assert.notCalled(onAvailableSpyOne);
          sinon.assert.notCalled(onRefreshSpyOne);
          sinon.assert.notCalled(onUpdateSpyOne);
          sinon.assert.notCalled(onAvailableSpyTwo);
          sinon.assert.notCalled(onRefreshSpyTwo);
          sinon.assert.notCalled(onUpdateSpyTwo);

          setTimeout(() => {
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
          }, 1);
        }, AJAX_RESPONSE_MS);
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

        setTimeout(() => {
          sinon.assert.notCalled(onAvailableSpyOne);
          sinon.assert.notCalled(onRefreshSpyOne);
          sinon.assert.notCalled(onUpdateSpyOne);
          sinon.assert.notCalled(onAvailableSpyTwo);
          sinon.assert.notCalled(onRefreshSpyTwo);
          sinon.assert.notCalled(onUpdateSpyTwo);

          setTimeout(() => {
            sinon.assert.calledOnce(onAvailableSpyOne);
            sinon.assert.notCalled(onRefreshSpyOne);
            sinon.assert.calledOnce(onUpdateSpyOne);
            sinon.assert.callOrder(onAvailableSpyOne, onUpdateSpyOne);

            sinon.assert.calledOnce(onAvailableSpyTwo);
            sinon.assert.notCalled(onRefreshSpyTwo);
            sinon.assert.calledOnce(onUpdateSpyTwo);
            sinon.assert.callOrder(onAvailableSpyTwo, onUpdateSpyTwo);

            ID5.refreshId(id5StatusTwo, true);

            setTimeout(() => {
              setTimeout(() => {
                sinon.assert.notCalled(onRefreshSpyOne);
                sinon.assert.calledOnce(onRefreshSpyTwo);

                done();
              }, 1);
            }, AJAX_RESPONSE_MS);
          }, 1);
        }, AJAX_RESPONSE_MS);
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
      });
    });
  });
});
