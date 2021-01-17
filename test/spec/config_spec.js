import sinon from 'sinon';
import { expect } from 'chai';
import Config from 'src/config';

const utils = require('src/utils');

describe('config API', function () {
  beforeEach(function () {
    sinon.spy(utils, 'logError');
    sinon.spy(utils, 'logWarn');
  });

  afterEach(function () {
    utils.logError.restore();
    utils.logWarn.restore();
  });

  it('member functions', function () {
    const config = new Config({});
    expect(config.updConfig).to.be.a('function');
    expect(config.getConfig).to.be.a('function');
    expect(config.getProvidedConfig).to.be.a('function');
  });

  it('getProvidedConfig returns an object', function () {
    const config = new Config({});
    expect(config.getProvidedConfig()).to.be.a('object');
  });

  it('sets and gets a valid configuration property', function () {
    const config = new Config({ refreshInSeconds: -1 });
    expect(config.getConfig().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedConfig().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets another valid configuration property', function () {
    const config = new Config({ partnerId: 999 });
    expect(config.getConfig().partnerId).to.equal(999);
    expect(config.getProvidedConfig().partnerId).to.equal(999);
  });

  it('sets and gets a invalid configuration property', function () {
    const config = new Config({ foo: -1 });
    expect(config.getConfig().foo).to.not.equal(-1);
    expect(config.getProvidedConfig().foo).to.be.undefined;
  });

  it('only accepts objects', function () {
    const config = new Config('invalid');
    expect(config.getConfig()[0]).to.not.equal('i');
  });

  it('sets multiple config properties in sequence', function () {
    const config = new Config({ partnerId: 999 });
    config.updConfig({ refreshInSeconds: -1 });

    expect(config.getConfig().partnerId).to.equal(999);
    expect(config.getConfig().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedConfig().partnerId).to.equal(999);
    expect(config.getProvidedConfig().refreshInSeconds).to.equal(-1);
  });

  it('sets multiple config properties at once', function () {
    const config = new Config({ partnerId: 999, refreshInSeconds: -1 });

    expect(config.getConfig().partnerId).to.equal(999);
    expect(config.getConfig().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedConfig().partnerId).to.equal(999);
    expect(config.getProvidedConfig().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets a valid configuration property with invalid type', function () {
    const config = new Config({ refreshInSeconds: -1 });
    config.updConfig({ refreshInSeconds: true });
    config.updConfig({ callback: function() {} });
    config.updConfig({ callback: -1 });
    expect(config.getConfig().refreshInSeconds).to.equal(-1);
    expect(config.getConfig().callback).to.be.a('function');
    expect(config.getProvidedConfig().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedConfig().callback).to.be.a('function');
  });

  it('overwrites existing config properties', function () {
    const config = new Config({ refreshInSeconds: -1 });
    config.updConfig({ refreshInSeconds: 1 });
    expect(config.getConfig().refreshInSeconds).to.equal(1);
    expect(config.getProvidedConfig().refreshInSeconds).to.equal(1);
  });

  it('sets debugging', function () {
    const config = new Config({ debug: true });
    expect(config.getConfig().debug).to.be.true;
    expect(config.getProvidedConfig().debug).to.be.true;
  });

  it('does not set providedConfig with default properties', function() {
    const config = new Config({});
    expect(config.getProvidedConfig().refreshInSeconds).to.be.undefined;
  });

  describe('Set and Get Config', function () {
    it('should have user-defined config and final config available', function () {
      const config = new Config({ partnerId: 44, debugBypassConsent: true, refreshInSeconds: 10 });

      expect(config.getProvidedConfig().partnerId).to.be.equal(44);
      expect(config.getConfig().partnerId).to.be.equal(44);

      expect(config.getProvidedConfig().pd).to.be.undefined;
      expect(config.getConfig().pd).to.be.equal('');

      expect(config.getProvidedConfig().refreshInSeconds).to.be.equal(10);
      expect(config.getConfig().refreshInSeconds).to.be.equal(10);
    });

    it('should update providedConfig and config with setConfig()', function () {
      const config = new Config({ partnerId: 44, debugBypassConsent: true });
      expect(config.getConfig().pd).to.be.equal('');

      config.updConfig({ pd: 'newpd' });

      expect(config.getConfig().pd).to.be.equal('newpd');
      expect(config.getProvidedConfig().pd).to.be.equal('newpd');
    });
  });
});
