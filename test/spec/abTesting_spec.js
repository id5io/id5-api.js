import sinon from 'sinon';
import { expect } from 'chai';
import isInControlGroup from 'src/abTesting';

describe('A/B Testing', function () {
  describe('Configuration Validation', function() {
    [ undefined, null, 2, -1, 'a', true ].forEach((controlGroupRatio) => {
      it('should throw error if ratio is invalid', () => {
        expect(() => { isInControlGroup('userId', controlGroupRatio) }).to.throw();
      });
    });

    [ 0, 0.5, 1 ].forEach((controlGroupRatio) => {
      it('should not throw error if ratio is valid', () => {
        expect(() => { isInControlGroup('userId', controlGroupRatio) }).to.not.throw();
      });
    });
  });

  describe('Setting Control Group and Exposing ID', function() {
    let randStub;

    afterEach(function () {
      randStub.restore();
    });

    describe('A/B Testing Config Set', function () {
      beforeEach(function() {
        randStub = sinon.stub(Math, 'random').callsFake(function() {
          return 0.25;
        });
      });

      it('Nobody is in a 0% control group', function () {
        expect(isInControlGroup('dsdndskhsdks', 0)).to.be.false;
        expect(isInControlGroup('3erfghyuijkm', 0)).to.be.false;
        expect(isInControlGroup('', 0)).to.be.false;
        expect(isInControlGroup(undefined, 0)).to.be.false;
      });

      it('Everybody is in a 100% control group', function () {
        expect(isInControlGroup('dsdndskhsdks', 1)).to.be.true;
        expect(isInControlGroup('3erfghyuijkm', 1)).to.be.true;
        expect(isInControlGroup('', 1)).to.be.true;
        expect(isInControlGroup(undefined, 1)).to.be.true;
      });

      it('Being in the control group must be consistant', function () {
        const inControlGroup = isInControlGroup('dsdndskhsdks', 0.5);
        expect(inControlGroup === isInControlGroup('dsdndskhsdks', 0.5)).to.be.true;
        expect(inControlGroup === isInControlGroup('dsdndskhsdks', 0.5)).to.be.true;
        expect(inControlGroup === isInControlGroup('dsdndskhsdks', 0.5)).to.be.true;
      });

      it('Control group ratio must be within a 10% error on a large sample', function () {
        let nbInControlGroup = 0;
        const sampleSize = 100;
        for (let i = 0; i < sampleSize; i++) {
          nbInControlGroup = nbInControlGroup + (isInControlGroup('R$*df' + i, 0.5) ? 1 : 0);
        }
        expect(nbInControlGroup).to.be.greaterThan(sampleSize / 2 - sampleSize / 10);
        expect(nbInControlGroup).to.be.lessThan(sampleSize / 2 + sampleSize / 10);
      });
    });
  });
});
