import * as utils from 'src/utils';

let assert = require('assert');

describe('Utils', function () {
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

  describe('extend', function () {
    it('should merge two input object', function () {
      let target = {
        a: '1',
        b: '2'
      };

      const source = {
        c: '3'
      };

      const expectedResult = {
        a: '1',
        b: '2',
        c: '3'
      };

      let output = Object.assign(target, source);
      assert.deepStrictEqual(output, expectedResult);
    });

    it('should merge two input object even though target object is empty', function () {
      var target = {};
      var source = {
        c: '3'
      };

      var output = Object.assign(target, source);
      assert.deepStrictEqual(output, source);
    });

    it('just return target object, if the source object is empty', function () {
      var target = {
        a: '1',
        b: '2'
      };
      var source = {};

      var output = Object.assign(target, source);
      assert.deepEqual(output, target);
    });
  });

  describe('isA', function () {
    it('should return true with string object', function () {
      var output = utils.isA(OBJ_STRING, TYPE_STRING);
      assert.deepEqual(output, true);
    });

    it('should return false with object', function () {
      var output = utils.isA(OBJ_OBJECT, TYPE_STRING);
      assert.deepEqual(output, false);
    });

    it('should return true with object', function () {
      var output = utils.isA(OBJ_OBJECT, TYPE_OBJECT);
      assert.deepEqual(output, true);
    });

    it('should return false with array object', function () {
      var output = utils.isA(OBJ_ARRAY, TYPE_OBJECT);
      assert.deepEqual(output, false);
    });

    it('should return true with array object', function () {
      var output = utils.isA(OBJ_ARRAY, TYPE_ARRAY);
      assert.deepEqual(output, true);
    });

    it('should return false with array object', function () {
      var output = utils.isA(OBJ_ARRAY, TYPE_FUNCTION);
      assert.deepEqual(output, false);
    });

    it('should return true with function', function () {
      var output = utils.isA(OBJ_FUNCTION, TYPE_FUNCTION);
      assert.deepEqual(output, true);
    });

    it('should return false with number', function () {
      var output = utils.isA(OBJ_FUNCTION, TYPE_NUMBER);
      assert.deepEqual(output, false);
    });

    it('should return true with number', function () {
      var output = utils.isA(OBJ_NUMBER, TYPE_NUMBER);
      assert.deepEqual(output, true);
    });
  });

  describe('isFn', function () {
    it('should return true with input function', function () {
      var output = utils.isFn(OBJ_FUNCTION);
      assert.deepEqual(output, true);
    });

    it('should return false with input string', function () {
      var output = utils.isFn(OBJ_STRING);
      assert.deepEqual(output, false);
    });

    it('should return false with input number', function () {
      var output = utils.isFn(OBJ_NUMBER);
      assert.deepEqual(output, false);
    });

    it('should return false with input Array', function () {
      var output = utils.isFn(OBJ_ARRAY);
      assert.deepEqual(output, false);
    });

    it('should return false with input object', function () {
      var output = utils.isFn(OBJ_OBJECT);
      assert.deepEqual(output, false);
    });
  });

  describe('isStr', function () {
    it('should return true with input string', function () {
      var output = utils.isStr(OBJ_STRING);
      assert.deepEqual(output, true);
    });

    it('should return false with input number', function () {
      var output = utils.isStr(OBJ_NUMBER);
      assert.deepEqual(output, false);
    });

    it('should return false with input object', function () {
      var output = utils.isStr(OBJ_OBJECT);
      assert.deepEqual(output, false);
    });

    it('should return false with input array', function () {
      var output = utils.isStr(OBJ_ARRAY);
      assert.deepEqual(output, false);
    });

    it('should return false with input function', function () {
      var output = utils.isStr(OBJ_FUNCTION);
      assert.deepEqual(output, false);
    });
  });

  describe('isArray', function () {
    it('should return false with input string', function () {
      var output = utils.isArray(OBJ_STRING);
      assert.deepEqual(output, false);
    });

    it('should return false with input number', function () {
      var output = utils.isArray(OBJ_NUMBER);
      assert.deepEqual(output, false);
    });

    it('should return false with input object', function () {
      var output = utils.isArray(OBJ_OBJECT);
      assert.deepEqual(output, false);
    });

    it('should return true with input array', function () {
      var output = utils.isArray(OBJ_ARRAY);
      assert.deepEqual(output, true);
    });

    it('should return false with input function', function () {
      var output = utils.isArray(OBJ_FUNCTION);
      assert.deepEqual(output, false);
    });
  });

  describe('isPlainObject', function () {
    it('should return false with input string', function () {
      var output = utils.isPlainObject(OBJ_STRING);
      assert.deepEqual(output, false);
    });

    it('should return false with input number', function () {
      var output = utils.isPlainObject(OBJ_NUMBER);
      assert.deepEqual(output, false);
    });

    it('should return true with input object', function () {
      var output = utils.isPlainObject(OBJ_OBJECT);
      assert.deepEqual(output, true);
    });

    it('should return false with input array', function () {
      var output = utils.isPlainObject(OBJ_ARRAY);
      assert.deepEqual(output, false);
    });

    it('should return false with input function', function () {
      var output = utils.isPlainObject(OBJ_FUNCTION);
      assert.deepEqual(output, false);
    });
  });

  describe('isEmpty', function () {
    it('should return true with empty object', function () {
      var output = utils.isEmpty(OBJ_OBJECT);
      assert.deepEqual(output, true);
    });

    it('should return false with non-empty object', function () {
      var obj = { a: 'b' };
      var output = utils.isEmpty(obj);
      assert.deepEqual(output, false);
    });

    it('should return false with null', function () {
      var obj = null;
      var output = utils.isEmpty(obj);
      assert.deepEqual(output, true);
    });
  });

  describe('_map', function () {
    it('return empty array when input object is empty', function () {
      var input = {};
      var callback = function () {};

      var output = utils._map(input, callback);
      assert.deepEqual(output, []);
    });

    it('return value array with vaild input object', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v) { return v; };

      var output = utils._map(input, callback);
      assert.deepEqual(output, ['A', 'B']);
    });

    it('return value array with vaild input object_callback func changed 1', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v, k) { return v + k; };

      var output = utils._map(input, callback);
      assert.deepEqual(output, ['Aa', 'Bb']);
    });

    it('return value array with vaild input object_callback func changed 2', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v, k, o) { return o; };

      var output = utils._map(input, callback);
      assert.deepEqual(output, [input, input]);
    });
  });

  describe('deferPixelFire', function () {
    let fn;
    beforeEach(function () {
      fn = sinon.spy();
    });
    it('should be called immediatly if dom is already ready', function () {
      utils.deferPixelFire('https://id5-sync.com/status', fn);
      sinon.assert.calledOnce(fn);
    });
    it('should not be called synchrously, and called on DOMContentLoaded', function () {
      // Fake document.readyState
      Object.defineProperty(document, 'readyState', {
        get() { return 'loading'; }
      });
      utils.deferPixelFire('https://id5-sync.com/status', fn);

      sinon.assert.notCalled(fn);

      // Fake DOMContentLoaded
      var event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      sinon.assert.calledOnce(fn);
    });
  });
});
