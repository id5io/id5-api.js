import log from 'fancy-log';
import _ from 'lodash';
import yargs from 'yargs';
import del from 'del';
import connect from 'gulp-connect';
import karma from 'karma';
import gulp from 'gulp';
import eslint from 'gulp-eslint-new';
import gulpif from 'gulp-if';
import header from 'gulp-header';
import mocha from 'gulp-mocha';
import uglify from 'gulp-uglify';
import gv from 'genversion';
import isDocker from 'is-docker';
import { readFile } from 'fs/promises';

// Rollup specific stuff
import { rollup } from 'rollup';
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import { Readable, Transform } from 'node:stream';
import File from 'vinyl';
import path from "path";

const id5Api = JSON.parse(await readFile('package.json'));
const port = 9998;
const argv = yargs.argv;

function lint(done) {
  if (argv.nolint) {
    return done();
  }
  return gulp.src([
      'src/**/*.js',
      'lib/**/*.js',
      'test/**/*.js',
      'integration/**/*.js',
    ])
    .pipe(eslint({ fix: true, configType: 'flat' }))     // Lint files, create fixes.
    .pipe(eslint.fix())              // Fix files if necessary.
    .pipe(eslint.format('stylish'))  // Output lint results to the console.
    .pipe(eslint.failAfterError());  // Exit with an error if problems are found.
}

// Watch Task with Live Reload
function watch(done) {
  var mainWatcher = gulp.watch([
    'src/**/*.js',
    'lib/**/*.js',
    'test/spec/**/*.js',
    '!test/spec/loaders/**/*.js',
    'package.json'
  ]);

  connect.server({
    https: argv.https,
    port: port,
    root: './',
    livereload: true
  });

  mainWatcher.on('all', gulp.series('clean', 'generate', gulp.parallel(lint, 'build-bundle-dev', test)));
  done();
}

var banner = `/**
 * ${id5Api.name}
 * @version v${id5Api.version}
 * @link ${id5Api.homepage}
 * @license ${id5Api.license}
 */
`;

const bundles = [
  { entry: 'src/index.js', output: 'id5-api.js' },
  { entry: 'src/api-lite.js', output: 'id5-api-lite.js' },
  { entry: 'src/esp.js', output: 'esp.js' },
  { entry: 'src/id5PrebidModule.js', output: 'id5PrebidModule.js' },
];


function rollupConfig(input, outputFileName) {
  return {
    input,
    output: {
      file: outputFileName,
      format: 'iife',
      sourcemap: true,
    },
    plugins: [
      babel({ babelHelpers: 'bundled' }),
      nodeResolve(),
    ]
  };
}

// Builds an object stream containing all the bundle output chunks
function buildRollupBaseStream() {
  const result = new Readable({
    // stub _read() as it's not available on Readable stream, needed by gulp et al
    read: () => { },
    objectMode: true,
  });

  const build = async () => {
    for(const bundleDef of bundles) {
      const options = rollupConfig(bundleDef.entry, bundleDef.output);
      const bundle = await rollup(options);
      result.emit('bundle', bundle);
      const { output } = await bundle.generate(options.output);
      for (const chunk of output) {
        result.push(chunk);
      }
    }
  };

  build().then(() => {
    // signal end of write
    result.push(null);
  }).catch((error) => {
    result.emit('error', error);
  });

  return result;
}

// Adapts the Rollup bundle stream we obtained before to a Vinyl Files stream
const buildRollupTransformer = () => new Transform({ objectMode: true,
  transform(chunk, encoding, callback) {
    const makeFile = (content, filename) => {
      const contents = Buffer.from(content, encoding);
      return new File({
        path: chunk.fileName,
        contents,
      });
    }
    let file = null, error = null;
    switch(chunk.type) {
      case 'asset':
        file = makeFile(chunk.source, chunk.fileName);
        break;
      case 'chunk':
        file = makeFile(chunk.code, chunk.fileName);
        break;
      default:
        error = new Error(`Unexpected chunk type: ${chunk.type}`);
    }
    callback(error, file);
  }
});

const isNotMap = file => !file.path.endsWith('.map');

function bundleDev() {
  return buildRollupBaseStream()
    .pipe(buildRollupTransformer())
    .pipe(gulpif(isNotMap, header(banner)))
    .pipe(gulp.dest('build/dev'));
}

function bundleProd() {
  return buildRollupBaseStream()
    .pipe(buildRollupTransformer())
    .pipe(gulpif(isNotMap, uglify()))
    .pipe(gulpif(isNotMap, header(banner)))
    .pipe(gulp.dest('build/dist'))
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

// Run the unit tests in headless chrome.
// If --continuous is given, the task will re-run unit tests whenever the source code changes
function test(done) {
  let karmaConfig = karma.config.parseConfig(path.resolve() + '/karma.conf.cjs',
    {
      singleRun: !argv.continuous
    },
    {
      promiseConfig: false,
      throwErrors: true
    });
  new karma.Server(karmaConfig, done).start();
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


gulp.task('build-bundle-dev', bundleDev);
gulp.task('build-bundle-prod', bundleProd);
gulp.task('build-all', gulp.parallel('build-bundle-dev', 'build-bundle-prod'));

gulp.task('inttest', () => {
  // `gulp-mocha` needs filepaths so you can't have any plugins before it
  const grepIndex = process.argv.indexOf('-g');
  const grepPattern = grepIndex > -1 ? process.argv[grepIndex + 1] : null;

  const mochaOptions = {
      reporter: isDocker() ? 'spec' : 'nyan',
      inlineDiffs: true,
  };

  if (grepPattern) {
    mochaOptions.grep = grepPattern;
  }

  return gulp.src('integration/**/*.spec.js', {read: false})
    .pipe(mocha(mochaOptions));
});

// public tasks (dependencies are needed for each task since they can be ran on their own)
gulp.task('test', gulp.series('clean', 'generate', lint, test));

gulp.task('build', gulp.series(
  'info',
  'clean',
  'generate',
  'lint',
  test,
  'build-all',
  'inttest'
));

gulp.task('serve', gulp.series(
  'info',
  'clean',
  'generate',
  lint,
  gulp.parallel('build-bundle-dev', watch, test)
));

gulp.task('npm-prepare-release', gulp.series('info', 'clean', 'generate', 'build-bundle-prod'))
