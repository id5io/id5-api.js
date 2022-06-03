import sinon from 'sinon';
import CONSTANTS from '../../lib/constants.json';
import * as utils from '../../lib/utils';
import ClientStore from '../../lib/clientStore';
import { version } from '../../generated/version.js';
import ID5 from '../../lib/id5-api';
import { API_TYPE, ConsentData, GRANT_TYPE, LocalStorageGrant } from '../../lib/consentManagement';
import {
  TEST_ID5_PARTNER_ID,
  ID5_FETCH_ENDPOINT,
  ID5_LB_ENDPOINT,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_ID5ID_STORAGE_CONFIG_EXPIRED,
  TEST_LAST_STORAGE_CONFIG,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_PD_STORAGE_CONFIG,
  TEST_NB_STORAGE_CONFIG,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_DISALLOWED,
  TEST_STORED_ID5ID,
  TEST_STORED_LINK_TYPE,
  STORED_JSON_LEGACY,
  STORED_JSON,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_ID5ID_NO_CONSENT,
  TEST_RESPONSE_LINK_TYPE,
  TEST_RESPONSE_LINK_TYPE_NO_CONSENT,
  TEST_RESPONSE_EID,
  JSON_RESPONSE_ID5_CONSENT,
  JSON_RESPONSE_NO_ID5_CONSENT,
  localStorage,
  resetAllInLocalStorage,
  defaultInitBypassConsent,
  defaultInit
} from './test_utils';

let expect = require('chai').expect;

describe('ID5 JS API', function () {

  const testClientStore = new ClientStore(0,
    () => new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG, API_TYPE.NONE),
    localStorage);

  beforeEach(function () {
    ID5.debug = false;
  });

  describe('Core API Availability', function () {
    it('should have a global variable ID5', function () {
      expect(ID5).to.be.a('object');
    });
    it('should have function ID5.init', function () {
      expect(ID5.init).to.be.a('function');
    });
    it('should have function ID5.refreshId', function () {
      expect(ID5.refreshId).to.be.a('function');
    });
    it('should be loaded', function () {
      expect(ID5.loaded).to.be.a('boolean');
      expect(ID5.loaded).to.be.true;
    });
    it('should be initialized', function () {
      const id5Status = ID5.init({partnerId: TEST_ID5_PARTNER_ID});
      expect(id5Status).to.exist;
    });
  });

  describe('Configuration and Parameters', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });
    afterEach(function () {
      ajaxStub.restore();
    });

    describe('Required Parameters', function () {
      it('should fail if partnerId not set in config', function () {
        // Note fatal configuration error: missing partnerId
        let id5Status = ID5.init({debugBypassConsent: true});
        expect(id5Status).to.be.undefined;
      });
    });
  });

  describe('Standard Storage and Responses', function () {
    before(function () {
      resetAllInLocalStorage();
    });
    afterEach(function () {
      resetAllInLocalStorage();
    });

    describe('Legacy Response from Server without Privacy Data', function () {
      let ajaxStub;
      let response = JSON.parse(JSON_RESPONSE_ID5_CONSENT);
      response.privacy = undefined;
      response = JSON.stringify(response);

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(response);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should call server and handle response without privacy data', function () {
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          allowLocalStorageWithoutConsentApi: true
        });

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(id5Status.isFromCache()).to.be.false;
        expect(id5Status.getUserIdAsEid()).to.be.eql(TEST_RESPONSE_EID);
        expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(response));
        expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.null;
      });
    });

    describe('Consent on Request and Response', function () {
      let ajaxStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      describe('No Stored Value', function () {
        it('should request new value with default parameters with consent override', function () {
          const id5Status = ID5.init(defaultInitBypassConsent());

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.secondCall.args[3].withCredentials).to.be.true;

          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.partner).to.be.equal(TEST_ID5_PARTNER_ID);
          expect(requestData.s).to.be.undefined;
          expect(requestData.o).to.be.equal('api');
          expect(requestData.v).to.be.equal(version);
          expect(requestData.pd).to.be.undefined;
          expect(requestData.rf).to.include('http://localhost');
          expect(requestData.top).to.be.equal(1);
          expect(requestData.gdpr).to.exist;
          expect(requestData.gdpr_consent).to.be.undefined;
          expect(requestData.features).to.be.undefined;
          expect(requestData.provider).to.be.undefined;
          expect(requestData.puid).to.be.undefined;
          expect(requestData.ua).to.be.a('string');

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.false;
          expect(id5Status.getUserIdAsEid()).to.be.eql(TEST_RESPONSE_EID);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash(''));
        });

        it('should drop some erratic segments and inform server-side about the dropping', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            segments: [
              { destination: '22', ids: ['abc']}, // valid
              { destination: '22', ids: []} // invalid
            ]
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.segments).to.deep.equal([
            { destination: '22', ids: ['abc'] }]);
          expect(requestData._invalid_segments).to.equal(1);
        });

        it('does not drop local storage items when options.applyCreativeRestrictions', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            applyCreativeRestrictions: true});

          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
        });

        it('should request new value with pd and provider in request when pd and provider config is set with consent override', function () {
          ID5.init({
            ...defaultInitBypassConsent(),
            pd: 'pubdata', provider: 'test-provider', partnerUserId: 'abc' });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.pd).to.be.equal('pubdata');
          expect(requestData.provider).to.be.equal('test-provider');
          expect(requestData.puid).to.be.equal('abc');
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash('pubdata'));
        });

        it('should not set ab features flag when abTesting is disabled', function () {
          ID5.init({
            ...defaultInitBypassConsent(),
            abTesting: { enabled: false } });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.features).to.be.undefined;
        });
      });

      describe('Legacy Stored Value with No Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON_LEGACY);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        });

        it('should use stored value with consent override', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 1000
          });

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.true;
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(STORED_JSON_LEGACY); // without a refresh, the storage doesn't change
        });
      });

      describe('Stored Value with No Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        });

        it('should use stored value with consent override', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 1000
          });

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.true;
        });

        it('should use stored value with consent from privacy storage', function () {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.true;
        });
      });

      describe('Legacy Stored Value with Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON_LEGACY);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        });

        it('should request new value with consent override', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
        });
      });

      describe('Stored Value with Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        });

        it('should request new value with consent override', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with consent from privacy storage', function () {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Stored Value with Missing Last Stored Value', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        });

        it('should request new value with consent override', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with consent from privacy storage', function () {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Expired Stored Value with Refresh Not Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        });

        it('should request new value with consent override', function () {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value and not use stored value with consent from privacy storage', function () {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Stored Data Change Forces Refresh with Refresh Not Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
        });

        describe('Stored Consent Changes', function () {
          before(function () {
            localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });
          afterEach(function () {
            localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });

          describe('TCF v1', function () {
            const testConsentDataFromCmp = {
              getConsentData: {
                gdprApplies: true,
                consentData: 'cmpconsentstring',
                apiVersion: 1
              },
              getVendorConsents: {
                metadata: 'some meta',
                gdprApplies: true,
                purposeConsents: {
                  '1': true, // Cookies/local storage access
                }
              }
            };

            beforeEach(function () {
              window.__cmp = (command, param, callback) => {
                callback(testConsentDataFromCmp[command], true);
              };
            });

            afterEach(function () {
              delete window.__cmp;
            });

            it('should call id5 servers if empty stored consent data', function () {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V1;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should not call id5 servers if stored consent data matches current consent', function () {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V1;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.notCalled(ajaxStub);
            });
          });

          describe('TCF v2', function () {
            let testConsentDataFromCmp = {
              getTCData: {
                gdprApplies: true,
                tcString: 'cmpconsentstring',
                eventStatus: 'tcloaded',
                apiVersion: 2,
                purpose: {
                  consents: {
                    '1': true
                  }
                }
              }
            };

            let cmpStub;

            beforeEach(function () {
              window.__tcfapi = function () {};
              cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
                args[2](testConsentDataFromCmp.getTCData, true);
              });
            });

            afterEach(function () {
              cmpStub.restore();
              delete window.__tcfapi;
            });

            it('should call id5 servers if empty stored consent data', function () {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V2;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should not call id5 servers if stored consent data matches current consent', function () {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V2;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.notCalled(ajaxStub);
            });
          });
        });

        describe('Stored PD Changes', function () {
          before(function () {
            testClientStore.clearHashedPd(TEST_ID5_PARTNER_ID);
          });
          afterEach(function () {
            testClientStore.clearHashedPd(TEST_ID5_PARTNER_ID);
          });

          describe('With Consent Override', function() {
            it('should not call id5 servers if no stored pd data with consent override', function () {
              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              });

              sinon.assert.notCalled(ajaxStub);
            });

            it('should call id5 servers if empty stored pd data with consent override', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, '');

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers if stored pd data does not match current pd with consent override', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should not call id5 servers if stored pd data matches current pd with consent override', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'storedpd'
              });

              sinon.assert.notCalled(ajaxStub);
            });
          });

          describe('With Consent From Privacy Storage', function() {
            it('should call id5 servers if empty stored pd data with consent from privacy storage', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers if stored pd data does not match current pd with consent from privacy storage', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should not call id5 servers if stored pd data matches current pd with consent from privacy storage', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000,
                pd: 'storedpd'
              });

              sinon.assert.notCalled(ajaxStub);
            });
          });
        });
      });

      describe('Handle Legacy Cookies with Consent Override', function () {
        const expStrFuture = (new Date(Date.now() + 5000).toUTCString());
        const expStrExpired = (new Date(Date.now() - 5000).toUTCString());

        it('should call id5 servers without existing legacy value in 1puid params via Ajax', function () {
          utils.setCookie('id5id.1st', JSON.stringify({'ID5ID': 'legacyid5id'}), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.s).to.be.undefined;
          expect(requestData['1puid']).to.be.undefined;

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5.1st storage if local storage is empty', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature');

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty', function () {
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature');

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty and both legacy cookies exist', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5.1st', 'signature': 'legacycookiessignature-id5.1st'}), expStrFuture);
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5id.1st', 'signature': 'legacycookiesignature-id5id.1st'}), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature-id5id.1st');

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          utils.setCookie('id5.1st', '', expStrExpired);
          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('removes legacy cookies', function () {
          CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function(cookie) {
            utils.setCookie(`${cookie}`, JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);
            utils.setCookie(`${cookie}_nb`, 1, expStrFuture);
            utils.setCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`, 2, expStrFuture);
            utils.setCookie(`${cookie}_last`, Date.now() - (8000 * 1000), expStrFuture);
            utils.setCookie(`${cookie}.cached_pd`, 'abc', expStrFuture);
            utils.setCookie(`${cookie}.cached_consent_data`, 'xyz', expStrFuture);
          });

          ID5.init(defaultInitBypassConsent());

          CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function(cookie) {
            expect(utils.getCookie(`${cookie}`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}_nb`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}_last`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}.cached_pd`)).to.be.equal(null);
            expect(utils.getCookie(`${cookie}.cached_consent_data`)).to.be.equal(null);
          });

          // just for safety's sake, forcibly remove the cookies that should already be gone
          CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function(cookie) {
            utils.setCookie(`${cookie}`, '', expStrExpired);
            utils.setCookie(`${cookie}_nb`, '', expStrExpired);
            utils.setCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`, '', expStrExpired);
            utils.setCookie(`${cookie}_last`, '', expStrExpired);
            utils.setCookie(`${cookie}.cached_pd`, '', expStrExpired);
            utils.setCookie(`${cookie}.cached_consent_data`, '', expStrExpired);
          });
        });
      });
    });

    describe('No CMP nor Stored Privacy nor Consent Override on Request, Consent on Response', function () {
      let ajaxStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      describe('No Stored Value', function () {
        it('should request new value with default parameters', function () {
          const id5Status = ID5.init(defaultInit());

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.secondCall.args[3].withCredentials).to.be.true;

          const requestData = JSON.parse(ajaxStub.secondCall.args[2]);
          expect(requestData.partner).to.be.equal(TEST_ID5_PARTNER_ID);
          expect(requestData.s).to.be.undefined;
          expect(requestData.o).to.be.equal('api');
          expect(requestData.v).to.be.equal(version);
          expect(requestData.pd).to.be.undefined;
          expect(requestData.rf).to.include('http://localhost');
          expect(requestData.top).to.be.equal(1);
          expect(requestData.gdpr).to.exist;
          expect(requestData.gdpr_consent).to.be.undefined;
          expect(requestData.ua).to.be.a('string');

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.false;
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
        });

        it('should not store consent data nor pd on first request, but should after refresh', function () {
          const id5Status = ID5.init({
            ...defaultInit(),
            pd: 'pubdata'
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

          ID5.refreshId(id5Status);

          sinon.assert.calledTwice(ajaxStub);
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash('pubdata'));
          expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.not.be.null;
        });
      });

      describe('Stored Value', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        });

        it('should request new value with no refresh needed', function () {
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.false;
        });

        it('should request new value with refresh needed', function () {
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 10
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with missing last stored value', function () {
          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with expired stored value with no refresh needed', function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          sinon.assert.calledTwice(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
          expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Stored Data Change Forces Refresh with Refresh Not Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        });

        describe('Stored Consent Changes', function () {
          before(function () {
            localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });
          afterEach(function () {
            localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });

          describe('TCF v1', function () {
            const testConsentDataFromCmp = {
              getConsentData: {
                gdprApplies: true,
                consentData: 'cmpconsentstring',
                apiVersion: 1
              },
              getVendorConsents: {
                metadata: 'some meta',
                gdprApplies: true,
                purposeConsents: {
                  '1': true, // Cookies/local storage access
                }
              }
            };

            beforeEach(function () {
              window.__cmp = (command, param, callback) => {
                callback(testConsentDataFromCmp[command], true);
              };
            });

            afterEach(function () {
              delete window.__cmp;
            });

            it('should call id5 servers if empty stored consent data', function () {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V1;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers even if stored consent data matches current consent', function () {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V1;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });
          });

          describe('TCF v2', function () {
            let testConsentDataFromCmp = {
              getTCData: {
                gdprApplies: true,
                tcString: 'cmpconsentstring',
                eventStatus: 'tcloaded',
                apiVersion: 2,
                purpose: {
                  consents: {
                    '1': true
                  }
                }
              }
            };
            let cmpStub;

            beforeEach(function () {
              window.__tcfapi = function () {};
              cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
                args[2](testConsentDataFromCmp.getTCData, true);
              });
            });

            afterEach(function () {
              cmpStub.restore();
              delete window.__tcfapi;
            });

            it('should call id5 servers if empty stored consent data', function () {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V2;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });

            it('should call id5 servers even if stored consent data matches current consent', function () {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V2;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.calledTwice(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
              expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            });
          });
        });

        describe('Stored PD Changes', function () {
          before(function () {
            localStorage.removeItemWithExpiration(TEST_PD_STORAGE_CONFIG);
          });
          afterEach(function () {
            localStorage.removeItemWithExpiration(TEST_PD_STORAGE_CONFIG);
          });

          it('should call id5 servers if empty stored pd data', function () {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID);

            ID5.init({
              ...defaultInit(),
              refreshInSeconds: 1000, pd: 'requestpd' });

            sinon.assert.calledTwice(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
            expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          });

          it('should call id5 servers if stored pd data does not match current pd', function () {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({
              ...defaultInit(),
              refreshInSeconds: 1000, pd: 'requestpd' });

            sinon.assert.calledTwice(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
            expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          });

          it('should call id5 servers even if stored pd data matches current pd', function () {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({
              ...defaultInit(),
              refreshInSeconds: 1000, pd: 'storedpd' });

            sinon.assert.calledTwice(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
            expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          });
        });
      });
    });

    describe('No Consent on Response', function () {
      let ajaxStub;

      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_NO_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should request new value but not store response', function () {
        const id5Status = ID5.init(defaultInit());

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
        expect(id5Status.isFromCache()).to.be.false;
        expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
      });

      it('should not store consent data nor pd on first request, nor after refresh', function () {
        const id5Status = ID5.init({
          ...defaultInit(),
          pd: 'pubdata' });

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

        ID5.refreshId(id5Status);

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
      });

      it('should clear previous stored data after no-consent response', function() {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, 'last');
        localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 'nb');
        localStorage.setItemWithExpiration(TEST_PD_STORAGE_CONFIG, 'pd');
        localStorage.setItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG, 'consent_data');

        const id5Status = ID5.init(defaultInit());

        sinon.assert.calledTwice(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_LB_ENDPOINT);
        expect(ajaxStub.secondCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
        expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_LAST_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
      });
    });

    describe('No Consent in Stored Privacy Data', function() {
      let ajaxStub;

      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_NO_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should not request new id with previous no-consent privacy data', function() {
        const id5Status = ID5.init(defaultInit());

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;
        expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
      });

      it('should not use stored response for ID with previous no-consent privacy data', function() {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

        const id5Status = ID5.init(defaultInit());

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;
      });
    });
  });
});
