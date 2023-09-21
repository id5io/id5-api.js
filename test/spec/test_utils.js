import LocalStorage from '../../lib/localStorage.js';
import sinon from 'sinon';
import multiplexing from '@id5io/multiplexing';

export const TEST_ID5_PARTNER_ID = 99;
export const ID5_FETCH_ENDPOINT = `https://id5-sync.com/gm/v2`;
export const ID5_CALL_ENDPOINT = `https://id5-sync.com/i/${TEST_ID5_PARTNER_ID}`;
export const ID5_SYNC_ENDPOINT = `https://id5-sync.com/s/${TEST_ID5_PARTNER_ID}`;

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

export const TEST_RESPONSE_ID5ID = 'testresponseid5id';
export const TEST_RESPONSE_SIGNATURE = 'uvwxyz';
export const TEST_RESPONSE_LINK_TYPE = 1;

export const TEST_RESPONSE_ID5_CONSENT = {
  'universal_uid': TEST_RESPONSE_ID5ID,
  'cascade_needed': false,
  'signature': TEST_RESPONSE_SIGNATURE,
  'ext': {
    'linkType': TEST_RESPONSE_LINK_TYPE
  },
  'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
};
export const JSON_RESPONSE_ID5_CONSENT = JSON.stringify(TEST_RESPONSE_ID5_CONSENT);
export const STORED_JSON = encodeURIComponent(JSON_RESPONSE_ID5_CONSENT);

export const JSON_RESPONSE_CASCADE = JSON.stringify({
  'universal_uid': TEST_RESPONSE_ID5ID,
  'cascade_needed': true,
  'signature': TEST_RESPONSE_SIGNATURE,
  'ext': {
    'linkType': TEST_RESPONSE_LINK_TYPE
  },
  'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
});

export const DEFAULT_EXTENSIONS = {
  lb: 'lbValue',
  lbCDN: '%%LB_CDN%%'
}

// Stubs Extensions data Promise in order to bypass async task queue and let `then` be immediately pushed on stack
export class ExtensionsPromiseStub {
  constructor(test) {
    this.test = test;
  }

  then(callback) {
    callback(DEFAULT_EXTENSIONS);
  }
}

export function defaultInit(partnerId = TEST_ID5_PARTNER_ID) {
  return {
    partnerId,
    disableUaHints: true,
    disableLiveIntentIntegration: true,
    multiplexing: {_disabled: true}
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
        } catch (origErr) {
          throw new Error(`[Sequence step ${storedIndex}] ${origErr.message}`);
        }
        acc();
      }, val.timeout);
      clock.tick(val.timeout);
    };
  }, () => {
  });
  rootFn();
}

export class MultiplexingStub {

  constructor() {
    this.realCreate = multiplexing.createInstance;
    this.stubCreate = sinon.stub(multiplexing, multiplexing.createInstance.name)
  }

  returnsInstance(instance) {
    this.stubCreate.returns(instance);
  }

  interceptInstance(interceptor) {
    const thisStub = this;
    this.stubCreate.callsFake((...args) => {
      return interceptor(thisStub.realCreate(...args));
    })
  }

  restore() {
    this.stubCreate.restore()
  }
}
