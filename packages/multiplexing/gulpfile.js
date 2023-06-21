import gulp from 'gulp';
import eslint from 'gulp-eslint';
import gulpif from 'gulp-if';
import {readFile} from 'fs/promises';
import karma from 'karma';
import * as path from 'path';
import gv from 'genversion';

function lint() {
  return gulp.src([
    'src/**/*.js',
    'test/**/*.js'
  ], {base: './'})
    .pipe(eslint())
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError())
    .pipe(gulpif(file => file.eslint?.fixed, gulp.dest('./')));
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
      singleRun: true
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
