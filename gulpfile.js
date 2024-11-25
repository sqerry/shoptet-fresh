const gulp = require('gulp')
const rename = require('gulp-rename')
const sass = require('gulp-sass')(require('sass'))
const sourcemaps = require('gulp-sourcemaps')
const browserSync = require('browser-sync').create()
const sftp = require('gulp-sftp-up4')
const rollup = require('rollup')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const { babel } = require('@rollup/plugin-babel')
const uglify = require('gulp-uglify')
const cleanCSS = require('gulp-clean-css')
const source = require('./gulp-source.json')
const remotePathOutput = '/'

// CSS - SASS
gulp.task('sass', function () {
    return gulp
        .src('template/scss/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(sourcemaps.write())
        .pipe(rename('style.css'))
        .pipe(gulp.dest('dist'))
        .pipe(
            sftp({
                host: source.hostname,
                user: source.username,
                pass: source.password,
                port: source.port,
                remotePath: remotePathOutput,
            })
        )
})

gulp.task(
    'sass-reload',
    gulp.series('sass', function (done) {
        browserSync.reload()
        done()
    })
)

// JavaScript
gulp.task('js', function () {
    return rollup
        .rollup({
            input: 'template/js/script.js',
            plugins: [
                nodeResolve(),
                commonjs(),
                babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
            ],
        })
        .then((bundle) => {
            return bundle.write({
                file: 'dist/script.js',
                format: 'iife',
                sourcemap: true,
            })
        })
        .then(() => {
            return gulp
                .src('dist/script.js')
                .pipe(sourcemaps.init({ loadMaps: true }))
                .pipe(sourcemaps.write('./'))
                .pipe(gulp.dest('dist'))
                .pipe(
                    sftp({
                        host: source.hostname,
                        user: source.username,
                        pass: source.password,
                        port: source.port,
                        remotePath: remotePathOutput,
                    })
                )
        })
})

gulp.task(
    'js-reload',
    gulp.series('js', function (done) {
        browserSync.reload()
        done()
    })
)

// Uglify JavaScript
gulp.task('uglify-js', function () {
    return gulp.src('dist/script.js').pipe(uglify()).pipe(gulp.dest('dist'))
})

// obrázky
gulp.task('images', function () {
    return gulp
        .src('template/images/*')
        .pipe(gulp.dest('dist/able-images'))
        .pipe(
            sftp({
                host: source.hostname,
                user: source.username,
                pass: source.password,
                port: source.port,
                remotePath: remotePathOutput + 'able-images',
            })
        )
})

gulp.task(
    'images-reload',
    gulp.series('images', function (done) {
        browserSync.reload()
        done()
    })
)

// ikony
gulp.task('icons', function () {
    return gulp
        .src('template/fonts/*')
        .pipe(gulp.dest('dist/fonts'))
        .pipe(
            sftp({
                host: source.hostname,
                user: source.username,
                pass: source.password,
                port: source.port,
                remotePath: remotePathOutput + 'fonts',
            })
        )
})

gulp.task(
    'icons-reload',
    gulp.series('icons', function (done) {
        browserSync.reload()
        done()
    })
)

//bez sourcemap
gulp.task('sass-without-map', function () {
    return gulp
        .src('template/scss/*.scss')
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError)) // Converts Sass to CSS with gulp-sass
        .pipe(sourcemaps.write())
        .pipe(rename('style.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('dist'))
        .pipe(
            sftp({
                host: source.hostname,
                user: source.username,
                pass: source.password,
                port: source.port,
                remotePath: remotePathOutput,
            })
        )
        .pipe(
            browserSync.reload({
                stream: true,
            })
        )
})

//browser synchronizace
gulp.task('browserSync', function () {
    browserSync.init({
        open: false,
        browser: ['google chrome', 'firefox'],
        reloadDelay: 600,
        proxy: {
            target: 'https://' + source.url + '.myshoptet.com',
        },
        // baseDir: remotePathOutput,
    })
})

gulp.task(
    'serve',
    gulp.parallel(['browserSync', 'sass-reload', 'js-reload'], function () {
        gulp.watch('template/scss/**/*.scss', gulp.series('sass-reload'))
        gulp.watch('template/js/**/*.js', gulp.series('js-reload'))
        gulp.watch('template/images/*', gulp.series('images-reload'))
        gulp.watch('template/fonts/*', gulp.series('icons-reload'))
    })
)
gulp.task('default', gulp.series('serve'))

gulp.task(
    'final',
    gulp.parallel(['sass-without-map', 'js', 'uglify-js'], function () {
        gulp.watch('template/scss/**/*.scss', gulp.series('sass-without-map'))
        gulp.watch('template/js/**/*.js', gulp.series('js', 'uglify-js'))
        gulp.watch('template/images/*', gulp.series('images'))
        gulp.watch('template/fonts/*', gulp.series('icons'))
    })
)
gulp.task('default', gulp.series('final'))
