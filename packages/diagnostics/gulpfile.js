import gulp from 'gulp';
import eslint from "gulp-eslint-new";
import mocha from 'gulp-mocha';
import {readFile} from "fs/promises";

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
