import sinon from 'sinon';
import {
  defaultInitBypassConsent,
  MultiplexInstanceStub,
  TEST_ID5_PARTNER_ID,
} from './test_utils.js';
import { Id5Instance, PageLevelInfo } from '../../lib/id5Instance.js';
import { Config } from '../../lib/config.js'
import { ConsentDataProvider } from '../../lib/consentProvider.js';
import { CONSTANTS, NO_OP_LOGGER, ApiEvent, ConsentManagement, ConsentData } from '@id5io/multiplexing';
import { Id5CommonMetrics } from '@id5io/diagnostics';
import { UaHints } from '../../lib/uaHints.js';
import { version } from '../../generated/version.js';

describe('Id5Instance', function () {
  const MOCK_PAGE_LEVEL_INFO = new PageLevelInfo(null, '0.0', true);
  const MOCK_CONSENT_DATA = new ConsentData();

  let multiplexingInstanceStub;

  beforeEach(() => {
    multiplexingInstanceStub = new MultiplexInstanceStub();
  });

  describe('when cascade triggered', function () {
    let imageSpy;

    beforeEach(() => {
      imageSpy = sinon.spy(window, 'Image');
    });

    afterEach(() => {
      imageSpy.restore();
    })

    it('should fire "call" sync pixel with configured maxCascades, gpp info and gdpr info', function () {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()

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
        partnerUserId: 'PUID',
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()

      // when
      multiplexingInstanceStub.emit(ApiEvent.CASCADE_NEEDED, {
        partnerId: TEST_ID5_PARTNER_ID,
        userId: 'ID5-ID-31313',
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

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()

      // when
      multiplexingInstanceStub.emit(ApiEvent.CASCADE_NEEDED, {
        userId: 'ID5-ID-31313',
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

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()

      // when
      multiplexingInstanceStub.emit(ApiEvent.CASCADE_NEEDED, {
        userId: 'ID5-ID-31313',
      });

      // then
      expect(imageSpy).to.not.have.been.called;
    });
  });

  describe('A/B Testing', function () {

    it('should set exposeUserId to true without any A/B testing', function (done) {
      // given
      const config = new Config({ ...defaultInitBypassConsent() }, NO_OP_LOGGER);
      const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
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
          universal_uid: 'ID5*the_id5_id',
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
      const config = new Config({ ...defaultInitBypassConsent() }, NO_OP_LOGGER);
      const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
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
        responseObj: TEST_RESPONSE_ABTEST,
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
      const config = new Config({ ...defaultInitBypassConsent() }, NO_OP_LOGGER);
      const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
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
        responseObj: TEST_RESPONSE_ABTEST,
      });
    });

    it('should set ab feature flags on the fetch request', async function () {
      const config = new Config({
        ...defaultInitBypassConsent(),
        abTesting: { enabled: true, controlGroupPct: 0.8 }
      }, NO_OP_LOGGER);
      const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);
      instanceUnderTest.bootstrap();
      await instanceUnderTest.firstFetch();

      expect(multiplexingInstanceStub.register).to.have.been.calledOnce;
      const registerObj = multiplexingInstanceStub.register.firstCall.firstArg;
      expect(registerObj.sourceConfiguration.options.abTesting).to.deep.eq({ enabled: true, controlGroupPct: 0.8 });
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
    })

    it('should set consent data into the consentManagement object and in the multiplexing instance', async function () {
      const config = new Config({ ...defaultInitBypassConsent() }, NO_OP_LOGGER);
      const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

      await instanceUnderTest.firstFetch();

      expect(consentManagement.setConsentData).to.have.been.calledWith(MOCK_CONSENT_DATA);
      expect(multiplexingInstanceStub.updateConsent).to.have.been.calledWith(MOCK_CONSENT_DATA);
    });

    it('should register a new multiplexing instance with correct options and correct fetch ID data', async function () {
      const config = new Config({
        partnerId: TEST_ID5_PARTNER_ID,
        refreshInSeconds: 33,
        partnerUserId: 'puid-abc',
        callbackTimeoutInMs: 450,
        pd: 'some_pd_string',
        provider: 'unit-test',
        storageExpirationDays: 13,
        att: 1
      }, NO_OP_LOGGER);
      const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      consentManagement.isForceAllowLocalStorageGrant.returns(false);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);
      instanceUnderTest.bootstrap();

      await instanceUnderTest.firstFetch();

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
        consentData: {
          getConsentData: {
            consentData: undefined,
            gdprApplies: undefined,
          },
          getVendorConsents: {},
        },
        debugBypassConsent: false,
        diagnostics: {
          publishAfterLoadInMsec: 30000,
          publishBeforeWindowUnload: true,
          publishingDisabled: false,
          publishingSampleRatio: 0.01,
        },
        disableUaHints: false,
        maxCascades: 8,
        multiplexing: {
          _disabled: false,
        },
        refreshInSeconds: 33,
        segments: undefined,
        partnerUserId: 'puid-abc',
        callbackTimeoutInMs: 450,
        pd: 'some_pd_string',
        provider: 'unit-test',
        storageExpirationDays: 13,
        att: 1
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
        trace: false
      });
      expect(registerObj.singletonMode).to.be.false;
      expect(registerObj.canDoCascade).to.be.true;
      expect(registerObj.forceAllowLocalStorageGrant).to.be.false;
      expect(registerObj.storageExpirationDays).to.eq(13);
    });

    it('should not block ID fetching if consent provider failed to refresh consent data', async function () {
      const config = new Config({ ...defaultInitBypassConsent() }, NO_OP_LOGGER);
      // const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
      consentDataProvider.refreshConsentData.rejects('Some error');
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, null, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

      await instanceUnderTest.firstFetch();

      expect(consentManagement.setConsentData).to.not.have.been.called;
      expect(multiplexingInstanceStub.register).to.have.been.calledOnce;
    });
  });

  describe('upon refresh', function () {
    it('should update options in the config object', async function () {
      const config = new Config({ partnerId: 99 }, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, null, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

      await instanceUnderTest.refreshId(false, {
        debugBypassConsent: true,
        allowLocalStorageWithoutConsentApi: true,
        refreshInSeconds: 12,
        partnerUserId: 'puid-abcd',
        pd: 'some-pd-string',
        abTesting: { enabled: true, controlGroupPct: 0.76 },
        provider: 'xyz',
        maxCascades: 3,
        applyCreativeRestrictions: true,
        disableUaHints: true,
        storageExpirationDays: 945,
        att: 1,
        segments: [
          { destination: '22', ids: ['a', 'b', 'c'] }
        ]
      });

      const updatedOptions = config.getOptions();
      expect(updatedOptions.debugBypassConsent).to.eq(true);
      expect(updatedOptions.allowLocalStorageWithoutConsentApi).to.eq(true);
      expect(updatedOptions.refreshInSeconds).to.eq(12);
      expect(updatedOptions.partnerUserId).to.eq('puid-abcd');
      expect(updatedOptions.pd).to.eq('some-pd-string');
      expect(updatedOptions.abTesting).to.deep.eq({ enabled: true, controlGroupPct: 0.76 });
      expect(updatedOptions.provider).to.eq('xyz');
      expect(updatedOptions.maxCascades).to.eq(3);
      expect(updatedOptions.applyCreativeRestrictions).to.eq(true);
      expect(updatedOptions.disableUaHints).to.eq(true);
      expect(updatedOptions.storageExpirationDays).to.eq(945);
      expect(updatedOptions.att).to.eq(1);
      expect(updatedOptions.segments).to.deep.eq([
        { destination: '22', ids: ['a', 'b', 'c'] }
      ]);
    });

    it('should update options in the multiplexing instance', async function () {
      const config = new Config({ partnerId: 99 }, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, null, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

      await instanceUnderTest.refreshId(false, {
        debugBypassConsent: true,
        allowLocalStorageWithoutConsentApi: true,
        refreshInSeconds: 12,
        partnerUserId: 'puid-abcd',
        pd: 'some-pd-string',
        abTesting: { enabled: true, controlGroupPct: 0.76 },
        provider: 'xyz',
        maxCascades: 3,
        applyCreativeRestrictions: true,
        disableUaHints: true,
        storageExpirationDays: 945,
        att: 1,
        segments: [
          { destination: '22', ids: ['a', 'b', 'c'] }
        ]
      });

      expect(multiplexingInstanceStub.updateFetchIdData).to.have.been.calledOnce;
      const updatedOptions = multiplexingInstanceStub.updateFetchIdData.firstCall.firstArg;
      expect(updatedOptions.att).to.eq(1);
      expect(updatedOptions.uaHints).to.be.undefined; // Disabled UA Hints lookup
      expect(updatedOptions.abTesting).to.deep.eq({ enabled: true, controlGroupPct: 0.76 });
      expect(updatedOptions.segments).to.deep.eq([
        { destination: '22', ids: ['a', 'b', 'c'] }
      ]);
      expect(updatedOptions.invalidSegmentsCount).to.eq(0);
      expect(updatedOptions.provider).to.eq('xyz');
      expect(updatedOptions.pd).to.eq('some-pd-string');
      expect(updatedOptions.partnerUserId).to.eq('puid-abcd');
      expect(updatedOptions.refreshInSeconds).to.eq(12);
    });

    it('should NOT (!) refresh consent data into the consentManagement object', async function () {
      const config = new Config({ ...defaultInitBypassConsent() }, NO_OP_LOGGER);
      const metrics = sinon.createStubInstance(Id5CommonMetrics);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, metrics, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

      await instanceUnderTest.refreshId(false, {});

      expect(consentManagement.setConsentData).to.not.have.been.called;
    });

    [
      [{ debugBypassConsent: false, allowLocalStorageWithoutConsentApi: false }, false],
      [{ debugBypassConsent: true, allowLocalStorageWithoutConsentApi: false }, true],
      [{ debugBypassConsent: false, allowLocalStorageWithoutConsentApi: true }, true],
      [{ debugBypassConsent: true, allowLocalStorageWithoutConsentApi: true }, true],
    ].forEach(([mergeConfig, expectedResult]) => {
      it('should calculate correctly forcibly allowed local storage', async function () {
        const config = new Config({ partnerId: 99 }, NO_OP_LOGGER);
        const consentManagement = sinon.createStubInstance(ConsentManagement);
        const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
        consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
        const instanceUnderTest = new Id5Instance(config, null, consentManagement, null, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

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
      const config = new Config({ partnerId: 99 }, NO_OP_LOGGER);
      const consentManagement = sinon.createStubInstance(ConsentManagement);
      const consentDataProvider = sinon.createStubInstance(ConsentDataProvider)
      consentDataProvider.refreshConsentData.resolves(MOCK_CONSENT_DATA);
      const instanceUnderTest = new Id5Instance(config, null, consentManagement, null, consentDataProvider, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

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
      ['onUpdate', (instance, param) => instance.onUpdate(param)],
    ].forEach(([callbackName, callbackInvoker]) => {
      it(`should throw error if the ${callbackName} callback is not a function`, function () {
        // given
        const config = new Config({
          ...defaultInitBypassConsent(),
        }, NO_OP_LOGGER);

        const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
        instanceUnderTest.bootstrap()

        expect(() => callbackInvoker(instanceUnderTest,'string')).to.throw;
      });
    });

    it('should take only first onAvailable callback ', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()

      instanceUnderTest.onAvailable(function () {
        done();
      });

      instanceUnderTest.onAvailable(function () {
        done(new Error('this callback should not be called'));
      });

      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: { universal_uid: 'ID5*the_ID' }
      });
    });

    it('should take only last onUpdate callback ', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()

      instanceUnderTest.onUpdate(function () {
        done(new Error('this callback should not be called'));
      });

      instanceUnderTest.onUpdate(function () {
        done();
      });

      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: { universal_uid: 'ID5*the_ID' }
      });
    });

    it('should take only last onRefresh callback ', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()
      instanceUnderTest.refreshId(false, {});

      instanceUnderTest.onRefresh(function () {
        done(new Error('this callback should not be called'));
      });

      instanceUnderTest.onRefresh(function () {
        done();
      });

      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: { universal_uid: 'ID5*the_ID' }
      });
    });

    it('should call onAvailable callback only once upon multiple USER_ID_READY events', function (done) {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()

      let invocations = 0;

      instanceUnderTest.onAvailable(function () {
        invocations++;
        // then
        expect(instanceUnderTest.getUserId()).to.eq('ID5*the_id5_id_2');
        multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
          isFromCache: false,
          responseObj: { universal_uid: 'ID5*the_id5_id_3' }
        });
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: { universal_uid: 'ID5*the_id5_id_2' }
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

      const instanceUnderTest = new Id5Instance(config, null, null, null, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap()
      instanceUnderTest.refreshId(false, {});

      let invocations = 0;

      instanceUnderTest.onRefresh(function () {
        invocations++;
        if (invocations < 2) {
          expect(instanceUnderTest.getUserId()).to.eq('ID5*the_id5_id_2');
          multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
            isFromCache: false,
            responseObj: { universal_uid: 'ID5*the_id5_id_3' }
          });
          done();
        } else {
          done(new Error('Callback was called twice'));
        }
      });

      // when
      multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
        isFromCache: false,
        responseObj: { universal_uid: 'ID5*the_id5_id_2' }
      });
    });

    [false, true].forEach(_isFromCache => {
      it(`correctly exposes the user id and extensions (isFromCache: ${_isFromCache}`, function(done) {
        // given
        const TEST_RESPONSE = {
          'universal_uid': 'whateverID',
          'ext': {
            'linkType': 0,
            'someOtherExt': 'test123',
          }
        };
        const config = new Config({ ...defaultInitBypassConsent() }, NO_OP_LOGGER);
        const metrics = sinon.createStubInstance(Id5CommonMetrics);
        const instanceUnderTest = new Id5Instance(config, null, null, metrics, null, NO_OP_LOGGER, multiplexingInstanceStub, null);
        instanceUnderTest.bootstrap();

        instanceUnderTest.onAvailable(function () {
          // then
          expect(instanceUnderTest.getUserId()).to.eq('whateverID');
          expect(instanceUnderTest.getLinkType()).to.be.equal(0);
          expect(instanceUnderTest.getUserIdAsEid()).to.eql({
            source: CONSTANTS.ID5_EIDS_SOURCE,
            uids: [{
              atype: 1,
              id: 'whateverID',
              ext: {
                abTestingControlGroup: false,
                linkType: 0,
                someOtherExt: 'test123',
              }
            }]
          });
          expect(instanceUnderTest.isFromCache()).to.eq(_isFromCache);
          done();
        });

        // when
        multiplexingInstanceStub.emit(ApiEvent.USER_ID_READY, {
          isFromCache: _isFromCache,
          responseObj: TEST_RESPONSE,
        });
      });
    });

  });
});
