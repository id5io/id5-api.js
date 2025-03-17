export const CONSTANTS = Object.freeze({
  STORAGE_CONFIG: {
    ID5: {
      name: 'id5id',
      expiresDays: 90
    },
    ID5_V2: {
      name: 'id5id_v2',
      expiresDays: 15
    },
    LAST: {
      name: 'id5id_last',
      expiresDays: 90
    },
    CONSENT_DATA: {
      name: 'id5id_cached_consent_data',
      expiresDays: 30
    },
    PRIVACY: {
      name: 'id5id_privacy',
      expiresDays: 30
    },
    EXTENSIONS: {
      name: 'id5id_extensions',
      expiresDays: 8/24
    }
  },
  LEGACY_COOKIE_NAMES: [
    'id5.1st',
    'id5id.1st'
  ],
  PRIVACY: {
    JURISDICTIONS: {
      gdpr: true,
      ccpa: false,
      lgpd: true,
      other: false
    }
  },
  ID5_EIDS_SOURCE: 'id5-sync.com'
});
