import '../../src/id5PrebidModule.js';
import {version} from '../../generated/version.js';
import {
  MultiplexingStub, MultiplexInstanceStub
} from './test_utils.js';

describe('ID5 Prebid module', function () {
  const pbjsVersion = '8.0.1';

  let multiplexingStub, instanceStub;
  beforeEach(function () {
    multiplexingStub = new MultiplexingStub();
    instanceStub = new MultiplexInstanceStub();
    multiplexingStub.returnsInstance(instanceStub);
    window.pbjs = {version: pbjsVersion};
  });

  afterEach(function () {
    multiplexingStub.restore();
  });


  it('should be globally available', function () {
    expect(window.id5Prebid.integration).to.be.a('object');
    expect(window.id5Prebid.version).to.be.eq(version);
  });

  it('should register to multiplexing', async () => {
    window.id5Prebid.integration.fetchId5Id({}, {
      partner: 1234
    }, {});

    await instanceStub.instanceRegistered();

    expect(instanceStub.updateConsent).to.have.been.calledOnce;
    expect(instanceStub.register).to.have.been.calledOnce;
    const registerObj = instanceStub.register.firstCall.firstArg;

    expect(registerObj.source).to.eq('id5-prebid-ext-module');
    expect(registerObj.sourceVersion).to.eq(version);
    expect(registerObj.fetchIdData.partnerId).to.eq(1234);
    expect(registerObj.fetchIdData.origin).to.eq('pbjs');
    expect(registerObj.fetchIdData.originVersion).to.eq(pbjsVersion);
  });
});
