import ID5 from '../lib/id5-api';
import { logError, isPlainObject, ajax } from '../lib/utils';

const gt = window.googletag = window.googletag || {};
gt.encryptedSignalProviders = gt.encryptedSignalProviders || [];
gt.encryptedSignalProviders.push({
  id: 'id5-sync.com',
  collectorFunction: () => {
    const INCREMENT_URL = 'https://id5-sync.com/api/esp/increment?counter=';
    return new Promise((resolve, reject) => {
      if (!isPlainObject(window.ID5EspConfig)) {
        const afterAjax = () => reject(new Error('No ID5 config'));
        logError('Expected window.ID5EspConfig to be an Object with the necessary configuration! Cannot invoke ID5 fetch.');
        ajax(INCREMENT_URL + 'no-config', {
          success: afterAjax,
          error: afterAjax
        });
        return;
      }
      window.ID5EspConfig.provider = window.ID5EspConfig.provider || 'g-esp';
      try {
        ID5.init(window.ID5EspConfig).onAvailable((id5Status) => {
          resolve(id5Status.getUserId());
        });
      } catch (error) {
        const afterAjax = () => reject(error);
        logError('Exception while initializing ID5 within googletag ESP! Cannot invoke ID5 fetch.');
        ajax(INCREMENT_URL + 'exception', {
          success: afterAjax,
          error: afterAjax
        });
      }
    });
  }
});
