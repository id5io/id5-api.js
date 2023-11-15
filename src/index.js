import ID5 from '../lib/id5-api';
import 'regenerator-runtime/runtime';

if (!window.ID5) {
  window.ID5 = ID5;
} else {
  // TODO: Check for different versions in the same page at init
}
