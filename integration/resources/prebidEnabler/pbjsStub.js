/*
 * A stand-in for Prebid.js: the parts the enabler talks to. `window.pbjsStub.init()` is what
 * Prebid does when it finishes loading — it drains the command queue and runs later commands
 * straight away.
 */
(function () {
  const config = {};
  const listeners = [];

  function setConfig(update) {
    window.setConfigCalls = window.setConfigCalls || [];
    window.setConfigCalls.push(JSON.parse(JSON.stringify(update)));
    Object.keys(update).forEach(topic => {
      config[topic] = update[topic];
    });
    listeners
      .filter(listener => update[listener.topic] !== undefined)
      .forEach(listener => listener.callback({[listener.topic]: config[listener.topic]}));
  }

  function getConfig(topic, listener) {
    if (typeof listener !== 'function') {
      return config[topic];
    }
    const subscription = {topic: topic, callback: listener};
    listeners.push(subscription);
    return function unsubscribe() {
      listeners.splice(listeners.indexOf(subscription), 1);
    };
  }

  const pbjs = window.pbjs = window.pbjs || {};
  pbjs.version = '9.0.0';
  pbjs.que = pbjs.que || [];
  pbjs.setConfig = setConfig;
  pbjs.getConfig = getConfig;
  pbjs.refreshUserIds = function (options) {
    window.refreshUserIdsCalls = window.refreshUserIdsCalls || [];
    window.refreshUserIdsCalls.push(options);
    return Promise.resolve({});
  };

  window.pbjsStub = {
    init: function () {
      const queued = pbjs.que.splice(0, pbjs.que.length);
      pbjs.que.push = function (command) {
        command();
      };
      queued.forEach(command => command());
    }
  };
})();
