import sinon from 'sinon';
import * as utils from '../../lib/utils';
import ClientStore from '../../lib/clientStore';
import ID5 from '../../lib/id5-api';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent,
  ID5_FETCH_ENDPOINT,
  JSON_RESPONSE_ID5_CONSENT,
  localStorage,
  resetAllInLocalStorage,
  STORED_JSON,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_ID5_PARTNER_ID,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_ID5ID_STORAGE_CONFIG_EXPIRED,
  TEST_LAST_STORAGE_CONFIG,
  TEST_PD_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE,
  TEST_STORED_ID5ID,
  TEST_STORED_LINK_TYPE,
  TEST_STORED_SIGNATURE
} from './test_utils';
import {StorageConfig} from "../../lib/config.js";
import {EXTENSIONS, ConsentData, API_TYPE, GRANT_TYPE, LocalStorageGrant, ApiEvent, NoopLogger} from "@id5io/multiplexing";

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

  const testClientStore = new ClientStore(
    () => new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG, API_TYPE.NONE),
    localStorage,
    new StorageConfig(), NoopLogger);

  let extensionsStub;

  beforeEach(function () {
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

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
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

        it('should not set ab features flag when abTesting is disabled', function (done) {
          ID5.init({
            ...defaultInitBypassConsent(),
            abTesting: {enabled: false}
          }).onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

            const requestData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
            expect(requestData.features).to.be.undefined;
            done()
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
            const requestData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
            expect(requestData.used_refresh_in_seconds).to.be.eq(10);
            expect(requestData.provided_options.refresh_in_seconds).to.be.eq(10);
            done();
          });
        });


        it('should request new value if stored older than cache max age from response ', function (done) {
          localStorage.setItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG, encodeURIComponent(JSON.stringify({
            universal_uid: TEST_STORED_ID5ID,
            cascade_needed: false,
            signature: TEST_STORED_SIGNATURE,
            ext: {
              linkType: TEST_STORED_LINK_TYPE
            },
            privacy: JSON.parse(TEST_PRIVACY_ALLOWED),
            cache_control: {
              max_age_sec: 11
            }
          })));
          localStorage.setItemWithExpiration(TEST_LAST_STORAGE_CONFIG, new Date(Date.now() - (8000 * 1000)).toUTCString());

          const id5Status = ID5.init({
            ...defaultInitBypassConsent()
          });

          id5Status.onAvailable(function () {
            sinon.assert.calledOnce(extensionsStub);
            sinon.assert.calledOnce(ajaxStub);
            expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            const requestData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
            expect(requestData.used_refresh_in_seconds).to.be.eq(11);
            expect(requestData.provided_options.refresh_in_seconds).to.be.eq(undefined);
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
          const callData = JSON.parse(ajaxStub.firstCall.args[2]).requests[0];
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
