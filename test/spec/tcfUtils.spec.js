import {isPurposeConsentSet} from "../../lib/tcfUtils.js";

const expect = require('chai').expect;

describe('TcfUtils', function () {

  describe('isPurposeConsentSet', function () {

    [
      {
        tcString: 'CPh7_cXPh7_cXKMAAAENCZCAAKqAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
        purposeConsents: new Map([
          [1, true], [2, false], [3, true], [4, false], [5, true], [6, false], [7, true], [8, false], [9, true], [10, false]
        ])
      },
      {
        tcString: 'CPh8CeXPh8CeXMgAAAENCZCAAFVAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
        purposeConsents: new Map([
          [1, false], [2, true], [3, false], [4, true], [5, false], [6, true], [7, false], [8, true], [9, false], [10, true]
        ])
      },
      {
        tcString: 'CPh8CoIPh8CoINYAAAENCZCAAP_AAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
        purposeConsents: new Map([
          [1, true], [2, true], [3, true], [4, true], [5, true], [6, true], [7, true], [8, true], [9, true], [10, true]
        ])
      },
      {
        tcString: 'CPh8CjOPh8CjOEZAAAENCZCAAAAAAAAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX32E7NF36tq4KmR4ku1bBIQNtHMnUDUmxaolVrzHsak2cpyNKJ_JkknsZe2dYGF9Pn9lD-YKZ7_5_9_f52T_9_9_-39z3_9f___dv_-__-vjf_599n_v9fV_78_Kf9______-____________8A',
        purposeConsents: new Map([
          [1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, false], [8, false], [9, false], [10, false]
        ])
      }
    ].forEach((arg) => {
      it("should decode tcString and check consnet", function () {
        let tcString = arg.tcString;
        let purposeConsentsExpected = arg.purposeConsents;
        for (let purpose = 1; purpose <= 10; purpose++) {
          expect(isPurposeConsentSet(tcString, purpose)).is.eq(purposeConsentsExpected.get(purpose))
        }
      })
    });

    [
      null,
      undefined,
      '',
      'CPh7_cXPh7', // too short
      'CPh7_cXPh7_cXKMAAAENCZCA??????????AAAAAAAAAAAAAAA.II7Nd_X__bX9n-_7_6ft0eY1f9_r37uQzDhfNs-8F3L_W_LwX', // invalid ? char
      'BPh8CjOPh8CjOEZAAAENCZCAAAAAAAAAAAAAAAAAAAAA' // not V2
    ].forEach((tcString) => {
      it("should decode unknown if invalid string and check consnet", function () {
        expect(isPurposeConsentSet(tcString, 1)).is.eq(undefined)
      })
    });
  });
});
