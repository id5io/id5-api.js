import gulp from 'gulp';
import eslint from 'gulp-eslint-new';
import {mkdir, readFile, writeFile} from 'fs/promises';
import karma from 'karma';
import * as path from 'path';
import gv from 'genversion';
import yargs from 'yargs';

const argv = yargs.argv;

function lint() {
  return gulp.src([
    'src/**/*.js',
    'test/**/*.js'
  ])
    .pipe(eslint({ fix: true, configType: 'flat' }))     // Lint files, create fixes.
    .pipe(eslint.fix())              // Fix files if necessary.
    .pipe(eslint.format('stylish'))  // Output lint results to the console.
    .pipe(eslint.failAfterError());  // Exit with an error if problems are found.
}

const pkgInfo = JSON.parse(await readFile('package.json'));

gulp.task('info', (done) => {
  console.log(`Building ${pkgInfo.name} v. ${pkgInfo.version}`)
  done()
})

// Fallback API bases, passed as a comma separated list in ID5_ALTERNATE_API_BASES.
// Without it, non-release builds use test hosts on the reserved .test TLD (they never resolve, so a leaked
// development bundle cannot send traffic anywhere), which lets the integration tests run everywhere.
// Release builds (on a tag or on the default branch in CI) fail when the list is empty or has a test host.
const TEST_API_BASES = ['https://fetch-1.id5.test', 'https://fetch-2.id5.test', 'https://fetch-3.id5.test'];

function isReleaseBuild() {
  const env = process.env;
  return !!env.CI && (!!env.CI_COMMIT_TAG || (!!env.CI_COMMIT_BRANCH && env.CI_COMMIT_BRANCH === env.CI_DEFAULT_BRANCH));
}

function isTestHost(base) {
  return new URL(base).hostname.endsWith('.test');
}

async function generateApiBases() {
  let bases = (process.env.ID5_ALTERNATE_API_BASES || '').split(',').map(base => base.trim()).filter(base => base);
  if (isReleaseBuild() && (bases.length === 0 || bases.some(isTestHost))) {
    throw new Error('ID5_ALTERNATE_API_BASES must be set to production hosts in release builds');
  }
  if (bases.length === 0) {
    console.warn('ID5_ALTERNATE_API_BASES is not set, building with test api bases');
    bases = TEST_API_BASES;
  }
  const encoded = bases.map(base => Buffer.from(base).toString('base64'));
  await mkdir(path.resolve() + '/generated', {recursive: true});
  await writeFile(path.resolve() + '/generated/apiBases.js',
    `// Generated at build time from ID5_ALTERNATE_API_BASES.\nexport const ALTERNATE_API_BASES = ${JSON.stringify(encoded)};\n`);
}

gulp.task('generate', gulp.parallel(
  (done) => gv.generate(path.resolve() + '/generated/version.js', {useEs6Syntax: true}, done),
  generateApiBases
));

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

gulp.task(lint)
gulp.task(test)

gulp.task('build', gulp.series('info', 'generate', lint, test))
gulp.task('npm-prepare-release', gulp.series('info', 'generate'))
