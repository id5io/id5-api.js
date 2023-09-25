import {expect} from 'chai';
import sinon from 'sinon';
import * as utils from '../../src/utils.js';
import {ID5_LB_ENDPOINT, EXTENSIONS} from '../../src/extensions.js';


describe('Extensions', function () {

  const LB_EXTENSIONS = {
    lb: 'lbValue'
  }

  let ajaxStub;

  function verifyExtensionsCalled() {
    sinon.assert.calledOnce(ajaxStub);
    expect(ajaxStub.getCalls().map(value => value.args[0])).to.have.members([ID5_LB_ENDPOINT]);
  }

  afterEach(function () {
    ajaxStub.restore();
  })

  it('should return all extensions gathered and default', function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      if (url.includes(ID5_LB_ENDPOINT)) {
        callbacks.success(JSON.stringify(LB_EXTENSIONS));
      } else {
        callbacks.error("BOOM")
      }
    });

    return EXTENSIONS.gather()
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should return only default when other fails', function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      callbacks.error("BOOM")
    });

    return EXTENSIONS.gather()
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

});
