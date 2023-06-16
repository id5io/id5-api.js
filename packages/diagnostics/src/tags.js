const EMPTY = Object.freeze({});

/**
 * @param {Object|Map<string,string>|undefined} tags
 * @return {Object}
 */
function from(tags) {
  if (tags) {
    return tags instanceof Map ? Object.fromEntries(tags) : tags;
  }
  return EMPTY;
}

/**
 *
 * @param {Object} tags
 * @return {string|undefined}
 */
function toString(tags) {
  return Array.from(Object.entries(tags), ([k, v]) => (`${k}=${v}`)).sort().toString();
}

export default {EMPTY, from, toString};
