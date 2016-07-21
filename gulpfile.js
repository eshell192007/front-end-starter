var gulp            = require('gulp'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    del             = require('del'),
    lazy            = require('lazypipe'),
    browserSync     = require('browser-sync').create(),
    runSequence     = require('run-sequence'),
    cleanCss        = require('gulp-clean-css'),
    merge           = require('merge-stream'),
    reload          = browserSync.reload,
    $               = gulpLoadPlugins();

var paths = {
    dist:           'dist',
    assets:         'assets',
    views:          'views/*.+(pug|jade)',
    sass:           'assets/sass/*.+(scss|sass)',
    img:            'assets/img/**/*.+(png|jpg|gif|svg)',
    fonts:          'assets/fonts/**/*',
    bootstrapFonts: 'bower_components/bootstrap-sass/assets/fonts/**/*',
    allSass:        'assets/sass/**/*.+(scss|sass)',
    allJs:          'assets/js/**/*.js',
    allViews:       'views/**/*.+(pug|jade)'
};

gulp.task('browser-sync', function() {
  browserSync.init({
    server: {
      baseDir: paths.dist
    }
  });
});

// Copy fonts
gulp.task('fonts', ['clean:fonts'], function() {
  var bootstrapFonts = gulp.src(paths.bootstrapFonts)
    .pipe(gulp.dest(paths.dist + '/fonts'));
  var fonts = gulp.src(paths.fonts)
    .pipe(gulp.dest(paths.dist + '/fonts'));
  return merge(bootstrapFonts, fonts);
});

// Cleans the dist/img folder then caches and compresses the images
gulp.task('img', ['clean:img'], function() {
  return gulp.src(paths.img)
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest(paths.dist + '/img'));
});

gulp.task('clean:img', function() {
  return del.sync([paths.dist + '/img']);
});

gulp.task('clean:dist', function() {
  return del.sync([paths.dist]);
});

gulp.task('clean:fonts', function() {
  return del.sync([paths.dist + '/fonts']);
});

// Compiles views/*.pug to assets
gulp.task('views', function() {
  return gulp.src(paths.views)
    .pipe($.pug({
      pretty: true
    }))
    .pipe(gulp.dest(paths.assets));
});

// Compatibility hack for useref & pug. I came up with this,
// so it's probably wrong. But it works!
gulp.task('views-watch', ['views'], function(callback) {
  runSequence(
    'useref-watch',
    callback
  );
});

// Compiles assets/sass/*.scss to assets/css
// Initiates sourcemaps
gulp.task('sass', function() {
  return gulp.src(paths.sass)
    .pipe($.sourcemaps.init())
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(paths.assets + '/css'))
    .pipe(browserSync.stream());
});

// Parse assets/*.html. Bundle and minify assets/css & assets/js
// Lazypipe used to get useref, Sass, and sourcemaps to play nice
gulp.task('useref', ['sass', 'views'], function() {
  return gulp.src(paths.assets + '/*.html')
    .pipe($.changed(paths.dist))
    .pipe($.useref({}, lazy().pipe($.sourcemaps.init, { loadMaps: true })))
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', cleanCss()))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(paths.dist))
});

// Browsewr reload must happen after useref is done running.
gulp.task('useref-watch', ['useref'], function() {
  browserSync.reload();
});

// Watch tasks
gulp.task('watch', function() {
  gulp.watch(paths.allSass, ['useref-watch']);
  gulp.watch(paths.allJs, ['useref-watch']);
  gulp.watch(paths.img, ['img']);
  gulp.watch(paths.allViews, ['views-watch']);
  gulp.watch(paths.fonts, ['fonts']);
});

// Build tasks
gulp.task('build', function(callback) {
  runSequence(
    'clean:dist',
    ['useref', 'img', 'fonts'],
    callback
  );
});

gulp.task('default', function(callback) {
  runSequence(
    'build',
    ['browser-sync', 'watch'],
    callback
  );
});
