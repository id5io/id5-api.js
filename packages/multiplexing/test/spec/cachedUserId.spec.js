import sinon from 'sinon';
import {CachedResponse, Store} from '../../src/store.js';
import {Follower} from '../../src/follower.js';
import {CachedUserIdProvisioner} from '../../src/cachedUserId.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {MeterRegistry, Summary} from '@id5io/diagnostics';

describe('CachedUserIdProvisioner', function () {

  /** @type {Store} */
  let store;
  /** @type {Follower} */
  let follower;
  /** @type {CachedUserIdProvisioner} */
  let provisioner;
  let nowStub;
  let ageMetric;
  const provisionerName = 'provisionerName-name';
  const cacheId = 'cache-id-1';
  const NOW = Date.now();

  beforeEach(() => {
    follower = sinon.createStubInstance(Follower);
    follower.callType = 'call-type';
    follower.getCacheId.returns(cacheId);
    store = sinon.createStubInstance(Store);
    ageMetric = sinon.createStubInstance(Summary);
    const meter = sinon.createStubInstance(MeterRegistry);
    meter.summary.withArgs('userid.cached.age', sinon.match.any).returns(ageMetric);
    provisioner = new CachedUserIdProvisioner(provisionerName, store, NO_OP_LOGGER, meter);
    nowStub = sinon.stub(Date, 'now').returns(NOW);
  });

  afterEach(() => {
    nowStub.restore();
  });

  [true, false].forEach((isExpired) => {
    it(`should provision cached response if valid available,  expired=${isExpired}`, async () => {

      // given
      const cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, 123456, 1));
      cachedResponse.isValid.returns(true);
      cachedResponse.isExpired.returns(isExpired);
      cachedResponse.getAgeSec.returns(12);
      store.getCachedResponse.withArgs(cacheId).returns(cachedResponse);

      // when
      let result = provisioner.provisionFromCache(follower);

      // then
      expect(follower.notifyUidReady).to.be.calledWith({
        responseObj: cachedResponse.response,
        timestamp: cachedResponse.timestamp,
        isFromCache: true,
        willBeRefreshed: isExpired,
        consents: undefined
      }, {
        timestamp: NOW,
        provisioner: provisionerName,
        tags: {
          callType: follower.callType
        }
      });
      expect(result).to.be.eql({
        cacheId: 'cache-id-1',
        provisioned: true,
        refreshRequired: isExpired,
        responseFromCache: cachedResponse
      });
      expect(ageMetric.record).to.be.calledWith(12); // 12000 msec -> 12 sec
    });
  });


  it(`should provision cached response with consents if available`, async () => {

    // given
    const consents = {
      gdpr: true,
      gdpr_consent: 'abc',
      gpp: 'gpp'
    };
    const cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, 123456, 1, consents));
    cachedResponse.isValid.returns(true);
    cachedResponse.isExpired.returns(false);
    cachedResponse.getAgeSec.returns(12);
    store.getCachedResponse.withArgs(cacheId).returns(cachedResponse);

    // when
    let result = provisioner.provisionFromCache(follower);

    // then
    expect(follower.notifyUidReady).to.be.calledWith({
      responseObj: cachedResponse.response,
      timestamp: cachedResponse.timestamp,
      isFromCache: true,
      willBeRefreshed: false,
      consents: consents
    }, {
      timestamp: NOW,
      provisioner: provisionerName,
      tags: {
        callType: follower.callType
      }
    });
    expect(result).to.be.eql({
      cacheId: 'cache-id-1',
      provisioned: true,
      refreshRequired: false,
      responseFromCache: cachedResponse
    });
    expect(ageMetric.record).to.be.calledWith(12); // 12000 msec -> 12 sec
  });


  it(`should notify with additional tags`, async () => {

    // given
    const cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, 123456, 1));
    cachedResponse.isValid.returns(true);
    cachedResponse.isExpired.returns(false);
    cachedResponse.getAgeSec.returns(11);
    store.getCachedResponse.withArgs(cacheId).returns(cachedResponse);

    // when
    provisioner.provisionFromCache(follower, {tag1: 'A', tag2: 'B'});

    // then
    expect(follower.notifyUidReady).to.be.calledWith({
      responseObj: cachedResponse.response,
      timestamp: cachedResponse.timestamp,
      isFromCache: true,
      willBeRefreshed: false,
      consents: undefined
    }, {
      timestamp: NOW,
      provisioner: provisionerName,
      tags: {
        callType: follower.callType,
        tag1: 'A',
        tag2: 'B'
      }
    });
  });

  [null, undefined].forEach((resp) => {
    it(`should NOT provision cached response if not available (${resp})`, async () => {

      // given
      store.getCachedResponse.returns(resp);

      // when
      let result = provisioner.provisionFromCache(follower);

      // then
      expect(follower.notifyUidReady).to.not.be.called;
      expect(result).to.be.eql({
        cacheId: 'cache-id-1',
        provisioned: false,
        refreshRequired: true,
        responseFromCache: resp
      });
      expect(ageMetric.record).to.not.be.called;
    });
  });

  it(`should NOT provision cached response if not NOT valid`, async () => {

    // given
    const cachedResponse = sinon.stub(new CachedResponse({universal_uid: crypto.randomUUID()}, 123456, 1));
    cachedResponse.isValid.returns(false);
    cachedResponse.isExpired.returns(false);
    cachedResponse.getAgeSec.returns(12);
    store.getCachedResponse.withArgs(cacheId).returns(cachedResponse);

    // when
    let result = provisioner.provisionFromCache(follower);

    // then
    expect(follower.notifyUidReady).to.not.be.called;
    expect(result).to.be.eql({
      cacheId: 'cache-id-1',
      provisioned: false,
      refreshRequired: true,
      responseFromCache: cachedResponse
    });
    expect(ageMetric.record).to.be.calledWith(12);
  });

});
