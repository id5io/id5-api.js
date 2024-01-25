import sinon from 'sinon';
import {API_TYPE, GRANT_TYPE, LocalStorageGrant} from '../../src/consent.js';
import {ClientStore} from '../../src/clientStore.js';
import {LocalStorage} from '../../src/localStorage.js';
import {StorageConfig, StoreItemConfig} from '../../src/store.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {cyrb53Hash} from '../../src/utils.js';

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

        it('should store a hash of the pd string for later comparison', function () {
          // given
          const clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);

          // when
          clientStore.putHashedPd(999, 'testpd');

          // then
          expect(localStorage.setItemWithExpiration).to.have.been.calledWith(
            DEFAULT_STORAGE_CONFIG.PD.withNameSuffixed(999),
            cyrb53Hash('testpd'));
        });

        [
          ['test_stored_pd', 'some_other_pd', false],
          ['test_stored_pd_2', 'test_stored_pd_2', true],
          ['test_stored_pd_2', '', true],
          ['test_stored_pd_2', undefined, true],
          [undefined, undefined, true],
          [undefined, 'some_pd', false]
        ].forEach(([storedPd, comparisonPd, expectedResult]) => {
          it(`should detect whether pd (${comparisonPd}) is better than the one seen before (${storedPd})`, function () {
            // given
            const clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);
            localStorage.getItemWithExpiration
              .withArgs(DEFAULT_STORAGE_CONFIG.PD.withNameSuffixed(888))
              .returns(typeof (storedPd) === 'string' ? cyrb53Hash(storedPd) : storedPd);

            const result = clientStore.isStoredPdUpToDate(888, comparisonPd);

            // then
            expect(result).to.eq(expectedResult);
          });
        });

        [
          [{destination: '977', ids: [1, 2, 3]}, {destination: '977', ids: [1, 2, 3]}, true],
          [{destination: '977', ids: [1, 2, 3]}, {destination: '976', ids: [1, 2, 3]}, false],
          [{destination: '977', ids: [1, 2, 3]}, {destination: '977', ids: [1, 77, 3]}, false],
          [{destination: '977', ids: [1, 2, 3]}, undefined, false],
          [undefined, {destination: '977', ids: [1, 2, 3]}, true], // special behaviour
          [undefined, undefined, true]
        ].forEach(([storedSegments, comparisonSegments, expectedResult]) => {
          it(`should detect whether segments (${JSON.stringify(comparisonSegments)}) are different than those seen before (${JSON.stringify(storedSegments)})`, function () {
            // given
            const clientStore = new ClientStore(grantChecker, localStorage, DEFAULT_STORAGE_CONFIG, log);
            localStorage.getItemWithExpiration
              .withArgs(DEFAULT_STORAGE_CONFIG.SEGMENTS.withNameSuffixed(787))
              .returns(typeof (storedSegments) === 'object' ? cyrb53Hash(JSON.stringify(storedSegments)) : storedSegments);

            const result = clientStore.storedSegmentsMatchesSegments(787, comparisonSegments);

            // then
            expect(result).to.eq(expectedResult);
          });
        });
      });
    });
    describe('V2', function () {


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

          // when
          clientStore.storeResponseV2('abcd', response, responseTime);

          // then
          expect(localStorage.updateObjectWithExpiration).to.be.called;
          expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(new StoreItemConfig('id5id_v2_abcd', 90));
          let calledUpdateFn = localStorage.updateObjectWithExpiration.firstCall.args[1];

          // when
          let updatedResponse = calledUpdateFn({
            response: {
              old: true
            },
            nb: 100
          });

          // then
          expect(updatedResponse).to.be.eql({
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

        it('should increase nb', function () {
          // when
          clientStore.incNbV2('abcd');

          // then
          expect(localStorage.updateObjectWithExpiration).to.be.called;
          expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(new StoreItemConfig('id5id_v2_abcd', 90));
          let calledUpdateFn = localStorage.updateObjectWithExpiration.firstCall.args[1];
          // when
          let updatedObject = calledUpdateFn({
            response: {
              universal_uid: 'uid',
              signature: 'sig',
              cache_control: {
                max_age_sec: 3600
              }
            },
            nb: 100
          });

          // then
          expect(updatedObject).to.be.eql({
              response: {
                universal_uid: 'uid',
                signature: 'sig',
                cache_control: {
                  max_age_sec: 3600
                }
              },
              nb: 101
            }
          );

          // when
          let updatedObjectInvalidNb = calledUpdateFn({nb: 'invalid'});

          // then
          expect(updatedObjectInvalidNb).to.be.eql({nb: 1});

          // when
          let updatedObjectEmpty = calledUpdateFn(undefined);

          // then
          expect(updatedObjectEmpty).to.be.eql({nb: 1});
        });

        it('should set nb value', function () {
          // given
          const nbValue = 0;

          // when
          clientStore.setNbV2('abcd', nbValue);

          // then
          expect(localStorage.updateObjectWithExpiration).to.be.called;
          expect(localStorage.updateObjectWithExpiration.firstCall.args[0]).to.be.eql(new StoreItemConfig('id5id_v2_abcd', 90));
          let calledUpdateFn = localStorage.updateObjectWithExpiration.firstCall.args[1];
          // when
          let updatedObject = calledUpdateFn({
            response: {
              universal_uid: 'uid',
              signature: 'sig',
              cache_control: {
                max_age_sec: 3600
              }
            },
            nb: 100
          });

          // then
          expect(updatedObject).to.be.eql({
              response: {
                universal_uid: 'uid',
                signature: 'sig',
                cache_control: {
                  max_age_sec: 3600
                }
              },
              nb: nbValue
            }
          );

          // when
          let updatedObjectInvalidNb = calledUpdateFn({nb: 'invalid'});

          // then
          expect(updatedObjectInvalidNb).to.be.eql({nb: nbValue});

          // when
          let updatedObjectEmpty = calledUpdateFn(undefined);

          // then
          expect(updatedObjectEmpty).to.be.eql({nb: nbValue});
        });
      });
    });
  });
});
