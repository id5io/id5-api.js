import sinon from 'sinon';
import multiplexing, {
  LocalStorage,
  StorageConfig,
  WindowStorage,
  ApiEventsDispatcher,
  utils
} from '@id5io/multiplexing';
import {NO_OP_LOGGER} from '@id5io/multiplexing';
import {Config} from '../../lib/config';

export const TEST_ID5_PARTNER_ID = 99;
export const ID5_FETCH_ENDPOINT = `https://id5-sync.com/gm/v3`;
export const ID5_CALL_ENDPOINT = `https://id5-sync.com/i/${TEST_ID5_PARTNER_ID}`;
export const ID5_SYNC_ENDPOINT = `https://id5-sync.com/s/${TEST_ID5_PARTNER_ID}`;

export const CALLBACK_TIMEOUT_MS = 30;

export const TEST_ID5ID_STORAGE_CONFIG = {
  name: 'id5id',
  expiresDays: 90
};
export const TEST_LAST_STORAGE_CONFIG = {
  name: 'id5id_last',
  expiresDays: 90
};
export const TEST_CONSENT_DATA_STORAGE_CONFIG = {
  name: 'id5id_cached_consent_data',
  expiresDays: 30
};

export const TEST_PRIVACY_STORAGE_CONFIG = {
  name: 'id5id_privacy',
  expiresDays: 30
};

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
  cache_control: {
    max_age_sec: 7200
  },
  'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
};
export const STORED_JSON = encodeURIComponent(JSON.stringify(TEST_RESPONSE_ID5_CONSENT));

export const TEST_RESPONSE_CASCADE = {
  'universal_uid': TEST_RESPONSE_ID5ID,
  'cascade_needed': true,
  'signature': TEST_RESPONSE_SIGNATURE,
  'ext': {
    'linkType': TEST_RESPONSE_LINK_TYPE
  },
  'privacy': JSON.parse(TEST_PRIVACY_ALLOWED)
};

export const DEFAULT_EXTENSIONS = {
  lb: 'lbValue',
  lbCDN: '%%LB_CDN%%'
};

export function prepareMultiplexingResponse(genericResponse, requestString) {
  const request = JSON.parse(requestString);
  const responses = {};
  request.requests.forEach(rq => responses[rq.requestId] = {});
  return JSON.stringify({generic: genericResponse, responses: responses});
}

export function defaultInit(partnerId = TEST_ID5_PARTNER_ID) {
  return {
    partnerId,
    disableUaHints: true,
    multiplexing: {_disabled: true}
  };
}

export function defaultInitBypassConsent(partnerId = TEST_ID5_PARTNER_ID) {
  return {
    ...defaultInit(partnerId),
    debugBypassConsent: true
  };
}

export function setupGppV11Stub() {
  window.__gpp = function (command) {
    if (command === 'ping') {
      return {
        gppVersion: '1.1',
        cmpStatus: 'stub',
        signalStatus: 'ready',
        applicableSections: [-1, 0],
        gppString: 'GPP_STRING'
      };
    }
  };
}

export function clearGppStub() {
  window.__gpp = undefined;
}


export const localStorage = new LocalStorage(new WindowStorage(window));

export function resetAllInLocalStorage() {
  localStorage.removeExpiredObjectWithPrefix(StorageConfig.DEFAULT.ID5_V2.name, true);
  localStorage.removeItemWithExpiration(TEST_ID5ID_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_LAST_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_PRIVACY_STORAGE_CONFIG);
  localStorage.removeItemWithExpiration(TEST_CONSENT_DATA_STORAGE_CONFIG);
}

export function makeCacheId(options) {
  const config = new Config(options, NO_OP_LOGGER);
  const configOptions = config.getOptions();
  const uniqueData = {
    partnerId: configOptions.partnerId,
    att: configOptions.att,
    pd: configOptions.pd,
    provider: configOptions.provider,
    abTesting: configOptions.abTesting,
    segments: JSON.stringify(configOptions.segments),
    providedRefresh: config.getProvidedOptions().refreshInSeconds
  };
  return utils.cyrb53Hash(JSON.stringify(uniqueData));
}

export function setStoredResponse(cacheId, response, responseTimestamp = Date.now(), nb = 0) {
  localStorage.setObjectWithExpiration(StorageConfig.DEFAULT.ID5_V2.withNameSuffixed(cacheId),
    {response, responseTimestamp, nb}
  );
}

export function getStoredResponse(cacheId) {
  return localStorage.getObjectWithExpiration(StorageConfig.DEFAULT.ID5_V2.withNameSuffixed(cacheId));
}

export function setExpiredStoredResponse(cacheId) {
  const expiredConfig = StorageConfig.DEFAULT.ID5_V2.withNameSuffixed(cacheId);
  expiredConfig.expiresDays = -5;
  localStorage.setObjectWithExpiration(expiredConfig,
    {
      response: TEST_RESPONSE_ID5_CONSENT,
      responseTimestamp: Date.now(),
      nb: 1
    });
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
    this.stubCreate = sinon.stub(multiplexing, multiplexing.createInstance.name);
  }

  returnsInstance(instance) {
    this.stubCreate.returns(instance);
  }

  interceptInstance(interceptor) {
    const thisStub = this;
    this.stubCreate.callsFake((...args) => {
      return interceptor(thisStub.realCreate(...args));
    });
  }

  restore() {
    this.stubCreate.restore();
  }
}

export function sinonFetchResponder(responseProvider) {
  return (request) => {
    if (request.url === ID5_FETCH_ENDPOINT) {
      request.respond(200, {'Content-Type': ' application/json'}, responseProvider(request));
    }
  };
}

export class MultiplexInstanceStub {
  _dispatcher;
  _registerCallPromise;
  _resolvers = {};
  constructor() {
    this._dispatcher = new ApiEventsDispatcher(NO_OP_LOGGER);
    const id = globalThis.crypto.randomUUID();
    this._registerCallPromise = new Promise((resolve) => {
      this._resolvers.register = resolve;
    });

    sinon.stub(this, 'register').callsFake(() => {
      this._resolvers.register();
    });
    sinon.stub(this, 'updateConsent');
    sinon.stub(this, 'refreshUid');
    sinon.stub(this, 'updateFetchIdData');
    sinon.stub(this, 'getId').returns(id);
    sinon.stub(this, 'unregister');
  }

  on(event, callback) {
    this._dispatcher.on(event, callback);
    return this;
  }

  emit(event, ...args) {
    this._dispatcher.emit(event, ...args);
    return this;
  }

  register() {}

  async instanceRegistered() {
    return this._registerCallPromise;
  }

  updateConsent() {}

  refreshUid() {}

  updateFetchIdData() {}

  getId(){}

  unregister() {}
}

export const TEST_CONSENT_DATA_V2 = _formatConsent(true);
export const TEST_CONSENT_DATA_V2_CONSENT_DENIED = _formatConsent(false);

  function _formatConsent(id5Consent) {
    return {getTCData: {
        'tcString': 'COuqj-POu90rDBcBkBENAZCgAPzAAAPAACiQFwwBAABAA1ADEAbQC4YAYAAgAxAG0A',
        'cmpId': 92,
        'cmpVersion': 100,
        'tcfPolicyVersion': 2,
        'gdprApplies': true,
        'isServiceSpecific': true,
        'useNonStandardStacks': false,
        'purposeOneTreatment': false,
        'publisherCC': 'US',
        'cmpStatus': 'loaded',
        'eventStatus': 'tcloaded',
        'outOfBand': {
          'allowedVendors': {},
          'discloseVendors': {}
        },
        'purpose': {
          'consents': {
            '1': true,
            '2': true,
            '3': true
          },
          'legitimateInterests': {
            '1': false,
            '2': false,
            '3': false
          }
        },
        'vendor': {
          'consents': {
            '1': true,
            '2': true,
            '3': false,
            '131': id5Consent
          },
          'legitimateInterests': {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false
          }
        },
        'specialFeatureOptins': {
          '1': false,
          '2': false
        },
        'restrictions': {},
        'publisher': {
          'consents': {
            '1': false,
            '2': false,
            '3': false
          },
          'legitimateInterests': {
            '1': false,
            '2': false,
            '3': false
          },
          'customPurpose': {
            'consents': {},
            'legitimateInterests': {}
          }
        }
      }
    }
  }

export function setupMockedConsent(id5HasConsent) {
  window.__tcfapi = sinon.stub();
  window.__tcfapi.callsFake((command, version, callback) => {
    expect(command).to.eq('addEventListener');
    expect(version).to.eq(2);
    callback(_formatConsent(id5HasConsent).getTCData, true);
  });
}

export function clearMockedConsent() {
  delete window.__tcfapi;
}
