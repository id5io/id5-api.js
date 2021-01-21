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
    const config = new Config({ partnerId: 44 });
    expect(config.updOptions).to.be.a('function');
    expect(config.getOptions).to.be.a('function');
    expect(config.getProvidedOptions).to.be.a('function');
    expect(config.getOptions()).to.be.a('object');
    expect(config.getProvidedOptions()).to.be.a('object');
  });

  it('Should throw if no partnerId', function () {
    // eslint-disable-next-line no-unused-vars
    expect(function() { const cfg = new Config({ debug: true }) }).to.throw();
  });

  it('sets and gets a valid configuration property', function () {
    const config = new Config({ partnerId: 44, refreshInSeconds: -1 });
    expect(config.getOptions().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets another valid configuration property', function () {
    const config = new Config({ partnerId: 999 });
    expect(config.getOptions()).to.be.a('object');
    expect(config.getProvidedOptions()).to.be.a('object');
    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().partnerId).to.equal(999);
  });

  it('sets and gets a invalid configuration property', function () {
    const config = new Config({ partnerId: 44, foo: -1 });
    expect(config.getOptions().foo).to.not.equal(-1);
    expect(config.getProvidedOptions().foo).to.be.undefined;
  });

  it('only accepts objects', function () {
    // eslint-disable-next-line no-new
    expect(() => { new Config('invalid') }).to.throw();
  });

  it('sets multiple config properties in sequence', function () {
    const config = new Config({ partnerId: 999 });
    config.updOptions({ refreshInSeconds: -1 });

    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getOptions().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets multiple config properties at once', function () {
    const config = new Config({ partnerId: 999, refreshInSeconds: -1 });

    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getOptions().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets a valid configuration property with invalid type', function () {
    const config = new Config({ partnerId: 44, refreshInSeconds: -1 });
    config.updOptions({ refreshInSeconds: true });
    config.updOptions({ callbackOnAvailable: function() {} });
    config.updOptions({ callbackOnAvailable: -1 });
    expect(config.getOptions().refreshInSeconds).to.equal(-1);
    expect(config.getOptions().callbackOnAvailable).to.be.a('function');
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedOptions().callbackOnAvailable).to.be.a('function');
  });

  it('overwrites existing config properties', function () {
    const config = new Config({ partnerId: 44, refreshInSeconds: -1 });
    config.updOptions({ refreshInSeconds: 1 });
    expect(config.getOptions().refreshInSeconds).to.equal(1);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(1);
  });

  it('sets debugging', function () {
    const config = new Config({ partnerId: 44, debug: true });
    expect(config.getOptions().debug).to.be.true;
    expect(config.getProvidedOptions().debug).to.be.true;
  });

  it('does not set providedConfig with default properties', function() {
    const config = new Config({ partnerId: 44 });
    expect(config.getProvidedOptions().refreshInSeconds).to.be.undefined;
  });

  describe('Set and Get Config', function () {
    it('should have user-defined config and final config available', function () {
      const config = new Config({ partnerId: 44, debugBypassConsent: true, refreshInSeconds: 10 });

      expect(config.getProvidedOptions().partnerId).to.be.equal(44);
      expect(config.getOptions().partnerId).to.be.equal(44);

      expect(config.getProvidedOptions().pd).to.be.undefined;
      expect(config.getOptions().pd).to.be.equal('');

      expect(config.getProvidedOptions().refreshInSeconds).to.be.equal(10);
      expect(config.getOptions().refreshInSeconds).to.be.equal(10);
    });

    it('should update providedConfig and config with setConfig()', function () {
      const config = new Config({ partnerId: 44, debugBypassConsent: true });
      expect(config.getOptions().pd).to.be.equal('');

      config.updOptions({ pd: 'newpd' });

      expect(config.getOptions().pd).to.be.equal('newpd');
      expect(config.getProvidedOptions().pd).to.be.equal('newpd');
    });
  });
});
