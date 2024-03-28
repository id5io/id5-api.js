import sinon from 'sinon';
import {EXTENSIONS, ID5_BOUNCE_ENDPOINT, ID5_LB_ENDPOINT} from '../../src/extensions.js';
import {NO_OP_LOGGER} from '../../src/logger.js';
import {Id5CommonMetrics} from '@id5io/diagnostics';


function createFetchStub(lbResponse) {
  return sinon.stub(window, 'fetch').callsFake(function (url) {
    if (url.includes('eu-3-id5-sync.com')) {
      return Promise.resolve(new window.Response('1', {status: 200}));
    } else if (url.includes('eu-4-id5-sync.com')) {
      return Promise.resolve(new window.Response('2', {status: 200}));
    } else if (url.includes(ID5_LB_ENDPOINT)) {
      return Promise.resolve(new window.Response(JSON.stringify(lbResponse), {status: 200}));
    } else if (url.includes(ID5_BOUNCE_ENDPOINT)) {
      return Promise.resolve(new window.Response(JSON.stringify({bounce: true}), {status: 200}));
    } else {
      return Promise.reject('Error');
    }
  });
}

describe('Extensions', function () {

  const logger = NO_OP_LOGGER; // `= console;` for debug purposes
  const metrics = new Id5CommonMetrics('api', '1');
  const extensions = EXTENSIONS.createExtensions(metrics, logger);

  const LB_EXTENSIONS = {
    lb: 'lbValue'
  };

  let fetchStub;

  afterEach(function () {
    fetchStub.restore();
  });

  it('should return all extensions gathered and a default response', function () {
    fetchStub = createFetchStub(LB_EXTENSIONS);

    return extensions.gather([{pd: 'some'}])
      .then(response => {
        expect(fetchStub).to.be.calledWith(ID5_BOUNCE_ENDPOINT);
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, () => '1'),
          devChunksVersion: '4',
          groupChunks: Array.from({length: 8}, () => '2'),
          groupChunksVersion: '4',
          bounce: true
        });
      });
  });

  it('should not call bounce when signature is present', function () {
    fetchStub = createFetchStub(LB_EXTENSIONS);

    return extensions.gather([{pd: 'some'}, {cacheData: {signature: 'some-signature'}}])
      .then(response => {
        expect(fetchStub).to.not.be.calledWith(ID5_BOUNCE_ENDPOINT);
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, () => '1'),
          devChunksVersion: '4',
          groupChunks: Array.from({length: 8}, () => '2'),
          groupChunksVersion: '4'
        });
      });
  });

  it('should return only default when calls fail on http level', function () {
    fetchStub = sinon.stub(window, 'fetch').callsFake(function () {
      return Promise.resolve(new window.Response(null, {status: 500}));
    });

    return extensions.gather([{pd: 'some'}])
      .then(response => {
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should return only default when other fails', function () {
    fetchStub = sinon.stub(window, 'fetch').callsFake(function () {
      return Promise.reject('error');
    });

    return extensions.gather([{pd: 'some'}])
      .then(response => {
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should call dev chunks only when there is pd in fetch data', function () {
    fetchStub = createFetchStub(LB_EXTENSIONS);

    return extensions.gather([{pd: null}, {}])
      .then(response => {
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          lbCDN: '%%LB_CDN%%',
          bounce: true
        });
      });
  });

  it('should call chunks when lb returned chunks:1', function () {
    let lbExtensions = {
      lb: 'lbValue',
      chunks: 1
    };
    fetchStub = createFetchStub(lbExtensions);

    return extensions.gather([{pd: null}, {}])
      .then(response => {
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, () => '1'),
          devChunksVersion: '4',
          groupChunks: Array.from({length: 8}, () => '2'),
          groupChunksVersion: '4',
          bounce: true
        });
      });
  });

  it('should never call chunks when lb returned chunks:0', function () {
    let lbExtensions = {
      lb: 'lbValue',
      chunks: 0
    };
    fetchStub = createFetchStub(lbExtensions);

    return extensions.gather([{pd: 'some'}, {}])
      .then(response => {
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%',
          bounce: true
        });
      });
  });


});
