import {Config, GCReclaimAllowed} from '../../lib/config.js';

describe('config API', function () {
  it('member functions', function () {
    const config = new Config({partnerId: 44});
    expect(config.updOptions).to.be.a('function');
    expect(config.getOptions).to.be.a('function');
    expect(config.getProvidedOptions).to.be.a('function');
    expect(config.getOptions()).to.be.a('object');
    expect(config.getProvidedOptions()).to.be.a('object');
  });

  it('Should throw if no partnerId', function () {
    // eslint-disable-next-line no-unused-vars
    expect(function () {
      new Config({})
    }).to.throw();
  });

  it('sets and gets a valid configuration property', function () {
    const config = new Config({partnerId: 44, refreshInSeconds: -1});
    expect(config.getOptions().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets another valid configuration property', function () {
    const config = new Config({partnerId: 999});
    expect(config.getOptions()).to.be.a('object');
    expect(config.getProvidedOptions()).to.be.a('object');
    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().partnerId).to.equal(999);
  });

  it('sets and gets a invalid configuration property', function () {
    const config = new Config({partnerId: 44, foo: -1});
    expect(config.getOptions().foo).to.not.equal(-1);
    expect(config.getProvidedOptions().foo).to.be.undefined;
  });

  it('only accepts objects', function () {
    // eslint-disable-next-line no-new
    expect(() => {
      new Config('invalid')
    }).to.throw();
  });

  it('sets multiple config properties in sequence', function () {
    const config = new Config({partnerId: 999});
    config.updOptions({refreshInSeconds: -1});

    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getOptions().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets multiple config properties at once', function () {
    const config = new Config({partnerId: 999, refreshInSeconds: -1});

    expect(config.getOptions().partnerId).to.equal(999);
    expect(config.getOptions().refreshInSeconds).to.equal(-1);

    expect(config.getProvidedOptions().partnerId).to.equal(999);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
  });

  it('sets and gets a valid configuration property with invalid type', function () {
    const config = new Config({partnerId: 44, refreshInSeconds: -1});
    config.updOptions({refreshInSeconds: true});
    config.updOptions({
      callbackOnAvailable: function () {
      }
    });
    config.updOptions({callbackOnAvailable: -1});
    expect(config.getOptions().refreshInSeconds).to.equal(-1);
    expect(config.getOptions().callbackOnAvailable).to.be.a('function');
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(-1);
    expect(config.getProvidedOptions().callbackOnAvailable).to.be.a('function');
  });

  it('overwrites existing config properties', function () {
    const config = new Config({partnerId: 44, refreshInSeconds: -1});
    config.updOptions({refreshInSeconds: 1});
    expect(config.getOptions().refreshInSeconds).to.equal(1);
    expect(config.getProvidedOptions().refreshInSeconds).to.equal(1);
  });

  it('does not set providedConfig with default properties', function () {
    const config = new Config({partnerId: 44});
    expect(config.getProvidedOptions().refreshInSeconds).to.be.undefined;
  });

  it('does not set unknown config properties', function () {
    const config = new Config({partnerId: 44, blah: 44});
    expect(config.getProvidedOptions().blah).to.be.undefined;
    expect(config.getOptions().blah).to.be.undefined;
  });

  it('allows partnerId to be a string', function () {
    const config = new Config({partnerId: "44"});
    expect(config.getProvidedOptions().partnerId).to.equal("44");
    expect(config.getOptions().partnerId).to.equal(44);
  });

  [
    'not an int',
    '-13',
    '76.223',
    {},
    [],
    () => {
    }
  ].forEach((partnerId) => {
    it('does not allow partnerId to be an invalid value', function () {
      expect(() => {
        new Config({partnerId});
      }).to.throw;
    });
  });

  describe('Set and Get Config', function () {
    it('should have user-defined config and final config available', function () {
      const config = new Config({partnerId: 44, debugBypassConsent: true, refreshInSeconds: 10});

      expect(config.getProvidedOptions().partnerId).to.be.equal(44);
      expect(config.getOptions().partnerId).to.be.equal(44);

      expect(config.getProvidedOptions().pd).to.be.undefined;
      expect(config.getOptions().pd).to.be.undefined;

      expect(config.getProvidedOptions().refreshInSeconds).to.be.equal(10);
      expect(config.getOptions().refreshInSeconds).to.be.equal(10);
    });

    it('should update providedConfig and config with updOptions()', function () {
      const config = new Config({partnerId: 44, debugBypassConsent: true});
      expect(config.getOptions().pd).to.be.undefined;

      config.updOptions({pd: 'newpd'});

      expect(config.getOptions().pd).to.be.equal('newpd');
      expect(config.getProvidedOptions().pd).to.be.equal('newpd');
    });

    it('should disallow to update partner ID', function () {
      expect(() => {
        const config = new Config({partnerId: 44, debugBypassConsent: true});
        config.updOptions({partnerId: 55});

      }).to.throw;
    });

    it('should detect creative restrictions', function() {
      const config1 = new Config({partnerId: 44, applyCreativeRestrictions: true });
      const config2 = new Config({partnerId: 44, acr: true });

      expect(config1.hasCreativeRestrictions()).to.be.true;
      expect(config2.hasCreativeRestrictions()).to.be.true;
    });
  });

  describe('segments validation', function () {
    it('should accept a well formed segment', function () {
      const config = new Config({partnerId: 44, segments: [{destination: '22', ids: ['abc']}]});
      expect(config.getOptions().segments).to.have.lengthOf(1);
      expect(config.getOptions().segments[0].destination).to.equal('22');
      expect(config.getOptions().segments[0].ids).to.have.lengthOf(1);
      expect(config.getOptions().segments[0].ids[0]).to.equal('abc');
      expect(config.getInvalidSegments()).to.equal(0);
    });
    it('should reject malformed segments', function () {
      const config = new Config({
        partnerId: 44, segments: [
          {destination: 122, ids: ['abc']},
          {destination: '322', ids: 'abc'},
          {destination: '422', ids: [123]},
          {destination: '522', ids: []},
        ]
      });
      expect(config.getOptions().segments).to.have.lengthOf(0);
      expect(config.getInvalidSegments()).to.equal(4);
    });
  });

  describe('Diagnostics config', function () {
    const defaults = {
      publishingDisabled: false,
      publishAfterLoadInMsec: 30000,
      publishBeforeWindowUnload: true,
      publishingSampleRatio: 0.01
    };
    [
      {
        provided: undefined,
        expected: defaults
      },
      {
        provided: "not an object",
        expected: defaults
      },
      {
        provided: {
          publishingDisabled: true,
          publishAfterLoadInMsec: 30,
          publishBeforeWindowUnload: false,
          publishingSampleRatio: 1
        },
        expected: {
          publishingDisabled: true,
          publishAfterLoadInMsec: 30,
          publishBeforeWindowUnload: false,
          publishingSampleRatio: 1
        }
      },
      {
        provided: {
          publishAfterLoadInMsec: -1,
          publishBeforeWindowUnload: true,
          publishingSampleRatio: 1
        },
        expected: {
          publishingDisabled: false,
          publishAfterLoadInMsec: -1,
          publishBeforeWindowUnload: true,
          publishingSampleRatio: 1
        }
      },
      {
        provided: {},
        expected: defaults
      },
      {
        provided: {
          unknownProperty: true
        },
        expected: defaults
      },
      {
        provided: {
          publishingDisabled: "invalid_type_to_ignore"
        },
        expected: defaults
      },
    ].forEach((tc) => {
      it("should merge with defaults " + tc, function () {
        // given
        let providedOptions = {
          partnerId: 23,
          diagnostics: tc.provided
        };

        // when
        let config = new Config(providedOptions);

        // then
        expect(config.getOptions().diagnostics).is.deep.eq(tc.expected);
      });
    });
  });

  describe('GC reclaim config', function () {
    [
      [undefined, GCReclaimAllowed.AFTER_UID_SET],
      ["invalid", GCReclaimAllowed.AFTER_UID_SET],
      ["never", GCReclaimAllowed.NEVER],
      ["after-uid-set", GCReclaimAllowed.AFTER_UID_SET],
      ["asap", GCReclaimAllowed.ASAP]
    ].forEach(([provided,expected]) => {
      it(`should allow only predefined values - provided (${provided})`, function () {
        // given
        let providedOptions = {
          partnerId: 1,
          allowGCReclaim: provided
        };

        // when
        let config = new Config(providedOptions);

        // then
        expect(config.getOptions().allowGCReclaim).is.deep.eq(expected);
      });
    });
  });

  it('sets and gets idLookupMode', function () {
    const config = new Config({partnerId: 44, idLookupMode: true});
    expect(config.getOptions().idLookupMode).to.be.true;
    expect(config.getProvidedOptions().idLookupMode).to.be.true;

    const configDefault = new Config({partnerId: 44});
    expect(configDefault.getOptions().idLookupMode).to.be.false;
  });
});
