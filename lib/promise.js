import {default as PolyfillPromise} from 'promise-polyfill';

function getPromise() {
  let root = typeof global !== 'undefined' ? global : window;
  if (root !== undefined && root.Promise !== undefined) {
    return root.Promise;
  }
  return PolyfillPromise;
}

const Promise = getPromise();
export default Promise;
