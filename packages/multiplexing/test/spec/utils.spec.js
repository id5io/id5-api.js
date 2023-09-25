import {expect} from 'chai';
import * as utils from '../../src/utils.js';
import assert from 'assert';

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
      let result = utils.semanticVersionCompare(v1, v2);

      // then
      expect(result).is.eq(expected);

      // when
      let oppositeResult = utils.semanticVersionCompare(v2, v1);

      // then
      let oppositeExpected = expected !== undefined ? -expected : undefined;
      expect(oppositeResult).is.eq(oppositeExpected);

    });
  });
});

const OBJ_STRING = 's',
    OBJ_NUMBER = 1,
    OBJ_OBJECT = {},
    OBJ_ARRAY = [],
    OBJ_FUNCTION = function () {};

const TYPE_STRING = 'String',
    TYPE_NUMBER = 'Number',
    TYPE_OBJECT = 'Object',
    TYPE_ARRAY = 'Array',
    TYPE_FUNCTION = 'Function';

describe('isA', function () {
  it('should return true with string object', function () {
    var output = utils.isA(OBJ_STRING, TYPE_STRING);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with object', function () {
    var output = utils.isA(OBJ_OBJECT, TYPE_STRING);
    assert.deepStrictEqual(output, false);
  });

  it('should return true with object', function () {
    var output = utils.isA(OBJ_OBJECT, TYPE_OBJECT);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with array object', function () {
    var output = utils.isA(OBJ_ARRAY, TYPE_OBJECT);
    assert.deepStrictEqual(output, false);
  });

  it('should return true with array object', function () {
    var output = utils.isA(OBJ_ARRAY, TYPE_ARRAY);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with array object', function () {
    var output = utils.isA(OBJ_ARRAY, TYPE_FUNCTION);
    assert.deepStrictEqual(output, false);
  });

  it('should return true with function', function () {
    var output = utils.isA(OBJ_FUNCTION, TYPE_FUNCTION);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with number', function () {
    var output = utils.isA(OBJ_FUNCTION, TYPE_NUMBER);
    assert.deepStrictEqual(output, false);
  });

  it('should return true with number', function () {
    var output = utils.isA(OBJ_NUMBER, TYPE_NUMBER);
    assert.deepStrictEqual(output, true);
  });
});

describe('isDefined', function () {
  it('should return true when object is defined', function() {
    expect(utils.isDefined(44)).to.be.true;
    expect(utils.isDefined({})).to.be.true;
    expect(utils.isDefined(null)).to.be.true;
    expect(utils.isDefined(() => 0)).to.be.true;
  });

  it('should return false when object is undefined', function() {
    expect(utils.isDefined(undefined)).to.not.be.true;
  });
});

describe('isFn', function () {
  it('should return true with input function', function () {
    var output = utils.isFn(OBJ_FUNCTION);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with input string', function () {
    var output = utils.isFn(OBJ_STRING);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input number', function () {
    var output = utils.isFn(OBJ_NUMBER);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input Array', function () {
    var output = utils.isFn(OBJ_ARRAY);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input object', function () {
    var output = utils.isFn(OBJ_OBJECT);
    assert.deepStrictEqual(output, false);
  });
});

describe('isStr', function () {
  it('should return true with input string', function () {
    var output = utils.isStr(OBJ_STRING);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with input number', function () {
    var output = utils.isStr(OBJ_NUMBER);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input object', function () {
    var output = utils.isStr(OBJ_OBJECT);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input array', function () {
    var output = utils.isStr(OBJ_ARRAY);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input function', function () {
    var output = utils.isStr(OBJ_FUNCTION);
    assert.deepStrictEqual(output, false);
  });
});

describe('isArray', function () {
  it('should return false with input string', function () {
    var output = utils.isArray(OBJ_STRING);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input number', function () {
    var output = utils.isArray(OBJ_NUMBER);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input object', function () {
    var output = utils.isArray(OBJ_OBJECT);
    assert.deepStrictEqual(output, false);
  });

  it('should return true with input array', function () {
    var output = utils.isArray(OBJ_ARRAY);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with input function', function () {
    var output = utils.isArray(OBJ_FUNCTION);
    assert.deepStrictEqual(output, false);
  });
});

describe('isPlainObject', function () {
  it('should return false with input string', function () {
    var output = utils.isPlainObject(OBJ_STRING);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input number', function () {
    var output = utils.isPlainObject(OBJ_NUMBER);
    assert.deepStrictEqual(output, false);
  });

  it('should return true with input object', function () {
    var output = utils.isPlainObject(OBJ_OBJECT);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with input array', function () {
    var output = utils.isPlainObject(OBJ_ARRAY);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with input function', function () {
    var output = utils.isPlainObject(OBJ_FUNCTION);
    assert.deepStrictEqual(output, false);
  });
});

describe('isEmpty', function () {
  it('should return true with empty object', function () {
    var output = utils.isEmpty(OBJ_OBJECT);
    assert.deepStrictEqual(output, true);
  });

  it('should return false with non-empty object', function () {
    var obj = { a: 'b' };
    var output = utils.isEmpty(obj);
    assert.deepStrictEqual(output, false);
  });

  it('should return false with null', function () {
    var obj = null;
    var output = utils.isEmpty(obj);
    assert.deepStrictEqual(output, true);
  });
});

