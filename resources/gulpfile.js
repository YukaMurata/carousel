/*--------------------------------------------------------
  modules
--------------------------------------------------------*/

const { src, watch, dest, parallel } = require('gulp'),
  autoprefixer = require('gulp-autoprefixer'),
  notify = require('gulp-notify'),
  plumber = require('gulp-plumber'),
  pug = require('gulp-pug'),
  sass = require('gulp-sass'),
  encode = require('gulp-convert-encoding'),
  replace = require('gulp-replace');

//------------------------------------------------------------------------------
// SP:sass / scss / css
//------------------------------------------------------------------------------

const compileSpSass = () =>
  src(`${__dirname}/scss/**/*.scss`)
    .pipe(
      plumber({
        errorHandler: notify.onError('<%= error.message %>'),
      })
    )
    .pipe(
      sass({
        outputStyle: 'expanded',
      }).on('error', sass.logError)
    )
    .pipe(autoprefixer())
    .pipe(replace('UTF-8', 'Shift_JIS'))
    .pipe(replace('utf-8', 'Shift_JIS'))
    .pipe(encode({ to: 'Shift_JIS' }))
    .pipe(dest(`${__dirname}/../css/`));

//------------------------------------------------------------------------------
// SP:watch
//------------------------------------------------------------------------------
const watchSPFiles = () => watch(`${__dirname}/scss/**/*.scss`, compileSpSass);

exports.default = watchSPFiles;
