import sinon from 'sinon';
import {DEFAULT_ENDPOINTS, FallbackEndpointsProvider, Id5Endpoints, sameEndpoints} from '../../src/endpoints.js';

const ALTERNATES = ['https://fetch.alt-1.id5.test', 'https://fetch.alt-2.id5.test', 'https://fetch.alt-3.id5.test'];
const ENCODED_ALTERNATES = ALTERNATES.map(base => btoa(base));

describe('Id5Endpoints', function () {

  describe('sameEndpoints()', function () {
    [
      ['the default endpoints', DEFAULT_ENDPOINTS, new Id5Endpoints(), true],
      ['the same api base', new Id5Endpoints('https://edge.example.com'), new Id5Endpoints('https://edge.example.com/'), true],
      ['another api base', new Id5Endpoints('https://edge.example.com'), new Id5Endpoints('https://other.example.com'), false],
      ['the default endpoints and an api base', DEFAULT_ENDPOINTS, new Id5Endpoints('https://edge.example.com'), false],
      ['a missing second argument', DEFAULT_ENDPOINTS, undefined, false],
      ['a missing first argument', null, DEFAULT_ENDPOINTS, false],
      ['neither argument', undefined, null, false]
    ].forEach(([description, endpoints, other, expected]) => {
      it(`is ${expected} for ${description}`, function () {
        expect(sameEndpoints(endpoints, other)).to.equal(expected);
      });
    });
  });

  describe('without an API base', function () {
    [
      ['DEFAULT_ENDPOINTS', DEFAULT_ENDPOINTS],
      ['new Id5Endpoints()', new Id5Endpoints()],
      ["new Id5Endpoints('')", new Id5Endpoints('')]
    ].forEach(([description, endpoints]) => {
      it(`uses the default absolute hosts (${description})`, function () {
        expect(endpoints.isFallback).to.be.false;
        expect(endpoints.fetch).to.equal('https://id5-sync.com/gm/v3');
        expect(endpoints.bounce).to.equal('https://id5-sync.com/bounce');
        expect(endpoints.event).to.equal('https://id5-sync.com/event');
        expect(endpoints.diagnostics).to.equal('https://diagnostics.id5-sync.com/measurements');
        expect(endpoints.analytics(99, 'id5-api-js')).to.equal('https://api.id5-sync.com/analytics/99/id5-api-js');
        expect(endpoints.cascade('i', 99, 4).href).to.equal('https://id5-sync.com/i/99/4.gif');
      });
    });
  });

  describe('with an API base', function () {
    const endpoints = new Id5Endpoints('https://edge.example.com/a7q3');
    it('builds every endpoint except bounce and cascade on the base', function () {
      expect(endpoints.isFallback).to.be.true;
      expect(endpoints.fetch).to.equal('https://edge.example.com/a7q3/gm/v3');
      expect(endpoints.event).to.equal('https://edge.example.com/a7q3/event');
      expect(endpoints.bounce).to.equal('https://id5-sync.com/bounce');
      expect(endpoints.diagnostics).to.equal('https://edge.example.com/a7q3/diag/measurements');
      expect(endpoints.analytics(99, 'id5-api-js')).to.equal('https://edge.example.com/a7q3/analytics/99/id5-api-js');
      expect(endpoints.cascade('s', 99, 4).href).to.equal('https://id5-sync.com/s/99/4.gif');
    });
  });

  describe('base normalization', function () {
    it('strips trailing slashes from the base', function () {
      const endpoints = new Id5Endpoints('https://edge.example.com/a7q3/');
      expect(endpoints.fetch).to.equal('https://edge.example.com/a7q3/gm/v3');
      expect(endpoints.diagnostics).to.equal('https://edge.example.com/a7q3/diag/measurements');
    });
  });

});

describe('FallbackEndpointsProvider', function () {

  describe('getEndpoints()', function () {
    it('should build the endpoints on one of the alternate api bases when nothing is configured', function () {
      const provider = new FallbackEndpointsProvider('', ENCODED_ALTERNATES);
      expect(ALTERNATES).to.include(provider.getEndpoints().apiBase);
    });

    it('should keep the endpoints it picked', function () {
      const provider = new FallbackEndpointsProvider('', ENCODED_ALTERNATES);
      const randomStub = sinon.stub(Math, 'random').returns(0);
      try {
        const endpoints = provider.getEndpoints();
        expect(endpoints.fetch).to.equal('https://fetch.alt-1.id5.test/gm/v3');
        randomStub.returns(0.9);
        expect(provider.getEndpoints()).to.equal(endpoints);
      } finally {
        randomStub.restore();
      }
    });

    it('should prefer the configured api base over the alternates', function () {
      const endpoints = new FallbackEndpointsProvider('https://id5.publisher.com', ENCODED_ALTERNATES).getEndpoints();
      expect(endpoints.fetch).to.equal('https://id5.publisher.com/gm/v3');
      expect(endpoints.diagnostics).to.equal('https://id5.publisher.com/diag/measurements');
    });

    it('should drop trailing slashes from the configured api base', function () {
      expect(new FallbackEndpointsProvider('https://id5.publisher.com/a7q3/').getEndpoints().fetch)
        .to.equal('https://id5.publisher.com/a7q3/gm/v3');
    });

    [
      ['nothing is configured and there are no alternates', '', []],
      ['the configured api base is the default host', 'https://id5-sync.com', []]
    ].forEach(([description, configured, alternates]) => {
      it(`should return undefined when ${description}`, function () {
        expect(new FallbackEndpointsProvider(configured, alternates).getEndpoints()).to.be.undefined;
      });
    });
  });

  describe('retryFor()', function () {
    it('should pick one api base per provider after the default endpoints', function () {
      const provider = new FallbackEndpointsProvider('', ENCODED_ALTERNATES);
      const randomStub = sinon.stub(Math, 'random').returns(0);
      try {
        const first = provider.retryFor(DEFAULT_ENDPOINTS);
        randomStub.returns(0.9);
        expect(first.fetch).to.equal('https://fetch.alt-1.id5.test/gm/v3');
        expect(provider.retryFor(DEFAULT_ENDPOINTS)).to.equal(first);
      } finally {
        randomStub.restore();
      }
    });

    it('should return the default endpoints after a fallback api base', function () {
      const provider = new FallbackEndpointsProvider('', ENCODED_ALTERNATES);
      expect(provider.retryFor(new Id5Endpoints('https://fetch.alt-1.id5.test'))).to.equal(DEFAULT_ENDPOINTS);
    });

    it('should retry on the configured api base instead of an alternate', function () {
      const provider = new FallbackEndpointsProvider('https://id5.publisher.com', ENCODED_ALTERNATES);
      const retry = provider.retryFor(DEFAULT_ENDPOINTS);
      expect(retry.fetch).to.equal('https://id5.publisher.com/gm/v3');
      expect(provider.retryFor(retry)).to.equal(DEFAULT_ENDPOINTS);
    });

    it('should return undefined after the default endpoints when there is no api base to switch to', function () {
      expect(new FallbackEndpointsProvider('', []).retryFor(DEFAULT_ENDPOINTS)).to.be.undefined;
    });
  });

  describe('endpointsForApiBase()', function () {
    let provider;

    beforeEach(function () {
      provider = new FallbackEndpointsProvider('https://id5.publisher.com', ENCODED_ALTERNATES);
    });

    it('should return the default endpoints for an empty api base', function () {
      expect(provider.endpointsForApiBase('')).to.equal(DEFAULT_ENDPOINTS);
    });

    it('should build the endpoints on the configured api base', function () {
      expect(provider.endpointsForApiBase('https://id5.publisher.com').fetch).to.equal('https://id5.publisher.com/gm/v3');
    });

    it('should keep the configured api base when an alternate is cached', function () {
      expect(provider.endpointsForApiBase('https://fetch.alt-2.id5.test')).to.be.undefined;
    });

    [
      ['any other api base', 'https://unknown.example.com'],
      ['an api base stored by an older version', undefined]
    ].forEach(([description, apiBase]) => {
      it(`should return undefined for ${description}`, function () {
        expect(provider.endpointsForApiBase(apiBase)).to.be.undefined;
      });
    });

    describe('without a configured api base', function () {
      beforeEach(function () {
        provider = new FallbackEndpointsProvider('', ENCODED_ALTERNATES);
      });

      it('should build the endpoints on an alternate api base', function () {
        expect(provider.endpointsForApiBase('https://fetch.alt-2.id5.test').fetch).to.equal('https://fetch.alt-2.id5.test/gm/v3');
      });

      it('should replace the api base picked so far', function () {
        const randomStub = sinon.stub(Math, 'random').returns(0);
        try {
          const picked = provider.getEndpoints();
          expect(picked.apiBase).to.equal('https://fetch.alt-1.id5.test');
          const endpoints = provider.endpointsForApiBase('https://fetch.alt-3.id5.test');
          expect(endpoints).to.not.equal(picked);
          expect(provider.getEndpoints()).to.equal(endpoints);
        } finally {
          randomStub.restore();
        }
      });
    });
  });
});
