import {GoogleSecureSignalProvider} from '../../lib/gssProvider.js';

describe('GoogleSecureSignalProvider', function () {
  function resetGoogletag() {
    try {
      delete window.googletag;
    } catch (e) {
      window.googletag = undefined;
    }
  }

  beforeEach(function () {
    resetGoogletag();
  });

  it('should register a secure signal provider on construction and create window.googletag if missing', function () {
    const id = 'id5-sync.com';
    new GoogleSecureSignalProvider(id);

    expect(window.googletag).to.exist;
    expect(window.googletag.secureSignalProviders).to.be.an('array');
    expect(window.googletag.secureSignalProviders).to.have.lengthOf(1);

    const entry = window.googletag.secureSignalProviders[0];
    expect(entry.id).to.equal(id);
    expect(entry.collectorFunction).to.be.a('function');
  });

  it('collectorFunction should return a pending promise until setUserId is called', async function () {
    const provider = new GoogleSecureSignalProvider('id5-sync.com');
    const promise = window.googletag.secureSignalProviders[0].collectorFunction();
    expect(promise).to.is.not.null;

    const expected = 'USER-123';
    provider.setUserId(expected);

    const value = await promise;
    expect(value).to.equal(expected);
  });

  it('setUserId should resolve only once even if called multiple times', async function () {
    const provider = new GoogleSecureSignalProvider('id5-sync.com');
    const promise = window.googletag.secureSignalProviders[0].collectorFunction();

    provider.setUserId('FIRST');
    const v1 = await promise;
    expect(v1).to.equal('FIRST');

    // Subsequent calls should not change the resolved value
    provider.setUserId('SECOND');
    const v2 = await window.googletag.secureSignalProviders[0].collectorFunction();
    expect(v2).to.equal('FIRST');
  });

  it('should append to existing window.googletag.secureSignalProviders array if already defined', function () {
    // Predefine googletag with an existing provider
    window.googletag = window.googletag || {};
    window.googletag.secureSignalProviders = [{
      id: 'existing-provider',
      collectorFunction: () => Promise.resolve('EXISTING')
    }];

    const id = 'id5-sync.com';
    new GoogleSecureSignalProvider(id);

    expect(window.googletag.secureSignalProviders).to.be.an('array');
    expect(window.googletag.secureSignalProviders).to.have.lengthOf(2);

    const [first, second] = window.googletag.secureSignalProviders;
    expect(first.id).to.equal('existing-provider');
    expect(second.id).to.equal(id);
    expect(second.collectorFunction).to.be.a('function');
  });

});
