import sinon from 'sinon';
import {EXTENSIONS, ID5_LB_ENDPOINT, ID5_LBS_ENDPOINT} from '../../src/extensions.js';
import {DEFAULT_ENDPOINTS, FallbackEndpointsProvider, Id5Endpoints} from '../../src/endpoints.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {MeterRegistry} from '@id5io/diagnostics';
import {Store} from '../../src/store.js';

// The fallback list from the build may be empty, so tests pass their own
const FALLBACK_API_BASES = ['https://fetch.alt-1.id5.test', 'https://fetch.alt-2.id5.test', 'https://fetch.alt-3.id5.test'].map(base => btoa(base));

const BOUNCE_DEFAULT_RESPONSE = {bounce: {setCookie: false}};

function createFetchStub(lbResponse, lbsResponse = undefined, bounceResponse = () => new window.Response(JSON.stringify(BOUNCE_DEFAULT_RESPONSE), {status: 200})) {
  return sinon.stub(window, 'fetch').callsFake(function (url) {
    if (url.includes('eu-3-id5-sync.com')) {
      return Promise.resolve(new window.Response('1', {status: 200}));
    } else if (url.includes('eu-4-id5-sync.com')) {
      return Promise.resolve(new window.Response('2', {status: 200}));
    } else if (url.includes(ID5_LB_ENDPOINT)) {
      return Promise.resolve(new window.Response(JSON.stringify(lbResponse), {status: 200}));
    } else if (url.includes('/bounce')) {
      return Promise.resolve(bounceResponse());
    } else if (url.includes(ID5_LBS_ENDPOINT) && lbsResponse !== undefined) {
      return Promise.resolve(new window.Response(JSON.stringify(lbsResponse), {status: 200}));
    } else {
      return Promise.reject('Error');
    }
  });
}

describe('Extensions', function () {

  const logger = NO_OP_LOGGER; // `= console;` for debug purposes
  const metrics = sinon.createStubInstance(MeterRegistry);
  const store = sinon.createStubInstance(Store);
  let extensions;

  const lbExtensionsWithChunksFlag = chunksEnabled => {
    return {
      lb: 'lbValue',
      chunks: chunksEnabled ? 1 : 0
    };
  };

  let fetchStub;

  beforeEach(function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store);
  });

  afterEach(function () {
    fetchStub?.restore();
    fetchStub = undefined;
    store.getCachedExtensions.reset();
    store.storeExtensions.reset();
    store.clearExtensions.reset();
  });

  it('should return the default endpoints when bounce succeeds', function () {
    fetchStub = createFetchStub(lbExtensionsWithChunksFlag(false));

    return extensions.gather([{}])
      .then(({extensions: response, endpoints}) => {
        expect(fetchStub.firstCall.args[0]).to.equal(DEFAULT_ENDPOINTS.bounce);
        expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
        expect(response.usedApiBase).to.be.undefined;
        expect(store.storeExtensions).to.be.calledOnceWith({...response, usedApiBase: ''});
      });
  });

  it('should keep the default endpoints on an http error from bounce', function () {
    let lbExtensions = lbExtensionsWithChunksFlag(false);
    fetchStub = createFetchStub(lbExtensions, undefined, () => new window.Response(null, {status: 500}));

    return extensions.gather([{}])
      .then(({extensions: response, endpoints}) => {
        expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should gather other extensions and use a fallback api base when bounce fails', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('', FALLBACK_API_BASES));
    const randomStub = sinon.stub(Math, 'random').returns(0.5);
    const lbExtensions = lbExtensionsWithChunksFlag(false);
    fetchStub = createFetchStub(lbExtensions, {lbs: 'lbsValue'}, () => Promise.reject(new TypeError('Load failed')));

    return extensions.gather([{}])
      .then(({extensions: response, endpoints, apiBaseStored}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce);
        expect(response).to.be.deep.equal({...lbExtensions, lbCDN: '%%LB_CDN%%', lbs: 'lbsValue'});
        expect(endpoints.fetch).to.equal('https://fetch.alt-2.id5.test/gm/v3');
        // stored only after a fetch on it succeeds
        expect(apiBaseStored).to.be.false;
        expect(store.storeExtensions).to.not.be.called;
      })
      .finally(() => randomStub.restore());
  });

  it('should keep and store the default endpoints when bounce fails and there are no fallback api bases', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('', []));
    const lbExtensions = lbExtensionsWithChunksFlag(false);
    fetchStub = createFetchStub(lbExtensions, {lbs: 'lbsValue'}, () => Promise.reject(new TypeError('Load failed')));

    return extensions.gather([{}])
      .then(({extensions: response, endpoints, apiBaseStored}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce);
        expect(response).to.be.deep.equal({...lbExtensions, lbCDN: '%%LB_CDN%%', lbs: 'lbsValue'});
        expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
        expect(apiBaseStored).to.be.true;
        expect(store.storeExtensions).to.be.calledOnceWith({...response, usedApiBase: ''});
      });
  });

  it('should keep the default endpoints when bounce succeeds and apiBaseUrl is configured', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('https://id5.publisher.com', FALLBACK_API_BASES));
    fetchStub = createFetchStub(lbExtensionsWithChunksFlag(false));

    return extensions.gather([{}])
      .then(({extensions: response, endpoints}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce);
        expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
        expect(store.storeExtensions).to.be.calledOnceWith({...response, usedApiBase: ''});
      });
  });

  it('should use the configured apiBaseUrl instead of a fallback api base when bounce fails', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('https://id5.publisher.com', FALLBACK_API_BASES));
    let lbExtensions = lbExtensionsWithChunksFlag(false);
    fetchStub = createFetchStub(lbExtensions, {lbs: 'lbsValue'}, () => Promise.reject(new TypeError('Load failed')));

    return extensions.gather([{}])
      .then(({extensions: response, endpoints, apiBaseStored}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce);
        expect(fetchStub).to.not.be.calledWith('https://id5.publisher.com/bounce');
        expect(endpoints.fetch).to.equal('https://id5.publisher.com/gm/v3');
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%',
          lbs: 'lbsValue'
        });
        // stored only after a fetch on it succeeds
        expect(apiBaseStored).to.be.false;
        expect(store.storeExtensions).to.not.be.called;
      });
  });

  it('should not report an unhandled rejection when bounce fails', function () {
    const unhandled = sinon.spy();
    window.addEventListener('unhandledrejection', unhandled);
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('https://id5.publisher.com'));
    // bounce fails right away, lb answers later
    fetchStub = sinon.stub(window, 'fetch').callsFake(url => url.includes('/bounce')
      ? Promise.reject(new TypeError('Load failed'))
      : new Promise(resolve => setTimeout(() => resolve(new window.Response('{}', {status: 200})), 50)));

    return extensions.gather([{}])
      .then(() => new Promise(resolve => setTimeout(resolve, 0)))
      .then(() => expect(unhandled).to.not.be.called)
      .finally(() => window.removeEventListener('unhandledrejection', unhandled));
  });

  it('should return all extensions gathered and a default response', function () {
    let extensionsResponse = lbExtensionsWithChunksFlag(true);
    fetchStub = createFetchStub(extensionsResponse, {lbs: 'lbsValue'});

    return extensions.gather([{}])
      .then(({extensions: response}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce);
        expect(response).to.be.deep.equal({
          ...extensionsResponse,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, () => '1'),
          devChunksVersion: '4',
          groupChunks: Array.from({length: 8}, () => '2'),
          groupChunksVersion: '4',
          ...BOUNCE_DEFAULT_RESPONSE,
          lbs: 'lbsValue'
        });
      });
  });

  it('should ignore failed lbs extension call', function () {
    let extensionsResponse = lbExtensionsWithChunksFlag(true);
    fetchStub = createFetchStub(extensionsResponse, undefined);

    return extensions.gather([{}])
      .then(({extensions: response}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce);
        expect(response).to.be.deep.equal({
          ...extensionsResponse,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, () => '1'),
          devChunksVersion: '4',
          groupChunks: Array.from({length: 8}, () => '2'),
          groupChunksVersion: '4',
          ...BOUNCE_DEFAULT_RESPONSE
        });
      });
  });

  it('should return only default when calls fail on http level', function () {
    fetchStub = sinon.stub(window, 'fetch').callsFake(function () {
      return Promise.resolve(new window.Response(null, {status: 500}));
    });

    return extensions.gather([{}])
      .then(({extensions: response}) => {
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should return only default when other fails', function () {
    fetchStub = sinon.stub(window, 'fetch').callsFake(function () {
      return Promise.reject('error');
    });

    return extensions.gather([{}])
      .then(({extensions: response}) => {
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });


  it('should call chunks when lb returned chunks:1', function () {
    let lbExtensions = lbExtensionsWithChunksFlag(true);
    fetchStub = createFetchStub(lbExtensions);

    return extensions.gather([{}])
      .then(({extensions: response}) => {
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, () => '1'),
          devChunksVersion: '4',
          groupChunks: Array.from({length: 8}, () => '2'),
          groupChunksVersion: '4',
          ...BOUNCE_DEFAULT_RESPONSE
        });
      });
  });

  it('should never call chunks when lb returned chunks:0', function () {
    let lbExtensions = lbExtensionsWithChunksFlag(false);
    fetchStub = createFetchStub(lbExtensionsWithChunksFlag(false));

    return extensions.gather([{}])
      .then(({extensions: response}) => {
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%',
          ...BOUNCE_DEFAULT_RESPONSE
        });
      });
  });

  it('should not call any extensions when there are cached extensions for the default endpoints', function () {
    store.getCachedExtensions.returns({ext: 'ext', usedApiBase: ''});
    fetchStub = createFetchStub();

    return extensions.gather([{}])
      .then(({extensions: response, endpoints}) => {
        expect(fetchStub).to.not.be.called;
        expect(response).to.be.deep.equal({ext: 'ext'});
        expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
      });
  });

  it('should use the fallback api base stored with cached extensions', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('', FALLBACK_API_BASES));
    store.getCachedExtensions.returns({lbCDN: '%%LB_CDN%%', usedApiBase: 'https://fetch.alt-3.id5.test'});
    fetchStub = createFetchStub();

    return extensions.gather([{}])
      .then(({extensions: response, endpoints}) => {
        expect(fetchStub).to.not.be.called;
        expect(response).to.be.deep.equal({lbCDN: '%%LB_CDN%%'});
        expect(endpoints.fetch).to.equal('https://fetch.alt-3.id5.test/gm/v3');
        expect(extensions.retryEndpoints(DEFAULT_ENDPOINTS)).to.equal(endpoints);
      });
  });

  it('should use the configured apiBaseUrl stored with cached extensions', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('https://id5.publisher.com', FALLBACK_API_BASES));
    store.getCachedExtensions.returns({lbCDN: '%%LB_CDN%%', usedApiBase: 'https://id5.publisher.com'});
    fetchStub = createFetchStub();

    return extensions.gather([{}])
      .then(({extensions: response, endpoints}) => {
        expect(fetchStub).to.not.be.called;
        expect(response).to.be.deep.equal({lbCDN: '%%LB_CDN%%'});
        expect(endpoints.fetch).to.equal('https://id5.publisher.com/gm/v3');
      });
  });

  [
    ['without usedApiBase (stored by an older version)', {ext: 'ext'}],
    ['with a base that is neither configured nor a fallback', {ext: 'ext', usedApiBase: 'https://old.example.com'}]
  ].forEach(([description, cachedExtensions]) => {
    it(`should gather extensions again when cached extensions are ${description}`, function () {
      extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('https://id5.publisher.com', FALLBACK_API_BASES));
      store.getCachedExtensions.returns(cachedExtensions);
      let lbExtensions = lbExtensionsWithChunksFlag(false);
      fetchStub = createFetchStub(lbExtensions);

      return extensions.gather([{}])
        .then(({extensions: response, endpoints}) => {
          expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce);
          expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
          expect(store.storeExtensions).to.be.calledOnceWith({...response, usedApiBase: ''});
        });
    });
  });

  describe('retryEndpoints', function () {
    it('should return the endpoints the provider switches to', function () {
      const provider = new FallbackEndpointsProvider('', FALLBACK_API_BASES);
      extensions = EXTENSIONS.createExtensions(metrics, logger, store, provider);
      expect(extensions.retryEndpoints(DEFAULT_ENDPOINTS)).to.equal(provider.retryFor(DEFAULT_ENDPOINTS));
    });
  });

  describe('confirmApiBase', function () {
    const FALLBACK = new Id5Endpoints('https://fetch.alt-1.id5.test');
    const EXT = {lb: 'lbValue'};

    beforeEach(function () {
      extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('', FALLBACK_API_BASES));
    });

    it('should store a fallback api base picked by gather after a fetch on it succeeded', function () {
      extensions.confirmApiBase(FALLBACK, {extensions: EXT, endpoints: FALLBACK, apiBaseStored: false});
      expect(store.storeExtensions).to.be.calledOnceWith({lb: 'lbValue', usedApiBase: 'https://fetch.alt-1.id5.test'});
    });

    it('should store a fallback api base reached by a retry', function () {
      extensions.confirmApiBase(FALLBACK, {extensions: EXT, endpoints: DEFAULT_ENDPOINTS, apiBaseStored: true});
      expect(store.storeExtensions).to.be.calledOnceWith({lb: 'lbValue', usedApiBase: 'https://fetch.alt-1.id5.test'});
    });

    it('should not store again a fallback api base read from the cache', function () {
      extensions.confirmApiBase(FALLBACK, {extensions: EXT, endpoints: FALLBACK, apiBaseStored: true});
      expect(store.storeExtensions).to.not.be.called;
      expect(store.clearExtensions).to.not.be.called;
    });

    it('should clear the cached extensions when the default endpoints answered after a fallback api base failed', function () {
      extensions.confirmApiBase(DEFAULT_ENDPOINTS, {extensions: EXT, endpoints: FALLBACK, apiBaseStored: true});
      expect(store.clearExtensions).to.be.calledOnce;
      expect(store.storeExtensions).to.not.be.called;
    });

    it('should do nothing after a fetch on the default endpoints', function () {
      extensions.confirmApiBase(DEFAULT_ENDPOINTS, {extensions: EXT, endpoints: DEFAULT_ENDPOINTS, apiBaseStored: true});
      expect(store.storeExtensions).to.not.be.called;
      expect(store.clearExtensions).to.not.be.called;
    });

    it('should store the configured apiBaseUrl after a fetch on it succeeded', function () {
      const configured = new Id5Endpoints('https://id5.publisher.com');
      extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('https://id5.publisher.com', FALLBACK_API_BASES));
      extensions.confirmApiBase(configured, {extensions: EXT, endpoints: configured, apiBaseStored: false});
      expect(store.storeExtensions).to.be.calledOnceWith({lb: 'lbValue', usedApiBase: 'https://id5.publisher.com'});
    });
  });

  it('should call bounce without credentials and not call chunks when idLookupMode is enabled', function () {
    let lbExtensions = lbExtensionsWithChunksFlag(true);
    fetchStub = createFetchStub(lbExtensions, {lbs: 'lbsValue'});

    return extensions.gather([{idLookupMode: true}])
      .then(({extensions: response, endpoints}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce, {credentials: 'omit'});
        expect(fetchStub).to.not.be.calledWith(DEFAULT_ENDPOINTS.bounce, {credentials: 'include'});
        expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
        // bounce data is not merged in lookup mode
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%',
          lbs: 'lbsValue'
        });
      });
  });

  it('should use a fallback api base in idLookupMode when bounce fails', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('', FALLBACK_API_BASES));
    fetchStub = createFetchStub(lbExtensionsWithChunksFlag(true), {lbs: 'lbsValue'}, () => Promise.reject(new TypeError('Load failed')));

    return extensions.gather([{idLookupMode: true}])
      .then(({extensions: response, endpoints}) => {
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce, {credentials: 'omit'});
        expect(fetchStub).to.not.be.calledWith(DEFAULT_ENDPOINTS.bounce, {credentials: 'include'});
        expect(response).to.be.deep.equal({...lbExtensionsWithChunksFlag(true), lbCDN: '%%LB_CDN%%', lbs: 'lbsValue'});
        expect(FALLBACK_API_BASES.map(base => `${atob(base)}/gm/v3`)).to.include(endpoints.fetch);
      });
  });

  it('should call bounce without credentials in idLookupMode when apiBaseUrl is set', function () {
    extensions = EXTENSIONS.createExtensions(metrics, logger, store, new FallbackEndpointsProvider('https://id5.publisher.com'));
    fetchStub = createFetchStub(lbExtensionsWithChunksFlag(false), {lbs: 'lbsValue'});

    return extensions.gather([{idLookupMode: true}])
      .then(({endpoints}) => {
        expect(fetchStub).to.not.be.calledWith('https://id5.publisher.com/bounce');
        expect(fetchStub).to.be.calledWith(DEFAULT_ENDPOINTS.bounce, {credentials: 'omit'});
        expect(fetchStub).to.not.be.calledWith(DEFAULT_ENDPOINTS.bounce, {credentials: 'include'});
        expect(endpoints).to.equal(DEFAULT_ENDPOINTS);
      });
  });
});
