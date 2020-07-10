'use strict';

var _ = require('lodash');
var argv = require('yargs').argv;
var gulp = require('gulp');
var gutil = require('gulp-util');
var connect = require('gulp-connect');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');
var uglify = require('gulp-uglify');
var gulpClean = require('gulp-clean');
var KarmaServer = require('karma').Server;
var karmaConfMaker = require('./karma.conf.maker');
var opens = require('opn');
var webpackConfig = require('./webpack.conf');
var concat = require('gulp-concat');
var footer = require('gulp-footer');
var header = require('gulp-header');
var replace = require('gulp-replace');
var shell = require('gulp-shell');
var eslint = require('gulp-eslint');
var gulpif = require('gulp-if');
var sourcemaps = require('gulp-sourcemaps');
var jsEscape = require('gulp-js-escape');

var id5Api = require('./package.json');
var port = 9998;

function clean() {
  return gulp.src(['build'], {
    read: false,
    allowEmpty: true
  }).pipe(gulpClean());
}

function lint(done) {
  if (argv.nolint) {
    return done();
  }
  const isFixed = function(file) {
    return file.eslint != null && file.eslint.fixed;
  };
  return gulp.src(['src/**/*.js', 'test/**/*.js'], {base: './'})
    .pipe(eslint())
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError())
    .pipe(gulpif(isFixed, gulp.dest('./')));
}

// View the code coverage report in the browser.
function viewCoverage(done) {
  var coveragePort = 1999;
  var mylocalhost = (argv.host) ? argv.host : 'localhost';

  connect.server({
    port: coveragePort,
    root: 'build/coverage/karma_html',
    livereload: false
  });
  opens('http://' + mylocalhost + ':' + coveragePort);
  done();
}
viewCoverage.displayName = 'view-coverage';

// Watch Task with Live Reload
function watch(done) {
  var mainWatcher = gulp.watch([
    'src/**/*.js',
    'test/spec/**/*.js',
    '!test/spec/loaders/**/*.js'
  ]);
  var loaderWatcher = gulp.watch([
    'loaders/**/*.js',
    'test/spec/loaders/**/*.js'
  ]);

  connect.server({
    https: argv.https,
    port: port,
    root: './',
    livereload: true
  });

  mainWatcher.on('all', gulp.series(clean, gulp.parallel(lint, 'build-bundle-dev', test)));
  loaderWatcher.on('all', gulp.series(lint));
  done();
}

var banner = ['/**',
  ' * <%= id5Api.name %> - <%= id5Api.description %>',
  ' * @version v<%= id5Api.version %>',
  ' * @link <%= id5Api.homepage %>',
  ' * @license <%= id5Api.license %>',
  ' */',
  ''].join('\n');

function makeDevpackPkg() {
  var cloned = _.cloneDeep(webpackConfig);
  cloned.devtool = 'source-map';

  return gulp.src(['src/id5-api.js'])
    .pipe(webpackStream(cloned, webpack))
    .pipe(footer('\n<%= global %>.version = \'<%= version %>\';\n', {
      global: id5Api.globalVarName,
      version: id5Api.version
    }))
    .pipe(header(banner, { id5Api : id5Api } ))
    .pipe(gulp.dest('build/dev'))
    .pipe(connect.reload());
}

function makeWebpackPkg() {
  var cloned = _.cloneDeep(webpackConfig);
  delete cloned.devtool;

  return gulp.src(['src/id5-api.js'])
    .pipe(webpackStream(cloned, webpack))
    .pipe(footer('\n<%= global %>.version = \'<%= version %>\';\n', {
      global: id5Api.globalVarName,
      version: id5Api.version
    }))
    .pipe(uglify())
    .pipe(header(banner, { id5Api : id5Api } ))
    .pipe(gulp.dest('build/dist'));
}

// Run the unit tests in headless chrome.
//
// If --watch is given, the task will re-run unit tests whenever the source code changes
// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
function test(done) {
  new KarmaServer(karmaConfMaker(false, argv.watch, argv.file), karmaCallback(done)).start();
}

function karmaCallback(done) {
  return function(exitCode) {
    if (exitCode) {
      done(new Error('Karma tests failed with exit code ' + exitCode));
    } else {
      done();
    }
  }
}

// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
function testCoverage(done) {
  new KarmaServer(karmaConfMaker(true, false, false, argv.file), karmaCallback(done)).start();
}

function coveralls() { // 2nd arg is a dependency: 'test' must be finished
  // first send results of istanbul's test coverage to coveralls.io.
  return gulp.src('gulpfile.js', { read: false }) // You have to give it a file, but you don't
  // have to read it.
    .pipe(shell('cat build/coverage/lcov.info | node_modules/coveralls/bin/coveralls.js'));
}

// support tasks
gulp.task(lint);
gulp.task(watch);
gulp.task(clean);

gulp.task('build-bundle-dev', makeDevpackPkg);
gulp.task('build-bundle-prod', makeWebpackPkg);

// public tasks (dependencies are needed for each task since they can be ran on their own)
gulp.task('test', gulp.series(clean, lint, test));

gulp.task('test-coverage', gulp.series(clean, testCoverage));
gulp.task(viewCoverage);

gulp.task('coveralls', gulp.series('test-coverage', coveralls));

gulp.task('build', gulp.series(clean, 'build-bundle-dev', 'build-bundle-prod'));

gulp.task('serve', gulp.series(clean, lint, gulp.parallel('build-bundle-dev', watch, test)));
gulp.task('default', gulp.series(clean, makeWebpackPkg));
