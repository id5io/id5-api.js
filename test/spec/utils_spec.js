import sinon from 'sinon';
import * as utils from '../../lib/utils';

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
      assert.deepStrictEqual(output, target);
    });
  });

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

  describe('_map', function () {
    it('return empty array when input object is empty', function () {
      var input = {};
      var callback = function () {};

      var output = utils._map(input, callback);
      assert.deepStrictEqual(output, []);
    });

    it('return value array with vaild input object', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v) { return v; };

      var output = utils._map(input, callback);
      assert.deepStrictEqual(output, ['A', 'B']);
    });

    it('return value array with vaild input object_callback func changed 1', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v, k) { return v + k; };

      var output = utils._map(input, callback);
      assert.deepStrictEqual(output, ['Aa', 'Bb']);
    });

    it('return value array with vaild input object_callback func changed 2', function () {
      var input = { a: 'A', b: 'B' };
      var callback = function (v, k, o) { return o; };

      var output = utils._map(input, callback);
      assert.deepStrictEqual(output, [input, input]);
    });
  });

  describe('deferPixelFire', function () {
    let fn, fn2;
    beforeEach(function () {
      fn = sinon.spy();
      fn2 = sinon.spy();
    });
    it('should be called immediately if dom is already ready', function () {
      // TODO mock these calls
      utils.deferPixelFire('https://id5-sync.com/status', fn);
      sinon.assert.calledOnce(fn);
    });
    it('should not be called synchronously, and called on DOMContentLoaded', function (done) {
      // Fake document.readyState
      Object.defineProperty(document, 'readyState', {
        get() { return 'loading'; }
      });
      // TODO mock these calls
      utils.deferPixelFire('https://id5-sync.com/i/1/0.gif', fn, fn2);

      sinon.assert.notCalled(fn);

      // Fake DOMContentLoaded
      var event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      sinon.assert.calledOnce(fn);

      setTimeout(() => {
        sinon.assert.calledOnce(fn2);
        done();
      }, 1000);
    });
    it('second callback should not be called on invalid response', function (done) {
      // TODO mock these calls
      utils.deferPixelFire('https://id5-sync.com/i/0/0.gif', fn, fn2);
      sinon.assert.notCalled(fn);
      setTimeout(() => {
        sinon.assert.notCalled(fn2);
        done();
      }, 1000);
    });
  });
});
