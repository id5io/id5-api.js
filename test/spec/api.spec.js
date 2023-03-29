import sinon from 'sinon';
import CONSTANTS from '../../lib/constants.json';
import * as utils from '../../lib/utils';
import ClientStore from '../../lib/clientStore';
import {version} from '../../generated/version.js';
import ID5 from '../../lib/id5-api';
import {API_TYPE, ConsentData, GRANT_TYPE, LocalStorageGrant} from '../../lib/consentManagement';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent, defaultInitBypassConsentWithPd,
  getLocalStorageItemExpirationDays,
  ID5_FETCH_ENDPOINT,
  JSON_RESPONSE_ID5_CONSENT,
  JSON_RESPONSE_NO_ID5_CONSENT,
  localStorage,
  resetAllInLocalStorage,
  STORED_JSON,
  STORED_JSON_LEGACY,
  stubTcfApi,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_ID5_PARTNER_ID,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_ID5ID_STORAGE_CONFIG_EXPIRED,
  TEST_LAST_STORAGE_CONFIG,
  TEST_NB_STORAGE_CONFIG,
  TEST_PD_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_DISALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_EID,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_ID5ID_NO_CONSENT,
  TEST_RESPONSE_LINK_TYPE,
  TEST_RESPONSE_LINK_TYPE_NO_CONSENT,
  TEST_SEGMENT_STORAGE_CONFIG,
  TEST_STORED_ID5ID,
  TEST_STORED_LINK_TYPE
} from './test_utils';
import {StorageConfig} from "../../lib/config.js";
import EXTENSIONS from "../../lib/extensions.js";

let expect = require('chai').expect;

const TCF_V2_STRING_WITH_STORAGE_CONSENT = 'CPh8b0RPh8b0RPXAAAENCZCAANoAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A';
const TCF_V2_STRING_WITHOUT_STORAGE_CONSENT = 'CPh8cxGPh8cxGFpAAAENCZCAAAgAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A';

function stubExtensions() {
  return sinon.stub(EXTENSIONS, 'gather').resolves(DEFAULT_EXTENSIONS);
}

function resetExtensionsStub(extensionsStub) {
  extensionsStub.restore()
  return stubExtensions()
}

describe('ID5 JS API', function () {

  const testClientStore = new ClientStore(0,
    () => new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG, API_TYPE.NONE),
    localStorage,
    new StorageConfig());

  let extensionsStub;

  beforeEach(function () {
    ID5.debug = false;
    extensionsStub = stubExtensions();
  });

  afterEach(function () {
    extensionsStub.restore();
  })

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
        it('should request new value with default parameters with consent override', function (done) {
          const id5Status = ID5.init(defaultInitBypassConsent());

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.partner).to.be.equal(TEST_ID5_PARTNER_ID);
            expect(requestData.s).to.be.undefined;
            expect(requestData.o).to.be.equal('api');
            expect(requestData.v).to.be.equal(version);
            expect(requestData.pd).to.be.undefined;
            expect(requestData.tml).to.include('http://localhost');
            expect(requestData.top).to.be.equal(1);
            expect(requestData.gdpr).to.exist;
            expect(requestData.gdpr_consent).to.be.undefined;
            expect(requestData.features).to.be.undefined;
            expect(requestData.provider).to.be.undefined;
            expect(requestData.puid).to.be.undefined;
            expect(requestData.ua).to.be.a('string');
            expect(requestData.extensions).to.be.deep.equal(DEFAULT_EXTENSIONS);

            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.false;
            expect(id5Status.getUserIdAsEid()).to.be.eql(TEST_RESPONSE_EID);
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
            expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
            done();
          });
        });

        it('should have specified values from config object on the request', function (done) {
          const id5Status = ID5.init({...defaultInitBypassConsent(), att: 1});

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.att).to.be.equal(1);

            done();
          });
        });

        it('should drop some erratic segments and inform server-side about the dropping', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            segments: [
              {destination: '22', ids: ['abc']}, // valid
              {destination: '22', ids: []} // invalid
            ]
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.segments).to.deep.equal([
              {destination: '22', ids: ['abc']}]);
            expect(requestData._invalid_segments).to.equal(1);
            done();
          });
        });

        it('does not drop local storage items when options.applyCreativeRestrictions', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            applyCreativeRestrictions: true
          });

          id5Status.onAvailable(function () {
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
            expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.null;
            expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
            done();
          });
        });

        it('should request new value with pd and provider in request when pd and provider config is set with consent override', function (done) {
          ID5.init({
            ...defaultInitBypassConsent(),
            pd: 'pubdata', provider: 'test-provider', partnerUserId: 'abc'
          }).onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.pd).to.be.equal('pubdata');
            expect(requestData.provider).to.be.equal('test-provider');
            expect(requestData.puid).to.be.equal('abc');
            expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash('pubdata'));
            done();
          });
        });

        it('should not set ab features flag when abTesting is disabled', function (done) {
          ID5.init({
            ...defaultInitBypassConsent(),
            abTesting: {enabled: false}
          }).onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.features).to.be.undefined;
            done()
          });
        });
      });

      describe('Local Storage configuration', function () {

        it('should use configured storage expiration time', function (done) {
          const customStorageExpirationDays = 10;
          ID5.init({
            ...defaultInitBypassConsentWithPd(),
            storageExpirationDays: customStorageExpirationDays
          }).onAvailable(function () {
            expect(getLocalStorageItemExpirationDays(TEST_ID5ID_STORAGE_CONFIG.name)).to.be.eq(customStorageExpirationDays);
            expect(getLocalStorageItemExpirationDays(TEST_LAST_STORAGE_CONFIG.name)).to.be.eq(customStorageExpirationDays);
            expect(getLocalStorageItemExpirationDays(TEST_PRIVACY_STORAGE_CONFIG.name)).to.be.eq(customStorageExpirationDays);
            expect(getLocalStorageItemExpirationDays(TEST_SEGMENT_STORAGE_CONFIG.name)).to.be.eq(customStorageExpirationDays);
            expect(getLocalStorageItemExpirationDays(TEST_PD_STORAGE_CONFIG.name)).to.be.eq(customStorageExpirationDays);
            expect(getLocalStorageItemExpirationDays(TEST_NB_STORAGE_CONFIG.name)).to.be.eq(customStorageExpirationDays);
            done();
          });
        });

        it('should use default storage expiration time', function (done) {
          ID5.init(defaultInitBypassConsentWithPd())
            .onAvailable(function () {
              expect(getLocalStorageItemExpirationDays(TEST_ID5ID_STORAGE_CONFIG.name)).to.be.eq(TEST_ID5ID_STORAGE_CONFIG.expiresDays);
              expect(getLocalStorageItemExpirationDays(TEST_LAST_STORAGE_CONFIG.name)).to.be.eq(TEST_LAST_STORAGE_CONFIG.expiresDays);
              expect(getLocalStorageItemExpirationDays(TEST_PRIVACY_STORAGE_CONFIG.name)).to.be.eq(TEST_PRIVACY_STORAGE_CONFIG.expiresDays);
              expect(getLocalStorageItemExpirationDays(TEST_SEGMENT_STORAGE_CONFIG.name)).to.be.eq(TEST_SEGMENT_STORAGE_CONFIG.expiresDays);
              expect(getLocalStorageItemExpirationDays(TEST_PD_STORAGE_CONFIG.name)).to.be.eq(TEST_PD_STORAGE_CONFIG.expiresDays);
              expect(getLocalStorageItemExpirationDays(TEST_NB_STORAGE_CONFIG.name)).to.be.eq(TEST_NB_STORAGE_CONFIG.expiresDays);
              done();
            });
        });

        it('should use minimum storage expiration time', function (done) {
          const customStorageExpirationDays = 0;
          ID5.init({
            ...defaultInitBypassConsentWithPd(),
            storageExpirationDays: customStorageExpirationDays
          }).onAvailable(function () {
            expect(getLocalStorageItemExpirationDays(TEST_ID5ID_STORAGE_CONFIG.name)).to.be.eq(1);
            expect(getLocalStorageItemExpirationDays(TEST_LAST_STORAGE_CONFIG.name)).to.be.eq(1);
            expect(getLocalStorageItemExpirationDays(TEST_PRIVACY_STORAGE_CONFIG.name)).to.be.eq(1);
            expect(getLocalStorageItemExpirationDays(TEST_SEGMENT_STORAGE_CONFIG.name)).to.be.eq(1);
            expect(getLocalStorageItemExpirationDays(TEST_PD_STORAGE_CONFIG.name)).to.be.eq(1);
            expect(getLocalStorageItemExpirationDays(TEST_NB_STORAGE_CONFIG.name)).to.be.eq(1);
            done();
          });
        });
      });

      describe('Legacy Stored Value with No Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON_LEGACY);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        });

        it('should use stored value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.notCalled(extensionsStub);
            sinon.assert.notCalled(ajaxStub);
            expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.true;
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(STORED_JSON_LEGACY); // without a refresh, the storage doesn't change
            done();
          });
        });
      });

      describe('Stored Value with No Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        });

        it('should use stored value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.notCalled(extensionsStub);
            sinon.assert.notCalled(ajaxStub);
            expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.true;
            done();
          });
        });

        it('should use stored value with consent from privacy storage', function (done) {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.notCalled(extensionsStub);
            sinon.assert.notCalled(ajaxStub);
            expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.true;
            done();
          });
        });
      });

      describe('Legacy Stored Value with Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON_LEGACY);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        });

        it('should request new value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
            done();
          });
        });
      });

      describe('Stored Value with Refresh Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());
        });

        it('should request new value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });

        it('should request new value with consent from privacy storage', function (done) {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });
      });

      describe('Stored Value with Missing Last Stored Value', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        });

        it('should request new value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });

        it('should request new value with consent from privacy storage', function (done) {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });
      });

      describe('Expired Stored Value with Refresh Not Needed', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());
        });

        it('should request new value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });

        it('should request new value and not use stored value with consent from privacy storage', function (done) {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
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

            it('should call id5 servers if empty stored consent data', function (done) {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should call id5 servers if stored consent data does not match current consent', function (done) {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V1;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should not call id5 servers if stored consent data matches current consent', function (done) {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V1;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {
                sinon.assert.notCalled(extensionsStub);
                sinon.assert.notCalled(ajaxStub);
                done();
              });
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
              window.__tcfapi = function () {
              };
              cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
                args[2](testConsentDataFromCmp.getTCData, true);
              });
            });

            afterEach(function () {
              cmpStub.restore();
              delete window.__tcfapi;
            });

            it('should call id5 servers if empty stored consent data', function (done) {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should call id5 servers if stored consent data does not match current consent', function (done) {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V2;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should not call id5 servers if stored consent data matches current consent', function (done) {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V2;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {
                sinon.assert.notCalled(extensionsStub);
                sinon.assert.notCalled(ajaxStub);
                done();
              });
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

          describe('With Consent Override', function () {
            it('should call id5 servers if no stored pd data with consent override', function (done) {
              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('requestpd'))
                done();
              });
            });

            it('should call id5 servers if empty stored pd data with consent override', function (done) {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, '');

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('requestpd'))
                done();
              });
            });

            it('should call id5 servers if stored pd data does not match current pd with consent override', function (done) {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('requestpd'))
                done();
              });
            });

            it('should not call id5 servers if stored pd data matches current pd with consent override', function (done) {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'storedpd'
              }).onAvailable(function () {
                sinon.assert.notCalled(extensionsStub);
                sinon.assert.notCalled(ajaxStub);
                expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('storedpd'))
                done();
              });
            });

            [
              undefined,
              null,
              ''
            ].forEach((pdValue) => {
              it(`should not call id5 servers if stored pd is present but current is [${pdValue}]`, function (done) {
                testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');
                ID5.init({
                  ...defaultInitBypassConsent(),
                  refreshInSeconds: 1000,
                  pd: pdValue
                }).onAvailable(function () {
                  sinon.assert.notCalled(extensionsStub);
                  sinon.assert.notCalled(ajaxStub);
                  expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('storedpd'))
                  done();
                });
              });
            });
          });

          describe('With Consent From Privacy Storage', function () {
            it('should call id5 servers if empty stored pd data with consent from privacy storage', function (done) {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('requestpd'))
                done();
              });
            });

            it('should call id5 servers if stored pd data does not match current pd with consent from privacy storage', function (done) {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('requestpd'))
                done();
              });
            });

            it('should not call id5 servers if stored pd data matches current pd with consent from privacy storage', function (done) {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000,
                pd: 'storedpd'
              }).onAvailable(function () {
                sinon.assert.notCalled(extensionsStub);
                sinon.assert.notCalled(ajaxStub);
                expect(testClientStore.getHashedPd(TEST_ID5_PARTNER_ID)).to.be.equal(ClientStore.makeStoredHash('storedpd'))
                done();
              });
            });
          });
        });

        describe('Stored segments changes', function () {
          before(function () {
            testClientStore.clearHashedSegments(TEST_ID5_PARTNER_ID);
          });
          afterEach(function () {
            testClientStore.clearHashedSegments(TEST_ID5_PARTNER_ID);
          });

          let testSegments = [{"destination": "ID5-1", "ids": ["123", "456"]}];

          describe('With Consent Override', function () {
            it('should not call id5 servers if no stored segments data with consent override', function (done) {
              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                segments: testSegments
              }).onAvailable(function () {

                sinon.assert.notCalled(extensionsStub);
                sinon.assert.notCalled(ajaxStub);
                done();
              });
            });

            it('should call id5 servers if empty stored segments data with consent override', function (done) {
              testClientStore.putHashedSegments(TEST_ID5_PARTNER_ID, []);

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                pd: 'requestpd'
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should call id5 servers if stored segments data does not match current segments with consent override', function (done) {
              testClientStore.putHashedSegments(TEST_ID5_PARTNER_ID, testSegments);

              let updatedTestSegments = [{...testSegments[0], "ids": testSegments[0].ids.concat("789")}]
              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                segments: updatedTestSegments
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should not call id5 servers if stored segments data matches current segments with consent override', function (done) {
              testClientStore.putHashedSegments(TEST_ID5_PARTNER_ID, testSegments);

              ID5.init({
                ...defaultInitBypassConsent(),
                refreshInSeconds: 1000,
                segments: testSegments
              }).onAvailable(function () {

                sinon.assert.notCalled(extensionsStub);
                sinon.assert.notCalled(ajaxStub);
                done();
              });
            });
          });
        });

      });

      describe('Handle Legacy Cookies with Consent Override', function () {
        const expStrFuture = (new Date(Date.now() + 5000).toUTCString());
        const expStrExpired = (new Date(Date.now() - 5000).toUTCString());

        it('should call id5 servers without existing legacy value in 1puid params via Ajax', function (done) {
          utils.setCookie('id5id.1st', JSON.stringify({'ID5ID': 'legacyid5id'}), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.s).to.be.undefined;
            expect(requestData['1puid']).to.be.undefined;

            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));

            utils.setCookie('id5id.1st', '', expStrExpired);
            done();
          });
        });

        it('should call id5 servers with existing signature value from legacy cookie id5.1st storage if local storage is empty', function (done) {
          utils.setCookie('id5.1st', JSON.stringify({
            'universal_uid': 'legacycookieuid',
            'signature': 'legacycookiesignature'
          }), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.s).to.be.equal('legacycookiesignature');

            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

            utils.setCookie('id5id.1st', '', expStrExpired);
            done();
          });
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty', function (done) {
          utils.setCookie('id5id.1st', JSON.stringify({
            'universal_uid': 'legacycookieuid',
            'signature': 'legacycookiesignature'
          }), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.s).to.be.equal('legacycookiesignature');

            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

            utils.setCookie('id5id.1st', '', expStrExpired);
            done();
          });
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty and both legacy cookies exist', function (done) {
          utils.setCookie('id5.1st', JSON.stringify({
            'universal_uid': 'legacycookieuid-id5.1st',
            'signature': 'legacycookiessignature-id5.1st'
          }), expStrFuture);
          utils.setCookie('id5id.1st', JSON.stringify({
            'universal_uid': 'legacycookieuid-id5id.1st',
            'signature': 'legacycookiesignature-id5id.1st'
          }), expStrFuture);

          const id5Status = ID5.init(defaultInitBypassConsent());

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.s).to.be.equal('legacycookiesignature-id5id.1st');

            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

            utils.setCookie('id5.1st', '', expStrExpired);
            utils.setCookie('id5id.1st', '', expStrExpired);
            done();
          });
        });

        it('removes legacy cookies', function (done) {
          CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
            utils.setCookie(`${cookie}`, JSON.stringify({
              'universal_uid': 'legacycookieuid',
              'signature': 'legacycookiesignature'
            }), expStrFuture);
            utils.setCookie(`${cookie}_nb`, 1, expStrFuture);
            utils.setCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`, 2, expStrFuture);
            utils.setCookie(`${cookie}_last`, Date.now() - (8000 * 1000), expStrFuture);
            utils.setCookie(`${cookie}.cached_pd`, 'abc', expStrFuture);
            utils.setCookie(`${cookie}.cached_consent_data`, 'xyz', expStrFuture);
          });

          ID5.init(defaultInitBypassConsent()).onAvailable(function () {

            CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
              expect(utils.getCookie(`${cookie}`)).to.be.equal(null);
              expect(utils.getCookie(`${cookie}_nb`)).to.be.equal(null);
              expect(utils.getCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`)).to.be.equal(null);
              expect(utils.getCookie(`${cookie}_last`)).to.be.equal(null);
              expect(utils.getCookie(`${cookie}.cached_pd`)).to.be.equal(null);
              expect(utils.getCookie(`${cookie}.cached_consent_data`)).to.be.equal(null);
            });

            // just for safety's sake, forcibly remove the cookies that should already be gone
            CONSTANTS.LEGACY_COOKIE_NAMES.forEach(function (cookie) {
              utils.setCookie(`${cookie}`, '', expStrExpired);
              utils.setCookie(`${cookie}_nb`, '', expStrExpired);
              utils.setCookie(`${cookie}_${TEST_ID5_PARTNER_ID}_nb`, '', expStrExpired);
              utils.setCookie(`${cookie}_last`, '', expStrExpired);
              utils.setCookie(`${cookie}.cached_pd`, '', expStrExpired);
              utils.setCookie(`${cookie}.cached_consent_data`, '', expStrExpired);
            });
            done();
          });
        });
      });
    });

    describe('No CMP nor Stored Privacy nor Consent Override on Request, Consent on Response', function () {
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
        it('should request new value with default parameters', function (done) {
          const id5Status = ID5.init(defaultInit());

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
            expect(requestData.partner).to.be.equal(TEST_ID5_PARTNER_ID);
            expect(requestData.s).to.be.undefined;
            expect(requestData.o).to.be.equal('api');
            expect(requestData.v).to.be.equal(version);
            expect(requestData.pd).to.be.undefined;
            expect(requestData.ref).to.be.null;
            expect(requestData.tml).to.include('http://localhost');
            expect(requestData.top).to.be.equal(1);
            expect(requestData.gdpr).to.exist;
            expect(requestData.gdpr_consent).to.be.undefined;
            expect(requestData.ua).to.be.a('string');
            expect(requestData.extensions).to.be.deep.equal(DEFAULT_EXTENSIONS);

            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.false;
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(encodeURIComponent(JSON_RESPONSE_ID5_CONSENT));
            expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
            done();
          });
        });

        it('should not store consent data nor pd on first request, but should after refresh', function (done) {
          const id5Status = ID5.init({
            ...defaultInit(),
            pd: 'pubdata'
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
            expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

            // reset stubs before next calls
            extensionsStub = resetExtensionsStub(extensionsStub);
            ajaxStub.reset()

            ID5.refreshId(id5Status).onRefresh(function () {

              sinon.assert.calledOnce(extensionsStub);
              sinon.assert.calledOnce(ajaxStub);
              expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash('pubdata'));
              expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.not.be.null;
              done();
            });
          });
        });
      });

      describe('Stored Value', function () {
        beforeEach(function () {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        });

        it('should request new value with no refresh needed', function (done) {
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.false;
            done();
          });
        });

        it('should request new value with refresh needed', function (done) {
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 10
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });

        it('should request new value with missing last stored value', function (done) {
          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });

        it('should request new value with expired stored value with no refresh needed', function (done) {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date().toUTCString());

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
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

            it('should call id5 servers if empty stored consent data', function (done) {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should call id5 servers if stored consent data does not match current consent', function (done) {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V1;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should call id5 servers even if stored consent data matches current consent', function (done) {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V1;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
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
              window.__tcfapi = function () {
              };
              cmpStub = stubTcfApi(testConsentDataFromCmp.getTCData)
            });

            afterEach(function () {
              cmpStub.restore();
              delete window.__tcfapi;
            });

            it('should call id5 servers if empty stored consent data', function (done) {
              const emptyConsentData = new ConsentData();
              testClientStore.putHashedConsentData(emptyConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should call id5 servers with tc string if gdprApplies and given decoded consent', function (done) {
              cmpStub = stubTcfApi({
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
              )
              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
                expect(requestData.gdpr_consent).is.eq('cmpconsentstring');
                expect(requestData.gdpr).is.eq(1);
                done();
              });
            });

            it('should call id5 servers with tc string if gdprApplies and given encoded consent', function (done) {
              cmpStub = stubTcfApi({
                  gdprApplies: true,
                  tcString: TCF_V2_STRING_WITH_STORAGE_CONSENT,
                  eventStatus: 'tcloaded',
                  apiVersion: 2,
                }
              )
              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
                expect(requestData.gdpr_consent).is.eq(TCF_V2_STRING_WITH_STORAGE_CONSENT);
                expect(requestData.gdpr).is.eq(1);
                done();
              });
            });

            it('should not call id5 servers with tc string if gdprApplies and storage consent not given - encoded', function () {
              let tcString = TCF_V2_STRING_WITHOUT_STORAGE_CONSENT;
              cmpStub = stubTcfApi({
                  gdprApplies: true,
                  tcString: tcString,
                  eventStatus: 'tcloaded',
                  apiVersion: 2,
                }
              )
              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.notCalled(extensionsStub);
              sinon.assert.notCalled(ajaxStub);

            });

            it('should not call id5 servers with tc string if gdprApplies and storage consent not given - decoded', function () {
              let tcString = TCF_V2_STRING_WITH_STORAGE_CONSENT;
              cmpStub = stubTcfApi({
                  gdprApplies: true,
                  tcString: tcString,
                  eventStatus: 'tcloaded',
                  apiVersion: 2,
                  purpose: {
                    consents: {
                      '1': false
                    }
                  }
                }
              )
              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              });

              sinon.assert.notCalled(extensionsStub);
              sinon.assert.notCalled(ajaxStub);

            });

            it('should call id5 servers with tc string if gdprApplies is false', function (done) {
              cmpStub = stubTcfApi({
                  gdprApplies: false,
                  tcString: 'cmpconsentstring',
                  eventStatus: 'tcloaded',
                  apiVersion: 2,
                }
              )
              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
                expect(requestData.gdpr_consent).is.eq('cmpconsentstring');
                expect(requestData.gdpr).is.eq(0);
                done();
              });
            });

            it('should call id5 servers with tc string if gdprApplies is undefined and given decoded consent ', function (done) {
              cmpStub = stubTcfApi({
                  tcString: 'cmpconsentstring',
                  eventStatus: 'tcloaded',
                  apiVersion: 2,
                  purpose: {
                    consents: {
                      '1': true
                    }
                  }
                }
              )
              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
                expect(requestData.gdpr_consent).is.eq('cmpconsentstring');
                expect(requestData.gdpr).is.eq(undefined);
                done();
              });
            });

            it('should call id5 servers with tc string if only encoded string available with storage access given consent', function (done) {
              cmpStub = stubTcfApi({
                  tcString: TCF_V2_STRING_WITH_STORAGE_CONSENT,
                  eventStatus: 'tcloaded',
                  apiVersion: 2,
                }
              )
              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {
                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
                expect(requestData.gdpr_consent).is.eq(TCF_V2_STRING_WITH_STORAGE_CONSENT);
                expect(requestData.gdpr).is.eq(undefined);
                done();
              });
            });

            it('should call id5 servers if stored consent data does not match current consent', function (done) {
              const someConsentData = new ConsentData();
              someConsentData.api = API_TYPE.TCF_V2;
              someConsentData.gdprApplies = true;
              someConsentData.consentString = 'storedconsentstring';
              testClientStore.putHashedConsentData(someConsentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
            });

            it('should call id5 servers even if stored consent data matches current consent', function (done) {
              const consentData = new ConsentData();
              consentData.api = API_TYPE.TCF_V2;
              consentData.gdprApplies = true;
              consentData.consentString = 'cmpconsentstring';
              testClientStore.putHashedConsentData(consentData);

              ID5.init({
                ...defaultInit(),
                refreshInSeconds: 1000
              }).onAvailable(function () {

                sinon.assert.calledOnce(extensionsStub);
                sinon.assert.calledOnce(ajaxStub);
                expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
                done();
              });
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

          it('should call id5 servers if empty stored pd data', function (done) {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID);

            ID5.init({
              ...defaultInit(),
              refreshInSeconds: 1000, pd: 'requestpd'
            }).onAvailable(function () {

              sinon.assert.calledOnce(extensionsStub);
              sinon.assert.calledOnce(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
              done();
            });
          });

          it('should call id5 servers if stored pd data does not match current pd', function (done) {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({
              ...defaultInit(),
              refreshInSeconds: 1000, pd: 'requestpd'
            }).onAvailable(function () {

              sinon.assert.calledOnce(extensionsStub);
              sinon.assert.calledOnce(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
              done();
            });
          });

          it('should call id5 servers even if stored pd data matches current pd', function (done) {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({
              ...defaultInit(),
              refreshInSeconds: 1000, pd: 'storedpd'
            }).onAvailable(function () {

              sinon.assert.calledOnce(extensionsStub);
              sinon.assert.calledOnce(ajaxStub);
              expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
              done();
            });
          });
        });
      });
    });

    describe('No Consent on Response', function () {
      let ajaxStub;

      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_NO_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should request new value but not store response', function (done) {
        const id5Status = ID5.init(defaultInit());

        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
          expect(id5Status.isFromCache()).to.be.false;
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
          done();
        });
      });

      it('should not store consent data nor pd on first request, nor after refresh', function (done) {
        const id5Status = ID5.init({
          ...defaultInit(),
          pd: 'pubdata'
        });

        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

          ID5.refreshId(id5Status).onRefresh(function () {

            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
            expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
            done();
          });
        });
      });

      it('should clear previous stored data after no-consent response', function (done) {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, 'last');
        localStorage.setItemWithExpiration(TEST_NB_STORAGE_CONFIG, 'nb');
        localStorage.setItemWithExpiration(TEST_PD_STORAGE_CONFIG, 'pd');
        localStorage.setItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG, 'consent_data');

        const id5Status = ID5.init(defaultInit());

        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID_NO_CONSENT);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE_NO_CONSENT);
          expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_LAST_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_NB_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
          expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
          done();
        });
      });
    });

    describe('No Consent in Stored Privacy Data', function () {
      let ajaxStub;

      beforeEach(function () {
        localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_NO_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should not request new id with previous no-consent privacy data', function () {
        const id5Status = ID5.init(defaultInit());

        sinon.assert.notCalled(extensionsStub);
        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;
        expect(localStorage.getItemWithExpiration(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(localStorage.getItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
      });

      it('should not use stored response for ID with previous no-consent privacy data', function () {
        localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

        const id5Status = ID5.init(defaultInit());

        sinon.assert.notCalled(extensionsStub);
        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;
      });
    });

    describe('With User Agent hints enabled', function () {
      let ajaxStub, uaDataStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_ID5_CONSENT);
        });
        uaDataStub = sinon.stub(ID5, 'gatherUaHints');
      });

      afterEach(function () {
        ajaxStub.restore();
        uaDataStub.restore();
      });

      it('should send the User Agent hints in the request', function (done) {
        uaDataStub.resolves({
          'architecture': 'x86',
          'brands': [
            {
              'brand': ' Not A;Brand',
              'version': '99'
            },
            {
              'brand': 'Chromium',
              'version': '101'
            },
            {
              'brand': 'Froogle Chrome',
              'version': '101'
            }
          ],
          'fullVersionList': [
            {
              'brand': ' Not A;Brand',
              'version': '99.0.0.0'
            },
            {
              'brand': 'Chromium',
              'version': '101.0.4951.64'
            },
            {
              'brand': 'Froogle Chrome',
              'version': '101.0.4951.64'
            }
          ],
          'mobile': false,
          'model': '',
          'platform': 'Linux',
          'platformVersion': '5.17.9'
        });
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          disableUaHints: false
        });

        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          const URL = ajaxStub.firstCall.args[0];
          expect(URL).to.contain(ID5_FETCH_ENDPOINT);
          const callData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(callData.ua_hints).to.be.an('object');
          expect(callData.ua_hints.architecture).to.equal('x86');
          expect(callData.ua_hints.brands).to.have.lengthOf(2); // Note ' Not A;Brand' gets filtered
          expect(callData.ua_hints.brands[0].brand).to.equal('Chromium');
          expect(callData.ua_hints.brands[0].version).to.equal('101');
          expect(callData.ua_hints.brands[1].brand).to.equal('Froogle Chrome');
          expect(callData.ua_hints.brands[1].version).to.equal('101');
          expect(callData.ua_hints.fullVersionList).to.have.lengthOf(2); // Note ' Not A;Brand' gets filtered
          expect(callData.ua_hints.fullVersionList[0].brand).to.equal('Chromium');
          expect(callData.ua_hints.fullVersionList[0].version).to.equal('101.0.4951.64');
          expect(callData.ua_hints.fullVersionList[1].brand).to.equal('Froogle Chrome');
          expect(callData.ua_hints.fullVersionList[1].version).to.equal('101.0.4951.64');
          expect(callData.ua_hints.mobile).to.be.false;
          expect(callData.ua_hints.model).to.equal('');
          expect(callData.ua_hints.platform).to.equal('Linux');
          expect(callData.ua_hints.platformVersion).to.equal('5.17.9');
          done();
        });
      });


      it('should not be blocked by an error in getHighEntropyValues()', function (done) {
        uaDataStub.rejects("ERROR");
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          disableUaHints: false
        });

        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          const URL = ajaxStub.firstCall.args[0]
          expect(URL).to.contain(ID5_FETCH_ENDPOINT);
          const callData = ajaxStub.firstCall.args[2]
          expect(callData.uaHints).to.be.undefined;
          done();
        });
      });
    });

    describe('With LiveIntent Integration enabled', function () {
      let ajaxStub;

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_ID5_CONSENT);
        });
      });

      afterEach(function () {
        ajaxStub.restore();
        delete window.liQ;
      });

      it('should not be blocked because of missing LiveIntent library', function (done) {
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          disableLiveIntentIntegration: false
        });
        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          done();
        });
      });

      it('should not be blocked because of an error in the LiveIntent library', function (done) {
        window.liQ = {
          ready: true,
          resolve: function () {
            throw new Error('Test error');
          }
        };
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          disableLiveIntentIntegration: false
        });
        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          done();
        });
      });

      it('should not block when LiveIntent library is present', function (done) {
        window.liQ = {
          ready: true,
          resolve: (callback) => callback()
        };
        const id5Status = ID5.init({
          ...defaultInitBypassConsent(),
          disableLiveIntentIntegration: false
        });
        id5Status.onAvailable(function () {
          sinon.assert.calledOnce(extensionsStub);
          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          done();
        });
      });
    });
  });
});
