export function generateId() {
  if (typeof global !== 'undefined' && global.crypto !== undefined) {
    if (global.crypto.randomUUID !== undefined) {
      return global.crypto.randomUUID();
    }
  }
  // sufficiently as for the use case
  return `${(Math.random() * 1000000) | 0}`;
}

export function semanticVersionCompare(version1, version2) {
  let semanticVersionPattern = '^\\d+(\\.\\d+(\\.\\d+){0,1}){0,1}$';
  if (!version1.match(semanticVersionPattern) || !version2.match(semanticVersionPattern)
  ) {
    return undefined;
  }

  let v1 = version1.split('.');
  let v2 = version2.split('.');
  let asInt = (val) => {
    return parseInt(val) || 0;
  };
  let compareInt = (i1, i2) => {
    let diff = i1 - i2;
    return diff === 0 ? 0 : (diff < 0 ? -1 : 1);
  };

  let majorCompare = compareInt(asInt(v1[0]), asInt(v2[0]));
  if (majorCompare === 0) {
    let minorCompare = compareInt(asInt(v1[1]), asInt(v2[1]));
    if (minorCompare === 0) {
      return compareInt(asInt(v1[2]), asInt(v2[2]));
    }
    return minorCompare;
  }
  return majorCompare;
}
