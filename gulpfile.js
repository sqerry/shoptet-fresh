const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();
const SftpClient = require('ssh2-sftp-client');
const path = require('path');
const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { babel } = require('@rollup/plugin-babel');
const terser = require('@rollup/plugin-terser');
const rename = require('gulp-rename');
const postcss = require('gulp-postcss');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');
const log = require('fancy-log');
const through = require('through2');
const fs = require('fs');
const express = require('express');
const replace = require('gulp-replace');
const newer = require('gulp-newer');
const sharp = require('sharp');
const staticServer = express();

const source = require('./gulp-source.json');
// const sourceSk = require('./gulp-source-sk.json')
// const sourceDe = require('./gulp-source-de.json')

const remotePathOutput = '/';

// Array of all sources for SFTP uploads
// V případě více mutací
// const sources = [source, sourceSk, sourceDe]
// const sources = [source]

const sources = [
  // require('./gulp-source-test.json'), // TEST
  require('./gulp-source.json'), // CZ
  require('./gulp-source-pl.json'), // PL
  require('./gulp-source-sk.json'), // SK
];

// Rollup cache for faster rebuilds
let rollupCache;

// Shared cssnano config
const cssnanoConfig = {
  preset: [
    'default',
    {
      discardComments: { removeAll: true },
      mergeLonghand: true,
      mergeRules: true,
      minifyFontValues: true,
      minifyGradients: true,
      minifySelectors: true,
      normalizeCharset: true,
      normalizeDisplayValues: true,
      normalizePositions: true,
      normalizeString: true,
      normalizeTimingFunctions: true,
      normalizeUnicode: true,
      normalizeUrl: true,
      normalizeWhitespace: true,
      orderedValues: true,
      reduceInitial: true,
      reduceTransforms: true,
      uniqueSelectors: true,
    },
  ],
};

// SFTP upload helper function - uploads to all sources in parallel
async function uploadToSftp(localPath, remotePath, isDirectory = false) {
  const uploadPromises = sources.map(async (src) => {
    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: src.hostname,
        port: src.port,
        username: src.username,
        password: src.password,
      });

      if (isDirectory) {
        await sftp.uploadDir(localPath, remotePath, {
          useFastPut: true,
          concurrency: 64,
          chunkSize: 32768,
        });
        log(`Uploaded directory ${localPath} to ${src.hostname}:${remotePath}`);
      } else {
        const remoteDir = path.dirname(remotePath);
        try {
          await sftp.mkdir(remoteDir, true);
        } catch (e) {
          // Directory might already exist
        }
        await sftp.fastPut(localPath, remotePath, {
          concurrency: 64,
          chunkSize: 32768,
        });
        log(`Uploaded ${localPath} to ${src.hostname}:${remotePath}`);
      }
    } catch (err) {
      log.error(`SFTP error for ${src.hostname}: ${err.message}`);
      throw err;
    } finally {
      await sftp.end();
    }
  });

  await Promise.all(uploadPromises);
}

function delayedStream(delay = 100) {
  return through.obj(
    function (file, enc, cb) {
      this.push(file);
      cb();
    },
    function (cb) {
      setTimeout(() => {
        browserSync.reload('*.css');
        cb();
      }, delay);
    }
  );
}

// Development CSS - SASS (no SFTP) - using sass native sourcemaps
gulp.task('sass-dev', function (done) {
  log('Starting SASS compilation for development...');
  return gulp
    .src('template/css/*.scss')
    .pipe(
      sass
        .sync({
          outputStyle: 'expanded',
          sourceMap: true,
          sourceMapEmbed: true,
          sourceMapContents: true,
        })
        .on('error', sass.logError)
    )
    .pipe(rename('style.css'))
    .pipe(gulp.dest('dist'))
    .pipe(delayedStream())
    .on('end', function () {
      log('SASS compilation completed');
      done();
    });
});

// Production CSS - SASS (with SFTP)
gulp.task('sass', async function () {
  log('Starting SASS compilation for production...');
  await new Promise((resolve, reject) => {
    gulp
      .src('template/css/*.scss')
      .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
      .pipe(rename('style.css'))
      .pipe(replace('/dist/', '/user/documents/'))
      .pipe(postcss([autoprefixer(), cssnano(cssnanoConfig)]))
      .pipe(gulp.dest('dist'))
      .on('end', resolve)
      .on('error', reject);
  });

  await uploadToSftp('dist/style.css', remotePathOutput + 'style.css');
  log('SASS compilation and SFTP upload completed to all sources');
});

// Development JavaScript (no SFTP, with cache)
gulp.task('js-dev', async function () {
  const bundle = await rollup.rollup({
    input: 'template/js/script.js',
    cache: rollupCache,
    plugins: [
      nodeResolve(),
      commonjs(),
      babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
    ],
  });
  rollupCache = bundle.cache;
  await bundle.write({
    file: 'dist/script.js',
    format: 'iife',
    sourcemap: true,
  });
  log('JavaScript compilation completed for development');
});

// Production JavaScript bundling with minification (with cache)
gulp.task('js-bundle', async function () {
  const bundle = await rollup.rollup({
    input: 'template/js/script.js',
    cache: rollupCache,
    plugins: [
      nodeResolve(),
      commonjs(),
      babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }),
      terser(),
    ],
  });
  rollupCache = bundle.cache;
  await bundle.write({
    file: 'dist/script.js',
    format: 'iife',
    sourcemap: false,
  });
  log('JavaScript bundling and minification completed for production');
});

// Production JavaScript SFTP upload
gulp.task('js-upload', async function () {
  await uploadToSftp('dist/script.js', remotePathOutput + 'script.js');
  log('JavaScript SFTP upload completed to all sources');
});

// Combined production JavaScript task (bundle + upload)
gulp.task('js', gulp.series('js-bundle', 'js-upload'));

gulp.task(
  'js-dev-reload',
  gulp.series('js-dev', function (done) {
    browserSync.reload();
    done();
  })
);

gulp.task(
  'js-reload',
  gulp.series('js', function (done) {
    browserSync.reload();
    done();
  })
);

// Development images (no SFTP, incremental)
gulp.task('images-dev', function () {
  return gulp
    .src('template/images/**/*')
    .pipe(newer('dist/able-images'))
    .pipe(gulp.dest('dist/able-images'));
});

// Image optimization with sharp
function optimizeImages() {
  return through.obj(async function (file, enc, cb) {
    if (file.isNull()) {
      cb(null, file);
      return;
    }

    const ext = path.extname(file.path).toLowerCase();

    // Skip non-image files and SVGs (sharp doesn't handle SVG)
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      cb(null, file);
      return;
    }

    try {
      let pipeline = sharp(file.contents);

      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({ quality: 80, progressive: true });
      } else if (ext === '.png') {
        pipeline = pipeline.png({ compressionLevel: 9 });
      } else if (ext === '.webp') {
        pipeline = pipeline.webp({ quality: 80 });
      } else if (ext === '.gif') {
        pipeline = pipeline.gif();
      }

      file.contents = await pipeline.toBuffer();
      cb(null, file);
    } catch (err) {
      log.error(`Sharp error processing ${file.path}: ${err.message}`);
      cb(null, file); // Pass through on error
    }
  });
}

// Production images (with optimization and SFTP)
gulp.task('images', async function () {
  await new Promise((resolve, reject) => {
    gulp
      .src('template/images/**/*')
      .pipe(optimizeImages())
      .pipe(gulp.dest('dist/able-images'))
      .on('end', resolve)
      .on('error', reject);
  });

  await uploadToSftp(
    'dist/able-images',
    remotePathOutput + 'able-images',
    true
  );
  log('Images optimized and uploaded to all sources');
});

gulp.task(
  'images-dev-reload',
  gulp.series('images-dev', function (done) {
    browserSync.reload();
    done();
  })
);

gulp.task(
  'images-reload',
  gulp.series('images', function (done) {
    browserSync.reload();
    done();
  })
);

// Development fonts (no SFTP, incremental)
gulp.task('icons-dev', function () {
  return gulp
    .src('template/fonts/**/*')
    .pipe(newer('dist/fonts'))
    .pipe(gulp.dest('dist/fonts'));
});

// Production fonts (with SFTP)
gulp.task('icons', async function () {
  await new Promise((resolve, reject) => {
    gulp
      .src('template/fonts/**/*')
      .pipe(gulp.dest('dist/fonts'))
      .on('end', resolve)
      .on('error', reject);
  });

  await uploadToSftp('dist/fonts', remotePathOutput + 'fonts', true);
  log('Fonts uploaded to all sources');
});

gulp.task(
  'icons-dev-reload',
  gulp.series('icons-dev', function (done) {
    browserSync.reload();
    done();
  })
);

gulp.task(
  'icons-reload',
  gulp.series('icons', function (done) {
    browserSync.reload();
    done();
  })
);

// Production SASS (without sourcemap)
gulp.task('sass-without-map', async function () {
  await new Promise((resolve, reject) => {
    gulp
      .src('template/css/*.scss')
      .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
      .pipe(rename('style.css'))
      .pipe(replace('/dist/', '/user/documents/'))
      .pipe(postcss([autoprefixer(), cssnano(cssnanoConfig)]))
      .pipe(gulp.dest('dist'))
      .on('end', resolve)
      .on('error', reject);
  });

  await uploadToSftp('dist/style.css', remotePathOutput + 'style.css');
  log('SASS compilation and SFTP upload completed');
});

gulp.task('staticServer', function (done) {
  staticServer.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  staticServer.use('/dist', express.static('dist'));
  staticServer.listen(3008, function () {
    log('Static server running on port 3008');
    done();
  });
});

gulp.task('browserSync', function (done) {
  log('Initializing BrowserSync...');
  browserSync.init({
    proxy: {
      target: 'https://' + source.url + '.myshoptet.com',
      // target: 'https://www.unuo.cz',
      ws: true,
    },
    port: 3009,
    open: false,
    browser: ['google chrome', 'firefox'],
    reloadDelay: 0,
  });
  log('BrowserSync initialized');
  done();
});

gulp.task('clean', function (done) {
  fs.rm('dist', { recursive: true, force: true }, (err) => {
    if (err && err.code !== 'ENOENT') {
      done(err);
      return;
    }
    fs.mkdir('dist', { recursive: true }, done);
  });
});

// Dev serve task (with static server, no SFTP)
gulp.task(
  'serve',
  gulp.series(
    'clean',
    gulp.parallel('staticServer', 'browserSync'),
    gulp.parallel('sass-dev', 'js-dev', 'icons-dev', 'images-dev'),
    function () {
      gulp.watch('template/css/**/*.scss', gulp.series('sass-dev'));
      gulp.watch('template/js/**/*.js', gulp.series('js-dev-reload'));
      gulp.watch('template/images/*', gulp.series('images-dev-reload'));
      gulp.watch('template/fonts/*', gulp.series('icons-dev-reload'));
    }
  )
);

gulp.task('default', gulp.series('serve'));

gulp.task(
  'final',
  gulp.parallel(['sass-without-map', 'js'], function () {
    gulp.watch('template/css/**/*.scss', gulp.series('sass-without-map'));
    gulp.watch('template/js/**/*.js', gulp.series('js'));
    gulp.watch('template/images/*', gulp.series('images'));
    gulp.watch('template/fonts/*', gulp.series('icons'));
  })
);

// Production build task (with SFTP uploads)
gulp.task('prod', gulp.parallel(['sass-without-map', 'js', 'images', 'icons']));
