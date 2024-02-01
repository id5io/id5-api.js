// eslint-disable-next-line no-unused-vars
function leaderElectionCallback(mxInstance, endpoint = 'on-election') {
  return (role, leader) => {
    window.fetch(`https://instances.log/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      mode: 'no-cors',
      body: JSON.stringify({
        location: window.location.href,
        id: mxInstance.properties.id,
        role: role,
        leader: leader.id,
        knownInstances: Array.from(mxInstance._knownInstances.keys())
      })
    });
  };
}

// eslint-disable-next-line no-unused-vars
function uidCallback(instance) {
  const mxInstance = instance._multiplexingInstance;
  const uid = instance.getUserId();
  window.fetch('https://instances.log/on-available', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    mode: 'no-cors',
    body: JSON.stringify({
      location: window.location.href,
      id: mxInstance.properties.id,
      role: mxInstance.role,
      uid: uid
    })
  });
}
