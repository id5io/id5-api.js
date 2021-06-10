import ID5 from '../lib/id5-api';

if (!window.ID5) {
  window.ID5 = ID5;
} else {
  // TODO: Check for different versions in the same page at init
}
