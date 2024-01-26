import sinon from 'sinon';
import ID5 from '../../lib/id5-api.js';
import {
  DEFAULT_EXTENSIONS,
  defaultInit,
  defaultInitBypassConsent,
  localStorage,
  prepareMultiplexingResponse,
  resetAllInLocalStorage,
  setExpiredStoredResponse,
  setStoredResponse,
  sinonFetchResponder,
  TEST_CONSENT_DATA_STORAGE_CONFIG,
  TEST_ID5ID_STORAGE_CONFIG,
  TEST_PRIVACY_ALLOWED,
  TEST_PRIVACY_STORAGE_CONFIG,
  TEST_RESPONSE_ID5_CONSENT,
  TEST_RESPONSE_ID5ID,
  TEST_RESPONSE_LINK_TYPE
} from './test_utils.js';
import {
  API_TYPE,
  ClientStore,
  ConsentData,
  Extensions,
  EXTENSIONS,
  GRANT_TYPE,
  LocalStorageGrant,
  NoopLogger,
  StorageConfig
} from '@id5io/multiplexing';

describe('ID5 JS API', function () {

  const testClientStore = new ClientStore(
    () => new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG, API_TYPE.NONE),
    localStorage,
    new StorageConfig(), NoopLogger);

  let extensionsStub, extensionsCreatorStub;

  beforeEach(function () {
    extensionsStub = sinon.createStubInstance(Extensions);
    extensionsStub.gather.resolves(DEFAULT_EXTENSIONS);
    extensionsCreatorStub = sinon.stub(EXTENSIONS, 'createExtensions').returns(extensionsStub);
  });

  afterEach(function () {
    extensionsCreatorStub.restore();
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
  });

  describe('Configuration and Parameters', function () {
    describe('Required Parameters', function () {
      it('should fail if partnerId not set in config', function () {
        // Note fatal configuration error: missing partnerId
        let id5Status = ID5.init({debugBypassConsent: true});
        expect(id5Status).to.be.undefined;
      });
    });
  });

  describe('Standard Storage and Responses', function () {
    let server;

    beforeEach(function () {
      server = sinon.fakeServer.create();
      server.respondImmediately = true;
      server.respondWith(sinonFetchResponder(request =>
        prepareMultiplexingResponse(TEST_RESPONSE_ID5_CONSENT, request.requestBody)
      ));
      resetAllInLocalStorage();
    });

    afterEach(function () {
      server.restore();
      resetAllInLocalStorage();
    });

    describe('Consent on Request and Response', function () {
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
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);

            const body = JSON.parse(server.requests[0].requestBody);
            expect(body.requests[0].segments).to.deep.equal([{destination: '22', ids: ['abc']}]);
            expect(body.requests[0]._invalid_segments).to.equal(1);
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
            expect(localStorage.storage.getKeysWithPrefix(StorageConfig.DEFAULT.ID5_V2.name)).to.be.eql([]);
            done();
          });
        });

        it('does not drop local storage items when options.acr', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            acr: true
          });

          id5Status.onAvailable(function () {
            expect(localStorage.getItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
            expect(localStorage.getItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG)).to.be.null;
            expect(localStorage.storage.getKeysWithPrefix(StorageConfig.DEFAULT.ID5_V2.name)).to.be.eql([]);
            done();
          });
        });

        it('should not set ab features flag when abTesting is disabled', function (done) {
          ID5.init({
            ...defaultInitBypassConsent(),
            abTesting: {enabled: false}
          }).onAvailable(function () {
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);

            const body = JSON.parse(server.requests[0].requestBody);
            expect(body.requests[0].features).to.be.undefined;
            done();
          });
        });
      });

      describe('Stored Value with No Refresh Needed', function () {
        const cacheId = '4165587571870860'; // constant on the basis of init params (default + refreshInSeconds=1000)
        beforeEach(function () {
          setStoredResponse(cacheId, TEST_RESPONSE_ID5_CONSENT);
        });

        it('should use stored value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            expect(extensionsStub.gather).to.not.have.been.called;
            expect(server.requests).to.have.lengthOf(0);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
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
            expect(extensionsStub.gather).to.not.have.been.called;
            expect(server.requests).to.have.lengthOf(0);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.true;
            done();
          });
        });
      });

      describe('Stored Value with Refresh Needed', function () {
        const responseMaxAge = TEST_RESPONSE_ID5_CONSENT.cache_control.max_age_sec;
        const cacheId = '8491605558362365'; // constant on the basis of init params (default + refreshInSeconds=10)
        beforeEach(function () {
          setStoredResponse(
            cacheId,
            TEST_RESPONSE_ID5_CONSENT,
            Date.now() - (responseMaxAge + 1) * 1000 // older than max age
          );
        });

        it('should request new value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 10
          });

          id5Status.onAvailable(function () {
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);
            const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
            expect(requestData.used_refresh_in_seconds).to.be.eq(responseMaxAge);
            expect(requestData.provided_options.refresh_in_seconds).to.be.eq(10);
            expect(requestData.cacheId).to.be.eq(cacheId);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            done();
          });
        });

        it('should request new value with consent from privacy storage', function (done) {
          localStorage.setItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 10
          });

          id5Status.onAvailable(function () {
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
            expect(requestData.used_refresh_in_seconds).to.be.eq(responseMaxAge);
            expect(requestData.cacheId).to.be.eq(cacheId);
            done();
          });
        });
      });

      describe('Expired Stored Value with Refresh Not Needed', function () {
        const cacheId = '4165587571870860'; // constant on the basis of init params (default + refreshInSeconds=1000)
        beforeEach(function () {
          setExpiredStoredResponse(cacheId);
        });

        it('should request new value with consent override', function (done) {
          const id5Status = ID5.init({
            ...defaultInitBypassConsent(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
            expect(requestData.cacheId).to.be.eq(cacheId);
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
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
            expect(requestData.cacheId).to.be.eq(cacheId);
            done();
          });
        });
      });

      describe('Stored Data Change Forces Refresh with Refresh Not Needed', function () {

        const cacheId = '4165587571870860'; // constant on the basis of init params (default + refreshInSeconds=1000)
        beforeEach(function () {
          setStoredResponse(cacheId, TEST_RESPONSE_ID5_CONSENT);
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
                  '1': true // Cookies/local storage access
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
                expect(extensionsStub.gather).to.have.been.calledOnce;
                expect(server.requests).to.have.lengthOf(1);
                const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
                expect(requestData.cacheId).to.be.eq(cacheId);
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
                expect(extensionsStub.gather).to.have.been.calledOnce;
                expect(server.requests).to.have.lengthOf(1);
                const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
                expect(requestData.cacheId).to.be.eq(cacheId);
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
                expect(extensionsStub.gather).to.not.have.been.called;
                expect(server.requests).to.have.lengthOf(0);
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
                expect(extensionsStub.gather).to.have.been.calledOnce;
                expect(server.requests).to.have.lengthOf(1);
                const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
                expect(requestData.cacheId).to.be.eq(cacheId);
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
                expect(extensionsStub.gather).to.have.been.calledOnce;
                expect(server.requests).to.have.lengthOf(1);
                const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
                expect(requestData.cacheId).to.be.eq(cacheId);
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
                expect(extensionsStub.gather).to.not.have.been.called;
                expect(server.requests).to.have.lengthOf(0);
                done();
              });
            });
          });
        });

      });
    });

    describe('No CMP nor Stored Privacy nor Consent Override on Request, Consent on Response', function () {
      describe('Stored Value', function () {
        const cacheId = '4165587571870860'; // constant on the basis of init params (default + refreshInSeconds=1000)
        beforeEach(function () {
          setStoredResponse(cacheId, TEST_RESPONSE_ID5_CONSENT);
        });

        it('should request new value with no refresh needed', function (done) {

          const id5Status = ID5.init({
            ...defaultInit(),
            refreshInSeconds: 1000
          });

          id5Status.onAvailable(function () {
            expect(extensionsStub.gather).to.have.been.calledOnce;
            expect(server.requests).to.have.lengthOf(1);
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(id5Status.isFromCache()).to.be.false;
            const requestData = JSON.parse(server.requests[0].requestBody).requests[0];
            expect(requestData.cacheId).to.be.eq(cacheId);
            done();
          });
        });
      });
    });

    describe('With User Agent hints enabled', function () {
      let uaDataStub;

      beforeEach(function () {
        uaDataStub = sinon.stub(window.NavigatorUAData.prototype, 'getHighEntropyValues');
      });

      afterEach(function () {
        uaDataStub.restore();
      });

      it('should send the User Agent hints in the request', function (done) {
        uaDataStub.resolves({
          'architecture': 'x86',
          'brands': [
            {
              'brand': 'Chromium',
              'version': '101'
            },
            {
              'brand': 'Not;A=Brand',
              'version': '8'
            },
            {
              'brand': 'Froogle Chrome',
              'version': '101'
            }
          ],
          'fullVersionList': [
            {
              'brand': 'Chromium',
              'version': '101.0.4951.64'
            },
            {
              'brand': 'Not;A=Brand',
              'version': '8.0.0.0'
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
          expect(extensionsStub.gather).to.have.been.calledOnce;
          expect(server.requests).to.have.lengthOf(1);
          const body = JSON.parse(server.requests[0].requestBody);
          expect(body.requests[0].ua_hints).to.be.an('object');
          expect(body.requests[0].ua_hints.architecture).to.equal('x86');
          expect(body.requests[0].ua_hints.brands).to.have.lengthOf(2); // Note ' Not A;Brand' gets filtered
          expect(body.requests[0].ua_hints.brands[0].brand).to.equal('Chromium');
          expect(body.requests[0].ua_hints.brands[0].version).to.equal('101');
          expect(body.requests[0].ua_hints.brands[1].brand).to.equal('Froogle Chrome');
          expect(body.requests[0].ua_hints.brands[1].version).to.equal('101');
          expect(body.requests[0].ua_hints.fullVersionList).to.have.lengthOf(2); // Note ' Not A;Brand' gets filtered
          expect(body.requests[0].ua_hints.fullVersionList[0].brand).to.equal('Chromium');
          expect(body.requests[0].ua_hints.fullVersionList[0].version).to.equal('101.0.4951.64');
          expect(body.requests[0].ua_hints.fullVersionList[1].brand).to.equal('Froogle Chrome');
          expect(body.requests[0].ua_hints.fullVersionList[1].version).to.equal('101.0.4951.64');
          expect(body.requests[0].ua_hints.mobile).to.be.false;
          expect(body.requests[0].ua_hints.model).to.equal('');
          expect(body.requests[0].ua_hints.platform).to.equal('Linux');
          expect(body.requests[0].ua_hints.platformVersion).to.equal('5.17.9');
          done();
        });
      });
    });
  });
});
