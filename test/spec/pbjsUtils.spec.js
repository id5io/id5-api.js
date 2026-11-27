import sinon from 'sinon';
import {PbjsDetector, getPbjsInstance} from '../../lib/prebid/pbjsUtils.js';

describe('getPbjsInstance', function () {
  it('should return pbjs when it exists on scope', function () {
    const mockScope = {
      pbjs: {version: '8.0.0'}
    };

    const result = getPbjsInstance(mockScope);

    expect(result).to.equal(mockScope.pbjs);
    expect(result.version).to.equal('8.0.0');
  });

  it('should return pbjs from _pbjsGlobals array when pbjs not directly available', function () {
    const mockScope = {
      _pbjsGlobals: ['customPbjs'],
      customPbjs: {version: '8.0.0', que: []}
    };

    const result = getPbjsInstance(mockScope);

    expect(result).to.equal(mockScope.customPbjs);
    expect(result.version).to.equal('8.0.0');
  });

  it('should prefer direct pbjs over _pbjsGlobals', function () {
    const mockScope = {
      pbjs: {version: '8.0.0'},
      _pbjsGlobals: ['customPbjs'],
      customPbjs: {version: '7.0.0'}
    };

    const result = getPbjsInstance(mockScope);

    expect(result).to.equal(mockScope.pbjs);
    expect(result.version).to.equal('8.0.0');
  });

  it('should return undefined when no pbjs found', function () {
    const mockScope = {};

    const result = getPbjsInstance(mockScope);

    expect(result).to.be.undefined;
  });

  it('should return undefined when _pbjsGlobals is empty array', function () {
    const mockScope = {
      _pbjsGlobals: []
    };

    const result = getPbjsInstance(mockScope);

    expect(result).to.be.undefined;
  });

  it('should return undefined when _pbjsGlobals is not an array', function () {
    const mockScope = {
      _pbjsGlobals: 'notAnArray'
    };

    const result = getPbjsInstance(mockScope);

    expect(result).to.be.undefined;
  });

  it('should handle multiple entries in _pbjsGlobals by using first one', function () {
    const mockScope = {
      _pbjsGlobals: ['firstPbjs', 'secondPbjs'],
      firstPbjs: {version: '8.0.0'},
      secondPbjs: {version: '7.0.0'}
    };

    const result = getPbjsInstance(mockScope);

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

    it('should detect a Prebid that takes a global name of its own after the detector', async function () {
      const customWindow = {};
      const detector = new PbjsDetector(customWindow);
      const promise = detector.getPbjs();

      // Prebid.js loading under a name of its own: it keeps the _pbjsGlobals it finds on the page
      customWindow.myPbjs = {que: [], version: '8.0.0'};
      customWindow._pbjsGlobals = customWindow._pbjsGlobals || [];
      customWindow._pbjsGlobals.push('myPbjs');
      customWindow.myPbjs.que.forEach(command => command());

      const pbjs = await promise;
      expect(pbjs).to.equal(customWindow.myPbjs);
      expect(pbjs.version).to.equal('8.0.0');
    });

    it('should prefer a Prebid of its own name over the global the detector left behind', function () {
      const customWindow = {};
      new PbjsDetector(customWindow).getPbjs();
      customWindow.myPbjs = {que: [], version: '8.0.0'};
      customWindow._pbjsGlobals.push('myPbjs');

      expect(getPbjsInstance(customWindow)).to.equal(customWindow.myPbjs);
    });

    it('should keep the default global once Prebid has taken it over', function () {
      const customWindow = {};
      const detector = new PbjsDetector(customWindow);
      detector.getPbjs();
      customWindow.pbjs.version = '8.0.0';
      customWindow.pbjs.que.forEach(command => command());
      customWindow.myPbjs = {que: [], version: '7.0.0'};
      customWindow._pbjsGlobals.push('myPbjs');

      expect(getPbjsInstance(customWindow)).to.equal(customWindow.pbjs);
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

describe('getPbjsInstance with a named Prebid.js', function () {
  it('should return the named global over the default one', function () {
    const mockScope = {
      pbjs: {version: '7.0.0'},
      customPrebid: {version: '8.0.0'}
    };

    expect(getPbjsInstance(mockScope, 'customPrebid')).to.equal(mockScope.customPrebid);
  });

  it('should return the named global over the one registered in _pbjsGlobals', function () {
    const mockScope = {
      _pbjsGlobals: ['otherPbjs'],
      otherPbjs: {version: '7.0.0'},
      customPrebid: {version: '8.0.0'}
    };

    expect(getPbjsInstance(mockScope, 'customPrebid')).to.equal(mockScope.customPrebid);
  });

  it('should return undefined when the page has nothing under the name', function () {
    const mockScope = {
      pbjs: {version: '7.0.0'}
    };

    expect(getPbjsInstance(mockScope, 'customPrebid')).to.be.undefined;
  });

  it('should return the instance it is given', function () {
    const customPrebid = {version: '8.0.0'};

    expect(getPbjsInstance({pbjs: {version: '7.0.0'}}, customPrebid)).to.equal(customPrebid);
  });
});

describe('PbjsDetector with a named Prebid.js', function () {
  it('should queue on the named global and leave the default one alone', async function () {
    const mockScope = {
      pbjs: {version: '7.0.0', que: []},
      customPrebid: {version: '8.0.0', que: []}
    };

    const promise = new PbjsDetector(mockScope, undefined, 'customPrebid').getPbjs();
    expect(mockScope.pbjs.que).to.have.lengthOf(0);
    expect(mockScope.customPrebid.que).to.have.lengthOf(1);
    mockScope.customPrebid.que[0]();

    expect(await promise).to.equal(mockScope.customPrebid);
  });

  it('should install a stub under the name the page has nothing under', async function () {
    const mockScope = {};

    const promise = new PbjsDetector(mockScope, undefined, 'customPrebid').getPbjs();
    expect(mockScope.pbjs).to.be.undefined;
    expect(mockScope.customPrebid.que).to.be.an('array').with.lengthOf(1);

    // Prebid.js loading under that name keeps the global it finds, queue included
    mockScope.customPrebid.version = '8.0.0';
    mockScope.customPrebid.que[0]();

    const pbjs = await promise;
    expect(pbjs).to.equal(mockScope.customPrebid);
    expect(pbjs.version).to.equal('8.0.0');
  });

  it('should queue on the instance it is given', async function () {
    const customPrebid = {version: '8.0.0', que: []};
    const mockScope = {pbjs: {version: '7.0.0', que: []}};

    const promise = new PbjsDetector(mockScope, undefined, customPrebid).getPbjs();
    expect(mockScope.pbjs.que).to.have.lengthOf(0);
    customPrebid.que[0]();

    expect(await promise).to.equal(customPrebid);
  });

  it('should leave a value under the name that is not an object as it is', async function () {
    const mockScope = {name: '', opener: null, status: 0};
    const logger = {error: sinon.spy()};

    expect(await new PbjsDetector(mockScope, logger, 'name').getPbjs()).to.be.null;
    expect(await new PbjsDetector(mockScope, logger, 'opener').getPbjs()).to.be.null;
    expect(await new PbjsDetector(mockScope, logger, 'status').getPbjs()).to.be.null;

    expect(mockScope).to.deep.equal({name: '', opener: null, status: 0});
    expect(logger.error).to.have.been.calledThrice;
  });

  it('should wait for nothing when it is given neither a name nor an instance', async function () {
    const mockScope = {pbjs: {version: '7.0.0', que: []}};
    const logger = {error: sinon.spy()};

    expect(await new PbjsDetector(mockScope, logger, true).getPbjs()).to.be.null;

    expect(mockScope).to.deep.equal({pbjs: {version: '7.0.0', que: []}});
    expect(logger.error).to.have.been.calledOnce;
  });

  it('should leave the page alone when it is given an instance', async function () {
    const customPrebid = {version: '8.0.0'};
    const mockScope = {};

    const promise = new PbjsDetector(mockScope, undefined, customPrebid).getPbjs();
    customPrebid.que[0]();

    expect(await promise).to.equal(customPrebid);
    expect(mockScope).to.deep.equal({});
  });
});
