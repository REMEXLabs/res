var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var run = require('gulp-run');

gulp.task('default', function() {
  return gulp.src('jquery.res.js')
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('./'))
    .pipe(run(
      'jsdoc -c conf.json'
    ));
});

gulp.task('watch', function(){
  gulp.watch('jquery.res.js', ['default']);
});
