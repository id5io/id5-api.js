import sinon from "sinon";
import * as utils from "../../lib/utils.js";
import {ID5_LB_ENDPOINT, ID5_LBS_ENDPOINT} from "./test_utils.js";
import EXTENSIONS from "../../lib/extensions.js";


describe('Extensions', function () {

  const LB_EXTENSIONS = {
    lb: 'lbValue'
  }

  const LBS_EXTENSIONS = {
    lbs: 'lbsValue'
  }

  let ajaxStub;

  function verifyExtensionsCalled() {
    sinon.assert.calledTwice(ajaxStub);
    expect(ajaxStub.getCalls().map(value => value.args[0])).to.have.members([ID5_LB_ENDPOINT, ID5_LBS_ENDPOINT]);
  }

  afterEach(function () {
    ajaxStub.restore();
  })

  it('should return all extensions gathered and default', function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      if (url.includes(ID5_LB_ENDPOINT)) {
        callbacks.success(JSON.stringify(LB_EXTENSIONS));
      } else if (url.includes(ID5_LBS_ENDPOINT)) {
        callbacks.success(JSON.stringify(LBS_EXTENSIONS))
      } else {
        callbacks.error("BOOM")
      }
    });

    return EXTENSIONS.gather(1)
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          ...LBS_EXTENSIONS,
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should return only default when other fails', function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      callbacks.error("BOOM")
    });

    return EXTENSIONS.gather(1)
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should return LB and default only when LBS failed', function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      if (url.includes(ID5_LB_ENDPOINT)) {
        callbacks.success(JSON.stringify(LB_EXTENSIONS));
      } else {
        callbacks.error("BOOM")
      }
    });

    return EXTENSIONS.gather(1)
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should return LBS and default only when LB fails', function () {
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      if (url.includes(ID5_LBS_ENDPOINT)) {
        callbacks.success(JSON.stringify(LBS_EXTENSIONS))
      } else {
        callbacks.error("BOOM")
      }
    });

    return EXTENSIONS.gather(1)
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          ...LBS_EXTENSIONS,
          lbCDN: '%%LB_CDN%%'
        });
      });
  });

  it('should not wait with LBS call until LB is finished', function () {
    const LB_RESP_DELAY = 50;
    let lbSubmitTime;
    let lbCompleteTime;
    let lbsSubmitTime;
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      if (url.includes(ID5_LB_ENDPOINT)) {
        lbSubmitTime = Date.now();
        setTimeout(function () {
          lbCompleteTime = Date.now();
          callbacks.success(JSON.stringify(LB_EXTENSIONS));
        }, LB_RESP_DELAY);
      } else if (url.includes(ID5_LBS_ENDPOINT)) {
        lbsSubmitTime = Date.now();
        callbacks.success(JSON.stringify(LBS_EXTENSIONS))
      } else {
        callbacks.error("BOOM")
      }
    });

    return EXTENSIONS.gather(1)
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          ...LBS_EXTENSIONS,
          lbCDN: '%%LB_CDN%%'
        });
        expect(lbCompleteTime).is.gt(lbsSubmitTime);
        expect(lbsSubmitTime - lbSubmitTime).is.lt(LB_RESP_DELAY);
      });
  });

  it('should not wait with LB call until LBS is finished', function () {
    const LBS_RESP_DELAY = 50;
    let lbSubmitTime;
    let lbsCompleteTime;
    let lbsSubmitTime;
    ajaxStub = sinon.stub(utils, 'ajax').callsFake(function (url, callbacks, data, options) {
      if (url.includes(ID5_LB_ENDPOINT)) {
        lbSubmitTime = Date.now();
        callbacks.success(JSON.stringify(LB_EXTENSIONS))
      } else if (url.includes(ID5_LBS_ENDPOINT)) {
        lbsSubmitTime = Date.now();
        setTimeout(function () {
          lbsCompleteTime = Date.now();
          callbacks.success(JSON.stringify(LBS_EXTENSIONS));
        }, LBS_RESP_DELAY);
      } else {
        callbacks.error("BOOM")
      }
    });

    return EXTENSIONS.gather(1)
      .then(response => {
        verifyExtensionsCalled();
        expect(response).to.be.deep.equal({
          ...LB_EXTENSIONS,
          ...LBS_EXTENSIONS,
          lbCDN: '%%LB_CDN%%'
        });
        expect(lbsCompleteTime).is.gt(lbSubmitTime);
        expect(lbsSubmitTime - lbSubmitTime).is.lt(LBS_RESP_DELAY);
      });
  });
});
