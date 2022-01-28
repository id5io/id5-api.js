import ID5 from '../lib/id5-api';
import { logError, isPlainObject } from '../lib/utils';

const gt = window.googletag = window.googletag || {};
gt.encryptedSignalProviders = gt.encryptedSignalProviders || [];
gt.encryptedSignalProviders.push({
  id: 'id5-sync.com',
  collectorFunction: () => {
    return new Promise((resolve, reject) => {
      if (!isPlainObject(window.ID5EspConfig)) {
        logError('Expected window.ID5.espInit to be an Object with the necessary configuration! Cannot invoke ID5 fetch.');
        reject(new Error('No ID5 config'));
        return;
      }
      window.ID5EspConfig.provider = window.ID5EspConfig.provider || 'g-esp';
      try {
        ID5.init(window.ID5EspConfig).onAvailable((id5Status) => {
          resolve(id5Status.getUserId());
        });
      } catch (error) {
        logError('Exception while initializing ID5 within googletag ESP! Cannot invoke ID5 fetch.');
        reject(error);
      }
    });
  }
});
