import sinon from 'sinon';
import {API_TYPE, GRANT_TYPE, LocalStorageGrant} from '../../src/consent.js';
import {ClientStore} from '../../src/clientStore.js';
import {LocalStorage} from '../../src/localStorage.js';
import {StorageConfig, StoreItemConfig} from '../../src/store.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {CONSTANTS} from '../../src/constants.js';

const TEST_RESPONSE_ID5_CONSENT = {
  universal_uid: 'testresponseid5id',
  cascade_needed: false,
  signature: 'uvwxyz',
  ext: {
    linkType: 1
  },
  privacy: {
    jurisdiction: 'other',
    id5_consent: true
  }
};

const JSON_RESPONSE_ID5_CONSENT = JSON.stringify(TEST_RESPONSE_ID5_CONSENT);

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
    describe('V1', function () {

      it('should not retrieve the previous response from local storage if local storage usage is not granted', function () {
        // given
        const GRANT_CHECKER = () => new LocalStorageGrant(false, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
        localStorage.getItemWithExpiration.withArgs(DEFAULT_STORAGE_CONFIG.ID5).returns('%20%7B%20%22created_at%22%3A%20%222023-07-19T13%3A44%3A14.906Z%22%2C%20%22id5_consent%22%3A%20true%2C%20%22original_uid%22%3A%20%22ID5*_oid_%22%2C%20%22universal_uid%22%3A%20%22ID5*_uid_%22%2C%20%22signature%22%3A%20%22ID5_sig%22%2C%20%22link_type%22%3A%202%2C%20%22cascade_needed%22%3A%20true%2C%20%22privacy%22%3A%20%7B%20%22jurisdiction%22%3A%20%22gdpr%22%2C%20%22id5_consent%22%3A%20true%7D%2C%20%22ext%22%3A%20%7B%20%22linkType%22%3A%202%2C%20%22pba%22%3A%20%2220bQ7qtIJC9ikHGxmXgbIQ%3D%3D%22%7D%2C%20%22cache_control%22%3A%20%7B%20%22max_age_sec%22%3A%2015%20%7D%7D');
        const clientStore = new ClientStore(GRANT_CHECKER, localStorage, DEFAULT_STORAGE_CONFIG, log);

        // when
        const cachedResponse = clientStore.getResponse();

        // then
        expect(cachedResponse).to.be.undefined;
        expect(localStorage.getItemWithExpiration).to.not.have.been.called;
      });


      describe('with local storage access granted', function () {
        let grantChecker;

        beforeEach(function () {
          grantChecker = () => new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
        });

        it('should retrieve the previous response from local storage if local storage usage is granted', function () {
          // given
          localStorage.getItemWithExpiration.withArgs(DEFAULT_STORAGE_CONFIG.ID5).returns('%20%7B%20%22created_at%22%3A%20%222023-07-19T13%3A44%3A14.906Z%22%2C%20%22id5_consent%22%3A%20true%2C%20%22original_uid%22%3A%20%22ID5*_oid_%22%2C%20%22universal_uid%22%3A%20%22ID5*_uid_%22%2C%20%22signature%22%3A%20%22ID5_sig%22%2C%20%22link_type%22%3A%202%2C%20%22cascade_needed%22%3A%20true%2C%20%22privacy%22%3A%20%7B%20%22jurisdiction%22%3A%20%22gdpr%22%2C%20%22id5_consent%22%3A%20true%7D%2C%20%22ext%22%3A%20%7B%20%22linkType%22%3A%202%2C%20%22pba%22%3A%20%2220bQ7qtIJC9ikHGxmXgbIQ%3D%3D%22%7D%2C%20%22cache_control%22%3A%20%7B%20%22max_age_sec%22%3A%2015%20%7D%7D');
          const clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);

          // when
          const cachedResponse = clientStore.getResponse();

          // then
          log.info(cachedResponse);
          expect(cachedResponse).to.deep.eq({
            created_at: '2023-07-19T13:44:14.906Z',
            id5_consent: true,
            original_uid: 'ID5*_oid_',
            universal_uid: 'ID5*_uid_',
            signature: 'ID5_sig',
            link_type: 2,
            cascade_needed: true,
            privacy: {
              jurisdiction: 'gdpr',
              id5_consent: true
            },
            ext: {
              linkType: 2,
              pba: '20bQ7qtIJC9ikHGxmXgbIQ=='
            },
            cache_control: {max_age_sec: 15}
          });
        });

        it('should retrieve the previous response from local storage when legacy encoding was used to store', function () {
          // given
          localStorage.getItemWithExpiration.withArgs(DEFAULT_STORAGE_CONFIG.ID5).returns(JSON_RESPONSE_ID5_CONSENT);
          const clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);

          // when
          const cachedResponse = clientStore.getResponse();

          // then
          log.info(cachedResponse);
          expect(cachedResponse).to.deep.eq(TEST_RESPONSE_ID5_CONSENT);
        });

        it('should store response object', function () {
          // given
          const clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);

          // when
          clientStore.putResponseV1(TEST_RESPONSE_ID5_CONSENT);

          // then
          expect(localStorage.setItemWithExpiration).to.be.calledWith(DEFAULT_STORAGE_CONFIG.ID5, encodeURIComponent(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)));
        });

        it('should store response json', function () {
          // given
          const clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);

          // when
          clientStore.putResponseV1(JSON.stringify(TEST_RESPONSE_ID5_CONSENT));

          // then
          expect(localStorage.setItemWithExpiration).to.be.calledWith(DEFAULT_STORAGE_CONFIG.ID5, encodeURIComponent(JSON.stringify(TEST_RESPONSE_ID5_CONSENT)));
        });
      });
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

          localStorage.updateObjectWithExpiration.callsFake((key, updFn) => {
            return updFn({
              response: {
                old: true
              },
              nb: 100
            });
          });
          // when
          const result = clientStore.storeResponseV2('abcd', response, responseTime);

          // then
          expect(localStorage.updateObjectWithExpiration).to.be.called;
          expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(new StoreItemConfig('id5id_v2_abcd', 15));
          let calledUpdateFn = localStorage.updateObjectWithExpiration.firstCall.args[1];

          expect(result).to.be.eql({
              response: response,
              responseTimestamp: responseTime,
              nb: 100
            }
          );

          let updatedResponseEmpty = calledUpdateFn(undefined);

          // then
          expect(updatedResponseEmpty).to.be.eql({
              response: response,
              responseTimestamp: responseTime
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
        let extensionsConfig = new StoreItemConfig(CONSTANTS.STORAGE_CONFIG.EXTENSIONS.name, CONSTANTS.STORAGE_CONFIG.EXTENSIONS.expiresDays)
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

  });
});
