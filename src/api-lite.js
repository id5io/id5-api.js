import {ApiLite} from '../lib/lite/apiLite.js';
import {Id5Api} from '../lib/core/id5Api.js';

if (!window.ID5) {
  window.ID5 = new Id5Api();
}

if (!window.ID5.ApiLiteLoaded) {
  new ApiLite(window.ID5);
}
