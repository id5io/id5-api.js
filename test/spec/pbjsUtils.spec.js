import {PbjsDetector, getPbjsGlobal} from '../../lib/prebid/pbjsUtils.js';

describe('getPbjsGlobal', function () {
  it('should return pbjs when it exists on scope', function () {
    const mockScope = {
      pbjs: {version: '8.0.0'}
    };

    const result = getPbjsGlobal(mockScope);

    expect(result).to.equal(mockScope.pbjs);
    expect(result.version).to.equal('8.0.0');
  });

  it('should return pbjs from _pbjsGlobals array when pbjs not directly available', function () {
    const mockScope = {
      _pbjsGlobals: ['customPbjs'],
      customPbjs: {version: '8.0.0', que: []}
    };

    const result = getPbjsGlobal(mockScope);

    expect(result).to.equal(mockScope.customPbjs);
    expect(result.version).to.equal('8.0.0');
  });

  it('should prefer direct pbjs over _pbjsGlobals', function () {
    const mockScope = {
      pbjs: {version: '8.0.0'},
      _pbjsGlobals: ['customPbjs'],
      customPbjs: {version: '7.0.0'}
    };

    const result = getPbjsGlobal(mockScope);

    expect(result).to.equal(mockScope.pbjs);
    expect(result.version).to.equal('8.0.0');
  });

  it('should return undefined when no pbjs found', function () {
    const mockScope = {};

    const result = getPbjsGlobal(mockScope);

    expect(result).to.be.undefined;
  });

  it('should return undefined when _pbjsGlobals is empty array', function () {
    const mockScope = {
      _pbjsGlobals: []
    };

    const result = getPbjsGlobal(mockScope);

    expect(result).to.be.undefined;
  });

  it('should return undefined when _pbjsGlobals is not an array', function () {
    const mockScope = {
      _pbjsGlobals: 'notAnArray'
    };

    const result = getPbjsGlobal(mockScope);

    expect(result).to.be.undefined;
  });

  it('should handle multiple entries in _pbjsGlobals by using first one', function () {
    const mockScope = {
      _pbjsGlobals: ['firstPbjs', 'secondPbjs'],
      firstPbjs: {version: '8.0.0'},
      secondPbjs: {version: '7.0.0'}
    };

    const result = getPbjsGlobal(mockScope);

    expect(result).to.equal(mockScope.firstPbjs);
    expect(result.version).to.equal('8.0.0');
  });
});

describe('PbjsDetector', function () {
  let mockWindow;

  beforeEach(function () {
    mockWindow = {
      pbjs: undefined
    };
  });

  it('should return a promise that resolves when pbjs is detected', async function () {
    const detector = new PbjsDetector(mockWindow);
    const detectionPromise = detector.getPbjs();

    expect(detectionPromise).to.be.instanceOf(Promise);

    mockWindow.pbjs.que[0]();

    const pbjs = await detectionPromise;
    expect(pbjs).to.equal(mockWindow.pbjs);
  });

  it('should return promises that resolve to the same pbjs instance', async function () {
    const detector = new PbjsDetector(mockWindow);

    const promise1 = detector.getPbjs();
    const promise2 = detector.getPbjs();

    mockWindow.pbjs.que[0]();

    const pbjs1 = await promise1;
    const pbjs2 = await promise2;

    expect(pbjs1).to.equal(pbjs2);
    expect(pbjs1).to.equal(mockWindow.pbjs);
  });

  it('should initialize pbjs and que if they do not exist', function () {
    const emptyWindow = {};
    const detector = new PbjsDetector(emptyWindow);

    detector.getPbjs();

    expect(emptyWindow.pbjs).to.exist;
    expect(emptyWindow.pbjs.que).to.be.an('array');
    expect(emptyWindow.pbjs.que).to.have.lengthOf(1);
  });

  it('should use existing pbjs.que if already present', function () {
    const someCallback = () => {
    };
    mockWindow.pbjs = {que: [someCallback]};
    const detector = new PbjsDetector(mockWindow);

    detector.getPbjs();

    expect(mockWindow.pbjs.que).to.have.lengthOf(2);
  });

  it('should handle window.pbjs setup errors gracefully', function () {
    const errorWindow = {
      get pbjs() {
        throw new Error('Access denied');
      },
      set pbjs(ignore) {
        throw new Error('Write denied');
      }
    };

    const detector = new PbjsDetector(errorWindow);
    const promise = detector.getPbjs();

    return promise.then((result) => {
      expect(result).to.be.null;
    });
  });

  it('should handle pbjs loading after detector setup', function (done) {
    const detector = new PbjsDetector(mockWindow);

    detector.getPbjs().then((pbjs) => {
      expect(pbjs.version).to.equal('8.0.0');
      expect(pbjs.installedModules).to.deep.equal(['module1', 'module2']);
      done();
    });

    setTimeout(() => {
      mockWindow.pbjs.version = '8.0.0';
      mockWindow.pbjs.installedModules = ['module1', 'module2'];
      mockWindow.pbjs.que[0]();
    }, 10);
  });

  it('should use real window object by default', function () {
    const detector = new PbjsDetector();
    detector.getPbjs();

    expect(window.pbjs).to.exist;
    expect(window.pbjs.que).to.be.an('array');
  });

  describe('with _pbjsGlobals', function () {
    it('should detect pbjs from custom global name via _pbjsGlobals', async function () {
      const customWindow = {
        _pbjsGlobals: ['customPbjsName'],
        customPbjsName: {
          que: [],
          version: '8.0.0'
        }
      };

      const detector = new PbjsDetector(customWindow);
      const promise = detector.getPbjs();

      // Simulate prebid.js setting window.pbjs after initialization
      customWindow.pbjs = customWindow.customPbjsName;
      customWindow.customPbjsName.que[0]();

      const pbjs = await promise;
      expect(pbjs).to.equal(customWindow.pbjs);
      expect(pbjs.version).to.equal('8.0.0');
    });

    it('should fallback to default pbjs when _pbjsGlobals array is empty', async function () {
      const customWindow = {
        _pbjsGlobals: []
      };

      const detector = new PbjsDetector(customWindow);
      detector.getPbjs();

      expect(customWindow.pbjs).to.exist;
      expect(customWindow.pbjs.que).to.be.an('array');
      expect(customWindow.pbjs.que).to.have.lengthOf(1);
    });

    it('should use existing custom pbjs.que if already present', async function () {
      const existingCallback = () => {};
      const customWindow = {
        _pbjsGlobals: ['myPbjs'],
        myPbjs: {
          que: [existingCallback],
          version: '8.0.0'
        }
      };

      const detector = new PbjsDetector(customWindow);
      detector.getPbjs();

      expect(customWindow.myPbjs.que).to.have.lengthOf(2);
      expect(customWindow.myPbjs.que[0]).to.equal(existingCallback);
    });
  });
});
