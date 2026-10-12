import {Id5Endpoints, DEFAULT_ENDPOINTS} from '../../src/endpoints.js';

describe('Id5Endpoints', function () {

  describe('without an API base', function () {
    [
      ['DEFAULT_ENDPOINTS', DEFAULT_ENDPOINTS],
      ['new Id5Endpoints()', new Id5Endpoints()],
      ["new Id5Endpoints('')", new Id5Endpoints('')]
    ].forEach(([description, endpoints]) => {
      it(`uses the default absolute hosts (${description})`, function () {
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
    it('builds every endpoint on the base', function () {
      expect(endpoints.fetch).to.equal('https://edge.example.com/a7q3/gm/v3');
      expect(endpoints.bounce).to.equal('https://edge.example.com/a7q3/bounce');
      expect(endpoints.event).to.equal('https://edge.example.com/a7q3/event');
      expect(endpoints.diagnostics).to.equal('https://edge.example.com/a7q3/diag/measurements');
      expect(endpoints.analytics(99, 'id5-api-js')).to.equal('https://edge.example.com/a7q3/analytics/99/id5-api-js');
      expect(endpoints.cascade('s', 99, 4).href).to.equal('https://edge.example.com/a7q3/s/99/4.gif');
    });
  });

  describe('base normalization', function () {
    it('strips trailing slashes from the base', function () {
      const endpoints = new Id5Endpoints('https://edge.example.com/a7q3/');
      expect(endpoints.fetch).to.equal('https://edge.example.com/a7q3/gm/v3');
      expect(endpoints.diagnostics).to.equal('https://edge.example.com/a7q3/diag/measurements');
    });
  });

  describe('from()', function () {
    [undefined, '', null].forEach((value) => {
      it(`returns the shared DEFAULT_ENDPOINTS when base is ${JSON.stringify(value)}`, function () {
        expect(Id5Endpoints.from(value)).to.equal(DEFAULT_ENDPOINTS);
      });
    });

    it('builds endpoints on the base when one is given', function () {
      const endpoints = Id5Endpoints.from('https://edge.example.com/a7q3');
      expect(endpoints).to.not.equal(DEFAULT_ENDPOINTS);
      expect(endpoints.fetch).to.equal('https://edge.example.com/a7q3/gm/v3');
    });
  });
});
