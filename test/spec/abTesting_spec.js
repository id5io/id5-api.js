import { expect } from 'chai';
import * as abTesting from 'src/abTesting';
import { config } from 'src/config';

describe('A/B Testing', function () {
  it('should have a function init', function () {
    expect(abTesting.init).to.be.a('function');
  });

  it('should have a function exposeId', function () {
    expect(abTesting.exposeId).to.be.a('function');
  });

  describe('Configuration Validation', function() {
    beforeEach(function() {
      config.resetConfig();
    });

    let testInvalidConfigsWithException = [
      { abTesting: { enabled: true } },
      { abTesting: { enabled: true, controlGroupPct: 2 } },
      { abTesting: { enabled: true, controlGroupPct: -1 } },
      { abTesting: { enabled: true, controlGroupPct: 'a' } },
      { abTesting: { enabled: true, controlGroupPct: true } }
    ];
    testInvalidConfigsWithException.forEach((testConfig) => {
      it('should throw error if config is invalid', function () {
        config.setConfig(testConfig);
        expect(function () { abTesting.init() }).to.throw();
      });
    });

    let testInvalidConfigsWithoutException = [
      { abTesting: { enabled: false, controlGroupPct: -1 } },
      { abTesting: { enabled: false, controlGroupPct: 2 } },
      { abTesting: { enabled: false, controlGroupPct: 'a' } },
      { abTesting: { enabled: false, controlGroupPct: true } }
    ];
    testInvalidConfigsWithoutException.forEach((testConfig) => {
      it('should not throw error if config is invalid but A/B testing is off', function () {
        config.setConfig(testConfig);
        expect(function () { abTesting.init() }).to.not.throw();
      });
    });

    let testValidConfigs = [
      { abTesting: { } },
      { abTesting: { enabled: false } },
      { abTesting: { enabled: true, controlGroupPct: 0 } },
      { abTesting: { enabled: true, controlGroupPct: 0.5 } },
      { abTesting: { enabled: true, controlGroupPct: 1 } }
    ];
    testValidConfigs.forEach((testConfig) => {
      it('should not throw error if config is valid', function () {
        config.setConfig(testConfig);
        expect(function () { abTesting.init() }).to.not.throw();
      });
    });
  });

  describe('Setting Control Group and Exposing ID', function() {
    let randStub;

    afterEach(function () {
      randStub.restore();
    });

    describe('A/B Testing is not Explicitly Enabled', function() {
      beforeEach(function() {
        randStub = sinon.stub(Math, 'random').callsFake(function() {
          return 0;
        });
        config.resetConfig();
      });

      it('should expose ID when A/B config is not set', function () {
        abTesting.init();
        expect(abTesting.exposeId()).to.be.true;
      });

      it('should expose ID when A/B config is not set and exposeId is called without init first', function () {
        expect(abTesting.exposeId()).to.be.true;
      });

      it('should expose ID when A/B config is empty', function () {
        config.setConfig({
          abTesting: { }
        });
        abTesting.init();
        expect(abTesting.exposeId()).to.be.true;
      });
    });

    describe('A/B Testing Config Set', function () {
      beforeEach(function() {
        randStub = sinon.stub(Math, 'random').callsFake(function() {
          return 0.25;
        });
        config.resetConfig();
      });

      it('should expose ID when A/B testing is off', function () {
        config.setConfig({
          abTesting: {
            enabled: false,
            controlGroupPct: 0.5
          }
        });
        abTesting.init();
        expect(abTesting.exposeId()).to.be.true;
      });

      it('should expose ID when not in control group', function () {
        config.setConfig({
          abTesting: {
            enabled: true,
            controlGroupPct: 0.1
          }
        });
        abTesting.init();
        expect(abTesting.exposeId()).to.be.true;
      });

      it('should not expose ID when in control group', function () {
        config.setConfig({
          abTesting: {
            enabled: true,
            controlGroupPct: 0.5
          }
        });
        abTesting.init();
        expect(abTesting.exposeId()).to.be.false;
      });
    });
  });
});
