const nodeResolve = require('@rollup/plugin-node-resolve');

// Karma configuration
module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',

        // frameworks to use
        // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
        frameworks: ['mocha', 'chai'],

        // list of files / patterns to load in the browser
        files: [
            '../../node_modules/sinon-chai/lib/sinon-chai.js',
            '../../node_modules/chai-datetime/chai-datetime.js',
            'test/test_index.js',
        ],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
        preprocessors: {
            // add webpack as preprocessor
            'test/**/*.js': ['rollup']
        },

        rollupPreprocessor: {
            // This is just a normal Rollup config object, except that `input` is handled for you.
            plugins: [ nodeResolve() ],
            output: {
                format: 'iife',
                sourcemap: 'inline', // Sensible for testing
                dir: 'build/test/',
            },
        },

        // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
        reporters: ['mocha'],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        customLaunchers: {
            ChromeCustom: {
                base: 'ChromeHeadless',
                // We must disable the Chrome sandbox when running Chrome inside Docker (Chrome's sandbox needs
                // more permissions than Docker allows by default)
                flags: ['--no-sandbox']
            }
        },

        // start these browsers
        // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
        browsers: ['ChromeCustom'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser instances should be started simultaneously
        concurrency: Infinity
    })
}
