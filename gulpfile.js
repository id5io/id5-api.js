import log from 'fancy-log';
import _ from 'lodash';
import yargs from 'yargs';
import gulp from 'gulp';
import del from 'del';
import connect from 'gulp-connect';
import webpack from 'webpack';
import webpackStream from 'webpack-stream';
import uglify from 'gulp-uglify';
import karma from 'karma';
import karmaConfMaker from './karma.conf.maker.js';
import opens from 'opn';
import webpackConfig from './webpack.conf.js';
import header from 'gulp-header';
import shell from 'gulp-shell';
import eslint from 'gulp-eslint';
import gulpif from 'gulp-if';
import gv from 'genversion';
import mocha from 'gulp-mocha';
import isDocker from 'is-docker';
import { readFile } from 'fs/promises';

const id5Api = JSON.parse(await readFile('package.json'));
const port = 9998;
const argv = yargs.argv;

function lint(done) {
  if (argv.nolint) {
    return done();
  }
  const isFixed = function(file) {
    return file.eslint != null && file.eslint.fixed;
  };
  return gulp.src([
      'src/**/*.js',
      'lib/**/*.js',
      'test/**/*.js',
    ], {base: './'})
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
    'lib/**/*.js',
    'test/spec/**/*.js',
    '!test/spec/loaders/**/*.js',
    'package.json'
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

  mainWatcher.on('all', gulp.series('clean', 'generate', gulp.parallel(lint, 'build-bundle-dev', test)));
  loaderWatcher.on('all', gulp.series(lint));
  done();
}

var banner = `/**
 * ${id5Api.name} - ${id5Api.description}
 * @version v${id5Api.version}
 * @link ${id5Api.homepage}
 * @license ${id5Api.license}
 */
`;

function makeDevpackPkg() {
  var cloned = _.cloneDeep(webpackConfig);
  cloned.devtool = 'source-map';

  const isNotMapFile = function(file) {
    return file.extname !== '.map';
  };

  return gulp.src(['src/index.js'])
    .pipe(webpackStream(cloned, webpack))
    .pipe(gulpif(isNotMapFile, header(banner)))
    .pipe(gulp.dest('build/dev'))
    .pipe(connect.reload());
}

function makeWebpackPkg() {
  var cloned = _.cloneDeep(webpackConfig);
  delete cloned.devtool;

  return gulp.src(['src/index.js'])
    .pipe(webpackStream(cloned, webpack))
    .pipe(uglify())
    .pipe(header(banner))
    .pipe(gulp.dest('build/dist'));
}

// Run the unit tests in headless chrome.
//
// If --watch is given, the task will re-run unit tests whenever the source code changes
// If --file "<path-to-test-file>" is given, the task will only run tests in the specified file.
function test(done) {
  if (argv.notest) {
    done();
  } else {
    new karma.Server(karmaConfMaker(false, argv.watch, argv.file), karmaCallback(done)).start();
  }
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
  new karma.Server(karmaConfMaker(true, false, false, argv.file), karmaCallback(done)).start();
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
gulp.task('clean', () => del(['build', 'generated']));
gulp.task('info', (done) => {
  log(`Running gulp on node ${process.version}`);
  log(`Building ID5 API version ${id5Api.version}`);
  done();
});
gulp.task('generate', (done) => {
  gv.generate('generated/version.js', { useEs6Syntax: true }, done);
});

gulp.task('build-bundle-dev', makeDevpackPkg);
gulp.task('build-bundle-prod', makeWebpackPkg);

gulp.task('inttest', () => (
  gulp.src('integration/**/*_spec.js', {read: false})
    // `gulp-mocha` needs filepaths so you can't have any plugins before it
    .pipe(mocha({
      reporter: isDocker() ? 'spec' : 'nyan'
    }))
));

// public tasks (dependencies are needed for each task since they can be ran on their own)
gulp.task('test', gulp.series('clean', 'generate', lint, test));

gulp.task('test-coverage', gulp.series(
  'info',
  'clean',
  'generate',
  testCoverage
));
gulp.task(viewCoverage);

gulp.task('coveralls', gulp.series('test-coverage', coveralls));

gulp.task('build', gulp.series(
  'info',
  'clean',
  'generate',
  test,
  gulp.parallel('build-bundle-dev', 'build-bundle-prod'),
  'inttest'
));

gulp.task('serve', gulp.series(
  'info',
  'clean',
  'generate',
  lint,
  gulp.parallel('build-bundle-dev', watch, test)
));

