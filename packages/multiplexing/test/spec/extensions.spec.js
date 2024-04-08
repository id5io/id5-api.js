import sinon from 'sinon';
import {EXTENSIONS, ID5_LB_ENDPOINT} from '../../src/extensions.js';
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
    } else {
      return Promise.reject('Error')
    }
  });
}

describe('Extensions', function () {

  const logger = NO_OP_LOGGER; // `= console;` for debug purposes
  const metrics = new Id5CommonMetrics('api', '1')
  const extensions = EXTENSIONS.createExtensions(metrics, logger)

  const lbExtensionsWithChunksFlag = chunksEnabled => {
    return {
      lb: 'lbValue',
      chunks: chunksEnabled ? 1 : 0
    }
  }

  let fetchStub;

  afterEach(function () {
    fetchStub.restore();
  })

  it('should return all extensions gathered and a default response', function () {
    let extensionsResponse = lbExtensionsWithChunksFlag(true);
    fetchStub = createFetchStub(extensionsResponse)

    return extensions.gather()
      .then(response => {
        expect(response).to.be.deep.equal({
          ...extensionsResponse,
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

    return extensions.gather()
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

    return extensions.gather()
      .then(response => {
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });


  it('should call chunks when lb returned chunks:1', function () {
    let lbExtensions = lbExtensionsWithChunksFlag(true);
    fetchStub = createFetchStub(lbExtensions);

    return extensions.gather()
      .then(response => {
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, () => '1'),
          devChunksVersion: '4',
          groupChunks: Array.from({length: 8}, () => '2'),
          groupChunksVersion: '4'
        });
      });
  });

  it('should never call chunks when lb returned chunks:0', function () {
    let lbExtensions = lbExtensionsWithChunksFlag(false);
    fetchStub = createFetchStub(lbExtensionsWithChunksFlag(false));

    return extensions.gather()
      .then(response => {
        expect(response).to.be.deep.equal({
          ...lbExtensions,
          lbCDN: '%%LB_CDN%%'
        });
      });
  });


});
