import gulp from 'gulp';
import eslint from "gulp-eslint";
import gulpif from "gulp-if";
import mocha from 'gulp-mocha';
import {readFile} from "fs/promises";

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

function test(done) {
  gulp.src('test/**/*.spec.js', {read: false})
    .pipe(mocha())
  done()
}
const pkgInfo = JSON.parse(await readFile('package.json'));

gulp.task('info', (done) => {
  console.log(`Building ${pkgInfo.name} v. ${pkgInfo.version}`)
  done()
})
gulp.task(lint)
gulp.task(test)

gulp.task('build', gulp.series('info', lint, test))
