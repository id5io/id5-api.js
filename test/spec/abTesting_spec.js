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

  describe('Configuration', function() {
    beforeEach(function() {
      config.resetConfig();
    });

    let testInvalidConfigs = [
      { enabled: true, controlGroupPct: -1 },
      { enabled: true, controlGroupPct: 2 },
      { enabled: true, controlGroupPct: 'a' },
      { enabled: true, controlGroupPct: true },
      { enabled: true }
    ];
    testInvalidConfigs.forEach((testConfig) => {
      it('should throw error if config is invalid', function () {
        config.setConfig({
          abTesting: testConfig
        });
        expect(function () { abTesting.init() }).to.throw();
      });
    });

    let testValidConfigs = [
      { enabled: false, controlGroupPct: -1 },
      { enabled: false, controlGroupPct: 2 },
      { enabled: false, controlGroupPct: 'a' },
      { enabled: false, controlGroupPct: true },
      { enabled: false }
    ];
    testValidConfigs.forEach((testConfig) => {
      it('should not throw error if config is invalid but A/B testing is off', function () {
        config.setConfig({
          abTesting: testConfig
        });
        expect(function () { abTesting.init() }).to.not.throw();
      });
    });
  });

  describe('Setting Control Group and Exposing ID', function() {
    let randStub;

    beforeEach(function() {
      randStub = sinon.stub(Math, 'random').callsFake(function() {
        return 0.2;
      });
      config.resetConfig();
    });
    afterEach(function () {
      randStub.restore();
    });

    it('should expose ID when A/B config is not set', function () {
      abTesting.init();
      expect(abTesting.exposeId()).to.be.true;
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
