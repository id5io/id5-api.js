import {expect} from 'chai';
import sinon from 'sinon';
import {EXTENSIONS, ID5_LB_ENDPOINT} from '../../src/extensions.js';
import {InvocationLogger} from '../../../../lib/utils.js';


function createFetchStub(lbResponse) {
  return sinon.stub(window, 'fetch').callsFake(function (url) {
    if (url.includes("eu-3-id5-sync.com")) {
      return Promise.resolve(new window.Response("1", {status: 200}));
    } else if (url.includes(ID5_LB_ENDPOINT)) {
      return Promise.resolve(new window.Response(JSON.stringify(lbResponse), {status: 200}));
    } else {
      return Promise.reject("Error")
    }
  });
}

describe('Extensions', function () {

  const LB_EXTENSIONS = {
    lb: 'lbValue'
  }

  let fetchStub;

  afterEach(function () {
    fetchStub.restore();
  })

  it('should return all extensions gathered and a default response', function () {
    fetchStub = createFetchStub(LB_EXTENSIONS)

    return EXTENSIONS.gather([{pd: "some"}],new InvocationLogger("1"))
      .then(response => {
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          lbCDN: '%%LB_CDN%%',
          devChunks: Array.from({length: 8}, v => "1"),
          devChunksVersion: "3"
        });
      });
  });

  it('should return only default when calls fail on http level', function () {
    fetchStub = sinon.stub(window, 'fetch').callsFake(function (input) {
      return Promise.resolve(new window.Response(null, {status: 500}));
    });

    return EXTENSIONS.gather([{pd: "some"}])
      .then(response => {
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should return only default when other fails', function () {
    fetchStub = sinon.stub(window, 'fetch').callsFake(function (input) {
      return Promise.reject("error");
    });

    return EXTENSIONS.gather([{pd: "some"}])
      .then(response => {
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should call dev chunks only when there is pd in fetch data', function () {
    fetchStub = createFetchStub(LB_EXTENSIONS);

    return EXTENSIONS.gather([{pd: null}, {}])
      .then(response => {
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

});
