import sinon from 'sinon';
import { expect } from 'chai';
import AbTesting from 'src/abTesting';

describe('A/B Testing', function () {
  describe('Configuration Validation', function() {
    let testInvalidConfigsWithException = [
      { enabled: true },
      { enabled: true, controlGroupPct: 2 },
      { enabled: true, controlGroupPct: -1 },
      { enabled: true, controlGroupPct: 'a' },
      { enabled: true, controlGroupPct: true }
    ];
    testInvalidConfigsWithException.forEach((testConfig) => {
      it('should throw error if config is invalid', function () {
        // eslint-disable-next-line no-new
        expect(function () { new AbTesting(testConfig) }).to.throw();
      });
    });

    let testInvalidConfigsWithoutException = [
      { enabled: false, controlGroupPct: -1 },
      { enabled: false, controlGroupPct: 2 },
      { enabled: false, controlGroupPct: 'a' },
      { enabled: false, controlGroupPct: true }
    ];
    testInvalidConfigsWithoutException.forEach((testConfig) => {
      it('should not throw error if config is invalid but A/B testing is off', function () {
        // eslint-disable-next-line no-new
        expect(function () { new AbTesting(testConfig) }).to.not.throw();
      });
    });

    let testValidConfigs = [
      { },
      { enabled: false },
      { enabled: true, controlGroupPct: 0 },
      { enabled: true, controlGroupPct: 0.5 },
      { enabled: true, controlGroupPct: 1 }
    ];
    testValidConfigs.forEach((testConfig) => {
      it('should not throw error if config is valid', function () {
        // eslint-disable-next-line no-new
        expect(function () { new AbTesting(testConfig) }).to.not.throw();
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
      });

      it('should expose ID when A/B config is not set', function () {
        const abTesting = new AbTesting();
        expect(abTesting.exposeId()).to.be.true;
      });

      it('should expose ID when A/B config is empty', function () {
        const abTesting = new AbTesting({});
        expect(abTesting.exposeId()).to.be.true;
      });
    });

    describe('A/B Testing Config Set', function () {
      beforeEach(function() {
        randStub = sinon.stub(Math, 'random').callsFake(function() {
          return 0.25;
        });
      });

      it('should expose ID when A/B testing is off', function () {
        const abTesting = new AbTesting({ enabled: false, controlGroupPct: 0.5 });
        expect(abTesting.exposeId()).to.be.true;
      });

      it('should expose ID when not in control group', function () {
        const abTesting = new AbTesting({ enabled: true, controlGroupPct: 0.1 });
        expect(abTesting.exposeId()).to.be.true;
      });

      it('should not expose ID when in control group', function () {
        const abTesting = new AbTesting({ enabled: true, controlGroupPct: 0.5 });
        expect(abTesting.exposeId()).to.be.false;
      });
    });
  });
});
