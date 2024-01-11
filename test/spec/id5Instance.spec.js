import sinon from 'sinon';
import {
  defaultInitBypassConsent,
  MultiplexInstanceStub,
  TEST_ID5_PARTNER_ID
} from './test_utils.js';
import { Id5Instance } from '../../lib/id5Instance.js';
import { Config } from '../../lib/config.js'
import { NO_OP_LOGGER, ApiEvent } from '@id5io/multiplexing';

describe('Id5Instance', function () {
  describe('when cascade triggered', function () {
    let multiplexingInstanceStub;
    let imageSpy;

    beforeEach(() => {
      imageSpy = sinon.spy(window, 'Image');
      multiplexingInstanceStub = new MultiplexInstanceStub();
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
      expect(url.searchParams.get('gpp_string')).to.eq('GPP_STRING');
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
        partnerId: TEST_ID5_PARTNER_ID,
        userId: 'ID5-ID-31313',
      });

      // then
      expect(imageSpy).to.not.have.been.called;
    
    });
  });
});
