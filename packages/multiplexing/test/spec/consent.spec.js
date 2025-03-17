import {API_TYPE, GRANT_TYPE, ConsentData, LocalStorageGrant, GppConsentData, GppTcfData} from '../../src/consent.js';
import {ConsentSource} from '../../src/consent.js';

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
        vendorsConsentForId5Granted: true,
        consentString: 'ABCD'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv2': true
      }, createDebugInfo('TCFv2', true, true)));
      expect(consentData.consentString).to.be.eql('ABCD');
    });

    [
      API_TYPE.GPP_V1_1,
      API_TYPE.GPP_V1_0
    ].forEach((gppVersion) => {
      it(`should support API PREBID - ${gppVersion}`, () => {

        // when
        const consentData = ConsentData.createFrom({
          api: API_TYPE.PREBID,
          gppData: {
            version: gppVersion,
            localStoragePurposeConsent: true,
            vendorsConsentForId5Granted: true,
            applicableSections: [2],
            gppString: 'gppString'
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([gppVersion]);
        const expectedApi = {};
        expectedApi[gppVersion] = true;
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, expectedApi,
          createDebugInfo(gppVersion + '-tcfeuv2', true, true)));
        expect(consentData.gppData).to.be.eql(new GppConsentData(gppVersion, [2], 'gppString', new GppTcfData(true, true)));
      });
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

    it('should support API PREBID - TCFv2 & USPv1 & GPP', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.PREBID,
        gdprApplies: true,
        localStoragePurposeConsent: true,
        vendorsConsentForId5Granted: true,
        consentString: 'ABCD',
        ccpaString: 'ccpa',
        gppData: {
          version: API_TYPE.GPP_V1_0,
          localStoragePurposeConsent: true,
          vendorsConsentForId5Granted: true,
          applicableSections: [6],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2, API_TYPE.USP_V1, API_TYPE.GPP_V1_0]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv2': true,
        'USPv1': true,
        'GPPv1.0': true
      }, createDebugInfo('TCFv2', true, true, 'GPPv1.0-tcfeuv2', true, true)));
      expect(consentData.consentString).to.be.eql('ABCD');
      expect(consentData.ccpaString).to.be.eql('ccpa');
      expect(consentData.gppData).to.be.eql(new GppConsentData(API_TYPE.GPP_V1_0, [6], 'gppString', new GppTcfData(true, true)));
    });

    it('should support API TCFv1', () => {

      const consentData = ConsentData.createFrom({
        api: API_TYPE.TCF_V1,
        gdprApplies: true,
        localStoragePurposeConsent: true,
        vendorsConsentForId5Granted: true
      });

      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv1': true
      }, createDebugInfo('TCFv1', true, true)));
    });

    it('should support API TCFv2', () => {

      // when
      const consentData = ConsentData.createFrom({
        api: API_TYPE.TCF_V2,
        gdprApplies: true,
        localStoragePurposeConsent: true,
        vendorsConsentForId5Granted: true,
        consentString: 'ABCD'
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'TCFv2': true
      }, createDebugInfo('TCFv2', true, true)));
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
          vendorsConsentForId5Granted: true,
          applicableSections: [6],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_0]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'GPPv1.0': true
      }, createDebugInfo('GPPv1.0-tcfeuv2', true, true)));
      expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.0',
        [6],
        'gppString',
        new GppTcfData(true, true)
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
          vendorsConsentForId5Granted: true,
          applicableSections: [6, 7, 8],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'GPPv1.1': true
      }, createDebugInfo('GPPv1.1-tcfeuv2', true, true)));
      expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',
        [6,7,8],
        'gppString', new GppTcfData(true, true)
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
          vendorsConsentForId5Granted: true,
          consentString: 'ABCD'
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedTcfv2Grant, GRANT_TYPE.CONSENT_API, {
          'TCFv2': expectedTcfv2Grant
        }, createDebugInfo('TCFv2', lspc, true)));
        expect(consentData.consentString).to.be.eql('ABCD');
      });

      it(`should support API TCFv2(gdprApplies=${gdprApplies}, localStoragePurposeConsent=${lspc}) and USPv1`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.TCF_V2, API_TYPE.USP_V1],
          gdprApplies: gdprApplies,
          localStoragePurposeConsent: lspc,
          vendorsConsentForId5Granted: true,
          consentString: 'ABCD',
          ccpaString: 'ccpa'
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2, API_TYPE.USP_V1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedTcfv2Grant, GRANT_TYPE.CONSENT_API, {
          'TCFv2': expectedTcfv2Grant,
          'USPv1': true
        }, createDebugInfo('TCFv2', lspc, true)));
        expect(consentData.consentString).to.be.eql('ABCD');
        expect(consentData.ccpaString).to.be.eql('ccpa');
      });

      it(`should support API TCFv2(gdprApplies=${gdprApplies}, localStoragePurposeConsent=${lspc}) and GPP`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.TCF_V2, API_TYPE.GPP_V1_1],
          gdprApplies: gdprApplies,
          localStoragePurposeConsent: lspc,
          vendorsConsentForId5Granted: true,
          consentString: 'ABCD',
          gppData: {
            version: 'GPPv1.1',
            applicableSections: [6,7,8],
            gppString: 'gppString',
            euTcfSection: {
              localStoragePurposeConsent: true,
              vendorsConsentForId5Granted: true
            }
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.TCF_V2, API_TYPE.GPP_V1_1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedTcfv2Grant, GRANT_TYPE.CONSENT_API, {
          'TCFv2': expectedTcfv2Grant,
          'GPPv1.1': true
        }, createDebugInfo('TCFv2', lspc, true, 'GPPv1.1-tcfeuv2', true, true)));
        expect(consentData.consentString).to.be.eql('ABCD');
        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',
          [6, 7, 8],
          'gppString',
          new GppTcfData(true, true)
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
          applicableSections: [6],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_0]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'GPPv1.0': true
      }, createDebugInfo()));

      expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.0',
        [6],
        'gppString'
      ));
    });

    [
      [true, true, true],
      [false, true, false],
      [undefined, true, true],
      [true, false, false],
      [undefined, undefined, true],
    ].forEach(([lspc, vendorConsent, expectedGrant]) => {
      it(`should support API GPP v1.1 (lspc=${lspc}, vendorConsent=${vendorConsent})`, () => {

        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.GPP_V1_1],
          gppData: {
            version: 'GPPv1.1',
            applicableSections: [2],
            gppString: 'gppString',
            euTcfSection: {
              localStoragePurposeConsent: lspc,
              vendorsConsentForId5Granted: vendorConsent
            }
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedGrant, GRANT_TYPE.CONSENT_API, {
          'GPPv1.1': expectedGrant
        }, createDebugInfo('GPPv1.1-tcfeuv2', lspc, vendorConsent)));

        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',[2],'gppString', new GppTcfData(lspc, vendorConsent)));
      });
    });

    [
      [true, true, true],
      [false, true, true],
      [undefined, true, true],
      [true, false, true],
      [undefined, undefined, true],
    ].forEach(([lspc, vendorConsent, expectedGrant]) => {
      it(`should support API GPP v1.1 with canadian tcf(lspc=${lspc}, vendorConsent=${vendorConsent})`, () => {

        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.GPP_V1_1],
          gppData: {
            version: 'GPPv1.1',
            applicableSections: [5],
            gppString: 'gppString',
            canadaTcfSection: {
              localStoragePurposeConsent: lspc,
              vendorsConsentForId5Granted: vendorConsent
            }
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedGrant, GRANT_TYPE.CONSENT_API, {
          'GPPv1.1': expectedGrant
        }, createDebugInfo('GPPv1.1-tcfcav1', lspc, vendorConsent)));

        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',[5],'gppString', undefined, new GppTcfData(lspc, vendorConsent)));
      });
    });

    it(`should support API GPP v1.1 and USPv1`, () => {
      // when
      const consentData = ConsentData.createFrom({
        apiTypes: [API_TYPE.GPP_V1_1, API_TYPE.USP_V1],
        ccpaString: 'someString',
        gppData: {
          version: 'GPPv1.1',
          applicableSections: [6],
          gppString: 'gppString'
        }
      });

      // then
      expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1, API_TYPE.USP_V1]);
      expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, {
        'GPPv1.1': true,
        'USPv1': true
      }, createDebugInfo()));

      expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1',[6],  'gppString'));
      expect(consentData.ccpaString).to.be.eql('someString');
    });

    [
      [true, true, true, true, true],
      [false, true, true, true, false],
      [true, false, true, true, false],
      [true, true, false, true, false],
      [true, true, true, false, false],
    ].forEach(([gppStorageConsent, gppVendorConsent, tcfStorageConsent, tcfVendorConsent, expectedGrant]) => {
      it(`should support API GPP v1.1(lspc=${gppStorageConsent}, vendorConsent=${gppVendorConsent} and TCFv2(lspc=${tcfStorageConsent}, vendorConsent=${tcfVendorConsent}`, () => {
        // when
        const consentData = ConsentData.createFrom({
          apiTypes: [API_TYPE.GPP_V1_1, API_TYPE.TCF_V2],
          gdprApplies: true,
          consentString: 'string',
          localStoragePurposeConsent: tcfStorageConsent,
          vendorsConsentForId5Granted: tcfVendorConsent,
          gppData: {
            version: 'GPPv1.1',
            applicableSections: [2],
            gppString: 'gppString',
            euTcfSection: {
              localStoragePurposeConsent: gppStorageConsent,
              vendorsConsentForId5Granted: gppVendorConsent
            }
          }
        });

        // then
        expect(consentData.apiTypes).to.be.eql([API_TYPE.GPP_V1_1, API_TYPE.TCF_V2]);
        expect(consentData.localStorageGrant()).to.be.eql(new LocalStorageGrant(expectedGrant, GRANT_TYPE.CONSENT_API, {
          'GPPv1.1': gppStorageConsent && gppVendorConsent,
          'TCFv2': tcfStorageConsent && tcfVendorConsent
        }, createDebugInfo('TCFv2', tcfStorageConsent, tcfVendorConsent, 'GPPv1.1-tcfeuv2', gppStorageConsent, gppVendorConsent)));

        expect(consentData.gppData).to.be.eql(new GppConsentData('GPPv1.1', [2], 'gppString', new GppTcfData(gppStorageConsent, gppVendorConsent)));
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

    [
      //gdpr does not apply, so it does not matter if id5 has been given consent
      [false, false, true],
      [false, true, true],
      //gdpr applies, so we check if id5 has been given consent
      [true, true, true],
      [true, false, false],
      // undefined vendorsConsentForId5Granted is considered granted
      [true, undefined, true]
    ].forEach(([gdprApplies, vendorsConsentForId5Granted, result]) => {
      it(`should check if id5 has been given consent when apiType is TCF_V2 (gdprApplies=${gdprApplies},vendorsConsentForId5Granted=${vendorsConsentForId5Granted})`, () => {
          const consentData = ConsentData.createFrom({
            apiTypes: [API_TYPE.TCF_V2],
            gdprApplies: gdprApplies,
            localStoragePurposeConsent: true,
            vendorsConsentForId5Granted: vendorsConsentForId5Granted
          });

          // then
          expect(consentData.localStorageGrant().allowed).to.be.eql(result);
        }
      );
    });

    [
      [['131'], true],
      [['131', '130'], true],//id5 and sth else
      [['1'], false]
    ].forEach(([allowedVendors, result]) => {
      it(`should check if id5 has been given consent when apiType is ID5 (allowedVendors=${allowedVendors})`, () => {
          const consentData = ConsentData.createFrom({
            apiTypes: [API_TYPE.ID5_ALLOWED_VENDORS],
            allowedVendors: allowedVendors
          });

          // then
          expect(consentData.localStorageGrant().allowed).to.be.eql(result);
        }
      );
    });
    [
      //sections containing '2' and lscp being true will result to isGranted=true
      [[API_TYPE.GPP_V1_0], true, [2], true],
      [[API_TYPE.GPP_V1_0], false, [2], false],
      [[API_TYPE.GPP_V1_0], undefined, [2], true],
      [[API_TYPE.GPP_V1_1], true, [2], true],
      [[API_TYPE.GPP_V1_1], false, [2], false],
      [[API_TYPE.GPP_V1_1], undefined, [2], true]
    ].forEach(([apiType, lscp, sections, result]) => {
      it(`should check if id5 has been given consent when apiType is ${apiType} and lscp=${lscp}, applicableSections=${sections}`, () => {
          const consentData = ConsentData.createFrom({
            apiTypes: apiType,
            gppData: {
              version: 'GPPv1.1',
              localStoragePurposeConsent: true,
              vendorsConsentForId5Granted: lscp,
              applicableSections: sections,
              gppString: 'gppString'
            }
          });

          // then
          expect(consentData.localStorageGrant().allowed).to.be.eql(result);
        }
      );
    });

    it(`should check id5 has vendor consent when all api_types check result to true and apiType is GPP_V1_1 and TCF_V2`, () => {
        const consentData = ConsentData.createFrom({
          //both tcf_v2 and gpp_v1_1 result to true
          apiTypes: [API_TYPE.GPP_V1_1, API_TYPE.TCF_V2],
          gdprApplies: true,
          localStoragePurposeConsent: true,
          vendorsConsentForId5Granted: true,
          gppData: {
            version: 'GPPv1.1',
            localStoragePurposeConsent: true,
            vendorsConsentForId5Granted: true,
            applicableSections: [2],
            gppString: 'gppString'
          }
        });

        // then
        expect(consentData.localStorageGrant().allowed).to.be.eql(true);
      }
    );

    it(`should check that id5 has NOT Consent when not all api_types check result to true and apiType is GPP_V1_1 and TCF_V2`, () => {
        const consentData = ConsentData.createFrom({
          //both tcf_v2 =false and gpp_v1_1 = true
          apiTypes: [API_TYPE.GPP_V1_1, API_TYPE.TCF_V2],
          gdprApplies: true,
          vendorsConsentForId5Granted: false,//this makes the result to fail
          gppData: {
            version: 'GPPv1.1',
            localStoragePurposeConsent: true,
            vendorsConsentForId5Granted: false,
            applicableSections: [2],
            gppString: 'gppString'
          }
        });

        // then
        expect(consentData.localStorageGrant().allowed).to.be.eql(false);
      }
    );
  });


  function createDebugInfo(...argTriplet) {
    const debugInfo = {};

    for (let i = 0; i < argTriplet.length; i += 3) {
      const apiType = argTriplet[i];
      const localStoragePurposeConsent = argTriplet[i + 1];
      const vendorsConsentForId5Granted = argTriplet[i + 2];
      if (localStoragePurposeConsent !== undefined) {
        debugInfo[apiType + '-localStoragePurposeConsent'] = localStoragePurposeConsent;
      }
      if (vendorsConsentForId5Granted !== undefined) {
        debugInfo[apiType + '-vendorsConsentForId5Granted'] = vendorsConsentForId5Granted;
      }
    }

    return debugInfo;
  }
});
