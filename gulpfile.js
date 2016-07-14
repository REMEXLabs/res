var path = require('path');
var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var run = require('gulp-run');
var replace = require('gulp-replace');

gulp.task('basics', function() {
  return gulp.src('jquery.res.js')
    .pipe(uglify({preserveComments:'license'}))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('./'))
    .pipe(run(
      'jsdoc -c conf.json'
    ));
});

gulp.task('default', ['basics'], function() {
  var find = path.join(__dirname + '/');
  find = find.replace('/c/', 'c:');
  find = find.replace(/\\/g, '/');
  return gulp.src(['docs/*.html'])
    .pipe(replace(find, ''))
    .pipe(replace(/<\/a> on .*\n.*<\/footer>/i, '</a></footer>'))
    .pipe(gulp.dest('docs/'));
});

gulp.task('watch', function(){
  gulp.watch('jquery.res.js', ['default']);
});
