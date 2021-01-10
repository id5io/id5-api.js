import sinon from 'sinon';
import { config } from 'src/config';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { resetConsentData } from 'src/consentManagement';
import * as clientStore from 'src/clientStore';

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

  const TEST_CONTROL_GROUP_VALUE = 0;
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

  function resetAll() {
    utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
    utils.removeFromLocalStorage(TEST_NB_STORAGE_CONFIG);
    ID5.userId = undefined;
    ID5.linkType = undefined;
    ID5.fromCache = undefined;
    config.resetConfig();
    resetConsentData();
  }

  describe('Core API Availability', function () {
    afterEach(function () {
      config.resetConfig();
    });

    it('should have a global variable ID5', function () {
      expect(ID5).to.be.a('object');
    });
    it('should have function ID5.init', function () {
      expect(ID5.init).to.be.a('function');
    });
    it('should be loaded', function () {
      expect(ID5.loaded).to.be.a('boolean');
      expect(ID5.loaded).to.be.true;
      expect(ID5.initialized).to.be.a('boolean');
      expect(ID5.initialized).to.be.false;
      expect(ID5.callbackFired).to.be.a('boolean');
      expect(ID5.callbackFired).to.be.false;
    });
    it('should be initialized', function () {
      let ajaxStub;
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
      expect(ID5.initialized).to.be.true;

      ajaxStub.restore();
    });
  });

  describe('Configuration and Parameters', function () {
    let ajaxStub;

    before(function () {
      ID5.userId = undefined;
      ID5.linkType = undefined;
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      ID5.userId = undefined;
      ID5.linkType = undefined;
    });

    describe('Set and Get Config', function () {
      it('should have user-defined config and final config available', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

        expect(ID5.getProvidedConfig().partnerId).to.be.equal(TEST_ID5_PARTNER_ID);
        expect(ID5.config.partnerId).to.be.equal(TEST_ID5_PARTNER_ID);
        expect(ID5.getConfig().partnerId).to.be.equal(TEST_ID5_PARTNER_ID);

        expect(ID5.getProvidedConfig().pd).to.be.undefined;
        expect(ID5.config.pd).to.be.equal('');
        expect(ID5.getConfig().pd).to.be.equal('');

        expect(ID5.getProvidedConfig().refreshInSeconds).to.be.equal(10);
        expect(ID5.config.refreshInSeconds).to.be.equal(10);
        expect(ID5.getConfig().refreshInSeconds).to.be.equal(10);
      });

      it('should update providedConfig and config with ID5.setConfig()', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        expect(ID5.getConfig().pd).to.be.equal('');

        ID5.setConfig({ pd: 'newpd' });

        expect(ID5.config.pd).to.be.equal('newpd');
        expect(ID5.getConfig().pd).to.be.equal('newpd');
        expect(ID5.getProvidedConfig().pd).to.be.equal('newpd');
      });
    });

    describe('Required Parameters', function () {
      afterEach(function () {
        config.resetConfig();
      });

      it('should fail if partnerId not set in config', function () {
        try {
          ID5.init({ allowID5WithoutConsentApi: true });
        } catch (e) { }

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
        expect(ID5.linkType).to.be.undefined;
      });

      it('should fail if ID5.version is not set', function () {
        let version;
        try {
          version = ID5.version;
          ID5.version = undefined;

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        } catch (e) { }

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
        expect(ID5.linkType).to.be.undefined;
        ID5.version = version;
      });

      it('should throw exception if ID5.version is not set', function () {
        let version;
        version = ID5.version;
        ID5.version = undefined;

        expect(function () { ID5.init({ partnerId: TEST_ID5_PARTNER_ID }) }).throw();

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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(ID5.fromCache).to.be.false;
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
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

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
          expect(requestData.tpids).to.be.undefined;
          expect(requestData.gdpr).to.exist;
          expect(requestData.gdpr_consent).to.exist;

          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(ID5.fromCache).to.be.false;
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
          expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.equal(utils.cyrb53Hash(''));
        });

        it('should request new value with pd in request when pd config is set with consent override', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, pd: 'pubdata' });

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
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000 });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(ID5.fromCache).to.be.true;
        });

        it('should use stored value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(ID5.fromCache).to.be.true;
        });
      });

      describe('Stored Value with Refresh Needed', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
        });

        it('should request new value with consent override', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Stored Value with Missing Last Stored Value', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        });

        it('should request new value with consent override', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });
      });

      describe('Expired Stored Value with Refresh Not Needed', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should request new value with consent override', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value and not use stored value with consent from privacy storage', function () {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
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
              resetConsentData();
            });

            it('should call id5 servers if empty stored consent data', function () {
              clientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored consent data matches current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

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
              resetConsentData();
            });

            it('should call id5 servers if empty stored consent data', function () {
              clientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored consent data matches current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.notCalled(ajaxStub);
            });
          });
        });

        describe('Stored PD Changes', function () {
          before(function () {
            clientStore.clearHashedPd(TEST_ID5_PARTNER_ID);
          });
          afterEach(function () {
            clientStore.clearHashedPd(TEST_ID5_PARTNER_ID);
          });

          describe('With Consent Override', function() {
            it('should not call id5 servers if no stored pd data with consent override', function () {
              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.notCalled(ajaxStub);
            });

            it('should call id5 servers if empty stored pd data with consent override', function () {
              clientStore.putHashedPd(TEST_ID5_PARTNER_ID, '');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored pd data does not match current pd with consent override', function () {
              clientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored pd data matches current pd with consent override', function () {
              clientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 1000, pd: 'storedpd' });

              sinon.assert.notCalled(ajaxStub);
            });
          });

          describe('With Consent From Privacy Storage', function() {
            it('should call id5 servers if empty stored pd data with consent from privacy storage', function () {
              clientStore.putHashedPd(TEST_ID5_PARTNER_ID);

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored pd data does not match current pd with consent from privacy storage', function () {
              clientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000, pd: 'requestpd' });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should not call id5 servers if stored pd data matches current pd with consent from privacy storage', function () {
              clientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000, pd: 'storedpd' });

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

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);

          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.s).to.be.equal('');
          expect(requestData['1puid']).to.be.undefined;

          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5.1st storage if local storage is empty', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature');

          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty', function () {
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid', 'signature': 'legacycookiesignature'}), expStrFuture);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature');

          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);

          utils.setCookie('id5id.1st', '', expStrExpired);
        });

        it('should call id5 servers with existing signature value from legacy cookie id5id.1st storage if local storage is empty and both legacy cookies exist', function () {
          utils.setCookie('id5.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5.1st', 'signature': 'legacycookiessignature-id5.1st'}), expStrFuture);
          utils.setCookie('id5id.1st', JSON.stringify({'universal_uid': 'legacycookieuid-id5id.1st', 'signature': 'legacycookiesignature-id5id.1st'}), expStrFuture);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(requestData.s).to.be.equal('legacycookiesignature-id5id.1st');

          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);

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

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

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

      describe('TPIDs with Consent Override', function () {
        it('should include valid tpids', function () {
          const testTpid = [
            {
              partnerId: 123,
              uid: 'ABC'
            }
          ];

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.eql(testTpid);
        });

        it('should not include tpids if an object', function () {
          const testTpid = { abc: 123 };

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
        });

        it('should not include tpids if an empty array', function () {
          const testTpid = [];

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
        });

        it('should not include tpids if a string', function () {
          const testTpid = 'string';

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, tpids: testTpid });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
        });

        it('should not include tpids if not set', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          const dataPrebid = JSON.parse(ajaxStub.firstCall.args[2]);
          expect(dataPrebid.tpids).to.be.undefined;
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
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

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
          expect(requestData.tpids).to.be.undefined;
          expect(requestData.gdpr).to.exist;
          expect(requestData.gdpr_consent).to.exist;

          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(ID5.fromCache).to.be.false;
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
          expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        });

        it('should not store consent data nor pd on first request, but should after refresh', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'pubdata' });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
          expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

          ID5.refreshId();

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

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(ID5.fromCache).to.be.false;
        });

        it('should request new value with refresh needed', function () {
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with missing last stored value', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        });

        it('should request new value with expired stored value with no refresh needed', function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG_EXPIRED, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
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
              resetConsentData();
            });

            it('should call id5 servers if empty stored consent data', function () {
              clientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers even if stored consent data matches current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 1
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

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
              resetConsentData();
            });

            it('should call id5 servers if empty stored consent data', function () {
              clientStore.putHashedConsentData();

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers if stored consent data does not match current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'storedconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

              sinon.assert.calledOnce(ajaxStub);
            });

            it('should call id5 servers even if stored consent data matches current consent', function () {
              clientStore.putHashedConsentData({
                gdprApplies: true,
                consentString: 'cmpconsentstring',
                apiVersion: 2
              });

              ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000 });

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
            clientStore.putHashedPd(TEST_ID5_PARTNER_ID);

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000, pd: 'requestpd' });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should call id5 servers if stored pd data does not match current pd', function () {
            clientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000, pd: 'requestpd' });

            sinon.assert.calledOnce(ajaxStub);
          });

          it('should call id5 servers even if stored pd data matches current pd', function () {
            clientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'storedpd');

            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 1000, pd: 'storedpd' });

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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(ID5.fromCache).to.be.false;
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
      });

      it('should not store consent data nor pd on first request, nor after refresh', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, pd: 'pubdata' });

        sinon.assert.calledOnce(ajaxStub);
        expect(ajaxStub.firstCall.args[0]).to.contain(ID5_FETCH_ENDPOINT);
        expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;

        ID5.refreshId();

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

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

        sinon.assert.calledOnce(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
        expect(ID5.linkType).to.be.undefined;
        expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.be.null;
        expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.be.null;
      });

      it('should not use stored response for ID with previous no-consent privacy data', function() {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.undefined;
        expect(ID5.linkType).to.be.undefined;
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
      ID5.userId = undefined;
      ID5.linkType = undefined;
      ID5.initialized = false;
    });
    beforeEach(function () {
      ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
        callbacks.success(JSON_RESPONSE_ID5_CONSENT);
      });
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_PD_STORAGE_CONFIG);
      ID5.userId = undefined;
      ID5.linkType = undefined;
      ID5.initialized = false;
    });

    describe('Parameters and Config', function () {
      it('should throw exception if refreshId is called before init', function () {
        expect(function () { ID5.refreshId() }).throw();
      });

      it('should error if first parameter is not a boolean', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        let logErrorSpy = sinon.spy(utils, 'logError');
        let getIdSpy = sinon.spy(ID5, 'getId');

        ID5.refreshId({ a: 1 });

        sinon.assert.calledOnce(logErrorSpy);
        sinon.assert.notCalled(getIdSpy);

        utils.logError.restore();
        ID5.getId.restore();
      });
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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId();
        sinon.assert.notCalled(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
      });

      it('should not call ID5 with config changes that do not require a refresh', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 50 });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(false, { refreshInSeconds: 100 });
        sinon.assert.notCalled(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
      });

      it('should call ID5 with config changes that require a refresh', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(false, { pd: 'abcdefg' });
        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        const requestData = JSON.parse(ajaxStub.firstCall.args[2]);
        expect(requestData.pd).to.be.equal('abcdefg');

        expect(ID5.userId).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
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
          resetConsentData();
        });

        it('should not call ID5 with no consent changes', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });
          sinon.assert.calledOnce(ajaxStub);

          ajaxStub.restore();
          ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
            callbacks.success(REFRESH_JSON_RESPONSE);
          });

          ID5.refreshId();
          sinon.assert.notCalled(ajaxStub);
          sinon.assert.calledTwice(getIdSpy);

          expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
        });

        it('should call ID5 when consent changes after init', function () {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });
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

          ID5.refreshId();
          sinon.assert.calledOnce(ajaxStub);
          sinon.assert.calledTwice(getIdSpy);

          expect(ID5.userId).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });
        sinon.assert.calledOnce(ajaxStub);

        ajaxStub.restore();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          callbacks.success(REFRESH_JSON_RESPONSE);
        });

        ID5.refreshId(true);
        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledTwice(getIdSpy);

        expect(ID5.userId).to.be.equal(TEST_REFRESH_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_REFRESH_RESPONSE_LINK_TYPE);
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
      let callbackSpy;
      let ajaxStub;

      beforeEach(function () {
        callbackSpy = sinon.spy();
        ajaxStub = sinon.stub(utils, 'ajax').callsFake(function(url, callbacks, data, options) {
          setTimeout(() => { callbacks.success(JSON_RESPONSE_ID5_CONSENT) }, AJAX_RESPONSE_MS);
        });
      });

      afterEach(function() {
        callbackSpy.resetHistory();
        ajaxStub.restore();
      });

      describe('Check callbackFired', function () {
        it('should have callbackFired:false if no callback', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          expect(ID5.callbackFired).to.be.false;
          sinon.assert.calledOnce(ajaxStub);

          setTimeout(() => {
            setTimeout(() => {
              expect(ID5.callbackFired).to.be.false;
              sinon.assert.notCalled(callbackSpy);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });

        it('should have callbackFired:true if callback', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

          sinon.assert.notCalled(callbackSpy);
          expect(ID5.callbackFired).to.be.false;
          sinon.assert.calledOnce(ajaxStub);

          setTimeout(() => {
            // callbackFired value is set before the callback is called
            expect(ID5.callbackFired).to.be.true;
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });
      });

      describe('No Stored Value, No Consent Override', function () {
        describe('Empty Stored Privacy', function() {
          it('should call callback at timeout with callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

            sinon.assert.calledOnce(ajaxStub);
            expect(ID5.userId).to.be.undefined;
            expect(ID5.linkType).to.be.undefined;

            setTimeout(() => {
              sinon.assert.notCalled(callbackSpy);
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
                expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);

                // make sure the watchdog timeout is cleared before moving on
                setTimeout(() => {
                  sinon.assert.calledOnce(callbackSpy);
                  done();
                }, LONG_TIMEOUT);
              }, (CALLBACK_TIMEOUT_MS + 1));
            }, 0);
          });

          it('should not call callback without callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy });

            sinon.assert.calledOnce(ajaxStub);
            expect(ID5.userId).to.be.undefined;
            expect(ID5.linkType).to.be.undefined;

            setTimeout(() => {
              sinon.assert.notCalled(callbackSpy);
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
                expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
                done();
              }, LONG_TIMEOUT);
            }, AJAX_RESPONSE_MS);
          });
        });

        describe('No Consent in Stored Privacy', function () {
          beforeEach(function() {
            utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);
          });

          it('should call callback at timeout with callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

            sinon.assert.notCalled(ajaxStub);
            expect(ID5.userId).to.be.undefined;
            expect(ID5.linkType).to.be.undefined;

            setTimeout(() => {
              sinon.assert.notCalled(callbackSpy);
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                expect(ID5.userId).to.be.undefined;
                expect(ID5.linkType).to.be.undefined;

                // make sure the watchdog timeout is cleared before moving on
                setTimeout(() => {
                  sinon.assert.calledOnce(callbackSpy);
                  done();
                }, LONG_TIMEOUT);
              }, (CALLBACK_TIMEOUT_MS + 1));
            }, 0);
          });

          it('should not call callback without callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy });

            sinon.assert.notCalled(ajaxStub);
            expect(ID5.userId).to.be.undefined;
            expect(ID5.linkType).to.be.undefined;

            setTimeout(() => {
              sinon.assert.notCalled(callbackSpy);
              setTimeout(() => {
                sinon.assert.notCalled(ajaxStub);
                expect(ID5.userId).to.be.undefined;
                expect(ID5.linkType).to.be.undefined;
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

        it('should call callback immediately with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);

            // make sure the watchdog timeout is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              done();
            }, LONG_TIMEOUT);
          }, 0);
        });

        it('should call callback immediately without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, callback: callbackSpy });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
            done();
          }, 0);
        });
      });

      describe('Stored Value, No Refresh, With  Override', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        it('should call callback immediately with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);

            // make sure the watchdog timeout is cleared before moving on
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              done();
            }, LONG_TIMEOUT);
          }, 0);
        });

        it('should call callback immediately without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

          sinon.assert.notCalled(ajaxStub);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
            done();
          }, 0);
        });
      });

      describe('No Stored Value, With Consent Override', function () {
        it('should call callback after server response with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);

              // make sure the watchdog timeout is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                done();
              }, LONG_TIMEOUT);
            }, 0);
          }, AJAX_RESPONSE_MS);
        });

        it('should call callback after timeout with callback timeout set if server response takes too long', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: SHORT_CALLBACK_TIMEOUT_MS });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            // TODO this test is flaky and fails 1 out of 5 times when running local tests with error on this line for "expected callback to not have been called but was called once"
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.undefined;
              expect(ID5.linkType).to.be.undefined;

              // make sure the watchdog timeout is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                done();
              }, LONG_TIMEOUT);
            }, 0);
          }, SHORT_CALLBACK_TIMEOUT_MS);
        });

        it('should call callback after server response without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            sinon.assert.notCalled(callbackSpy);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });
      });

      describe('Stored Value, Refresh Needed, With Consent Override', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
        });

        it('should call callback immediately and only once with callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
          }, 0);

          setTimeout(() => {
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);

              // make sure the watchdog timeout is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                done();
              }, LONG_TIMEOUT);
            }, 0);
          }, AJAX_RESPONSE_MS);
        });

        it('should call callback immediately and only once without callback timeout set', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
          setTimeout(() => {
            sinon.assert.calledOnce(callbackSpy);
          }, 0);

          setTimeout(() => {
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
              expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
              done();
            }, 0);
          }, AJAX_RESPONSE_MS);
        });
      });

      describe('With RefreshId', function () {
        beforeEach(function () {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
        });

        describe('No Fetch Required on Refresh', function () {
          it('should call callback from refresh immediately with callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

            sinon.assert.notCalled(ajaxStub);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);

              // make sure the watchdog timeout from init is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
                expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

                ID5.refreshId();

                sinon.assert.notCalled(ajaxStub);
                setTimeout(() => {
                  sinon.assert.calledTwice(callbackSpy);
                  expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
                  expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

                  // make sure the watchdog timeout from refresh is cleared before moving on
                  setTimeout(() => {
                    sinon.assert.calledTwice(callbackSpy);
                    expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
                    expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
                    done();
                  }, LONG_TIMEOUT);
                }, 0);
              }, LONG_TIMEOUT);
            }, 0);
          });

          it('should call callback from refresh immediately without callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

            sinon.assert.notCalled(ajaxStub);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
              expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId();

              sinon.assert.notCalled(ajaxStub);
              setTimeout(() => {
                sinon.assert.calledTwice(callbackSpy);
                expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
                expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
                done();
              }, 0);
            }, 0);
          });
        });

        describe('Fetch Required on Refresh', function () {
          it('should call callback from refresh after server response with callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: CALLBACK_TIMEOUT_MS });

            sinon.assert.notCalled(ajaxStub);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);

              // make sure the watchdog timeout from init is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);
                expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
                expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

                ID5.refreshId(true);

                sinon.assert.calledOnce(ajaxStub);
                setTimeout(() => {
                  setTimeout(() => {
                    sinon.assert.calledTwice(callbackSpy);
                    expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
                    expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);

                    // make sure the watchdog timeout from refresh is cleared before moving on
                    setTimeout(() => {
                      sinon.assert.calledTwice(callbackSpy);
                      expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
                      expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
                      done();
                    }, LONG_TIMEOUT);
                  }, 0);
                }, AJAX_RESPONSE_MS);
              }, LONG_TIMEOUT);
            }, 0);
          });

          it('should call callback from refresh after timeout with callback timeout set if server response takes too long', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy, callbackTimeoutInMs: SHORT_CALLBACK_TIMEOUT_MS });

            sinon.assert.notCalled(ajaxStub);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
              expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

              // make sure the watchdog timeout from init is cleared before moving on
              setTimeout(() => {
                sinon.assert.calledOnce(callbackSpy);

                ID5.refreshId(true);

                sinon.assert.calledOnce(ajaxStub);
                setTimeout(() => {
                  setTimeout(() => {
                    sinon.assert.calledTwice(callbackSpy);
                    expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
                    expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

                    // make sure the watchdog timeout from refresh is cleared before moving on
                    setTimeout(() => {
                      sinon.assert.calledTwice(callbackSpy);
                      done();
                    }, LONG_TIMEOUT);
                  }, 0);
                }, SHORT_CALLBACK_TIMEOUT_MS);
              }, LONG_TIMEOUT);
            }, 0);
          });

          it('should call callback from refresh after server response without callback timeout set', function (done) {
            ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, callback: callbackSpy });

            sinon.assert.notCalled(ajaxStub);
            setTimeout(() => {
              sinon.assert.calledOnce(callbackSpy);
              expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
              expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

              ID5.refreshId(true);

              sinon.assert.calledOnce(ajaxStub);
              setTimeout(() => {
                setTimeout(() => {
                  sinon.assert.calledTwice(callbackSpy);
                  expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
                  expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
                  done();
                }, 0);
              }, AJAX_RESPONSE_MS);
            }, 0);
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

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            expect(ID5.userId).to.be.undefined;
            expect(ID5.linkType).to.be.undefined;
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and not change, with stored value, no refresh, no consent override, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and not change, with stored value, no refresh, consent override', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.notCalled(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId after the response with no stored value, consent override', function (done) {
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId after the response with no stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent override', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
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
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_NO_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId after the response with no stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.undefined;
          expect(ID5.linkType).to.be.undefined;

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent override', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_NO_ID5_CONSENT);
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should set userId immediately and update it after response received with stored value, consent in privacy data', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
            expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.null;
            expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_DISALLOWED);
            done();
          }, LONG_TIMEOUT);
        });

        it('should clear stored values after receiving no-consent response', function (done) {
          utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
          utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now() - (8000 * 1000));
          utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 1);
          clientStore.putHashedPd(TEST_ID5_PARTNER_ID, 'pd');
          utils.setInLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG, 'consent_data');
          utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);

          ID5.init({ partnerId: TEST_ID5_PARTNER_ID, pd: 'pd', allowID5WithoutConsentApi: false, refreshInSeconds: 10 });

          sinon.assert.calledOnce(ajaxStub);
          expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
          expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
          expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(STORED_JSON);
          expect(utils.getFromLocalStorage(TEST_LAST_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_PD_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_CONSENT_DATA_STORAGE_CONFIG)).to.not.be.null;
          expect(utils.getFromLocalStorage(TEST_PRIVACY_STORAGE_CONFIG)).to.be.eq(TEST_PRIVACY_ALLOWED);

          setTimeout(() => {
            expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
            expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
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
      ID5.userId = undefined;
      ID5.linkType = undefined;
    });
    beforeEach(function () {
      syncStub = sinon.stub(utils, 'deferPixelFire').callsFake(function(url, initCallback, callback) {
        if (utils.isFn(initCallback)) {
          initCallback();
        };
        if (utils.isFn(callback)) {
          callback();
        }
      });
    });
    afterEach(function () {
      config.resetConfig();
      ajaxStub.restore();
      syncStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_FS_STORAGE_CONFIG);
      ID5.userId = undefined;
      ID5.linkType = undefined;
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

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledOnce(syncStub);
        expect(syncStub.args[0][0]).to.contain(ID5_CALL_ENDPOINT);
      });

      it('should fire "sync" sync pixel if ID5 is called and cascades_needed is true and partnerUserId is provided', function () {
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
        sinon.assert.calledOnce(syncStub);
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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

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
        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true, partnerUserId: 'abc123' });

        sinon.assert.calledOnce(ajaxStub);
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

        ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

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

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
    it('should increment counter when not calling ID5 servers if existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(6);
    });
    it('should not increment counter when not calling ID5 servers if no existing ID in cookie', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_DISALLOWED);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: false });

      sinon.assert.notCalled(ajaxStub);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(5);
    });
    it('should reset counter to 0 after calling ID5 servers if ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
      utils.setInLocalStorage(TEST_PRIVACY_STORAGE_CONFIG, TEST_PRIVACY_ALLOWED);
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(6);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });
    it('should reset counter to 0 after calling ID5 servers if ID in cookie without a previous counter', function () {
      utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(1);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(0);
    });
    it('should reset counter to 1 after calling ID5 servers if no ID in cookie with a previous counter', function () {
      utils.setInLocalStorage(TEST_NB_STORAGE_CONFIG, 5);

      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(5);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
    it('should reset counter to 1 after calling ID5 servers if no ID in cookie without a previous counter', function () {
      ID5.init({ partnerId: TEST_ID5_PARTNER_ID, allowID5WithoutConsentApi: true });

      sinon.assert.calledOnce(ajaxStub);
      const requestPayload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(requestPayload.nbPage).to.be.equal(0);

      const nb = parseInt(utils.getFromLocalStorage(TEST_NB_STORAGE_CONFIG));
      expect(nb).to.be.equal(1);
    });
  });

  describe('A/B Testing', function () {
    let ajaxStub;
    let exposeIdStub;

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
      config.resetConfig();
      ajaxStub.restore();
      utils.removeFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG);
      utils.removeFromLocalStorage(TEST_LAST_STORAGE_CONFIG);
      ID5.userId = undefined;
    });

    describe('Function Availability', function() {
      it('should have function ID5.exposeId', function() {
        expect(ID5.exposeId).to.be.a('function');
      });

      it('should set exposeId to true without any config', function() {
        expect(ID5.exposeId()).to.be.true;
      });
    });

    describe('Not in Control Group', function() {
      let apiConfig = {
        partnerId: TEST_ID5_PARTNER_ID,
        allowID5WithoutConsentApi: true,
        abTesting: { enabled: true, controlGroupPct: 0.5 } // config not relevant with the stub
      };

      beforeEach(function () {
        exposeIdStub = sinon.stub(ID5, 'exposeId').callsFake(function() {
          return true;
        });
      });
      afterEach(function () {
        exposeIdStub.restore();
      });

      it('should expose ID5.userId from a server response', function () {
        ID5.init(apiConfig);

        sinon.assert.calledOnce(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_RESPONSE_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_RESPONSE_LINK_TYPE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
        expect(ID5.exposeId()).to.be.true;
      });

      it('should expose ID5.userId from a stored response', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        ID5.init(apiConfig);

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_STORED_ID5ID);
        expect(ID5.linkType).to.be.equal(TEST_STORED_LINK_TYPE);
        expect(ID5.exposeId()).to.be.true;
      });
    });

    describe('In Control Group', function() {
      let apiConfig = {
        partnerId: TEST_ID5_PARTNER_ID,
        allowID5WithoutConsentApi: true,
        abTesting: { enabled: true, controlGroupPct: 0.5 } // config not relevant with the stub
      };

      beforeEach(function () {
        exposeIdStub = sinon.stub(ID5, 'exposeId').callsFake(function() {
          return false;
        });
      });
      afterEach(function () {
        exposeIdStub.restore();
      });

      it('should not expose ID5.userId from a server response', function () {
        ID5.init(apiConfig);

        sinon.assert.calledOnce(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_CONTROL_GROUP_VALUE);
        expect(ID5.linkType).to.be.equal(TEST_CONTROL_GROUP_VALUE);
        expect(utils.getFromLocalStorage(TEST_ID5ID_STORAGE_CONFIG)).to.be.eq(JSON_RESPONSE_ID5_CONSENT);
        expect(ID5.exposeId()).to.be.false;
      });

      it('should not expose ID5.userId from a stored response', function () {
        utils.setInLocalStorage(TEST_ID5ID_STORAGE_CONFIG, STORED_JSON);
        utils.setInLocalStorage(TEST_LAST_STORAGE_CONFIG, Date.now());

        ID5.init(apiConfig);

        sinon.assert.notCalled(ajaxStub);
        expect(ID5.userId).to.be.equal(TEST_CONTROL_GROUP_VALUE);
        expect(ID5.linkType).to.be.equal(TEST_CONTROL_GROUP_VALUE);
        expect(ID5.exposeId()).to.be.false;
      });
    });
  });
});
