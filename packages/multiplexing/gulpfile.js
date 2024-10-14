import gulp from 'gulp';
import eslint from 'gulp-eslint-new';
import {readFile} from 'fs/promises';
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

gulp.task('generate', (done) => {
  gv.generate(path.resolve() + '/generated/version.js', {useEs6Syntax: true}, done);
});

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
