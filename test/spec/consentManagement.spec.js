import sinon, {spy, stub} from 'sinon';
import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';

chai.should();
chai.use(sinonChai);
import {
    API_TYPE,
    ConsentManagement,
    GRANT_TYPE,
    ConsentData, LocalStorageGrant
} from '../../lib/consentManagement.js';
import * as utils from '../../lib/utils.js';
import CONSTANTS from '../../lib/constants.json';
import {StorageConfig} from "../../lib/config.js";
import {NoopLogger} from "@id5io/multiplexing";

const STORAGE_CONFIG = new StorageConfig();

function newConsentManagement(localStorageMock, forceGrant = false) {
    return new ConsentManagement(localStorageMock, STORAGE_CONFIG, forceGrant, NoopLogger);
}

describe('Consent Management', function () {
    let localStorageMock, callbackSpy;

    beforeEach(function () {
        callbackSpy = spy();

        spy(utils, 'logError');
        spy(utils, 'logWarn');

        localStorageMock = {
            getItemWithExpiration: stub(),
            setItemWithExpiration: stub()
        };
    });

    afterEach(function () {
        callbackSpy.resetHistory();
        utils.logWarn.restore();
        utils.logError.restore();
    });

    it('should provide consent data when settled', async () => {
        const consentManagement = newConsentManagement(localStorageMock);

        // when
        let consentDataPromise = consentManagement.getConsentData();
        let consentData = new ConsentData();
        consentManagement.setConsentData(consentData);
        // then
        return consentDataPromise.then(consent => {
            expect(consent).to.be.eq(consentData);
        });
    });

    it('should allow reset and provide new consent when settled', async () => {
        const consentManagement = newConsentManagement(localStorageMock);

        // when
        let consentDataPromise = consentManagement.getConsentData();
        let consentData = new ConsentData();
        consentData.api = API_TYPE.USP_V1;
        let anotherConsentData = new ConsentData();
        anotherConsentData.api = API_TYPE.ID5_ALLOWED_VENDORS;

        consentManagement.setConsentData(consentData);
        // then
        return consentDataPromise.then(consent => {
            expect(consent).to.be.eq(consentData);
            consentManagement.resetConsentData(false);
            let promiseAfterReset = consentManagement.getConsentData();
            consentManagement.setConsentData(anotherConsentData);
            return promiseAfterReset;
        }).then(consent => {
            expect(consent).to.be.eq(anotherConsentData);
        });
    });

    describe('Provisional local storage access grant', function () {
        it('should be allowed provisionally if privacy data is not set', function () {
            const consent = newConsentManagement(localStorageMock);
            const localStorageGrant = consent.localStorageGrant();
            expect(localStorageGrant.allowed).to.be.true;
            expect(localStorageGrant.grantType).to.equal(GRANT_TYPE.PROVISIONAL);
            expect(localStorageGrant.api).to.equal(API_TYPE.NONE);
        });

        const tests = [
            {expected_result: {allowed: true, grantType: GRANT_TYPE.PROVISIONAL, api: API_TYPE.NONE}, data: {}},
            {
                expected_result: {allowed: true, grantType: GRANT_TYPE.ID5_CONSENT, api: API_TYPE.NONE},
                data: {id5_consent: true}
            },
            {
                expected_result: {allowed: false, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE.NONE},
                data: {jurisdiction: 'gdpr'}
            },
            {
                expected_result: {allowed: true, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE.NONE},
                data: {jurisdiction: 'other'}
            },
            {
                expected_result: {allowed: false, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE.NONE},
                data: {jurisdiction: 'gdpr', id5_consent: false}
            },
            {
                expected_result: {allowed: true, grantType: GRANT_TYPE.ID5_CONSENT, api: API_TYPE.NONE},
                data: {jurisdiction: 'gdpr', id5_consent: true}
            },
            {
                expected_result: {allowed: true, grantType: GRANT_TYPE.ID5_CONSENT, api: API_TYPE.NONE},
                data: {jurisdiction: 'other', id5_consent: true}
            },
            {
                expected_result: {allowed: true, grantType: GRANT_TYPE.JURISDICTION, api: API_TYPE.NONE},
                data: {jurisdiction: 'other', id5_consent: false}
            }
        ];
        tests.forEach((test) => {
            it(`should be allowed:${test.expected_result.allowed}, grantType:${test.expected_result.grantType} with stored privacy data ${JSON.stringify(test.data)}`, function () {
                localStorageMock.getItemWithExpiration.callsFake((config) => {
                    expect(config.name).to.equal(CONSTANTS.STORAGE_CONFIG.PRIVACY.name);
                    expect(config.expiresDays).to.equal(CONSTANTS.STORAGE_CONFIG.PRIVACY.expiresDays);
                    return JSON.stringify(test.data);
                });
                const consent = newConsentManagement(localStorageMock);
                const localStorageGrant = consent.localStorageGrant();
                expect(localStorageGrant.allowed).to.equal(test.expected_result.allowed);
                expect(localStorageGrant.grantType).to.equal(test.expected_result.grantType);
                expect(localStorageGrant.api).to.equal(test.expected_result.api);
            });
        });
    });

    describe('Local storage access grant', function () {
        it(`allows local storage forced by config`, async ()=> {
            const consent = newConsentManagement(localStorageMock, true);
            const localStorageGrant = consent.localStorageGrant();
            expect(localStorageGrant.allowed).to.be.true;
            expect(localStorageGrant.grantType).to.equal(GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG);
            expect(localStorageGrant.api).to.equal(API_TYPE.NONE);
        });

        it('returns consent based local grant when consent set and has determined API', async () => {
            // given
            const consentManagement = newConsentManagement(localStorageMock);
            let consentData = new ConsentData();
            consentData.api = API_TYPE.USP_V1;
            let localStorageGrantStub = sinon.stub(consentData, 'localStorageGrant');
            let localStorageGrant = new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.USP_V1);
            localStorageGrantStub.returns(localStorageGrant);
            consentManagement.setConsentData(consentData);

            //when
            const result = consentManagement.localStorageGrant();

            // then
            expect(localStorageGrantStub).to.be.called;
            expect(result).to.be.equal(localStorageGrant);
        });

        it(`allows local storage forced by config after reset`, function ()  {
            // given
            const consentManagement = newConsentManagement(localStorageMock, false);
            let consentData = new ConsentData();
            consentData.api = API_TYPE.USP_V1;
            let localStorageGrantStub = sinon.stub(consentData, 'localStorageGrant');
            let localStorageGrant = new LocalStorageGrant(true, GRANT_TYPE.CONSENT_API, API_TYPE.USP_V1);
            localStorageGrantStub.returns(localStorageGrant);
            consentManagement.setConsentData(consentData);

            //when
            const result = consentManagement.localStorageGrant();

            // then
            expect(result).to.be.equal(localStorageGrant);

            // when
            consentManagement.resetConsentData(true);
            const newResult = consentManagement.localStorageGrant();
            expect(newResult.allowed).to.be.true;
            expect(newResult.grantType).to.equal(GRANT_TYPE.FORCE_ALLOWED_BY_CONFIG);
            expect(newResult.api).to.equal(API_TYPE.NONE);
        })
    });
});
