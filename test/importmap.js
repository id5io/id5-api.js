// modulesJson = {}
// Object.keys(window.__karma__.files).forEach(file => {
//   const matches = file.match(/node_modules\/(.+)/);
//   if (matches) {
//     const pathIntoNodeModules = matches[1];
//     const splitted = pathIntoNodeModules.split('/');
//     if (pathIntoNodeModules.startsWith('@')) {
//       moduleName = splitted[0] + '/' + splitted[1] + '/';
//     } else {
//       moduleName = splitted[0] + '/';
//     }
//     const actualLocation = file.substring(0, file.lastIndexOf(moduleName));
//     modulesJson[moduleName] = actualLocation;
//   }
// });
const theMap = document.createElement('script');
theMap.setAttribute('type','importmap');
theMap.innerText = JSON.stringify({
  imports: {
    '@id5io/diagnostics': '/base/node_modules/@id5io/diagnostics/index.mjs',
    '@id5io/diagnostics/': '/base/node_modules/@id5io/diagnostics/',
    '@id5io/multiplexing':'/base/node_modules/@id5io/multiplexing/index.mjs',
    '@id5io/multiplexing/':'/base/node_modules/@id5io/multiplexing/',
    'sinon': '/base/node_modules/sinon/pkg/sinon-esm.js',
    'sinon/': '/base/node_modules/sinon/',
  }
});
document.body.appendChild(theMap);
