import LocalStorage from '../../lib/localStorage.js';
import CONSTANTS from '../../lib/constants.json';

export const TEST_ID5_PARTNER_ID = 99;
export const TEST_ID5_PARTNER_ID_ALT = 999;
export const ID5_FETCH_ENDPOINT = `https://id5-sync.com/g/v2/${TEST_ID5_PARTNER_ID}.json`;
export const ID5_CALL_ENDPOINT = `https://id5-sync.com/i/${TEST_ID5_PARTNER_ID}`;
export const ID5_SYNC_ENDPOINT = `https://id5-sync.com/s/${TEST_ID5_PARTNER_ID}`;
export const ID5_LB_ENDPOINT = `https://lb.eu-1-id5-sync.com/lb/v1`;

export const AJAX_RESPONSE_MS = 20;
export const CALLBACK_TIMEOUT_MS = 30;

export const TEST_ID5ID_STORAGE_CONFIG = {
  name: 'id5id',
  expiresDays: 90
};
export const TEST_ID5ID_STORAGE_CONFIG_EXPIRED = {
  name: 'id5id',
  expiresDays: -5
};
export const TEST_LAST_STORAGE_CONFIG = {
  name: 'id5id_last',
  expiresDays: 90
};
export const TEST_CONSENT_DATA_STORAGE_CONFIG = {
  name: 'id5id_cached_consent_data',
  expiresDays: 30
};
export const TEST_PD_STORAGE_CONFIG = {
  name: `id5id_cached_pd_${TEST_ID5_PARTNER_ID}`,
  expiresDays: 30
};
export const TEST_NB_STORAGE_CONFIG = {
  name: `id5id_${TEST_ID5_PARTNER_ID}_nb`,
  expiresDays: 90
};
export const TEST_PRIVACY_STORAGE_CONFIG = {
  name: 'id5id_privacy',
  expiresDays: 30
}

export const TEST_PRIVACY_ALLOWED = JSON.stringify({
  'jurisdiction': 'other',
  'id5_consent': true
});
export const TEST_PRIVACY_DISALLOWED = JSON.stringify({
  'jurisdiction': 'gdpr',
  'id5_consent': false
});

export const TEST_STORED_ID5ID = 'teststoredid5id';
export const TEST_STORED_SIGNATURE = 'abcdef';
export const TEST_STORED_LINK_TYPE = 0;
export const STORED_JSON_LEGACY = JSON.stringify({
  'universal_uid': TEST_STORED_ID5ID,
  'cascade_needed': false,
  'signature': TEST_STORED_SIGNATURE,
  'link_type': TEST_STORED_LINK_TYPE,
  'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
});
export const STORED_JSON = encodeURIComponent(STORED_JSON_LEGACY);

export const TEST_RESPONSE_ID5ID = 'testresponseid5id';
export const TEST_RESPONSE_ID5ID_NO_CONSENT = '0';
export const TEST_RESPONSE_SIGNATURE = 'uvwxyz';
export const TEST_RESPONSE_LINK_TYPE = 1;
export const TEST_RESPONSE_LINK_TYPE_NO_CONSENT = 0;
export const TEST_RESPONSE_EID = {
  source: CONSTANTS.ID5_EIDS_SOURCE,
  uids: [{
    atype: 1,
    id: TEST_RESPONSE_ID5ID,
    ext: {
      linkType: TEST_RESPONSE_LINK_TYPE,
      abTestingControlGroup: false
    }
  }]
};

export const JSON_RESPONSE_ID5_CONSENT = JSON.stringify({
  'universal_uid': TEST_RESPONSE_ID5ID,
  'cascade_needed': false,
  'signature': TEST_RESPONSE_SIGNATURE,
  'link_type': TEST_RESPONSE_LINK_TYPE,
  'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
});

export const JSON_RESPONSE_CASCADE = JSON.stringify({
  'universal_uid': TEST_RESPONSE_ID5ID,
  'cascade_needed': true,
  'signature': TEST_RESPONSE_SIGNATURE,
  'link_type': TEST_RESPONSE_LINK_TYPE,
  'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
});

export const JSON_RESPONSE_NO_ID5_CONSENT = JSON.stringify({
  'universal_uid': TEST_RESPONSE_ID5ID_NO_CONSENT,
  'cascade_needed': false,
  'signature': TEST_RESPONSE_SIGNATURE,
  'link_type': TEST_RESPONSE_LINK_TYPE_NO_CONSENT,
  'privacy': JSON.parse(TEST_PRIVACY_DISALLOWED)
});

export function defaultInit(partnerId = TEST_ID5_PARTNER_ID) {
  return {
    partnerId,
    disableUaHints: true
  }
}

export function defaultInitBypassConsent(partnerId = TEST_ID5_PARTNER_ID) {
  return {
    ...defaultInit(partnerId),
    debugBypassConsent: true
  }
}

export const localStorage = new LocalStorage(window);


export function resetAllInLocalStorage() {
  localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_PD_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_NB_STORAGE_CONFIG);
}

export function stubDelayedResponse(response) {
  return function (url, callbacks, data, options) {
    if (url.includes(ID5_LB_ENDPOINT)) {
      callbacks.success();
    } else {
      setTimeout(() => {
        callbacks.success(response);
      }, AJAX_RESPONSE_MS);
    }
  };
}

/**
 * Performs a sequence of timeouts expressed with parameter "steps" using
 * the specified clock
 * @param {object} clock
 * @param  {...object} steps objects made of {timeout: a numeric value, fn: a function to execute}
 */
export function execSequence(clock, ...steps) {
  const rootFn = steps.reduceRight((acc, val, index) => {
    return () => {
      setTimeout(() => {
        const storedIndex = index;
        try {
          val.fn();
        } catch(origErr) {
          throw new Error(`[Sequence step ${storedIndex}] ${origErr.message}`);
        }
        acc();
      }, val.timeout);
      clock.tick(val.timeout);
    };
  }, () => {});
  rootFn();
}
