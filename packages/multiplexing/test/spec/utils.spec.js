import {expect} from 'chai';
import {semanticVersionCompare} from "../../src/utils.js";


describe('Semantic Version Comparator', function () {

  [
    ['1.0.0', '1.0.0', 0],
    ['1.0.0', '1.0.1', -1],
    ['1.0.100', '1.0.2', 1],
    ['1.0.100', '1.1.2', -1],
    ['1.100.0', '1.99.2', 1],
    ['2.0.0', '1.99.2', 1],
    ['2.0.0', '11.99.2', -1],
    ['2.0', '1.99.2', 1],
    ['2.0', '2.0', 0],
    ['2', '11', -1],
    ['11', '11', 0],
    ['non-semantic', '1.0.1', undefined],
    ['non-semantic', 'other-non-semantic', undefined]
  ].forEach(function (args) {
    let v1 = args[0];
    let v2 = args[1];
    let expected = args[2];
    it(`should compare  ${v1} vs ${v2}`, function () {
      // when
      let result = semanticVersionCompare(v1, v2);

      // then
      expect(result).is.eq(expected);

      // when
      let oppositeResult = semanticVersionCompare(v2, v1);

      // then
      let oppositeExpected = expected !== undefined ? -expected : undefined;
      expect(oppositeResult).is.eq(oppositeExpected);

    });
  });
});
