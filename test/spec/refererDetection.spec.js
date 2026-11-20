import { detectReferer } from '../../lib/refererDetection.js';

const mocks = {
  createFakeWindow: function (referrer, href, ancestorOrigins = undefined) {
    return {
      document: {
        referrer: referrer
      },
      location: {
        href: href,
        ancestorOrigins: ancestorOrigins
      },
      parent: null,
      top: null
    };
  }
};

describe('referer detection', () => {
  it('should return topmostLocation details in nested friendly iframes', function() {
    // Fake window object to test friendly iframes
    // - Main page http://example.com/page.html (opened from http://search.com/results?q=x)
    // - - Iframe1 http://example.com/iframe1.html
    // - - - Iframe2 http://example.com/iframe2.html
    let mockIframe2WinObject = mocks.createFakeWindow('http://example.com/iframe1.html', 'http://example.com/iframe2.html?a=b#c');
    let mockIframe1WinObject = mocks.createFakeWindow('http://example.com/page.html?user=secret', 'http://example.com/iframe1.html');
    let mainWinObject = mocks.createFakeWindow('http://search.com/results?q=secret', 'http://example.com/page.html?user=secret#frag');
    mainWinObject.document.querySelector = function() {
      return {
        href: 'http://id5.io/canonical'
      }
    }
    mockIframe2WinObject.parent = mockIframe1WinObject;
    mockIframe2WinObject.top = mainWinObject;
    mockIframe1WinObject.parent = mainWinObject;
    mockIframe1WinObject.top = mainWinObject;
    mainWinObject.top = mainWinObject;

    const getRefererInfo = detectReferer(mockIframe2WinObject);
    let result = getRefererInfo();
    let expectedResult = {
      ref: 'http://search.com',
      topmostLocation: 'http://example.com',
      reachedTop: true,
      numIframes: 2,
      stack: [
        'http://example.com',
        'http://example.com',
        'http://example.com'
      ]
    };
    expect(result).to.deep.equal(expectedResult);
  });

  it('should return topmostLocation details in nested cross domain iframes', function() {
    // Fake window object to test cross domain iframes.
    // - Main page http://example.com/page.html
    // - - Iframe1 http://aaa.com/iframe1.html
    // - - - Iframe2 http://bbb.com/iframe2.html
    let mockIframe2WinObject = mocks.createFakeWindow('http://aaa.com/iframe1.html?secret=1', 'http://bbb.com/iframe2.html');
    // Sinon cannot throw exception when accessing a propery so passing null to create cross domain
    // environment for refererDetection module
    let mockIframe1WinObject = mocks.createFakeWindow(null, null);
    let mainWinObject = mocks.createFakeWindow(null, null);
    mockIframe2WinObject.parent = mockIframe1WinObject;
    mockIframe2WinObject.top = mainWinObject;
    mockIframe1WinObject.parent = mainWinObject;
    mockIframe1WinObject.top = mainWinObject;
    mainWinObject.top = mainWinObject;

    const getRefererInfo = detectReferer(mockIframe2WinObject);
    let result = getRefererInfo();
    let expectedResult = {
      topmostLocation: 'http://aaa.com',
      ref: null,
      reachedTop: false,
      numIframes: 2,
      stack: [
        null,
        'http://aaa.com',
        'http://bbb.com'
      ]
    };
    expect(result).to.deep.equal(expectedResult);
  });

  it('should use ancestor origins when frames are not accessible', function() {
    // - Main page https://top.com/page.html (not accessible)
    // - - Iframe1 https://aaa.com/iframe1.html (not accessible, no referrer)
    // - - - Iframe2 https://bbb.com/iframe2.html
    let mockIframe2WinObject = mocks.createFakeWindow(null, 'https://bbb.com/iframe2.html?x=y', ['https://aaa.com', 'https://top.com']);
    let mockIframe1WinObject = mocks.createFakeWindow(null, null);
    let mainWinObject = mocks.createFakeWindow(null, null);
    mockIframe2WinObject.parent = mockIframe1WinObject;
    mockIframe2WinObject.top = mainWinObject;
    mockIframe1WinObject.parent = mainWinObject;
    mockIframe1WinObject.top = mainWinObject;
    mainWinObject.top = mainWinObject;

    const result = detectReferer(mockIframe2WinObject)();

    expect(result).to.deep.equal({
      topmostLocation: 'https://top.com',
      ref: null,
      reachedTop: false,
      numIframes: 2,
      stack: [
        'https://top.com',
        'https://aaa.com',
        'https://bbb.com'
      ]
    });
  });

  it('should treat opaque ancestor origins as unknown', function() {
    // - Main page (not accessible, reported as "null" e.g. due to no-referrer policy)
    // - - Iframe1 https://aaa.com/iframe1.html (not accessible, no referrer)
    // - - - Iframe2 https://bbb.com/iframe2.html
    let mockIframe2WinObject = mocks.createFakeWindow(null, 'https://bbb.com/iframe2.html', ['https://aaa.com', 'null']);
    let mockIframe1WinObject = mocks.createFakeWindow(null, null);
    let mainWinObject = mocks.createFakeWindow(null, null);
    mockIframe2WinObject.parent = mockIframe1WinObject;
    mockIframe2WinObject.top = mainWinObject;
    mockIframe1WinObject.parent = mainWinObject;
    mockIframe1WinObject.top = mainWinObject;
    mainWinObject.top = mainWinObject;

    const result = detectReferer(mockIframe2WinObject)();

    expect(result).to.deep.equal({
      topmostLocation: 'https://aaa.com',
      ref: null,
      reachedTop: false,
      numIframes: 2,
      stack: [
        null,
        'https://aaa.com',
        'https://bbb.com'
      ]
    });
  });

  it('should skip opaque origins', function() {
    let mainWinObject = mocks.createFakeWindow('about:blank', 'about:blank');
    mainWinObject.top = mainWinObject;

    const result = detectReferer(mainWinObject)();

    expect(result).to.deep.equal({
      topmostLocation: null,
      ref: null,
      reachedTop: false,
      numIframes: 0,
      stack: [null]
    });
  });
});
