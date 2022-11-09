/**
 * Base 64 characters with additional -,_ replacements for +,/ characters used in TCFv2
 */
const BASE_64_REVERSE_DICT = {
  'A': 0,
  'B': 1,
  'C': 2,
  'D': 3,
  'E': 4,
  'F': 5,
  'G': 6,
  'H': 7,
  'I': 8,
  'J': 9,
  'K': 10,
  'L': 11,
  'M': 12,
  'N': 13,
  'O': 14,
  'P': 15,
  'Q': 16,
  'R': 17,
  'S': 18,
  'T': 19,
  'U': 20,
  'V': 21,
  'W': 22,
  'X': 23,
  'Y': 24,
  'Z': 25,
  'a': 26,
  'b': 27,
  'c': 28,
  'd': 29,
  'e': 30,
  'f': 31,
  'g': 32,
  'h': 33,
  'i': 34,
  'j': 35,
  'k': 36,
  'l': 37,
  'm': 38,
  'n': 39,
  'o': 40,
  'p': 41,
  'q': 42,
  'r': 43,
  's': 44,
  't': 45,
  'u': 46,
  'v': 47,
  'w': 48,
  'x': 49,
  'y': 50,
  'z': 51,
  '0': 52,
  '1': 53,
  '2': 54,
  '3': 55,
  '4': 56,
  '5': 57,
  '6': 58,
  '7': 59,
  '8': 60,
  '9': 61,
  '-': 62,
  '_': 63,
  '+': 62,
  '/': 63
};

const BASIS = 6;

/**
 * Decodes only purposesConsent section of tcf v2 consent string and checks if given purpose consnet is set.
 * Decodes according to https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20Consent%20string%20and%20vendor%20list%20formats%20v2.md#tc-string-format
 * @param tcString - given tcString
 * @param purpose - given purpose number
 * @return {boolean|undefined} - undefined if purpose section not found or tcString version is not 2, true if purpose consent set, false otherwise
 */
export function isPurposeConsentSet(tcString, purpose) {
  let purposeBitOffset = 152 + purpose - 1;
  let purposeBitCharPos = ~~(purposeBitOffset / BASIS);

  if (!tcString ||
    tcString.charAt(0) !== 'C' || // v2 version
    tcString.length <= purposeBitCharPos
  ) {
    return undefined;
  }
  let purposeBitChar = tcString.charAt(purposeBitCharPos);
  let purposeBitCharBits = BASE_64_REVERSE_DICT[purposeBitChar];
  if (purposeBitCharBits === undefined) {
    return undefined;
  }
  let purposeBitPos = purposeBitOffset % BASIS;
  let mask = (1 << (BASIS - purposeBitPos - 1));
  let value = purposeBitCharBits & mask;
  return value !== 0;
}
