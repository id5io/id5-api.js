export class GoogleSecureSignalProvider {

  constructor(id) {
    const self = this;
    const promise = new Promise((resolve) => {
      self._resolve = resolve;
    })
    const gt = window.googletag = window.googletag || {};
    gt.secureSignalProviders = gt.secureSignalProviders || [];
    gt.secureSignalProviders.push({
      id: id,
      collectorFunction: () => promise
    })
  }

  setUserId(userId) {
    if (this._resolve && this._resolved !== true) {
      this._resolve(userId);
      this._resolved = true;
    }
  }
}
