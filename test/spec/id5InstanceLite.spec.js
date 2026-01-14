import sinon from 'sinon';
import {
  defaultInit,
  defaultInitBypassConsent,
  MultiplexInstanceStub,
  TEST_ID5_PARTNER_ID
} from './test_utils.js';
import {Id5InstanceLite, PageLevelInfo, ID5_REGISTRY} from '../../lib/lite/id5InstanceLite.js';
import {Config, GCReclaimAllowed} from '../../lib/config.js';
import {NO_OP_LOGGER} from '@id5io/multiplexing/logger';
import {ApiEvent} from '@id5io/multiplexing';
import {MeterRegistry} from '@id5io/diagnostics';
import {UaHints} from '../../lib/uaHints.js';
import {version} from '../../generated/version.js';

function createInstance(config, metrics, multiplexingInstanceStub) {
  return new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null, 'api-lite');
}

describe('Id5InstanceLite', function () {
  const MOCK_PAGE_LEVEL_INFO = new PageLevelInfo(null, '0.0', true);

  let multiplexingInstanceStub;
  let metrics;
  beforeEach(() => {
    multiplexingInstanceStub = new MultiplexInstanceStub();
    metrics = sinon.createStubInstance(MeterRegistry);
  });


  describe('A/B Testing', function () {

    it('should set exposeUserId to true without any A/B testing', function (done) {
      // given
      const config = new Config({...defaultInitBypassConsent()}, NO_OP_LOGGER);
      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
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
      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
      instanceUnderTest.bootstrap();

      instanceUnderTest.onAvailable(function () {
        // then
        expect(instanceUnderTest.exposeUserId()).to.be.false;
        expect(instanceUnderTest.getUserId()).to.eq('0');
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
      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);
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

    it(`should register a new multiplexing instance with correct options and correct fetch ID data`, async function () {
      const config = new Config({
        partnerId: TEST_ID5_PARTNER_ID,
        refreshInSeconds: 33,
        partnerUserId: 'puid-abc',
        callbackTimeoutInMs: 450,
        pd: 'some_pd_string',
        provider: 'unit-test',
        storageExpirationDays: 13,
        segments: [
          {destination: '22', ids: ['a', 'b', 'c']}
        ],
        att: 1
      }, NO_OP_LOGGER);
      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);
      instanceUnderTest.bootstrap();
      await instanceUnderTest.init();

      expect(multiplexingInstanceStub.register).to.have.been.calledOnce;
      const registerObj = multiplexingInstanceStub.register.firstCall.firstArg;
      expect(registerObj.source).to.eq('api-lite');
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
        segments: [
          {destination: '22', ids: ['a', 'b', 'c']}
        ],
        partnerUserId: 'puid-abc',
        callbackTimeoutInMs: 450,
        pd: 'some_pd_string',
        provider: 'unit-test',
        storageExpirationDays: 13,
        att: 1,
        gamTargetingPrefix: undefined,
        exposeTargeting: false
      });
      expect(registerObj.fetchIdData).to.deep.eq({
        partnerId: TEST_ID5_PARTNER_ID,
        refererInfo: null,
        origin: 'api-lite',
        originVersion: '0.0',
        isUsingCdn: true,
        abTesting: {
          controlGroupPct: 0,
          enabled: false
        },
        provider: 'unit-test',
        refreshInSeconds: 33,
        providedRefreshInSeconds: 33,
        trace: false,
        consentSource: 'none',
        segments: [
          {destination: '22', ids: ['a', 'b', 'c']}
        ],
        invalidSegmentsCount: 0
      });
      expect(registerObj.singletonMode).to.be.false;
      expect(registerObj.canDoCascade).to.be.false;
      expect(registerObj.forceAllowLocalStorageGrant).to.be.false;
      expect(registerObj.storageExpirationDays).to.eq(13);
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

        const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
        instanceUnderTest.bootstrap();

        expect(() => callbackInvoker(instanceUnderTest, 'string')).to.throw;
      });
    });

    it('should take only first onAvailable callback ', function (done) {
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
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

      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
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

      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
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

    it('should call onAvailable callback only once upon multiple USER_ID_READY events', function (done) {
      // given
      const config = new Config({
        ...defaultInitBypassConsent(),
        maxCascades: 4
      }, NO_OP_LOGGER);

      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
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
      const instanceUnderTest = new Id5InstanceLite(config, metrics, NO_OP_LOGGER, multiplexingInstanceStub, null);
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

  });

  describe('cleanup', function () {
    let registerSpy;
    let unregisterSpy;
    let releaseSpy;
    let finalizationRegisterSpy;
    let finalizationUnRegisterSpy;

    beforeEach(function () {
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
      const instanceUnderTest = new Id5InstanceLite(new Config(defaultInit()), null, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

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
        const instanceUnderTest = new Id5InstanceLite(new Config({
          ...defaultInit(),
          allowGCReclaim: gcAllowed
        }), null, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);

        // then
        expect(registerSpy).to.have.been.calledWith(instanceUnderTest);

        expect(ID5_REGISTRY._instancesHolder.has(instanceUnderTest)).to.be.eq(expectHold);
      });
    });

    it('should deregister instance when called', function () {
      // given
      const instanceUnderTest = new Id5InstanceLite(new Config(defaultInit()), metrics, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);
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
        const instanceUnderTest = new Id5InstanceLite(new Config({
          ...defaultInit(),
          allowGCReclaim: allowGcConfig
        }), null, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);


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
        const instanceUnderTest = new Id5InstanceLite(new Config({
          ...defaultInit(),
          allowGCReclaim: GCReclaimAllowed.AFTER_UID_SET
        }), null, NO_OP_LOGGER, multiplexingInstanceStub, MOCK_PAGE_LEVEL_INFO);


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
