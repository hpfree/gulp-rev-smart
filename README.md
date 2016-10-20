CSS-URL [![Build Status](https://travis-ci.org/galkinrost/gulp-rev-css-url.svg?branch=master)](https://travis-ci.org/galkinrost/gulp-rev-css-url)
=========
Static asset revisioning by appending content hash to filenames: unicorn.css => unicorn.098f6bcd.css, also re-writes references in each file to new reved name.

Install
--
```sh
npm install gulp-rev-smart
```

Usage
--

```javascript
var gulp=require('gulp');
var override=require('gulp-rev-smart');

gulp.task('rev',function(){
    return gulp.src('./activity/**/*')
                .pipe(override())
                .pipe(gulp.dest('./build/'))
                .pipe(rev.manifest())
                .pipe(gulp.dest('./rev'));
});

```
Tests
--
```sh
npm test
```

License
----

MIT
