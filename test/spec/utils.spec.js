import sinon from 'sinon';
import * as utils from '../../lib/utils.js';

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
      expect(output).to.deep.eq(expectedResult);
    });

    it('should merge two input object even though target object is empty', function () {
      var target = {};
      var source = {
        c: '3'
      };

      var output = Object.assign(target, source);
      expect(output).to.deep.eq(source);
    });

    it('just return target object, if the source object is empty', function () {
      var target = {
        a: '1',
        b: '2'
      };
      var source = {};

      var output = Object.assign(target, source);
      expect(output).to.deep.eq(target);
    });
  });

  describe('all', function () {
    it('should return true when the mappings returns true', function () {
      expect(utils.all(["a", "b", "c"], utils.isStr)).to.be.true;
    });
    it('should return false when one of the mappings returns false', function () {
      expect(utils.all(["a", 12, "c"], utils.isStr)).to.not.be.true;
    });
  });

  describe('isA', function () {
    it('should return true with string object', function () {
      var output = utils.isA(OBJ_STRING, TYPE_STRING);
      expect(output).to.be.true;
    });

    it('should return false with object', function () {
      var output = utils.isA(OBJ_OBJECT, TYPE_STRING);
      expect(output).to.be.false;
    });

    it('should return true with object', function () {
      var output = utils.isA(OBJ_OBJECT, TYPE_OBJECT);
      expect(output).to.be.true;
    });

    it('should return false with array object', function () {
      var output = utils.isA(OBJ_ARRAY, TYPE_OBJECT);
      expect(output).to.be.false;
    });

    it('should return true with array object', function () {
      var output = utils.isA(OBJ_ARRAY, TYPE_ARRAY);
      expect(output).to.be.true;
    });

    it('should return false with array object', function () {
      var output = utils.isA(OBJ_ARRAY, TYPE_FUNCTION);
      expect(output).to.be.false;
    });

    it('should return true with function', function () {
      var output = utils.isA(OBJ_FUNCTION, TYPE_FUNCTION);
      expect(output).to.be.true;
    });

    it('should return false with number', function () {
      var output = utils.isA(OBJ_FUNCTION, TYPE_NUMBER);
      expect(output).to.be.false;
    });

    it('should return true with number', function () {
      var output = utils.isA(OBJ_NUMBER, TYPE_NUMBER);
      expect(output).to.be.true;
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
      expect(output).to.be.true;
    });

    it('should return false with input string', function () {
      var output = utils.isFn(OBJ_STRING);
      expect(output).to.be.false;
    });

    it('should return false with input number', function () {
      var output = utils.isFn(OBJ_NUMBER);
      expect(output).to.be.false;
    });

    it('should return false with input Array', function () {
      var output = utils.isFn(OBJ_ARRAY);
      expect(output).to.be.false;
    });

    it('should return false with input object', function () {
      var output = utils.isFn(OBJ_OBJECT);
      expect(output).to.be.false;
    });
  });

  describe('isStr', function () {
    it('should return true with input string', function () {
      var output = utils.isStr(OBJ_STRING);
      expect(output).to.be.true;
    });

    it('should return false with input number', function () {
      var output = utils.isStr(OBJ_NUMBER);
      expect(output).to.be.false;
    });

    it('should return false with input object', function () {
      var output = utils.isStr(OBJ_OBJECT);
      expect(output).to.be.false;
    });

    it('should return false with input array', function () {
      var output = utils.isStr(OBJ_ARRAY);
      expect(output).to.be.false;
    });

    it('should return false with input function', function () {
      var output = utils.isStr(OBJ_FUNCTION);
      expect(output).to.be.false;
    });
  });

  describe('isArray', function () {
    it('should return false with input string', function () {
      var output = utils.isArray(OBJ_STRING);
      expect(output).to.be.false;
    });

    it('should return false with input number', function () {
      var output = utils.isArray(OBJ_NUMBER);
      expect(output).to.be.false;
    });

    it('should return false with input object', function () {
      var output = utils.isArray(OBJ_OBJECT);
      expect(output).to.be.false;
    });

    it('should return true with input array', function () {
      var output = utils.isArray(OBJ_ARRAY);
      expect(output).to.be.true;
    });

    it('should return false with input function', function () {
      var output = utils.isArray(OBJ_FUNCTION);
      expect(output).to.be.false;
    });
  });

  describe('isPlainObject', function () {
    it('should return false with input string', function () {
      var output = utils.isPlainObject(OBJ_STRING);
      expect(output).to.be.false;
    });

    it('should return false with input number', function () {
      var output = utils.isPlainObject(OBJ_NUMBER);
      expect(output).to.be.false;
    });

    it('should return true with input object', function () {
      var output = utils.isPlainObject(OBJ_OBJECT);
      expect(output).to.be.true;
    });

    it('should return false with input array', function () {
      var output = utils.isPlainObject(OBJ_ARRAY);
      expect(output).to.be.false;
    });

    it('should return false with input function', function () {
      var output = utils.isPlainObject(OBJ_FUNCTION);
      expect(output).to.be.false;
    });
  });

  describe('isEmpty', function () {
    it('should return true with empty object', function () {
      var output = utils.isEmpty(OBJ_OBJECT);
      expect(output).to.be.true;
    });

    it('should return false with non-empty object', function () {
      var obj = { a: 'b' };
      var output = utils.isEmpty(obj);
      expect(output).to.be.false;
    });

    it('should return false with null', function () {
      var obj = null;
      var output = utils.isEmpty(obj);
      expect(output).to.be.true;
    });
  });

  describe('deferPixelFire', function () {
    let imageSpy;

    beforeEach(function () {
      imageSpy = sinon.spy(window, 'Image');
    });

    afterEach(function () {
      imageSpy.restore();
    });

    it('should be called immediately if dom is already ready', function () {
      // Served by Karma ('files' property)
      utils.deferPixelFire('/base/test/pages/1x1.png');
      expect(imageSpy).to.have.been.calledOnce;
      const pixelUrl = imageSpy.firstCall.returnValue.src;
      expect(pixelUrl).to.contain('/base/test/pages/1x1.png');
    });

    it('should not be called synchronously, and called on DOMContentLoaded', function (done) {
      // Fake document.readyState
      Object.defineProperty(document, 'readyState', {
        get() { return 'loading'; },
        configurable: true
      });

      // Served by Karma ('files' property)
      utils.deferPixelFire('/base/test/pages/1x1.png');

      expect(imageSpy).to.not.have.been.called;

      // Fake DOMContentLoaded
      var event = document.createEvent('Event');
      event.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(event);

      setTimeout(() => {
        expect(imageSpy).to.have.been.calledOnce;
        const pixelUrl = imageSpy.firstCall.returnValue.src;
        expect(pixelUrl).to.contain('/base/test/pages/1x1.png');
        Object.defineProperty(document, 'readyState', {
          value: 'complete',
          writable: false
        });
        done();
      }, 100);
    });
  });

  describe('deepEqual', () => {
    it('should return true for equal objects', () => {
      const obj1 = {
        name: 'John',
        age: 30,
        address: {
          street: '123 Main St',
        },
        hobbies: ['swimming']
      };
      const obj2 = {
        name: 'John',
        age: 30,
        address: {
          street: '123 Main St',
        },
        hobbies: ['swimming']
      };
      expect(utils.deepEqual(obj1, obj2)).to.be.true;
    });

    it('should return false for objects with different properties', () => {
      const obj1 = {
        name: 'John1',
        age: 30,
      };
      const obj2 = {
        name: 'John2',
        age: 30,
      };
      expect(utils.deepEqual(obj1, obj2)).to.be.false;
    });

    it('should return false for objects with different nested properties', () => {
      const obj1 = {
        address: {
          street: '123 Main St',
        },
      };
      const obj2 = {
        address: {
          street: '123 Other St',
        },
      };
      expect(utils.deepEqual(obj1, obj2)).to.be.false;
    });

    it('should return true for null objects', () => {
      const obj1 = null;
      const obj2 = null;
      expect(utils.deepEqual(obj1, obj2)).to.be.true;
    });

    it('should return true for objects with null values', () => {
      const obj1 = {
        age: null
      };
      const obj2 = {
        age: null
      };
      expect(utils.deepEqual(obj1, obj2)).to.be.true;
    });

    it('should return true for objects with different property order', () => {
      const obj1 = {
        name: 'John',
        age: 30,
      };
      const obj2 = {
        age: 30,
        name: 'John',
      };
      expect(utils.deepEqual(obj1, obj2)).to.be.true;
    });

    it('should return false for objects with different property set', () => {
      const obj1 = {
        name: 'John',
        age: 30,
      };
      const obj2 = {
        age: 30,
        name: 'John',
        surname: 'Doe',
      };
      expect(utils.deepEqual(obj1, obj2)).to.be.false;
    });
  });
});
