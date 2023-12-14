// Karma configuration
module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',


        // frameworks to use
        // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
        frameworks: ['mocha'],

        // list of files / patterns to load in the browser
        files: [
            'test/spec/*.spec.js'
        ],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
        preprocessors: {
            // add webpack as preprocessor
            'test/**/*.spec.js': ['webpack', 'sourcemap']
        },

        webpack: {
            devtool : 'inline-source-map',
            module: {
                loaders: [
                    {
                        test: /\.js?$/, exclude: /node_modules/, loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {         "targets": {
                                        "browsers": [
                                            "chrome >= 61",
                                            "safari >= 11",
                                            "edge >= 14",
                                            "firefox >= 57",
                                            "ios >= 11",
                                            "node >= 18"
                                        ]
                                    }
                                }]
                            ],
                            plugins: ['@babel/plugin-proposal-class-properties',
                                '@babel/plugin-transform-object-assign']
                        }
                    }
                ],
            },
            watch: true,
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
        autoWatch: false,

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
