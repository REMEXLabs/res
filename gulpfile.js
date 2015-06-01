var path = require('path');
var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var run = require('gulp-run');
var replace = require('gulp-replace');

gulp.task('default', function() {
  return gulp.src('jquery.res.js')
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('./'))
    .pipe(run(
      'jsdoc -c conf.json'
    ));
});

gulp.task('replace', ['default'], function() {
  var find = path.join(__dirname + '/');
  find = find.replace('/c/', 'c:');
  find = find.replace(/\\/g, '/');
  console.log(find);
  return gulp.src(['docs/*.html'])
    .pipe(replace(find, ''))
    .pipe(gulp.dest('docs/'));
});

gulp.task('watch', function(){
  gulp.watch('jquery.res.js', ['replace']);
});
