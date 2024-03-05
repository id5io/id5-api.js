import {API_TYPE, GRANT_TYPE, ConsentData, LocalStorageGrant, GppConsentData} from '../../src/consent.js';
import {ConsentSource} from '../../src/data.js';

describe('Consent Data', function () {

  describe('assigned from old data', function () {

    it('should support API NONE', () => {

      const consentData = ConsentData.createFrom({
        source: ConsentSource.partner,
        api: API_TYPE.NONE
      });

      expect(consentData.apiTypes).to.be.eql([]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.PROVISIONAL));
    });

    it('should support allowed by config', () => {

      const consentData = ConsentData.createFrom({
        api: API_TYPE.NONE,
        forcedGrantByConfig: true
      });

      expect(consentData.apiTypes).to.be.eql([]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG));
    });

    it('should support API PREBID - TCFv2', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.PREBID,
        gdprApplies: true,
        localStoragePurposeConsent: true,
        consentString: 'ABCD'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv2': true
      }));
      expect(consentData.consentString).to.be.eql('ABCD');
    });

    it('should support API PREBID - USPv1', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.PREBID,
        ccpaString: 'ccpa'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.USP_V1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'USPv1': true
      }));
      expect(consentData.ccpaString).to.be.eql('ccpa');
    });

    it('should support API PREBID - TCFv2 & USPv1', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.PREBID,
        gdprApplies: true,
        localStoragePurposeConsent: true,
        consentString: 'ABCD',
        ccpaString: 'ccpa'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2, API_TYPE.USP_V1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv2': true,
        'USPv1': true
      }));
      expect(consentData.consentString).to.be.eql('ABCD');
      expect(consentData.ccpaString).to.be.eql('ccpa');
    });

    it('should support API TCFv1', () => {

      const consentData = ConsentData.createFrom({
        api: API_TYPE.TCF_V1,
        gdprApplies: true,
        localStoragePurposeConsent: true
      });

      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv1': true
      }));
    });

    it('should support API TCFv2', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.TCF_V2,
        gdprApplies: true,
        localStoragePurposeConsent: true,
        consentString: 'ABCD'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv2': true
      }));
      expect(consentData.consentString).to.be.eql('ABCD');
    });

    it('should support API USPv1', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.USP_V1,
        ccpaString: 'ABCD'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.USP_V1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'USPv1': true
      }));
      expect(consentData.ccpaString).to.be.eql('ABCD');
    });

    it('should support API GPP v1.0', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.GPP_V1_0,
        gppData: {
          version: 'GPPv1.0',
          localStoragePurposeConsent: true,
          applicableSections: [6],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_0]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'GPPv1.0': true
      }));
      expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.0',
        true,
        [6],
        'gppString'
      ));
    });

    it('should support API ID5_ALLOWED_VENDORS', () => {

      const consentData = ConsentData.createFrom({
        api: API_TYPE.ID5_ALLOWED_VENDORS,
        allowedVendors: ['131']
      });

      expect(consentData.apiTypes).to.be.eql([API_TYPE.ID5_ALLOWED_VENDORS]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'ID5': true
      }));
    });


    it('should support API GPP v1.1', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.GPP_V1_1,
        gppData: {
          version: 'GPPv1.1',
          localStoragePurposeConsent: true,
          applicableSections: [6, 7, 8],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'GPPv1.1': true
      }));
      expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',
        true,
        [6, 7, 8],
        'gppString'
      ));
    });
  });

  describe('assigned from new  data', function () {

    it('should support no API', () => {

      const consentData = ConsentData.createFrom({});

      expect(consentData.apiTypes).to.be.eql([]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.PROVISIONAL));
    });

    [
      [['131'], true],
      [['131', '61'], true],
      [['13'], false],
      [[], false]
    ].forEach(([allowedVendors, expectedGrant]) => {
      it(`should support API ID5_ALLOWED_VENDORS (${allowedVendors})`, () => {

        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.ID5_ALLOWED_VENDORS],
          allowedVendors: allowedVendors
        });

        expect(consentData.apiTypes).to.be.eql([API_TYPE.ID5_ALLOWED_VENDORS]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedGrant, GRANT_TYPE.CONSENT_API, {
          'ID5': expectedGrant
        }));
      });
    });

    [
      [true, true, true],
      [true, false, false],
      [false, true, true],
      [false, false, true],
      [false, undefined, true],
      [undefined, true, true],
      [undefined, false, false],
      [undefined, undefined, false]
    ].forEach(([gdprApplies, lspc, expectedTcfv2Grant]) => {
      it(`should support API TCFv2 (gdprApplies=${gdprApplies}, localStoragePurposeConsent=${lspc})`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.TCF_V2],
          gdprApplies: gdprApplies,
          localStoragePurposeConsent: lspc,
          consentString: 'ABCD'
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedTcfv2Grant, GRANT_TYPE.CONSENT_API, {
          'TCFv2': expectedTcfv2Grant
        }));
        expect(consentData.consentString).to.be.eql('ABCD');
      });

      it(`should support API TCFv2(gdprApplies=${gdprApplies}, localStoragePurposeConsent=${lspc}) and USPv1`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.TCF_V2, API_TYPE.USP_V1],
          gdprApplies: gdprApplies,
          localStoragePurposeConsent: lspc,
          consentString: 'ABCD',
          ccpaString: 'ccpa'
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2, API_TYPE.USP_V1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedTcfv2Grant, GRANT_TYPE.CONSENT_API, {
          'TCFv2': expectedTcfv2Grant,
          'USPv1': true
        }));
        expect(consentData.consentString).to.be.eql('ABCD');
        expect(consentData.ccpaString).to.be.eql('ccpa');
      });

      it(`should support API TCFv2(gdprApplies=${gdprApplies}, localStoragePurposeConsent=${lspc}) and GPP`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.TCF_V2, API_TYPE.GPP_V1_1],
          gdprApplies: gdprApplies,
          localStoragePurposeConsent: lspc,
          consentString: 'ABCD',
          gppData: {
            version: 'GPPv1.1',
            localStoragePurposeConsent: true,
            applicableSections: [6, 7, 8],
            gppString: 'gppString'
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2, API_TYPE.GPP_V1_1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedTcfv2Grant, GRANT_TYPE.CONSENT_API, {
          'TCFv2': expectedTcfv2Grant,
          'GPPv1.1': true
        }));
        expect(consentData.consentString).to.be.eql('ABCD');
        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',
          true,
          [6, 7, 8],
          'gppString'
        ));
      });
    });

    it('should support API USPv1', () => {

      // when
      const consentData = ConsentData.createFrom({
        apiTypes: [API_TYPE.USP_V1],
        ccpaString: 'ABCD'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.USP_V1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'USPv1': true
      }));
      expect(consentData.ccpaString).to.be.eql('ABCD');
    });

    it('should support API GPP v1.0', () => {

      // when
      const consentData = ConsentData.createFrom({
        apiTypes: [API_TYPE.GPP_V1_0],
        gppData: {
          version: 'GPPv1.0',
          localStoragePurposeConsent: true,
          applicableSections: [6],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_0]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'GPPv1.0': true
      }));
      expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.0',
        true,
        [6],
        'gppString'
      ));
    });

    [
      [true, [6, 7, 8], true],
      [false, [6], true],
      [undefined, [6], true],
      [true, [2, 6, 7, 8], true],
      [false, [2], false],
      [undefined, [2], false],
      [true, [], true],
      [false, [], false],
      [undefined, [], true],
      [true, [0], true],
      [false, [0], false],
      [undefined, [0], true],
      [true, [-1], true],
      [false, [-1], false],
      [undefined, [-1], true],
      [true, [7, 8], false],
      [false, [8], false],
      [undefined, [7], false]
    ].forEach(([lscp, sections, expectedGrant]) => {
      it(`should support API GPP v1.1 (localStoragePurposeConsent=${lscp}, applicableSections=${sections})`, () => {

        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.GPP_V1_1],
          gppData: {
            version: 'GPPv1.1',
            localStoragePurposeConsent: lscp,
            applicableSections: sections,
            gppString: 'gppString'
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedGrant, GRANT_TYPE.CONSENT_API, {
          'GPPv1.1': expectedGrant
        }));
        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',
          lscp,
          sections,
          'gppString'
        ));
      });

      it(`should support API GPP v1.1 (localStoragePurposeConsent=${lscp}, applicableSections=${sections}) and USPv1`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.GPP_V1_1, API_TYPE.USP_V1],
          ccpaString: 'someString',
          gppData: {
            version: 'GPPv1.1',
            localStoragePurposeConsent: lscp,
            applicableSections: sections,
            gppString: 'gppString'
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1, API_TYPE.USP_V1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedGrant, GRANT_TYPE.CONSENT_API, {
          'GPPv1.1': expectedGrant,
          'USPv1': true
        }));
        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',
          lscp,
          sections,
          'gppString'
        ));
        expect(consentData.ccpaString).to.be.eql('someString');
      });

      it(`should support API GPP v1.1 (localStoragePurposeConsent=${lscp}, applicableSections=${sections}) and TCFv2`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.GPP_V1_1, API_TYPE.TCF_V2],
          gdprApplies: true,
          consentString: 'string',
          localStoragePurposeConsent: true,
          gppData: {
            version: 'GPPv1.1',
            localStoragePurposeConsent: lscp,
            applicableSections: sections,
            gppString: 'gppString'
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1, API_TYPE.TCF_V2]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedGrant, GRANT_TYPE.CONSENT_API, {
          'GPPv1.1': expectedGrant,
          'TCFv2': true
        }));
        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',
          lscp,
          sections,
          'gppString'
        ));
        expect(consentData.consentString).to.be.eql('string');
      });
    });

    it('should support allowed by config', () => {

      const consentData = ConsentData.createFrom({
        apiTypes: [],
        forcedGrantByConfig: true
      });

      expect(consentData.apiTypes).to.be.eql([]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG));
    });
  });
});
