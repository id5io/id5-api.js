import sinon from 'sinon';
import {
  defaultInit,
  defaultInitBypassConsent,
  MultiplexInstanceStub,
  TEST_ID5_PARTNER_ID
} from './test_utils.js';
import {Id5Instance, PageLevelInfo, ID5_REGISTRY} from '../../lib/id5Instance.js';
import {Config, GCReclaimAllowed} from '../../lib/config.js';
import {ConsentDataProvider} from '../../lib/consentProvider.js';
import {CONSTANTS} from '@id5io/multiplexing/constants';
import {NO_OP_LOGGER} from '@id5io/multiplexing/logger';
import {ApiEvent, ConsentManagement, ConsentData} from '@id5io/multiplexing';
import {Id5CommonMetrics} from '../../lib/metrics.js';
import {UaHints} from '../../lib/uaHints.js';
import {version} from '../../generated/version.js';
import {TrueLinkAdapter} from '@id5io/multiplexing/trueLink';

function createInstance(config, metrics, multiplexingInstanceStub) {
  return new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
}

describe('Id5Instance', function () {
  const MOCK_PAGE_LEVEL_INFO = new PageLevelInfo(null, '0.0', true);
  const MOCK_CONSENT_DATA = new ConsentData();

  let multiplexingInstanceStub;
  let metrics;
  beforeEach(() => {
    multiplexingInstanceStub = new MultiplexInstanceStub();
    metrics = sinon.createStubInstance(Id5CommonMetrics);
  });

  describe('when cascade triggered', function () {
    let imageSpy;

    beforeEach(() => {
      imageSpy = sinon.spy(window, 'Image');
    });

    afterEach(() => {
      imageSpy.restore();
    });

    it('should fire "call" sync pixel with configured maxCascades, gpp info and gdpr info', function () {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      // when
      multiplexingInstanceStub.emit(ApiEvent.CASCADE_NEEDED, {
        partnerId: TEST_ID5_PARTNER_ID,
        gppString: 'GPP_STRING',
        gppSid: 'GPP_SID',
        userId: 'ID5-ID-31313',
        consentString: 'GDPR_CONSENT_STRING',
        gdprApplies: 1
      });

      // then
      expect(imageSpy).to.have.been.calledOnce;

      const pixelUrl = imageSpy.firstCall.returnValue.src;
      const url = new URL(pixelUrl);
      expect(url.host).to.eq(`id5-sync.com`);
      expect(url.pathname).to.eq(`/i/${TEST_ID5_PARTNER_ID}/4.gif`);
      expect(url.searchParams.get('id5id')).to.eq('ID5-ID-31313');
      expect(url.searchParams.get('o')).to.eq('api');
      expect(url.searchParams.get('gdpr_consent')).to.eq('GDPR_CONSENT_STRING');
      expect(url.searchParams.get('gdpr')).to.eq('1');
      expect(url.searchParams.get('gpp')).to.eq('GPP_STRING');
      expect(url.searchParams.get('gpp_sid')).to.eq('GPP_SID');
    });

    it('should fire "sync" sync pixel if partnerUserId is provided', function () {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4,
        partnerUserId: 'PUID'
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      // when
      multiplexingInstanceStub.emit(ApiEvent.CASCADE_NEEDED, {
        partnerId: TEST_ID5_PARTNER_ID,
        userId: 'ID5-ID-31313'
      });

      // then
      expect(imageSpy).to.have.been.calledOnce;

      const pixelUrl = imageSpy.firstCall.returnValue.src;
      const url = new URL(pixelUrl);
      expect(url.host).to.eq(`id5-sync.com`);
      expect(url.pathname).to.eq(`/s/${TEST_ID5_PARTNER_ID}/4.gif`);
      expect(url.searchParams.get('puid')).to.eq('PUID');
      expect(url.searchParams.get('id5id')).to.eq('ID5-ID-31313');
    });

    it('should not fire sync pixel if ID5 is maxCascade is set to -1', function () {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: -1
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      // when
      multiplexingInstanceStub.emit(ApiEvent.CASCADE_NEEDED, {
        userId: 'ID5-ID-31313'
      });

      // then
      expect(imageSpy).to.not.have.been.called;
    });

    it('should not fire sync pixel if creative restrictions are enabled', function () {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        applyCreativeRestrictions: true
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      // when
      multiplexingInstanceStub.emit(ApiEvent.CASCADE_NEEDED, {
        userId: 'ID5-ID-31313'
      });

      // then
      expect(imageSpy).to.not.have.been.called;
    });
  });

  describe('A/B Testing', function () {

    it('should set exposeUserId to true without any A/B testing', function (done) {
      // given
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        // then
        expect(instanceUnderTest.exposeUserId()).to.be.true;
        done();
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {
          universal_uid: 'ID5*the_id5_id'
          // Note: no ab_testing object
        }
      });
    });

    it('should expose ID5 userId from a server response when UID not in Control Group', function (done) {
      // given
      const TEST_RESPONSE_ABTEST = {
        'universal_uid': 'whateverID_AB_NORMAL',
        'ab_testing': {
          'result': 'normal'
        },
        'ext': {
          'linkType': 1
        }
      };
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const instanceUnderTest = createInstance(config, metrics, multiplexingInstanceStub);
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        // then
        expect(instanceUnderTest.exposeUserId()).to.be.true;
        expect(instanceUnderTest.getUserId()).to.eq('whateverID_AB_NORMAL');
        expect(instanceUnderTest.getLinkType()).to.be.equal(1);
        expect(instanceUnderTest.getUserIdAsEid()).to.eql({
          source: CONSTANTS.ID5_EIDS_SOURCE,
          uids: [{
            atype: 1,
            id: 'whateverID_AB_NORMAL',
            ext: {
              linkType: 1,
              abTestingControlGroup: false
            }
          }]
        });
        done();
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: TEST_RESPONSE_ABTEST
      });
    });

    it('should not expose ID5 userId from a server response when UID in Control Group', function (done) {
      // given
      const TEST_RESPONSE_ABTEST = {
        'universal_uid': 'whateverID_AB_CONTROL',
        'ab_testing': {
          'result': 'control'
        },
        'ext': {
          'linkType': 1
        }
      };
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        // then
        expect(instanceUnderTest.exposeUserId()).to.be.false;
        expect(instanceUnderTest.getUserId()).to.eq('0');
        expect(instanceUnderTest.getLinkType()).to.be.equal(0);
        expect(instanceUnderTest.getUserIdAsEid()).to.eql({
          source: CONSTANTS.ID5_EIDS_SOURCE,
          uids: [{
            atype: 1,
            id: '0',
            ext: {
              abTestingControlGroup: true
            }
          }]
        });
        done();
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: TEST_RESPONSE_ABTEST
      });
    });

    it('should set ab feature flags on the fetch request', async function () {
      const config = new Config({
        ...defaultInitBypassConsent(),
        abTesting: {enabled: true, controlGroupPct: 0.8}
      }, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();
      await instanceUnderTest.init();

      expect(multiplexingInstanceStub.register).to.have.been.calledOnce;
      const registerObj = multiplexingInstanceStub.register.firstCall.firstArg;
      expect(registerObj.sourceConfiguration.options.abTesting).to.deep.eq({enabled: true, controlGroupPct: 0.8});
    });
  });

  describe('upon first provisioning', function () {
    let gatherUaHintsStub;
    const MOCK_UA_HINTS = {
      'architecture': 'x86',
      'brands': [
        {
          'brand': 'Froogle Chrome',
          'version': '101'
        }
      ]
    };

    beforeEach(() => {
      gatherUaHintsStub = sinon.stub(UaHints, 'gatherUaHints').resolves(MOCK_UA_HINTS);
    });

    afterEach(() => {
      gatherUaHintsStub.restore();
    });

    it('should set consent data into the consentManagement object and in the multiplexing instance', async function () {
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

      await instanceUnderTest.init();

      expect(consentManagement.setConsentData).to.have.been.calledWith(MOCK_CONSENT_DATA);
      expect(multiplexingInstanceStub.updateConsent).to.have.been.calledWith(MOCK_CONSENT_DATA);
    });

    [
      ['default',
        {},
        {}
      ],
      ['allowedVendors',
        {
          consentData: {
            allowedVendors: ['1', '123']
          }
        },
        {
          allowedVendors: ['1', '123'],
          consentSource: 'cmp'
        }],
      ['consentSource - cmp',
        {
          cmpApi: 'iab'
        },
        {
          consentSource: 'cmp'
        }],
      ['consentSource - partner',
        {
          cmpApi: 'static'
        },
        {
          consentSource: 'partner'
        }]
    ].forEach(([tc, additionalConfig, additionalExpectedRegistration]) => {
      it(`should register a new multiplexing instance with correct options and correct fetch ID data - ${tc}`, async function () {
        const config = new Config({
          partnerId: TEST_ID5_PARTNER_ID,
          refreshInSeconds: 33,
          partnerUserId: 'puid-abc',
          callbackTimeoutInMs: 450,
          pd: 'some_pd_string',
          provider: 'unit-test',
          storageExpirationDays: 13,
          att: 1,
          ...additionalConfig
        }, NO_OP_LOGGER);
        const consentManagement = sinon.createStubInstance(ConsentManagement);
        consentManagement.isForceAllowLocalStorageGrant.returns(false);
        const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
        consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
        const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());
        instanceUnderTest.bootstrap();

        await instanceUnderTest.init();

        expect(multiplexingInstanceStub.register).to.have.been.calledOnce;
        const registerObj = multiplexingInstanceStub.register.firstCall.firstArg;
        expect(registerObj.source).to.eq('api');
        expect(registerObj.sourceVersion).to.eq(version);
        expect(registerObj.sourceConfiguration.options).to.deep.eq({
          partnerId: TEST_ID5_PARTNER_ID,
          abTesting: {
            controlGroupPct: 0,
            enabled: false
          },
          acr: false,
          allowLocalStorageWithoutConsentApi: false,
          applyCreativeRestrictions: false,
          callbackOnAvailable: undefined,
          callbackOnUpdates: undefined,
          cmpApi: 'iab',
          consentData: {},
          debugBypassConsent: false,
          allowGCReclaim: GCReclaimAllowed.AFTER_UID_SET,
          diagnostics: {
            publishAfterLoadInMsec: 30000,
            publishBeforeWindowUnload: true,
            publishingDisabled: false,
            publishingSampleRatio: 0.01
          },
          disableUaHints: false,
          maxCascades: 8,
          multiplexing: {
            _disabled: false
          },
          refreshInSeconds: 33,
          segments: undefined,
          partnerUserId: 'puid-abc',
          callbackTimeoutInMs: 450,
          pd: 'some_pd_string',
          provider: 'unit-test',
          storageExpirationDays: 13,
          att: 1,
          ...additionalConfig
        });
        expect(registerObj.fetchIdData).to.deep.eq({
          partnerId: TEST_ID5_PARTNER_ID,
          refererInfo: null,
          origin: 'api',
          originVersion: '0.0',
          isUsingCdn: true,
          att: 1,
          uaHints: MOCK_UA_HINTS,
          abTesting: {
            controlGroupPct: 0,
            enabled: false
          },
          segments: undefined,
          invalidSegmentsCount: 0,
          provider: 'unit-test',
          pd: 'some_pd_string',
          partnerUserId: 'puid-abc',
          refreshInSeconds: 33,
          providedRefreshInSeconds: 33,
          trace: false,
          consentSource: 'cmp',
          allowedVendors: undefined,
          trueLink: {booted: false},
          ...additionalExpectedRegistration
        });
        expect(registerObj.singletonMode).to.be.false;
        expect(registerObj.canDoCascade).to.be.true;
        expect(registerObj.forceAllowLocalStorageGrant).to.be.false;
        expect(registerObj.storageExpirationDays).to.eq(13);
      });
    });

    it('should not block ID fetching if consent provider failed to refresh consent data', async function () {
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
      consentDataProvider.refreshConsentData.rejects('Some error');
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, null, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

      await instanceUnderTest.init();

      expect(consentManagement.setConsentData).to.not.have.been.called;
      expect(multiplexingInstanceStub.register).to.have.been.calledOnce;
    });
  });

  describe('upon refresh', function () {
    beforeEach(function () {
      metrics = new Id5CommonMetrics('source', '1.2.3', 99);
    });

    it('should update options in the config object', async function () {
      const config = new Config({partnerId: 99}, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

      await instanceUnderTest.refreshId(false, {
        debugBypassConsent: true,
        allowLocalStorageWithoutConsentApi: true,
        refreshInSeconds: 12,
        partnerUserId: 'puid-abcd',
        pd: 'some-pd-string',
        abTesting: {enabled: true, controlGroupPct: 0.76},
        provider: 'xyz',
        maxCascades: 3,
        applyCreativeRestrictions: true,
        disableUaHints: true,
        storageExpirationDays: 945,
        att: 1,
        segments: [
          {destination: '22', ids: ['a', 'b', 'c']}
        ]
      });

      const updatedOptions = config.getOptions();
      expect(updatedOptions.debugBypassConsent).to.eq(true);
      expect(updatedOptions.allowLocalStorageWithoutConsentApi).to.eq(true);
      expect(updatedOptions.refreshInSeconds).to.eq(12);
      expect(updatedOptions.partnerUserId).to.eq('puid-abcd');
      expect(updatedOptions.pd).to.eq('some-pd-string');
      expect(updatedOptions.abTesting).to.deep.eq({enabled: true, controlGroupPct: 0.76});
      expect(updatedOptions.provider).to.eq('xyz');
      expect(updatedOptions.maxCascades).to.eq(3);
      expect(updatedOptions.applyCreativeRestrictions).to.eq(true);
      expect(updatedOptions.disableUaHints).to.eq(true);
      expect(updatedOptions.storageExpirationDays).to.eq(945);
      expect(updatedOptions.att).to.eq(1);
      expect(updatedOptions.segments).to.deep.eq([
        {destination: '22', ids: ['a', 'b', 'c']}
      ]);
    });

    it('should update options in the multiplexing instance', async function () {
      const config = new Config({partnerId: 99}, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

      await instanceUnderTest.refreshId(false, {
        debugBypassConsent: true,
        allowLocalStorageWithoutConsentApi: true,
        refreshInSeconds: 12,
        partnerUserId: 'puid-abcd',
        pd: 'some-pd-string',
        abTesting: {enabled: true, controlGroupPct: 0.76},
        provider: 'xyz',
        maxCascades: 3,
        applyCreativeRestrictions: true,
        disableUaHints: true,
        storageExpirationDays: 945,
        att: 1,
        segments: [
          {destination: '22', ids: ['a', 'b', 'c']}
        ]
      });

      expect(multiplexingInstanceStub.updateFetchIdData).to.have.been.calledOnce;
      const updatedOptions = multiplexingInstanceStub.updateFetchIdData.firstCall.firstArg;
      expect(updatedOptions.att).to.eq(1);
      expect(updatedOptions.uaHints).to.be.undefined; // Disabled UA Hints lookup
      expect(updatedOptions.abTesting).to.deep.eq({enabled: true, controlGroupPct: 0.76});
      expect(updatedOptions.segments).to.deep.eq([
        {destination: '22', ids: ['a', 'b', 'c']}
      ]);
      expect(updatedOptions.invalidSegmentsCount).to.eq(0);
      expect(updatedOptions.provider).to.eq('xyz');
      expect(updatedOptions.pd).to.eq('some-pd-string');
      expect(updatedOptions.partnerUserId).to.eq('puid-abcd');
      expect(updatedOptions.refreshInSeconds).to.eq(12);
    });

    it('should NOT (!) refresh consent data into the consentManagement object', async function () {
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

      await instanceUnderTest.refreshId(false, {});

      expect(consentManagement.setConsentData).to.not.have.been.called;
    });

    [
      [{debugBypassConsent: false, allowLocalStorageWithoutConsentApi: false}, false],
      [{debugBypassConsent: true, allowLocalStorageWithoutConsentApi: false}, true],
      [{debugBypassConsent: false, allowLocalStorageWithoutConsentApi: true}, true],
      [{debugBypassConsent: true, allowLocalStorageWithoutConsentApi: true}, true]
    ].forEach(([mergeConfig, expectedResult]) => {
      it('should calculate correctly forcibly allowed local storage', async function () {
        const config = new Config({partnerId: 99}, NO_OP_LOGGER);
        const consentManagement = sinon.createStubInstance(ConsentManagement);
        const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
        consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
        const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

        await instanceUnderTest.refreshId(false, mergeConfig);

        expect(multiplexingInstanceStub.refreshUid).to.have.been.calledOnce;
        const refreshUidParams = multiplexingInstanceStub.refreshUid.firstCall.firstArg;
        expect(refreshUidParams).to.deep.eq({
          resetConsent: true,
          forceAllowLocalStorageGrant: expectedResult,
          forceFetch: false
        });
      });
    });

    it('should pass forceFetch to multiplexing', async function () {
      const config = new Config({partnerId: 99}, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider);
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

      await instanceUnderTest.refreshId(true, {});

      expect(multiplexingInstanceStub.refreshUid).to.have.been.calledOnce;
      const refreshUidParams = multiplexingInstanceStub.refreshUid.firstCall.firstArg;
      expect(refreshUidParams.forceFetch).to.be.true;
    });
  });

  describe('callbacks and external api', function () {
    [
      ['onAvailable', (instance, param) => instance.onAvailable(param)],
      ['onRefresh', (instance, param) => instance.onRefresh(param)],
      ['onUpdate', (instance, param) => instance.onUpdate(param)]
    ].forEach(([callbackName, callbackInvoker]) => {
      it(`should throw error if the ${callbackName} callback is not a function`, function () {
        // given
        const config = new Config({
          ...defaultInitBypassConsent()
        }, NO_OP_LOGGER);

        const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
        instanceUnderTest.bootstrap();

        expect(() => callbackInvoker(instanceUnderTest, 'string')).to.throw;
      });
    });

    it('should take only first onAvailable callback ', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        done();
      });

      instanceUnderTest.onAvailable(function () {
        done(new Error('this callback should not be called'));
      });

      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {universal_uid: 'ID5*the_ID'}
      });
    });

    it('should fire onUpdate immediately if ID is available', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {universal_uid: 'ID5*the_ID'}
      });

      instanceUnderTest.onUpdate(function () {
        done();
      });
    });

    it('should take only last onUpdate callback', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onUpdate(function () {
        done(new Error('this callback should not be called'));
      });

      instanceUnderTest.onUpdate(function () {
        done();
      });

      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {universal_uid: 'ID5*the_ID'}
      });
    });

    it('should take only last onRefresh callback ', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();
      instanceUnderTest.refreshId(false, {});

      instanceUnderTest.onRefresh(function () {
        done(new Error('this callback should not be called'));
      });

      instanceUnderTest.onRefresh(function () {
        done();
      });

      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {universal_uid: 'ID5*the_ID'}
      });
    });

    it('should call onAvailable callback only once upon multiple USER_ID_READY events', function (done) {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      let invocations = 0;

      instanceUnderTest.onAvailable(function () {
        invocations++;
        // then
        expect(instanceUnderTest.getUserId()).to.eq('ID5*the_id5_id_2');
        multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
          isFromCache: false,
          responseObj: {universal_uid: 'ID5*the_id5_id_3'}
        });
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {universal_uid: 'ID5*the_id5_id_2'}
      });

      setTimeout(() => {
        expect(invocations).to.eq(1);
        done();
      }, 200);
    });

    it('should call onRefresh callback only once upon multiple USER_ID_READY events', function (done) {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();
      instanceUnderTest.refreshId(false, {});

      let invocations = 0;

      instanceUnderTest.onRefresh(function () {
        invocations++;
        if (invocations < 2) {
          expect(instanceUnderTest.getUserId()).to.eq('ID5*the_id5_id_2');
          multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
            isFromCache: false,
            responseObj: {universal_uid: 'ID5*the_id5_id_3'}
          });
          done();
        } else {
          done(new Error('Callback was called twice'));
        }
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {universal_uid: 'ID5*the_id5_id_2'}
      });
    });

    [false, true].forEach(_isFromCache => {
      it(`correctly exposes the user id, eids and extensions when "eids" not present in response (isFromCache: ${_isFromCache})`, function (done) {
        // given
        const TEST_RESPONSE = {
          'universal_uid': 'whateverID',
          'ext': {
            'linkType': 0,
            'someOtherExt': 'test123'
          }
        };
        const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
        const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
        instanceUnderTest.bootstrap();

        instanceUnderTest.onAvailable(function () {
          // then
          expect(instanceUnderTest.getUserId()).to.eq('whateverID');
          expect(instanceUnderTest.getLinkType()).to.be.equal(0);
          const id5IdAsEID = {
            source: CONSTANTS.ID5_EIDS_SOURCE,
            uids: [{
              atype: 1,
              id: 'whateverID',
              ext: {
                abTestingControlGroup: false,
                linkType: 0,
                someOtherExt: 'test123'
              }
            }]
          };
          expect(instanceUnderTest.getUserIdAsEid()).to.eql(id5IdAsEID);
          expect(instanceUnderTest.getUserIdsAsEids()).to.eql([id5IdAsEID]);
          expect(instanceUnderTest.isFromCache()).to.eq(_isFromCache);
          done();
        });

        // when
        multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
          isFromCache: _isFromCache,
          responseObj: TEST_RESPONSE
        });
      });

      it(`correctly exposes the user id, eids and extensions when "eids" present in response (isFromCache: ${_isFromCache})`, function (done) {
        // given
        const id5IdEid = {
          source: 'id5-sync.com',
          uids: [{
            atype: 1,
            id: 'id5id',
            ext: {
              abTestingControlGroup: false,
              linkType: 0,
              someOtherExt: 'test123'
            }
          }
          ]
        };
        const trueLinkIdEid = {
          source: 'true-link-id5-sync.com',
          uids: [{
            atype: 1,
            id: 'true-link-id'
          }
          ]
        };
        const EIDs = [
          id5IdEid,
          trueLinkIdEid
        ];
        const TEST_RESPONSE = {
          'universal_uid': 'whateverID',
          'ext': {
            'linkType': 0,
            'someOtherExt': 'test123'
          },
          ids: {
            id5id: {
              eid: id5IdEid
            },
            trueLinkId: {
              eid: trueLinkIdEid
            }
          }
        };
        const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
        const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
        instanceUnderTest.bootstrap();

        instanceUnderTest.onAvailable(function () {
          // then
          expect(instanceUnderTest.getUserId()).to.eq('whateverID');
          expect(instanceUnderTest.getLinkType()).to.be.equal(0);
          expect(instanceUnderTest.getUserIdAsEid()).to.eql(id5IdEid);
          expect(instanceUnderTest.getUserIdsAsEids()).to.eql(EIDs);
          expect(instanceUnderTest.isFromCache()).to.eq(_isFromCache);
          done();
        });

        // when
        multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
          isFromCache: _isFromCache,
          responseObj: TEST_RESPONSE
        });
      });
    });

    it(`correctly exposes the publisherTrueLinkId`, function (done) {
      // given
      const publisherTrueLinkId = 'publisherTLID';
      const TEST_RESPONSE = {
        'universal_uid': 'whateverID',
        'publisherTrueLinkId': publisherTrueLinkId
      };
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        // then
        expect(instanceUnderTest.getUserId()).to.eq('whateverID');
        expect(instanceUnderTest.getPublisherTrueLinkId()).to.eq(publisherTrueLinkId);
        done();
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: TEST_RESPONSE
      });
    });

    it(`correctly exposes the GPID`, function (done) {
      // given
      const pgId = 'someGpId';
      const TEST_RESPONSE = {
        'universal_uid': 'whateverID',
        'gp': pgId
      };
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        // then
        expect(instanceUnderTest.getUserId()).to.eq('whateverID');
        expect(instanceUnderTest.getGpId()).to.eq(pgId);
        done();
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: TEST_RESPONSE
      });
    });

    it(`should expose consents`, function (done) {
      // given
      const TEST_RESPONSE = {
        'universal_uid': 'whateverID',
      };
      const consents = {
        gdpr: true,
        gdpr_consent: 'tcfString'

      }
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        // then
        expect(instanceUnderTest.getUserId()).to.eq('whateverID');
        expect(instanceUnderTest.getConsents()).to.eql(consents);
        done();
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: TEST_RESPONSE,
        consents: consents
      });
    });

    it('should expose signature via getter', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null, new TrueLinkAdapter());
      instanceUnderTest.bootstrap();

      instanceUnderTest.onUpdate(function () {
        done(new Error('this callback should not be called'));
      });

      instanceUnderTest.onUpdate(function () {
        done();
      });

      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: {universal_uid: 'ID5*the_ID', 'signature': 'ID5*the_sig'}
      });
      expect(instanceUnderTest.getSignature() ).to.eq('ID5*the_sig');
    });
  });

  describe('cleanup', function () {
    let consentManager;
    let consentProvider;
    let registerSpy;
    let unregisterSpy;
    let releaseSpy;
    let finalizationRegisterSpy;
    let finalizationUnRegisterSpy;

    beforeEach(function () {
      consentManager = sinon.createStubInstance(ConsentManagement);
      consentProvider = sinon.createStubInstance(ConsentDataProvider);
      registerSpy = sinon.spy(ID5_REGISTRY, 'register');
      unregisterSpy = sinon.spy(ID5_REGISTRY, 'unregister');
      releaseSpy = sinon.spy(ID5_REGISTRY, 'releaseInstance');
      finalizationRegisterSpy = sinon.spy(ID5_REGISTRY._finalizationRegistry, 'register');
      finalizationUnRegisterSpy = sinon.spy(ID5_REGISTRY._finalizationRegistry, 'unregister');
    });

    afterEach(function () {
      registerSpy.restore();
      releaseSpy.restore();
      unregisterSpy.restore();
      finalizationRegisterSpy.restore();
      finalizationUnRegisterSpy.restore();
    });

    it('should register instance when created', function () {
      // when
      const instanceUnderTest = new Id5Instance(new Config(defaultInit()), null, consentManager, null, consentProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

      // then
      expect(registerSpy).have.been.calledWith(instanceUnderTest);
      expect(finalizationRegisterSpy).have.been.calledWith(instanceUnderTest, instanceUnderTest._unregisterTargets, instanceUnderTest);
    });

    [
      [GCReclaimAllowed.ASAP, false],
      [GCReclaimAllowed.AFTER_UID_SET, true],
      [GCReclaimAllowed.NEVER, true],
      [undefined, true] // default
    ].forEach(([gcAllowed, expectHold]) => {
      it(`should keep instance reference globally accessible - ${gcAllowed}`, function () {
        // when
        const instanceUnderTest = new Id5Instance(new Config({
          ...defaultInit(),
          allowGCReclaim: gcAllowed
        }), null, consentManager, metrics, consentProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());

        // then
        expect(registerSpy).to.have.been.calledWith(instanceUnderTest);

        expect(ID5_REGISTRY._instancesHolder.has(instanceUnderTest)).to.be.eq(expectHold);
      });
    });

    it('should deregister instance when called', function () {
      // given
      const instanceUnderTest = new Id5Instance(new Config(defaultInit()), null, consentManager, metrics, consentProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());
      const unregisterTargetsSpy = sinon.spy(instanceUnderTest._unregisterTargets, 'unregister');

      // when
      instanceUnderTest.unregister();

      // then
      expect(unregisterTargetsSpy).have.been.calledWith('api-call');
      expect(metrics.timer).have.been.calledWith('instance.survival.time', {unregisterTrigger: 'api-call'});
      expect(metrics.unregister).have.been.called;
      expect(multiplexingInstanceStub.unregister).have.been.called;
      expect(unregisterSpy).have.been.calledWith(instanceUnderTest);
      expect(finalizationUnRegisterSpy).have.been.calledWith(instanceUnderTest);
    });

    [
      [GCReclaimAllowed.ASAP, false],
      [GCReclaimAllowed.AFTER_UID_SET, true],
      [GCReclaimAllowed.NEVER, false]
    ].forEach(([allowGcConfig, expectedRelease]) => {
      it(`should release instance when uid set if configured - ${allowGcConfig}`, function () {
        // given
        const instanceUnderTest = new Id5Instance(new Config({
          ...defaultInit(),
          allowGCReclaim: allowGcConfig
        }), null, consentManager, null, consentProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());


        // when
        instanceUnderTest._setUserId({
          universal_uid: 'S'
        }, false);

        // then
        if (expectedRelease) {
          expect(releaseSpy).have.been.calledWith(instanceUnderTest);
        } else {
          expect(releaseSpy).have.not.been.calledWith(instanceUnderTest);
        }
      });
    });

    [
      [true, false, true],
      [true, true, false],
      [true, undefined, true],
      [false, false, true],
      [false, true, true],
      [false, undefined, true]
    ].forEach(([fromCache, willBeRefreshed, expectedRelease]) => {
      it(`should release instance when configured and will not be refreshed (cached=${fromCache}, refresh=${willBeRefreshed})`, function () {
        // given
        const instanceUnderTest = new Id5Instance(new Config({
          ...defaultInit(),
          allowGCReclaim: GCReclaimAllowed.AFTER_UID_SET
        }), null, consentManager, null, consentProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO, new TrueLinkAdapter());


        // when
        instanceUnderTest._setUserId({
          universal_uid: 'S'
        }, fromCache, willBeRefreshed);

        // then
        if (expectedRelease) {
          expect(releaseSpy).have.been.calledWith(instanceUnderTest);
        } else {
          expect(releaseSpy).have.not.been.calledWith(instanceUnderTest);
        }
      });
    });

  });
});
