import * as chai from 'chai';
import {expect} from 'chai';
import sinonChai from 'sinon-chai';import sinon from 'sinon';
import { API_TYPE, GRANT_TYPE, LocalStorageGrant, NoopLogger } from "@id5io/multiplexing";
import ClientStore from "../../lib/clientStore";
import LocalStorage from "../../lib/localStorage";
import { StorageConfig } from '../../lib/config';
import { JSON_RESPONSE_ID5_CONSENT, TEST_RESPONSE_ID5_CONSENT } from './test_utils';

chai.use(sinonChai);

const DEFAULT_STORAGE_CONFIG = new StorageConfig();
const _DEBUG = false;

describe.only('ClientStore', function() {
  let log;

  beforeEach(function() {
    log = _DEBUG ? console : NoopLogger;
  });

  [true, false].forEach(casus => {
    it(`should tell whether local storage is available in case ${casus}`, function() {
      // given
      const localStorage = sinon.createStubInstance(LocalStorage);
      localStorage.isAvailable.returns(casus);
      const clientStore = new ClientStore(undefined, localStorage, DEFAULT_STORAGE_CONFIG, log);

      // when
      const isAvailable = clientStore.isLocalStorageAvailable();

      // then
      expect(isAvailable).to.eq(casus);
    });
  });

  describe('with available local storage', function() {
    let localStorage;

    beforeEach(function() {
      localStorage = sinon.createStubInstance(LocalStorage);
      localStorage.isAvailable.returns(true);
    });

    it('should retrieve the previous response from local storage if local storage usage is granted', function() {
      // given
      const GRANT_CHECKER = () => new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
      localStorage.getItemWithExpiration.withArgs(DEFAULT_STORAGE_CONFIG.ID5).returns('%20%7B%20%22created_at%22%3A%20%222023-07-19T13%3A44%3A14.906Z%22%2C%20%22id5_consent%22%3A%20true%2C%20%22original_uid%22%3A%20%22ID5*_oid_%22%2C%20%22universal_uid%22%3A%20%22ID5*_uid_%22%2C%20%22signature%22%3A%20%22ID5_sig%22%2C%20%22link_type%22%3A%202%2C%20%22cascade_needed%22%3A%20true%2C%20%22privacy%22%3A%20%7B%20%22jurisdiction%22%3A%20%22gdpr%22%2C%20%22id5_consent%22%3A%20true%7D%2C%20%22ext%22%3A%20%7B%20%22linkType%22%3A%202%2C%20%22pba%22%3A%20%2220bQ7qtIJC9ikHGxmXgbIQ%3D%3D%22%7D%2C%20%22cache_control%22%3A%20%7B%20%22max_age_sec%22%3A%2015%20%7D%7D')
      const clientStore = new ClientStore(GRANT_CHECKER, localStorage, DEFAULT_STORAGE_CONFIG, log);

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
        cache_control: { max_age_sec: 15 }
      });
    });

    it('should retrieve the previous response from local storage when legacy encoding was used to store', function() {
      // given
      const GRANT_CHECKER = () => new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
      localStorage.getItemWithExpiration.withArgs(DEFAULT_STORAGE_CONFIG.ID5).returns(JSON_RESPONSE_ID5_CONSENT)
      const clientStore = new ClientStore(GRANT_CHECKER, localStorage, DEFAULT_STORAGE_CONFIG, log);

      // when
      const cachedResponse = clientStore.getResponse();

      // then
      log.info(cachedResponse);
      expect(cachedResponse).to.deep.eq(TEST_RESPONSE_ID5_CONSENT);
    });

    it('should not retrieve the previous response from local storage if local storage usage is not granted', function() {
      // given
      const GRANT_CHECKER = () => new LocalStorageGrant(false, GRANT_TYPE.CONSENT_API, API_TYPE.TCF_V2);
      localStorage.getItemWithExpiration.withArgs(DEFAULT_STORAGE_CONFIG.ID5).returns('%20%7B%20%22created_at%22%3A%20%222023-07-19T13%3A44%3A14.906Z%22%2C%20%22id5_consent%22%3A%20true%2C%20%22original_uid%22%3A%20%22ID5*_oid_%22%2C%20%22universal_uid%22%3A%20%22ID5*_uid_%22%2C%20%22signature%22%3A%20%22ID5_sig%22%2C%20%22link_type%22%3A%202%2C%20%22cascade_needed%22%3A%20true%2C%20%22privacy%22%3A%20%7B%20%22jurisdiction%22%3A%20%22gdpr%22%2C%20%22id5_consent%22%3A%20true%7D%2C%20%22ext%22%3A%20%7B%20%22linkType%22%3A%202%2C%20%22pba%22%3A%20%2220bQ7qtIJC9ikHGxmXgbIQ%3D%3D%22%7D%2C%20%22cache_control%22%3A%20%7B%20%22max_age_sec%22%3A%2015%20%7D%7D')
      const clientStore = new ClientStore(GRANT_CHECKER, localStorage, DEFAULT_STORAGE_CONFIG, log);

      // when
      const cachedResponse = clientStore.getResponse();

      // then
      expect(cachedResponse).to.be.undefined;
      expect(localStorage.getItemWithExpiration).to.not.have.been.called;
    });
  });
});
