var through = require('through2');
var crypto = require('crypto');
var Merge = require('merge');
var gutil = require('gulp-util');
var path = require('path');

module.exports = function override(opts) {
    var defaults = {
        "dontRenameFile" : [],
        "addjspostfix" : []
    }
    this.options = Merge(defaults, opts);
    var allowedPathRegExp = /\.(css|js|html)$/;
    var dontGlobal = [ /^\/favicon.ico$/g ];
    var pathsep = path.sep;
    var f = [];
    var addMatchJs = /(\s*\:\s*['|"][\w\-\_\.\/\/]+(?!\.js))(['|"])/g
    var delMatchJs = /(\s*\:\s*['|"][\w\-\_\.\/\/]+)\.js(['|"])/g;
    function md5(str) {
        return crypto.createHash('md5').update(str, 'utf8').digest('hex').slice(0, 10);
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
    function is_binary_file(file) {
        var length = (file.contents.length > 50) ? 50 : file.contents.length;
        for (var i = 0; i < length; i++) {
            if (file.contents[i] === 0) {
                return true;
            }
        }
        return false;

    };
    function shouldSearchFile(file){
        var filename = path.basename(file.revOrigPath);
        for (var i = dontGlobal.length; i--;) {
            var regex = (dontGlobal[i] instanceof RegExp) ? dontGlobal[i] : new RegExp(dontGlobal[i] + '$', 'ig');
            if (filename.match(regex)) {
                return false;
            }
        }
        return true;
    };
    function createRelativePath(){
        for(var i=0;i<f.length;i++){
            var currentFile = f[i].file;
            if (is_binary_file(currentFile) || !shouldSearchFile(currentFile) || !allowedPathRegExp.test(currentFile.revOrigPath) ) {
                continue;
            }
            currentFile.needRepleace = true;
            currentFile.revOrigBaseRelative = [];
            currentFile.revOrigBasePosition = [];
            f.forEach(function(__file){
                var listsFile = __file.file;
                isUploadRevHash(currentFile,listsFile,__file.origPath);
                getReference(listsFile, currentFile)
            })
        }
    };

    function isUploadRevHash(currentFile, file, checkPath, isrelative){
        var contents = currentFile.contents.toString() ;
        checkPath = checkPath.replace(new RegExp('\\' + path.sep, 'g'), '/');
        if(contents.indexOf(checkPath) > -1){
            currentFile.isUpdataHash = true;
            currentFile.revHash += file.revHash;
            isrelative?
            currentFile.revOrigBaseRelative.push({"path":checkPath,"file":file}):currentFile.revOrigBasePosition.push({"path":checkPath,"file":file});

        }
    };
    function getReference(fileCurrentReference, file) {
        if (dirname_with_sep(fileCurrentReference.path).indexOf(dirname_with_sep(file.path)) === 0) {
            var relPath = get_relative_path(path.dirname(file.path), fileCurrentReference.revOrigPath, true);
            var relPathdosh = '.' + get_relative_path(path.dirname(file.path), fileCurrentReference.revOrigPath, false);
            isUploadRevHash(file,fileCurrentReference,relPath,true)
            isUploadRevHash(file,fileCurrentReference,relPathdosh,true)
        }
        if (dirname_with_sep(file.path) !== dirname_with_sep(fileCurrentReference.path) &&
            dirname_with_sep(fileCurrentReference.path).indexOf(dirname_with_sep(file.path)) === -1) {
            var pathCurrentReference = dirname_with_sep(get_relative_path(fileCurrentReference.revOrigBase, fileCurrentReference.revOrigPath));
            var pathFile = dirname_with_sep(get_relative_path(file.base, file.revOrigPath));

            var relPath = path.relative(pathFile, pathCurrentReference);
            relPath = relPath.replace(/\\/g, '/');
            relPath = relPath + '/' + path.basename(fileCurrentReference.revOrigPath);
            isUploadRevHash(file,fileCurrentReference,relPath,true);          
        }
    };
    function dirname_with_sep(filepath){
        return path.dirname(filepath)+"/";
    };
    function get_relative_path(base, paths, noStartingSlash) {
        if (base === paths) {
            return '';
        }
        base = base.replace(/^[a-z]:/i, '').replace(/\\/g, '/').replace(/\/$/g, '') + '/';
        paths = paths.replace(/^[a-z]:/i, '').replace(/\\/g, '/');
        if (base === paths.substr(0, base.length)) {
            paths = '/' + paths.substr(base.length);
        }
        var modifyStartingSlash = noStartingSlash !== undefined;
        if(modifyStartingSlash) {
            if (paths[0] === '/' && noStartingSlash) {
                paths = paths.substr(1);
            } else if (paths[0] !== '/' && !noStartingSlash){
                paths = '/' + paths;
            }
        }
        return paths;
    };
    function createHashName(filepath, revHash, onlyName){
        if(!filepath) return
        var ext = path.extname(filepath);
        var fileDirname = path.dirname(filepath);
        var fileBasename = path.basename(filepath,ext);
        var filename;
        filename = onlyName ?
        fileBasename + '-' + revHash + ext  :  fileDirname + "/" + fileBasename + '-' + revHash + ext;
        return filename;
    };
    function manifestFile() {
        return new Gutil.File({
            cwd: this.pathCwd,
            base: this.pathBase,
            path: Path.join(this.pathBase, this.options.fileNameManifest),
            contents: new Buffer(JSON.stringify(this.manifest, null, 2))
        });

    };
    function shouldRemaneFile(file){
        var filename = get_relative_path(file.revOrigBase,file.revOrigPath);
        for (var i = this.options.dontRenameFile.length; i--;) {
            var regex = (this.options.dontRenameFile[i] instanceof RegExp) ? this.options.dontRenameFile[i] : new RegExp(this.options.dontRenameFile[i] + '$', 'ig');
            if (filename.match(regex)) {
                return false;
            }
        }
        return true;
    };
    function shouldaddjspostfix(file){
        var filename = path.basename(file.revOrigPath);
        for (var i = this.options.addjspostfix.length; i--;) {
            var regex = (this.options.addjspostfix[i] instanceof RegExp) ? this.options.addjspostfix[i] : new RegExp(this.options.addjspostfix[i] + '$', 'ig');
            if (filename.match(regex)) {
                return true;
            }
        }
        return false;
    };
    var sourcemaps = [];
    var pathMap = {};
    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }
        if (file.isStream()) {
            cb(new gutil.PluginError('gulp-rev-smart', 'Streaming not supported'));
            return;
        }
       if (!this.pathCwd) {
           this.pathCwd = file.cwd;
       }
        var firstFile = null;
        var oldPath = file.path;
        file.revOrigPath = file.path;
        file.revOrigBase = file.base;
        file.revHash = md5(file.contents);
        if(/\.(js|html)$/.test(file.revOrigPath)&&shouldaddjspostfix(file)){
            file.contents = new Buffer(file.contents.toString().replace(addMatchJs,'$1.js$2'));
            file.jspostfix = true;
        };
        if (file.path && file.revOrigPath) {
            firstFile = firstFile || file;
            var _relPath = relPath(path.resolve(firstFile.revOrigBase), file.revOrigPath);
            f.push({
                origPath: _relPath,
                file: file 
            });
            f.sort(function (a, b) {
                if(a.origPath.length > b.origPath.length) return -1;
                if(a.origPath.length < b.origPath.length) return 1;
                return 0;
            });
        }
        cb();
    }, function (cb) {
        var self = this;
        createRelativePath();
        var i=0;
        f.forEach(function(_f){
            var file = _f.file;
            if(file.isUpdataHash){
                file.revHash =  md5(file.revHash.toString());
            };
            if(!/\.html$/.test(file.revOrigPath)&&shouldRemaneFile(file)){
                var filename = createHashName(file.path,file.revHash);
                file.path = path.join(filename);
            }else{
                file.revHash = "";
            };
        })
        f.forEach(function (_f) {
            var file = _f.file;
            if(file.needRepleace) {
                var contents = file.contents.toString();
                file.revOrigBaseRelative.forEach(function(relativeFile){
                    var origPath = relativeFile.path;
                    var hashedPath = createHashName(origPath,relativeFile.file.revHash);
                    var origPath = origPath.replace(new RegExp('\\' + path.sep, 'g'), '/').replace(/\./g, '\\.');
                    var hashedPath = hashedPath.replace(new RegExp('\\' + path.sep, 'g'), '/');

                    contents=contents.replace(
                    new RegExp(origPath, 'g'),
                    hashedPath);
                });

                file.revOrigBasePosition.forEach(function(relativeFile){
                    var origPath = relativeFile.path;
                    var hashedPath = createHashName(origPath,relativeFile.file.revHash);
                    var origPath = origPath.replace(new RegExp('\\' + path.sep, 'g'), '/').replace(/\./g, '\\.');
                    var hashedPath = hashedPath.replace(new RegExp('\\' + path.sep, 'g'), '/');
                    contents=contents.replace(
                    new RegExp(origPath, 'g'),
                    hashedPath);
                });
                if(file.jspostfix){
                    contents = contents.replace(delMatchJs,'$1$2');
                }
                file.contents = new Buffer(contents);
                file.needRepleace = false;
            }
            self.push(file);
        });
        cb();
    });
};