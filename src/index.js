import {Id5Api} from '../lib/id5-api';

const API_ORIGIN = 'api';
if (!window.ID5 || window.ID5.origin !== API_ORIGIN) {
  window.ID5 = new Id5Api(API_ORIGIN);
}
