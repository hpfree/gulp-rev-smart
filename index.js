var through = require('through2');
var crypto = require('crypto');
var gutil = require('gulp-util');
var path = require('path');

module.exports = function override() {
   // var allowedPathRegExp = /\.(css|js)$/;
    var allowedPathRegExp = /\.(css|js|html)$/;

    function md5(str) {
        return crypto.createHash('md5').update(str, 'utf8').digest('hex');
    }

    function relPath(base, filePath) {
        if (filePath.indexOf(base) !== 0) {
            return filePath;
        }
        var newPath = filePath.substr(base.length);
        if (newPath[0] === path.sep) {
            return newPath.substr(1);
        } else {
            return newPath;
        }
    }

    var f = [];

    return through.obj(function (file, enc, cb) {
        var firstFile = null;

        if (file.path && file.revOrigPath) {
            firstFile = firstFile || file;
            var _relPath = relPath(path.resolve(firstFile.revOrigBase), file.revOrigPath);

            f.push({
                origPath: _relPath, //tip.css
                hashedPath: relPath(path.resolve(firstFile.base), file.path), //tip12345.css
                file: file
            });

            // sort by filename length to not replace the common part(s) of several filenames
            f.sort(function (a, b) {
                if(a.origPath.length > b.origPath.length) return -1;
                if(a.origPath.length < b.origPath.length) return 1;
                return 0;
            });

        }
        cb();
    }, function (cb) {
        var self = this;
        f.forEach(function (_f) {
            var file = _f.file;

            if ((allowedPathRegExp.test(file.revOrigPath) ) && file.contents) {
                var contents = file.contents.toString();
                f.forEach(function (__f) {
                     var pathsep = path.sep;
                    var momentHashedPathArr = __f.hashedPath.split(pathsep);
                    var momentOrigPathArr = __f.origPath.split(pathsep);

                    var origPath = __f.origPath.replace(new RegExp('\\' + path.sep, 'g'), '/').replace(/\./g, '\\.');
                    var hashedPath = __f.hashedPath.replace(new RegExp('\\' + path.sep, 'g'), '/');
                    contents = contents.replace(
                        new RegExp(origPath, 'g'),
                        hashedPath);

                    //我是为了相对路径而生的

                    var momentRelHashedPath = relPath(path.resolve(file.base), file.path);
                    var momentRelOrigPath = relPath(path.resolve(file.revOrigBase), file.revOrigPath);

                    var momentRelHashedPathArr = momentRelHashedPath.split(pathsep);
                    var momentRelOrigPathArr = momentRelOrigPath.split(pathsep);

                    var copymomentRelHashedPathArr = momentRelHashedPath.split(pathsep);
                    for(var i=0;i<copymomentRelHashedPathArr.length;i++){
                        if(copymomentRelHashedPathArr[i]==momentHashedPathArr[0]){
                            momentRelOrigPathArr.shift()
                            momentRelHashedPathArr.shift()
                            momentHashedPathArr.shift()
                            momentOrigPathArr.shift()
                        }else{
                            break;
                        }
                    };
                            
                    momentRelOrigPath = momentRelOrigPathArr.join(pathsep).indexOf("/")<0?"":momentRelOrigPathArr.join(pathsep);
                    momentRelHashedPath =  momentRelHashedPathArr.join(pathsep).indexOf("/")<0?"":momentRelHashedPathArr.join(pathsep);
                    momentHashedPath =  momentHashedPathArr.join(pathsep);
                    momentOrigPath =  momentOrigPathArr.join(pathsep);

                    var relHashedPath = path.relative(path.basename(momentRelHashedPath),momentHashedPath);
                    var relOrigPath = path.relative(path.basename(momentRelOrigPath),momentOrigPath);

                    relOrigPath = relOrigPath.replace(new RegExp('\\' + path.sep, 'g'),"/").replace(/\./g,'\\.');
                    relHashedPath = relHashedPath.replace(new RegExp('\\' + path.sep, 'g'), '/');

                    //替换相对路径名
                    contents = contents.replace(
                        new RegExp(relOrigPath,"g"),
                        relHashedPath);

                });

                file.contents = new Buffer(contents);

                // update file's hash as it does in gulp-rev plugin
                var hash = file.revHash = md5(contents).slice(0, 10);
                var ext = path.extname(file.path);

                //我是为了处理文件名带" . "而生的;
                var baseFileName = path.basename(file.revOrigPath, ext)
                var extIndex = baseFileName.indexOf(".")

                var filename = extIndex === -1?
                    baseFileName + '-' + hash + ext : 
                    baseFileName.substr(0,extIndex) + '-' + hash + baseFileName.substr(extIndex) + ext;
                file.path = path.join(path.dirname(file.path), filename);

            }
            self.push(file);
        });
        cb();
    });
};
