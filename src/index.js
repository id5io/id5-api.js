import {ApiStandard} from '../lib/id5-api.js';
import {Id5Api} from '../lib/core/id5Api.js';

if (!window.ID5) {
  window.ID5 = new Id5Api();
}

if (!window.ID5.ApiStandardLoaded) {
  new ApiStandard(window.ID5); // assign standard api
}
