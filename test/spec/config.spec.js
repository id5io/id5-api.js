import sinon from 'sinon';
import { expect } from 'chai';
import Config, {StorageConfig} from '../../lib/config';
import {STORAGE_CONFIG} from '../../lib/constants.json'
const utils = require('../../lib/utils');

describe("Storage config", function () {
  it('should return default config', function () {
    const storageConfig = new StorageConfig(undefined);
    function verifyConfig(actual, expected) {
      expect(actual.name).is.eq(expected.name);
      expect(actual.expiresDays).is.eq(expected.expiresDays);
    }
    verifyConfig(storageConfig.ID5, STORAGE_CONFIG.ID5);
    verifyConfig(storageConfig.LAST, STORAGE_CONFIG.LAST);
    verifyConfig(storageConfig.PD, STORAGE_CONFIG.PD);
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
    verifyConfig(storageConfig.SEGMENTS, STORAGE_CONFIG.SEGMENTS);
    verifyConfig(storageConfig.LIVE_INTENT, STORAGE_CONFIG.LIVE_INTENT);
  });

  it('should return configured expiration', function () {
    const storageExpirationDays = 40;
    const storageConfig = new StorageConfig(storageExpirationDays);
    function verifyConfig(actual, expected) {
      expect(actual.name).is.eq(expected.name);
      expect(actual.expiresDays).is.eq(storageExpirationDays);
    }
    verifyConfig(storageConfig.ID5, STORAGE_CONFIG.ID5);
    verifyConfig(storageConfig.LAST, STORAGE_CONFIG.LAST);
    verifyConfig(storageConfig.PD, STORAGE_CONFIG.PD);
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
    verifyConfig(storageConfig.SEGMENTS, STORAGE_CONFIG.SEGMENTS);
    verifyConfig(storageConfig.LIVE_INTENT, STORAGE_CONFIG.LIVE_INTENT);
  });

  it('should apply minimum expiration', function () {
    const storageExpirationDays = 0;
    const storageConfig = new StorageConfig(storageExpirationDays);
    function verifyConfig(actual, expected) {
      expect(actual.name).is.eq(expected.name);
      expect(actual.expiresDays).is.eq(1);
    }
    verifyConfig(storageConfig.ID5, STORAGE_CONFIG.ID5);
    verifyConfig(storageConfig.LAST, STORAGE_CONFIG.LAST);
    verifyConfig(storageConfig.PD, STORAGE_CONFIG.PD);
    verifyConfig(storageConfig.PRIVACY, STORAGE_CONFIG.PRIVACY);
    verifyConfig(storageConfig.CONSENT_DATA, STORAGE_CONFIG.CONSENT_DATA);
    verifyConfig(storageConfig.SEGMENTS, STORAGE_CONFIG.SEGMENTS);
    verifyConfig(storageConfig.LIVE_INTENT, STORAGE_CONFIG.LIVE_INTENT);
  });
});

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
    const config = new Config(0, { partnerId: 44 });
    expect(config.updOptions).to.be.a('function');
    expect(config.getOptions).to.be.a('function');
    expect(config.getProvidedOptions).to.be.a('function');
    expect(config.getOptions()).to.be.a('object');
    expect(config.getProvidedOptions()).to.be.a('object');
  });

  it('Should throw if no partnerId', function () {
    // eslint-disable-next-line no-unused-vars
    expect(function() { const cfg = new Config(0, { }) }).to.throw();
  });

  it('sets and gets a valid configuration property', function () {
    const config = new Config(0, { partnerId: 44, refreshInSeconds: -1 });
    expect(config.getOptions().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets another valid configuration property', function () {
    const config = new Config(0, { partnerId: 999 });
    expect(config.getOptions()).to.be.a('object');
    expect(config.getProvidedOptions()).to.be.a('object');
    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().partnerId).to.equal(999);
  });

  it('sets and gets a invalid configuration property', function () {
    const config = new Config(0, { partnerId: 44, foo: -1 });
    expect(config.getOptions().foo).to.not.equal(-1);
    expect(config.getProvidedOptions().foo).to.be.undefined;
  });

  it('only accepts objects', function () {
    // eslint-disable-next-line no-new
    expect(() => { new Config(0, 'invalid') }).to.throw();
  });

  it('sets multiple config properties in sequence', function () {
    const config = new Config(0, { partnerId: 999 });
    config.updOptions({ refreshInSeconds: -1 });

    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getOptions().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets multiple config properties at once', function () {
    const config = new Config(0, { partnerId: 999, refreshInSeconds: -1 });

    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getOptions().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets a valid configuration property with invalid type', function () {
    const config = new Config(0, { partnerId: 44, refreshInSeconds: -1 });
    config.updOptions({ refreshInSeconds: true });
    config.updOptions({ callbackOnAvailable: function() {} });
    config.updOptions({ callbackOnAvailable: -1 });
    expect(config.getOptions().refreshInSeconds).to.equal(-1);
    expect(config.getOptions().callbackOnAvailable).to.be.a('function');
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedOptions().callbackOnAvailable).to.be.a('function');
  });

  it('overwrites existing config properties', function () {
    const config = new Config(0, { partnerId: 44, refreshInSeconds: -1 });
    config.updOptions({ refreshInSeconds: 1 });
    expect(config.getOptions().refreshInSeconds).to.equal(1);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(1);
  });

  it('does not set providedConfig with default properties', function() {
    const config = new Config(0, { partnerId: 44 });
    expect(config.getProvidedOptions().refreshInSeconds).to.be.undefined;
  });

  it('does not set unknown config properties', function() {
    const config = new Config(0, { partnerId: 44, blah: 44 });
    expect(config.getProvidedOptions().blah).to.be.undefined;
    expect(config.getOptions().blah).to.be.undefined;
  });

  describe('Set and Get Config', function () {
    it('should have user-defined config and final config available', function () {
      const config = new Config(0, { partnerId: 44, debugBypassConsent: true, refreshInSeconds: 10 });

      expect(config.getProvidedOptions().partnerId).to.be.equal(44);
      expect(config.getOptions().partnerId).to.be.equal(44);

      expect(config.getProvidedOptions().pd).to.be.undefined;
      expect(config.getOptions().pd).to.be.undefined;

      expect(config.getProvidedOptions().refreshInSeconds).to.be.equal(10);
      expect(config.getOptions().refreshInSeconds).to.be.equal(10);
    });

    it('should update providedConfig and config with setConfig()', function () {
      const config = new Config(0, { partnerId: 44, debugBypassConsent: true });
      expect(config.getOptions().pd).to.be.undefined;

      config.updOptions({ pd: 'newpd' });

      expect(config.getOptions().pd).to.be.equal('newpd');
      expect(config.getProvidedOptions().pd).to.be.equal('newpd');
    });
  });

  describe('segments validation', function () {
    it('should accept a well formed segment', function () {
      const config = new Config(0, { partnerId: 44, segments:[{ destination: '22', ids: ['abc']}] });
      expect(config.getOptions().segments).to.have.lengthOf(1);
      expect(config.getOptions().segments[0].destination).to.equal('22');
      expect(config.getOptions().segments[0].ids).to.have.lengthOf(1);
      expect(config.getOptions().segments[0].ids[0]).to.equal('abc');
      expect(config.getInvalidSegments()).to.equal(0);
    });
    it('should reject malformed segments', function () {
      const config = new Config(0, { partnerId: 44, segments:[
        { destination: 122, ids: ['abc']},
        { destination: '322', ids: 'abc'},
        { destination: '422', ids: [123]},
        { destination: '522', ids: []},
      ]});
      expect(config.getOptions().segments).to.have.lengthOf(0);
      expect(config.getInvalidSegments()).to.equal(4);
    });
  });
});
