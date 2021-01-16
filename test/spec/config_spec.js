import sinon from 'sinon';
import { expect } from 'chai';
import { newConfig } from 'src/config';

const utils = require('src/utils');

let getConfig;
let getProvidedConfig;
let setConfig;

describe('config API', function () {
  beforeEach(function () {
    const config = newConfig();
    getConfig = config.getConfig;
    getProvidedConfig = config.getProvidedConfig;
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

  it('getConfig is a function', function () {
    expect(getConfig).to.be.a('function');
  });

  it('getProvidedConfig is a function', function () {
    expect(getProvidedConfig).to.be.a('function');
  });

  it('getConfig returns an object', function () {
    expect(getConfig()).to.be.a('object');
  });

  it('getProvidedConfig returns an object', function () {
    expect(getProvidedConfig()).to.be.a('object');
  });

  it('sets and gets a valid configuration property', function () {
    setConfig({ refreshInSeconds: -1 });
    expect(getConfig().refreshInSeconds).to.equal(-1);
    expect(getProvidedConfig().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets another valid configuration property', function () {
    setConfig({ partnerId: 999 });
    expect(getConfig().partnerId).to.equal(999);
    expect(getProvidedConfig().partnerId).to.equal(999);
  });

  it('sets and gets a invalid configuration property', function () {
    setConfig({ foo: -1 });
    expect(getConfig().foo).to.not.equal(-1);
    expect(getProvidedConfig().foo).to.be.undefined;
  });

  it('only accepts objects', function () {
    setConfig('invalid');
    expect(getConfig()[0]).to.not.equal('i');
  });

  it('sets multiple config properties in sequence', function () {
    setConfig({ partnerId: 999 });
    setConfig({ refreshInSeconds: -1 });

    let config = getConfig();
    expect(config.partnerId).to.equal(999);
    expect(config.refreshInSeconds).to.equal(-1);

    let providedConfig = getProvidedConfig();
    expect(providedConfig.partnerId).to.equal(999);
    expect(providedConfig.refreshInSeconds).to.equal(-1);
  });

  it('sets multiple config properties at once', function () {
    setConfig({ partnerId: 999, refreshInSeconds: -1 });

    let config = getConfig();
    expect(config.partnerId).to.equal(999);
    expect(config.refreshInSeconds).to.equal(-1);

    let providedConfig = getProvidedConfig();
    expect(providedConfig.partnerId).to.equal(999);
    expect(providedConfig.refreshInSeconds).to.equal(-1);
  });

  it('sets and gets a valid configuration property with invalid type', function () {
    setConfig({ refreshInSeconds: -1 });
    setConfig({ refreshInSeconds: true });
    setConfig({ callback: function() {} });
    setConfig({ callback: -1 });
    expect(getConfig().refreshInSeconds).to.equal(-1);
    expect(getConfig().callback).to.be.a('function');
    expect(getProvidedConfig().refreshInSeconds).to.equal(-1);
    expect(getProvidedConfig().callback).to.be.a('function');
  });

  it('overwrites existing config properties', function () {
    setConfig({ refreshInSeconds: -1 });
    setConfig({ refreshInSeconds: 1 });
    expect(getConfig().refreshInSeconds).to.equal(1);
    expect(getProvidedConfig().refreshInSeconds).to.equal(1);
  });

  it('sets debugging', function () {
    setConfig({ debug: true });
    expect(getConfig().debug).to.be.true;
    expect(getProvidedConfig().debug).to.be.true;
  });

  it('does not set providedConfig with default properties', function() {
    expect(getProvidedConfig().refreshInSeconds).to.be.undefined;
  });

  describe('Set and Get Config', function () {
    it('should have user-defined config and final config available', function () {
      setConfig({ partnerId: 44, debugBypassConsent: true, refreshInSeconds: 10 });

      expect(getProvidedConfig().partnerId).to.be.equal(44);
      expect(getConfig().partnerId).to.be.equal(44);

      expect(getProvidedConfig().pd).to.be.undefined;
      expect(getConfig().pd).to.be.equal('');

      expect(getProvidedConfig().refreshInSeconds).to.be.equal(10);
      expect(getConfig().refreshInSeconds).to.be.equal(10);
    });

    it('should update providedConfig and config with setConfig()', function () {
      setConfig({ partnerId: 44, debugBypassConsent: true });
      expect(getConfig().pd).to.be.equal('');

      setConfig({ pd: 'newpd' });

      expect(getConfig().pd).to.be.equal('newpd');
      expect(getProvidedConfig().pd).to.be.equal('newpd');
    });
  });
});
