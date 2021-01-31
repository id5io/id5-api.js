import sinon from 'sinon';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import ClientStore from '../../src/clientStore';
import * as abTesting from '../../src/abTesting';

require('src/id5-api.js');

// need to manually set version since the test process doesn't set it like gulp build does
ID5.version = 'TESTING';

let expect = require('chai').expect;

describe('ID5 JS API', function () {
  const TEST_ID5_PARTNER_ID = 99;
  const ID5_FETCH_ENDPOINT = `https://id5-sync.com/g/v2/${TEST_ID5_PARTNER_ID}.json`;
  const ID5_CALL_ENDPOINT = `https://id5-sync.com/i/${TEST_ID5_PARTNER_ID}/8.gif`;
  const ID5_SYNC_ENDPOINT = `https://id5-sync.com/s/${TEST_ID5_PARTNER_ID}/8.gif`;
  const TEST_ID5ID_STORAGE_CONFIG = {
    name: 'id5id',
    expiresDays: 90
  };
  const TEST_ID5ID_STORAGE_CONFIG_EXPIRED = {
    name: 'id5id',
    expiresDays: -5
  };
  const TEST_LAST_STORAGE_CONFIG = {
    name: 'id5id_last',
    expiresDays: 90
  };
  const TEST_CONSENT_DATA_STORAGE_CONFIG = {
    name: 'id5id_cached_consent_data',
    expiresDays: 30
  };
  const TEST_PD_STORAGE_CONFIG = {
    name: `id5id_cached_pd_${TEST_ID5_PARTNER_ID}`,
    expiresDays: 30
  };
  const TEST_NB_STORAGE_CONFIG = {
    name: `id5id_${TEST_ID5_PARTNER_ID}_nb`,
    expiresDays: 90
  };
  const TEST_FS_STORAGE_CONFIG = {
    name: 'id5id_fs',
    expiresDays: 7
  };
  const TEST_PRIVACY_STORAGE_CONFIG = {
    name: 'id5id_privacy',
    expiresDays: 30
  }

  const TEST_PRIVACY_ALLOWED = JSON.stringify({
    'jurisdiction': 'other',
    'id5_consent': true
  });
  const TEST_PRIVACY_DISALLOWED = JSON.stringify({
    'jurisdiction': 'gdpr',
    'id5_consent': false
  });

  const TEST_CONTROL_GROUP_USERID = '0';
  const TEST_CONTROL_GROUP_LINKTYPE = 0;
  const TEST_STORED_ID5ID = 'teststoredid5id';
  const TEST_STORED_SIGNATURE = 'abcdef';
  const TEST_STORED_LINK_TYPE = 0;
  const STORED_JSON = JSON.stringify({
    'universal_uid': TEST_STORED_ID5ID,
    'cascade_needed': false,
    'signature': TEST_STORED_SIGNATURE,
    'link_type': TEST_STORED_LINK_TYPE,
    'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
  });

  const TEST_RESPONSE_ID5ID = 'testresponseid5id';
  const TEST_RESPONSE_SIGNATURE = 'uvwxyz';
  const TEST_RESPONSE_LINK_TYPE = 1;
  const JSON_RESPONSE_ID5_CONSENT = JSON.stringify({
    'universal_uid': TEST_RESPONSE_ID5ID,
    'cascade_needed': false,
    'signature': TEST_RESPONSE_SIGNATURE,
    'link_type': TEST_RESPONSE_LINK_TYPE,
    'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
  });
  const JSON_RESPONSE_CASCADE = JSON.stringify({
    'universal_uid': TEST_RESPONSE_ID5ID,
    'cascade_needed': true,
    'signature': TEST_RESPONSE_SIGNATURE,
    'link_type': TEST_RESPONSE_LINK_TYPE,
    'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
  });
  const JSON_RESPONSE_NO_ID5_CONSENT = JSON.stringify({
    'universal_uid': TEST_RESPONSE_ID5ID,
    'cascade_needed': false,
    'signature': TEST_RESPONSE_SIGNATURE,
    'link_type': TEST_RESPONSE_LINK_TYPE,
    'privacy': JSON.parse(TEST_PRIVACY_DISALLOWED)
  });

  const testClientStore = new ClientStore(() => true);

  beforeEach(function () {
    ID5.debug = false;
    ID5.debugBypassConsent = false;
    ID5.allowLocalStorageWithoutConsentApi = false;
    ID5.localStorageAllowed = false;
  });

  function resetAll() {
    utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_NB_STORAGE_CONFIG);
  }

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
      const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
      expect(id5Status).to.exist;
    });
  });

  describe('Configuration and Parameters', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });
    afterEach(function () {
      ajaxStub.restore();
    });

    describe('Required Parameters', function () {
      it('should fail if partnerId not set in config', function () {
        let id5Status;
        try {
          id5Status = ID5.init({ debugBypassConsent: true });
        } catch (e) { }

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status).to.be.undefined;
      });

      it('should fail if ID5.version is not set', function () {
        let version;
        let id5Status;
        try {
          version = ID5.version;
          ID5.version = undefined;

          id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
        } catch (e) { }

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status).to.be.undefined;
        ID5.version = version;
      });
    });
  });

  describe('Standard Storage and Responses', function () {
    before(function () {
      resetAll();
    });
    afterEach(function () {
      resetAll();
    });

    describe('Legacy Response from Server without Privacy Data', function () {
      let ajaxStub;
      let response = JSON.parse(JSON_RESPONSE_ID5_CONSENT);
      response.privacy = undefined;
      response = JSON.stringify(response);

      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(response);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should call server and handle response without privacy data', function () {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, allowLocalStorageWithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(id5Status.isFromCache()).to.be.false;
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(response);
        expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.null;
      });
    });

    describe('Consent on Request and Response', function () {
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
        it('should request new value with default parameters with consent override', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.partner).to.be.equal(TEST_ID5_PARTNER_ID);
          expect(requestData.s).to.be.equal('');
          expect(requestData.o).to.be.equal('api');
          expect(requestData.v).to.be.equal('TESTING');
          expect(requestData.pd).to.be.equal('');
          expect(requestData.rf).to.include('http://localhost');
          expect(requestData.top).to.be.equal(1);
          expect(requestData.gdpr).to.exist;
          expect(requestData.gdpr_consent).to.exist;

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.false;
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
          expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash(''));
        });

        it('should request new value with pd in request when pd config is set with consent override', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, pd: 'pubdata' });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.pd).to.be.equal('pubdata');
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash('pubdata'));
        });
      });

      describe('Stored Value with No Refresh Needed', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should use stored value with consent override', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 1000 });

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.true;
        });

        it('should use stored value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

          sinon.assert.notCalled(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.true;
        });
      });

      describe('Stored Value with Refresh Needed', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
        });

        it('should request new value with consent override', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Stored Value with Missing Last Stored Value', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        });

        it('should request new value with consent override', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Expired Stored Value with Refresh Not Needed', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should request new value with consent override', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value and not use stored value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Stored Data Change Forces Refresh with Refresh Not Needed', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
        });

        describe('Stored Consent Changes', function () {
          before(function () {
            utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });
          afterEach(function () {
            utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });

          describe('TCF v1', function () {
            const testConsentDataFromCmp = {
              gdprApplies: true,
              consentData: 'cmpconsentstring',
              apiVersion: 1
            };
            let cmpStub;

            beforeEach(function () {
              window.__cmp = function () {};
              cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
                args[2](testConsentDataFromCmp);
              });
            });

            afterEach(function () {
              cmpStub.restore();
              delete window.__cmp;
            });

            it('should call id5 servers if empty stored consent data', function () {
              testClientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored consent data matches current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.notCalled(ajaxStub);
            });
          });

          describe('TCF v2', function () {
            let testConsentDataFromCmp = {
              getTCData: {
                gdprApplies: true,
                tcString: 'cmpconsentstring',
                eventStatus: 'tcloaded',
                apiVersion: 2
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
              testClientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored consent data matches current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

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
              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.notCalled(ajaxStub);
            });

            it('should call id5 servers if empty stored pd data with consent override', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, '');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored pd data does not match current pd with consent override', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored pd data matches current pd with consent override', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 1000, pd: 'storedpd' });

              sinon.assert.notCalled(ajaxStub);
            });
          });

          describe('With Consent From Privacy Storage', function() {
            it('should call id5 servers if empty stored pd data with consent from privacy storage', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID);

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored pd data does not match current pd with consent from privacy storage', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored pd data matches current pd with consent from privacy storage', function () {
              testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000, pd: 'storedpd' });

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

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

          sinon.assert.calledOnce(ajaxStub);

          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.s).to.be.equal('');
          expect(requestData['1puid']).to.be.undefined;

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5.1st storage if local storage is empty', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

          sinon.assert.calledOnce(ajaxStub);
          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature');

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty', function () {
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

          sinon.assert.calledOnce(ajaxStub);
          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature');

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty and both legacy cookies exist', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5.1st', 'signature': 'legacycookiessignature-id5.1st'}), expStrFuture);
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5id.1st', 'signature': 'legacycookiesignature-id5id.1st'}), expStrFuture);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

          sinon.assert.calledOnce(ajaxStub);
          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
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

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

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
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ajaxStub.firstCall.args[3].withCredentials).to.be.true;

          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.partner).to.be.equal(TEST_ID5_PARTNER_ID);
          expect(requestData.s).to.be.equal('');
          expect(requestData.o).to.be.equal('api');
          expect(requestData.v).to.be.equal('TESTING');
          expect(requestData.pd).to.be.equal('');
          expect(requestData.rf).to.include('http://localhost');
          expect(requestData.top).to.be.equal(1);
          expect(requestData.gdpr).to.exist;
          expect(requestData.gdpr_consent).to.exist;

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.false;
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
          expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        });

        it('should not store consent data nor pd on first request, but should after refresh', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'pubdata' });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
          expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

          ID5.refreshId(id5Status);

          sinon.assert.calledOnce(ajaxStub);
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash('pubdata'));
          expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.not.be.null;
        });
      });

      describe('Stored Value', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        });

        it('should request new value with no refresh needed', function () {
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(id5Status.isFromCache()).to.be.false;
        });

        it('should request new value with refresh needed', function () {
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with missing last stored value', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with expired stored value with no refresh needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Stored Data Change Forces Refresh with Refresh Not Needed', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        describe('Stored Consent Changes', function () {
          before(function () {
            utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });
          afterEach(function () {
            utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
          });

          describe('TCF v1', function () {
            const testConsentDataFromCmp = {
              gdprApplies: true,
              consentData: 'cmpconsentstring',
              apiVersion: 1
            };
            let cmpStub;

            beforeEach(function () {
              window.__cmp = function () {};
              cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
                args[2](testConsentDataFromCmp);
              });
            });

            afterEach(function () {
              cmpStub.restore();
              delete window.__cmp;
            });

            it('should call id5 servers if empty stored consent data', function () {
              testClientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers even if stored consent data matches current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });
          });

          describe('TCF v2', function () {
            let testConsentDataFromCmp = {
              getTCData: {
                gdprApplies: true,
                tcString: 'cmpconsentstring',
                eventStatus: 'tcloaded',
                apiVersion: 2
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
              testClientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers even if stored consent data matches current consent', function () {
              testClientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });
          });
        });

        describe('Stored PD Changes', function () {
          before(function () {
            utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
          });
          afterEach(function () {
            utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
          });

          it('should call id5 servers if empty stored pd data', function () {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID);

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000, pd: 'requestpd' });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should call id5 servers if stored pd data does not match current pd', function () {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000, pd: 'requestpd' });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should call id5 servers even if stored pd data matches current pd', function () {
            testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 1000, pd: 'storedpd' });

            sinon.assert.calledOnce(ajaxStub);
          });
        });
      });
    });

    describe('No Consent on Response', function () {
      let ajaxStub;

      beforeEach(function () {
        utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_NO_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should request new value but not store response', function () {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(id5Status.isFromCache()).to.be.false;
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
      });

      it('should not store consent data nor pd on first request, nor after refresh', function () {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'pubdata' });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

        ID5.refreshId(id5Status);

        sinon.assert.calledOnce(ajaxStub);
        expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
      });

      it('should clear previous stored data after no-consent response', function() {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, 'last');
        utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 'nb');
        utils.setInLocalStorage(TEST_PD_STORAGE_CONFIG, 'pd');
        utils.setInLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG, 'consent_data');

        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

        sinon.assert.calledOnce(ajaxStub);
        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_LAST_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
      });
    });

    describe('No Consent in Stored Privacy Data', function() {
      let ajaxStub;

      beforeEach(function () {
        utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_NO_ID5_CONSENT);
        });
      });
      afterEach(function () {
        ajaxStub.restore();
      });

      it('should not request new id with previous no-consent privacy data', function() {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;
        expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
      });

      it('should not use stored response for ID with previous no-consent privacy data', function() {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.undefined;
        expect(id5Status.getLinkType()).to.be.undefined;
      });
    });
  });

  describe('Refresh ID Fetch Handling', function () {
    let ajaxStub;
    const TEST_REFRESH_RESPONSE_ID5ID = 'testrefreshresponseid5id';
    const TEST_REFRESH_RESPONSE_SIGNATURE = 'lmnopq';
    const TEST_REFRESH_RESPONSE_LINK_TYPE = 2;
    const REFRESH_JSON_RESPONSE = JSON.stringify({
      'universal_uid': TEST_REFRESH_RESPONSE_ID5ID,
      'cascade_needed': false,
      'signature': TEST_REFRESH_RESPONSE_SIGNATURE,
      'link_type': TEST_REFRESH_RESPONSE_LINK_TYPE
    });

    before(function () {
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });
    afterEach(function () {
      ajaxStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
    });

    describe('No Force Fetch', function () {
      let getIdSpy;

      beforeEach(function () {
        getIdSpy = sinon.spy(ID5, 'getId');
      });
      afterEach(function () {
        ID5.getId.restore();
      });

      it('should not call ID5 with no config changes', function () {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(id5Status);
        sinon.assert.notCalled(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
      });

      it('should not call ID5 with config changes that do not require a refresh', function () {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 50 });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(id5Status, false, { refreshInSeconds: 100 });
        sinon.assert.notCalled(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
      });

      it('should call ID5 with config changes that require a refresh', function () {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(id5Status, false, { pd: 'abcdefg' });
        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.pd).to.be.equal('abcdefg');

        expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(REFRESH_JSON_RESPONSE);
      });

      describe('Consent Checks TCF v2', function () {
        let testConsentDataFromCmp = {
          getTCData: {
            gdprApplies: true,
            tcString: 'cmpconsentstring',
            eventStatus: 'tcloaded',
            apiVersion: 2
          }
        };
        let cmpStub;

        before(function () {
          utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
        });
        beforeEach(function () {
          window.__tcfapi = function () {};
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2](testConsentDataFromCmp.getTCData, true);
          });
        });
        afterEach(function () {
          cmpStub.restore();
          delete window.__tcfapi;
          utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
        });

        it('should not call ID5 with no consent changes', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
          sinon.assert.calledOnce(ajaxStub);

          ajaxStub.restore();
          ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
            callbacks.success(REFRESH_JSON_RESPONSE);
          });

          ID5.refreshId(id5Status);
          sinon.assert.notCalled(ajaxStub);
          sinon.assert.calledTwice(getIdSpy);

          expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
        });

        it('should call ID5 when consent changes after init', function () {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
          sinon.assert.calledOnce(ajaxStub);

          ajaxStub.restore();
          ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
            callbacks.success(REFRESH_JSON_RESPONSE);
          });

          cmpStub.restore();
          delete window.__tcfapi;
          window.__tcfapi = function () {};
          cmpStub = sinon.stub(window, '__tcfapi').callsFake((...args) => {
            args[2]({
              gdprApplies: true,
              tcString: 'NEWcmpconsentstring',
              eventStatus: 'tcloaded',
              apiVersion: 2
            }, true);
          });

          ID5.refreshId(id5Status);
          sinon.assert.calledOnce(ajaxStub);
          sinon.assert.calledTwice(getIdSpy);

          expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(REFRESH_JSON_RESPONSE);
        });
      });
    });

    describe('Force Fetch', function () {
      let getIdSpy;

      beforeEach(function () {
        getIdSpy = sinon.spy(ID5, 'getId');
      });
      afterEach(function () {
        ID5.getId.restore();
      });

      it('should call ID5 with no other reason to refresh', function () {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(id5Status, true);
        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        expect(id5Status.getUserId()).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(REFRESH_JSON_RESPONSE);
      });
    });
  });

  describe('Async Responses', function () {
    const AJAX_RESPONSE_MS = 20;
    const CALLBACK_TIMEOUT_MS = 30;
    const SHORT_CALLBACK_TIMEOUT_MS = 10;
    // arbitrary timeout to test the ID later in the call process after any ajax calls
    // or other async activities
    const LONG_TIMEOUT = 150;

    before(function () {
      resetAll();
    });
    afterEach(function () {
      resetAll();
    });

    describe('Callbacks', function () {
      let onAvailableSpy, onUpdateSpy, onRefreshSpy;
      let ajaxStub;

      beforeEach(function () {
        onAvailableSpy = sinon.spy();
        onUpdateSpy = sinon.spy();
        onRefreshSpy = sinon.spy();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          utils.logError('in ajaxStub')
          setTimeout(() => { callbacks.success(JSON_RESPONSE_ID5_CONSENT) }, AJAX_RESPONSE_MS);
        });
      });

      afterEach(function() {
        onAvailableSpy.resetHistory();
        onUpdateSpy.resetHistory();
        onRefreshSpy.resetHistory();
        ajaxStub.restore();
      });

      describe('Check callback are fired with consent override', function () {
        it('should call back onAvailable then onUpdate with consent bypass', function (done) {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true })
          id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy).onRefresh(onRefreshSpy);

          sinon.assert.calledOnce(ajaxStub);
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
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
            id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

            sinon.assert.calledOnce(ajaxStub);
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
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
            id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy);

            sinon.assert.calledOnce(ajaxStub);
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
            utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);
          });

          it('should call onAvailable at time-out, but not onUpdate', function (done) {
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
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
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
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
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
        });

        it('should call onAvailable immediately even with time-out', function (done) {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
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
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
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
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should call onAvailable and onUpdate immediately even with time-out set', function (done) {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
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
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
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
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.calledOnce(ajaxStub);
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
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
          id5Status.onAvailable(onAvailableSpy, SHORT_CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.calledOnce(ajaxStub);
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
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
        });

        it('should call onAvailable immediately and only once with time-out set', function (done) {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });
          id5Status.onAvailable(onAvailableSpy, CALLBACK_TIMEOUT_MS).onUpdate(onUpdateSpy);

          sinon.assert.calledOnce(ajaxStub);
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
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });
          id5Status.onAvailable(onAvailableSpy).onUpdate(onUpdateSpy).onRefresh(onRefreshSpy);

          sinon.assert.calledOnce(ajaxStub);
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
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        describe('No Fetch Required on Refresh', function () {
          it('should call onAvailable from refresh immediately with time-out set', function (done) {
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
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
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
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
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
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

                sinon.assert.calledOnce(ajaxStub);
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
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
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

                sinon.assert.calledOnce(ajaxStub);
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
            const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });
            id5Status.onAvailable(onAvailableSpy);

            sinon.assert.notCalled(ajaxStub);
            setTimeout(() => {
              sinon.assert.calledOnce(onAvailableSpy);
              expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
              expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(id5Status, true).onRefresh(onRefreshSpy);
              sinon.assert.calledOnce(ajaxStub);
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

    describe('Setting ID5.userId', function () {
      let ajaxStub;

      describe('Consent in Response', function() {
        beforeEach(function () {
          ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
            setTimeout(() => { callbacks.success(JSON_RESPONSE_ID5_CONSENT) }, AJAX_RESPONSE_MS);
          });
        });
        afterEach(function () {
          ajaxStub.restore();
        })

        it('should never set userId with no stored value, no consent override, no-consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

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
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

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
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

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
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId after the response with no stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent override', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            done();
          }, LONG_TIMEOUT);
        });
      });

      describe('No-Consent in Response', function() {
        beforeEach(function () {
          ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
            setTimeout(() => { callbacks.success(JSON_RESPONSE_NO_ID5_CONSENT) }, AJAX_RESPONSE_MS);
          });
        });
        afterEach(function () {
          ajaxStub.restore();
        })

        it('should set userId after the response with no stored value, consent override', function (done) {
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_NO_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId after the response with no stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.undefined;
          expect(id5Status.getLinkType()).to.be.undefined;

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent override', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_NO_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should clear stored values after receiving no-consent response', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 1);
          testClientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'pd');
          utils.setInLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG, 'consent_data');
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'pd', refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
          expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(STORED_JSON);
          expect(utils.getFromLocalStorage(TEST_LAST_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);

          setTimeout(() => {
            expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_LAST_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });
      });
    });
  });

  describe('Fire Usersync Pixel', function () {
    let ajaxStub;
    let syncStub;

    before(function () {
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_FS_STORAGE_CONFIG);
    });
    beforeEach(function () {
      syncStub = sinon.stub(utils, 'deferPixelFire').callsFake(function(url, initCallback, callback) {
        if (utils.isFn(initCallback)) {
          initCallback();
        }
        if (utils.isFn(callback)) {
          callback();
        }
      });
    });
    afterEach(function () {
      ajaxStub.restore();
      syncStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_FS_STORAGE_CONFIG);
    });

    describe('Without Calling ID5', function () {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success('{}');
        });
      });

      it('should not fire sync pixel if ID5 is not called', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

        sinon.assert.notCalled(ajaxStub);
        sinon.assert.notCalled(syncStub);
      });
    });

    describe('With Cascade Needed', function () {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_CASCADE);
        });
      });

      it('should fire "call" sync pixel if ID5 is called and cascades_needed is true and no partnerUserId is provided', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
      });

      it('should fire "sync" sync pixel if ID5 is called and cascades_needed is true and partnerUserId is provided', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledOnce(syncStub);
        expect(JSON.parse(ajaxStub.args[0][2]).puid).to.be.equal('abc123');
        expect(syncStub.args[0][0]).to.contain(ID5_SYNC_ENDPOINT);
        expect(syncStub.args[0][0]).to.contain('puid=abc123');
      });
    });

    describe('Without Cascade Needed', function () {
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(JSON_RESPONSE_ID5_CONSENT);
        });
      });

      it('should not fire sync pixel if ID5 is called and cascades_needed is false', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.notCalled(syncStub);
      });
    });

    describe('Force Sync', function () {
      const AJAX_RESPONSE_MS = 10;
      beforeEach(function () {
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          setTimeout(() => { callbacks.success(JSON_RESPONSE_CASCADE) }, AJAX_RESPONSE_MS);
        });
      });

      it('sends fs=1 for new user without partnerUserId then sets fs storage to 1', function (done) {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
          expect(syncStub.args[0][0]).to.contain('fs=1');
          expect(syncStub.args[0][0]).to.not.contain('puid=');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(1);

          done();
        }, AJAX_RESPONSE_MS);
      });
      it('sends fs=1 for new user with partnerUserId then sets fs storage to 1', function (done) {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        expect(JSON.parse(ajaxStub.args[0][2]).puid).to.be.equal('abc123');
        setTimeout(() => {
          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_SYNC_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
          expect(syncStub.args[0][0]).to.contain('fs=1');
          expect(syncStub.args[0][0]).to.contain('puid=abc123');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(1);

          done();
        }, AJAX_RESPONSE_MS);
      });
      it('sends fs=0 for previously synced user', function (done) {
        utils.setInLocalStorage(TEST_FS_STORAGE_CONFIG, '1');

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

        sinon.assert.calledOnce(ajaxStub);
        setTimeout(() => {
          sinon.assert.calledOnce(syncStub);
          expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
          expect(syncStub.args[0][0]).to.contain(`id5id=${TEST_RESPONSE_ID5ID}`);
          expect(syncStub.args[0][0]).to.contain('fs=0');

          const fs = parseInt(utils.getFromLocalStorage(TEST_FS_STORAGE_CONFIG));
          expect(fs).to.be.equal(1);

          done();
        }, AJAX_RESPONSE_MS);
      });
    });
  });

  describe('Counters', function () {
    let ajaxStub;
    before(function () {
      resetAll();
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });
    afterEach(function () {
      ajaxStub.restore();
      resetAll();
    });

    it('should set counter to 1 if no existing counter cookie and not calling ID5 servers', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
    it('should increment counter when not calling ID5 servers if existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(6);
    });
    it('should not increment counter when not calling ID5 servers if no existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(5);
    });
    it('should reset counter to 0 after calling ID5 servers if ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(6);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });
    it('should reset counter to 0 after calling ID5 servers if ID in cookie without a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(1);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });
    it('should reset counter to 1 after calling ID5 servers if no ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
    it('should reset counter to 1 after calling ID5 servers if no ID in cookie without a previous counter', function () {
      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, debugBypassConsent: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
  });

  describe('A/B Testing', function () {
    let ajaxStub;
    let isInControlGroupStub;

    before(function () {
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      ID5.userId = undefined;
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });
    afterEach(function () {
      ajaxStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      ID5.userId = undefined;
    });

    describe('Function Availability', function() {
      it('should set exposeUserId to true without any config', function() {
        const id5Status = ID5.init({ partnerId: TEST_ID5_PARTNER_ID });
        expect(id5Status.exposeUserId()).to.be.true;
      });
    });

    describe('Not in Control Group', function() {
      let apiConfig = {
        partnerId: TEST_ID5_PARTNER_ID,
        debugBypassConsent: true,
        abTesting: { enabled: true, controlGroupPct: 0.5 } // config not relevant with the stub
      };

      beforeEach(function () {
        isInControlGroupStub = sinon.stub(abTesting, 'isInControlGroup').callsFake(() => {
          return false;
        });
      });
      afterEach(function () {
        isInControlGroupStub.restore();
      });

      it('should expose ID5.userId from a server response', function () {
        const id5Status = ID5.init(apiConfig);

        sinon.assert.calledOnce(ajaxStub);
        expect(id5Status.getUserId()).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
        expect(id5Status.exposeUserId()).to.be.true;
      });

      it('should expose ID5.userId from a stored response', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        const id5Status = ID5.init(apiConfig);

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.equal(TEST_STORED_ID5ID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_STORED_LINK_TYPE);
        expect(id5Status.exposeUserId()).to.be.true;
      });
    });

    describe('In Control Group', function() {
      let apiConfig = {
        partnerId: TEST_ID5_PARTNER_ID,
        debugBypassConsent: true,
        abTesting: { enabled: true, controlGroupPct: 0.5 } // config not relevant with the stub
      };

      beforeEach(function () {
        isInControlGroupStub = sinon.stub(abTesting, 'isInControlGroup').callsFake(() => {
          return true;
        });
      });
      afterEach(function () {
        isInControlGroupStub.restore();
      });

      it('should not expose ID5.userId from a server response', function () {
        const id5Status = ID5.init(apiConfig);

        sinon.assert.calledOnce(ajaxStub);
        expect(id5Status.getUserId()).to.be.equal(TEST_CONTROL_GROUP_USERID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_CONTROL_GROUP_LINKTYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
        expect(id5Status.exposeUserId()).to.be.false;
      });

      it('should not expose ID5.userId from a stored response', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        const id5Status = ID5.init(apiConfig);

        sinon.assert.notCalled(ajaxStub);
        expect(id5Status.getUserId()).to.be.equal(TEST_CONTROL_GROUP_USERID);
        expect(id5Status.getLinkType()).to.be.equal(TEST_CONTROL_GROUP_LINKTYPE);
        expect(id5Status.exposeUserId()).to.be.false;
      });
    });
  });
});
