// This configures Karma, describing how to run the tests and where to output code coverage reports.
//
// For more information, see http://karma-runner.github.io/1.0/config/configuration-file.html

import _ from 'lodash';
import isDocker from 'is-docker';
import nodeResolve from '@rollup/plugin-node-resolve';
import pkg from 'karma';
const { constants: karmaConstants, config: cfg } = pkg;

function setBrowsers(karmaConf) {
  if (isDocker()) {
    karmaConf.customLaunchers = karmaConf.customLaunchers || {};
    karmaConf.customLaunchers.ChromeCustom = {
      base: 'ChromeHeadless',
      // We must disable the Chrome sandbox when running Chrome inside Docker (Chrome's sandbox needs
      // more permissions than Docker allows by default)
      flags: ['--no-sandbox']
    };
    karmaConf.browsers = ['ChromeCustom'];
  } else {
    karmaConf.browsers = ['ChromeHeadless'];
  }
}

export default function (watchMode) {
  var config = {
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai'],

    files: [
      'node_modules/sinon-chai/lib/sinon-chai.js',
      'node_modules/clone/clone.js',
      'test/test_index.js',
      { pattern: 'test/pages/1x1.png', watched: false, included: false, served: true }
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {
      'test/**/*.js': ['rollup']
    },

    rollupPreprocessor: {
      // This is just a normal Rollup config object, except that `input` is handled for you.
      plugins: [nodeResolve()],
      output: {
        format: 'iife',
        sourcemap: 'inline', // Sensible for testing
        dir: 'build/test/',
      },
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: karmaConstants.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    concurrency: 2,

    client: {
      captureConsole: true
    },

    reporters: ['mocha'],
    mochaReporter: {
      showDiff: true,
      output: 'spec'
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: !watchMode,
    browserDisconnectTimeout: 10000, // default 2000
    browserDisconnectTolerance: 1, // default 0
    browserNoActivityTimeout: 4 * 60 * 1000, // default 10000
    captureTimeout: 4 * 60 * 1000 // default 60000
  };
  setBrowsers(config);
  return cfg.parseConfig(null, config);
};
