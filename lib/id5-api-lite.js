import {Id5Api} from './core/id5Api.js';
import {ApiLite} from './lite/apiLite.js';

const ID5 = new Id5Api();
new ApiLite(ID5); // assign standard API
export default ID5;
