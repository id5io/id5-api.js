import { expect } from 'chai';
import { newConfig } from 'src/config';

const utils = require('src/utils');

let getConfig;
let setConfig;

describe('config API', function () {
  beforeEach(function () {
    const config = newConfig();
    getConfig = config.getConfig;
    setConfig = config.setConfig;
    sinon.spy(utils, 'logError');
    sinon.spy(utils, 'logWarn');
  });

  afterEach(function () {
    utils.logError.restore();
    utils.logWarn.restore();
  });

  it('setConfig is a function', function () {
    expect(setConfig).to.be.a('function');
  });

  it('getConfig returns an object', function () {
    expect(getConfig()).to.be.a('object');
  });

  it('sets and gets a valid configuration property', function () {
    setConfig({ refreshInSeconds: -1 });
    expect(getConfig().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets another valid configuration property', function () {
    setConfig({ partnerId: 999 });
    expect(getConfig().partnerId).to.equal(999);
  });

  it('sets and gets a invalid configuration property', function () {
    setConfig({ foo: -1 });
    expect(getConfig().foo).to.not.equal(-1);
  });

  it('only accepts objects', function () {
    setConfig('invalid');
    expect(getConfig()[0]).to.not.equal('i');
  });

  it('sets multiple config properties', function () {
    setConfig({ partnerId: 999 });
    setConfig({ refreshInSeconds: -1 });
    var config = getConfig();
    expect(config.partnerId).to.equal(999);
    expect(config.refreshInSeconds).to.equal(-1);
  });

  it('sets and gets a valid configuration property with invalid type', function () {
    setConfig({ refreshInSeconds: -1 });
    setConfig({ refreshInSeconds: true });
    expect(getConfig().refreshInSeconds).to.equal(-1);
  });

  it('overwrites existing config properties', function () {
    setConfig({ refreshInSeconds: -1 });
    setConfig({ refreshInSeconds: 1 });
    expect(getConfig().refreshInSeconds).to.equal(1);
  });

  it('sets debugging', function () {
    setConfig({ debug: true });
    expect(getConfig().debug).to.be.true;
  });
});
