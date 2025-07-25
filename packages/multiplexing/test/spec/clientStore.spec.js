import sinon from 'sinon';
import {API_TYPE, GRANT_TYPE, LocalStorageGrant} from '../../src/consent.js';
import {ClientStore} from '../../src/clientStore.js';
import {LocalStorage} from '../../src/localStorage.js';
import {StorageConfig, StoreItemConfig} from '../../src/store.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {CONSTANTS} from '../../src/constants.js';

const DEFAULT_STORAGE_CONFIG = new StorageConfig();
const _DEBUG = false;

describe('ClientStore', function () {
  let log;


  beforeEach(function () {
    log = _DEBUG ? console : NO_OP_LOGGER;
  });

  describe('with available local storage', function () {
    /** @type {LocalStorage} */
    let localStorage;

    beforeEach(function () {
      localStorage = sinon.createStubInstance(LocalStorage);
    });
    describe('V2', function () {

      describe('with local storage access NOT granted', function () {
        let localStorageGrant = sinon.createStubInstance(LocalStorageGrant);
        /** @type {ClientStore} */
        let clientStore;
        beforeEach(function () {
          localStorageGrant.isDefinitivelyAllowed.returns(false);
          clientStore = new ClientStore(() => localStorageGrant, localStorage, DEFAULT_STORAGE_CONFIG, log);
        });
        it('should NOT store response', function () {
          // given
          const response = {
            universal_uid: 'uid',
            signature: 'sig',
            cache_control: {
              max_age_sec: 3600
            }
          };
          const responseTime = 123;

          // when
          const result = clientStore.storeResponseV2('abcd', response, responseTime);

          // then
          expect(localStorageGrant.isDefinitivelyAllowed).have.been.called;
          expect(localStorage.updateObjectWithExpiration).have.not.been.called;
          expect(result).to.be.undefined;
        });

        it('should NOT get response', function () {
          // when
          const result = clientStore.getStoredResponseV2('abcd');

          // then
          expect(localStorageGrant.isDefinitivelyAllowed).have.been.called;
          expect(localStorage.getObjectWithExpiration).have.not.been.called;
          expect(result).to.be.undefined;
        });

        it('should NOT inc nb', function () {
          // when
          const result = clientStore.incNbV2('abcd');

          // then
          expect(localStorageGrant.isDefinitivelyAllowed).have.been.called;
          expect(localStorage.updateObjectWithExpiration).have.not.been.called;
          expect(result).to.be.undefined;
        });

      });

      describe('with local storage access granted', function () {
        let grantChecker;
        /** @type {ClientStore} */
        let clientStore;
        beforeEach(function () {
          grantChecker = () => new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
          clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);
        });

        it('should store response', function () {
          // given
          const response = {
            universal_uid: 'uid',
            signature: 'sig',
            cache_control: {
              max_age_sec: 3600
            }
          };
          const responseTime = 123;
          const consents = {
            gpp: 'gppString'
          };

          localStorage.updateObjectWithExpiration.callsFake((key, updFn) => {
            return updFn({
              response: {
                old: true
              },
              nb: 100
            });
          });
          // when
          const result = clientStore.storeResponseV2('abcd', response, responseTime, consents);

          // then
          expect(localStorage.updateObjectWithExpiration).to.be.called;
          expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(new StoreItemConfig('id5id_v2_abcd', 15));
          let calledUpdateFn = localStorage.updateObjectWithExpiration.firstCall.args[1];

          expect(result).to.be.eql({
              response: response,
              responseTimestamp: responseTime,
              nb: 100,
              consents: consents
            }
          );

          let updatedResponseEmpty = calledUpdateFn(undefined);

          // then
          expect(updatedResponseEmpty).to.be.eql({
              response: response,
              responseTimestamp: responseTime,
              consents: consents
            }
          );
        });

        it('should get response', function () {
          // given
          const storedResponse = {
            response: {
              universal_uid: 'uid',
              signature: 'sig',
              cache_control: {
                max_age_sec: 3600
              }
            },
            responseTimestamp: 1234,
            nb: 10
          };
          localStorage.getObjectWithExpiration.returns(storedResponse);

          // when
          const result = clientStore.getStoredResponseV2('abcd');

          // then
          expect(localStorage.getObjectWithExpiration).to.be.calledWith(new StoreItemConfig('id5id_v2_abcd', 15));
          expect(result).to.be.eql(storedResponse);
        });

        [
          [10, undefined, 11],
          [10, 1, 11],
          [10, 10, 20],
          [10, -4, 6],
          [10, -10, 0],
          ['invalid', 1, 1],
          [undefined, 1, 1],
          ['invalid', -2, 0],
          [undefined, -1, 0],
          [10, -12, 0]
        ].forEach(([initialValue, incValue, expectedValue]) => {
          it(`should increase nb (${initialValue}) by ${incValue}`, function () {
            localStorage.updateObjectWithExpiration.callsFake((key, updFn) => {
              return updFn({
                response: {
                  universal_uid: 'uid',
                  signature: 'sig',
                  cache_control: {
                    max_age_sec: 3600
                  }
                },
                nb: initialValue
              });
            });
            // when
            let result = clientStore.incNbV2('abcd', incValue);

            // then
            expect(localStorage.updateObjectWithExpiration).to.be.called;
            expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(new StoreItemConfig('id5id_v2_abcd', 15));

            expect(result).to.be.eql({
                response: {
                  universal_uid: 'uid',
                  signature: 'sig',
                  cache_control: {
                    max_age_sec: 3600
                  }
                },
                nb: expectedValue
              }
            );
          });
        });
      });
    });

    describe('extensions', function () {

      describe('with local storage access granted', function () {
        let grantChecker;
        /** @type {ClientStore} */
        let clientStore;
        let extensionsConfig = new StoreItemConfig(CONSTANTS.STORAGE_CONFIG.EXTENSIONS.name, CONSTANTS.STORAGE_CONFIG.EXTENSIONS.expiresDays);
        beforeEach(function () {
          grantChecker = () => new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
          clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);
        });

        it('should store extensions', function () {
          // given
          const ext = {
            extA: {
              extB: 'C'
            }
          };

          localStorage.updateObjectWithExpiration.callsFake((key, updFn) => {
            return updFn({});
          });
          // when
          const result = clientStore.storeExtensions(ext, extensionsConfig);

          // then
          expect(localStorage.updateObjectWithExpiration).to.be.called;
          expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(extensionsConfig);

          expect(result).to.be.eql(ext);
        });

        it('should get extensions', function () {
          // given
          const storedExtensions = {
            extA: {
              extB: 'C'
            }
          };
          localStorage.getObjectWithExpiration.returns(storedExtensions);

          // when
          const result = clientStore.getExtensions();

          // then
          expect(localStorage.getObjectWithExpiration).to.be.calledWith(extensionsConfig);
          expect(result).to.be.eql(storedExtensions);
        });
      });
    });

    describe('signature', function () {
      describe('with local storage access NOT granted', function () {
        let localStorageGrant = sinon.createStubInstance(LocalStorageGrant);
        /** @type {ClientStore} */
        let clientStore;
        beforeEach(function () {
          localStorageGrant.isDefinitivelyAllowed.returns(false);
          clientStore = new ClientStore(() => localStorageGrant, localStorage, DEFAULT_STORAGE_CONFIG, log);
        });

        it('should NOT store signature', function () {
          // given
          const signature = 'test-signature';

          // when
          const result = clientStore.storeSignature(signature);

          // then
          expect(localStorageGrant.isDefinitivelyAllowed).have.been.called;
          expect(localStorage.updateObjectWithExpiration).have.not.been.called;
          expect(result).to.be.undefined;
        });

        it('should NOT get signature', function () {
          // when
          const result = clientStore.getStoredSignature();

          // then
          expect(localStorageGrant.isDefinitivelyAllowed).have.been.called;
          expect(localStorage.getObjectWithExpiration).have.not.been.called;
          expect(result).to.be.undefined;
        });
      });

      describe('with local storage access granted', function () {
        let grantChecker;
        /** @type {ClientStore} */
        let clientStore;
        let signatureConfig = new StoreItemConfig('id5id_v2_signature', 15);
        beforeEach(function () {
          grantChecker = () => new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
          clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);
        });

        it('should store signature', function () {
          // given
          const signature = 'test-signature';

          localStorage.updateObjectWithExpiration.callsFake((key, updFn) => {
            return updFn({});
          });
          // when
          const result = clientStore.storeSignature(signature);

          // then
          expect(localStorage.updateObjectWithExpiration).to.be.called;
          expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(signatureConfig);

          expect(result).to.be.eql({
            signature: signature
          });
        });

        it('should get signature', function () {
          // given
          const storedSignature = {
            signature: 'test-signature'
          };
          localStorage.getObjectWithExpiration.returns(storedSignature);

          // when
          const result = clientStore.getStoredSignature();

          // then
          expect(localStorage.getObjectWithExpiration).to.be.calledWith(signatureConfig);
          expect(result).to.be.eql(storedSignature);
        });

        it('should clear signature', function () {
          // when
          clientStore.clearSignature();

          // then
          expect(localStorage.removeItem).to.be.calledWith(signatureConfig.name);
        });
      });
    });

  });
});
