// This configures Karma, describing how to run the tests and where to output code coverage reports.
//
// For more information, see http://karma-runner.github.io/1.0/config/configuration-file.html

var _ = require('lodash');
var webpackConf = require('./webpack.conf');
var path = require('path');
var karmaConstants = require('karma').constants;

function newWebpackConfig(codeCoverage) {
  // Make a clone here because we plan on mutating this object, and don't want parallel tasks to trample each other.
  var webpackConfig = _.cloneDeep(webpackConf);

  webpackConfig.devtool = 'inline-source-map';

  if (codeCoverage) {
    webpackConfig.module.rules.push({
      enforce: 'post',
      exclude: /(node_modules)|(test)|(build)/,
      use: {
        loader: 'istanbul-instrumenter-loader',
        options: { esModules: true }
      },
      test: /\.js$/
    })
  }
  return webpackConfig;
}

function newPluginsArray(browserstack) {
  var plugins = [
    'karma-chrome-launcher',
    'karma-coverage-istanbul-reporter',
    'karma-es5-shim',
    'karma-mocha',
    'karma-chai',
    'karma-sinon',
    'karma-sourcemap-loader',
    'karma-spec-reporter',
    'karma-webpack',
    'karma-mocha-reporter'
  ];
  plugins.push('karma-firefox-launcher');
  plugins.push('karma-opera-launcher');
  plugins.push('karma-safari-launcher');
  plugins.push('karma-script-launcher');
  plugins.push('karma-ie-launcher');
  return plugins;
}

function setReporters(karmaConf, codeCoverage) {
  // In browserstack, the default 'progress' reporter floods the logs.
  // The karma-spec-reporter reports failures more concisely
  if (codeCoverage) {
    karmaConf.reporters.push('coverage-istanbul');
    karmaConf.coverageIstanbulReporter = {
      reports: ['html', 'lcovonly', 'text-summary'],
      dir: path.join(__dirname, 'build', 'coverage'),
      'report-config': {
        html: {
          subdir: 'karma_html',
          urlFriendlyName: true, // simply replaces spaces with _ for files/dirs
        }
      }
    }
  }
}

function setBrowsers(karmaConf) {
  var isDocker = require('is-docker')();
  if (isDocker) {
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

module.exports = function(codeCoverage, watchMode, file) {
  var webpackConfig = newWebpackConfig(codeCoverage);

  var files = file ? ['test/helpers/id5-apiGlobal.js', file] : ['test/test_index.js'];

  var config = {
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    webpack: webpackConfig,
    webpackMiddleware: {
      stats: 'errors-only',
      noInfo: true
    },
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['es5-shim', 'mocha', 'chai', 'sinon'],

    files: files,

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/test_index.js': ['webpack', 'sourcemap']
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
      output: 'minimal'
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: !watchMode,
    browserDisconnectTimeout: 10000, // default 2000
    browserDisconnectTolerance: 1, // default 0
    browserNoActivityTimeout: 4 * 60 * 1000, // default 10000
    captureTimeout: 4 * 60 * 1000 // default 60000

  };
  setReporters(config, codeCoverage);
  setBrowsers(config);
  return config;
};
