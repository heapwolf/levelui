var B = require("buster-core");
var Path = require("path");
var fs = require("fs");
var A = require("async");
var glob = require("glob");

function isExistingFile(file) {
    try {
        var stat = fs.statSync(file);
        return stat.isFile();
    } catch (e) {}
}

function tryFileNames(baseDir, files) {
    var i, l;
    for (i = 0, l = files.length; i < l; ++i) {
        var file = Path.join(baseDir, files[i]);
        if (isExistingFile(file)) { return file; }
    }
}

function inflate(config, file) {
    try {
        config.loadFile(file);
        config.source = file;
        return config;
    } catch (e) {
        e.message = "Error loading configuration " + file + "\n" + e.message;
        throw e;
    }
}

function requireAndInflateFiles(config, file, next) {
    this.resolveFiles(file, function (err, files) {
        if (err) { return next(err); }
        try {
            files.forEach(function (f) { inflate(config, f); });
            next(null, config);
        } catch (e) {
            return next(e);
        }
    });
}

module.exports = {
    create: function (config, baseName, defaultLocations) {
        return B.extend(B.create(this), {
            config: config,
            baseName: baseName,
            defaultLocations: defaultLocations || ["./", "./test/", "./spec/"]
        });
    },

    defaultFileNames: function () {
        var fileName = this.baseName + ".js";
        return this.defaultLocations.map(function (file) {
            return Path.join(file, fileName);
        });
    },

    findDefaultFiles: function (baseDir, callback) {
        var file, lastBaseDir;
        do {
            file = tryFileNames(baseDir, this.defaultFileNames());
            lastBaseDir = baseDir;
            baseDir = Path.dirname(baseDir);
        } while (!file && baseDir !== lastBaseDir);
        callback(null, isExistingFile(file) ? [file] : []);
    },

    findValidFiles: function (baseDir, file, callback) {
        if (!file) { return this.findDefaultFiles(baseDir, callback); }
        glob(file, { cwd: baseDir }, function (err, files) {
            callback(err, files && files.filter(function (f) {
                return isExistingFile(f);
            }));
        });
    },

    resolveFiles: function (fileName, callback) {
        this.findValidFiles(process.cwd(), fileName, function (err, files) {
            if (files.length === 0 && fileName) {
                return callback(new Error(fileName +
                                          " did not match any files"));
            }
            if (files.length === 0) {
                return callback(new Error("No file provided, and none of\n[" +
                                          this.defaultFileNames().join(", ") +
                                          "] exist"));
            }
            callback(null, files);
        }.bind(this));
    },

    load: function (fileNames, callback) {
        var reducer = requireAndInflateFiles.bind(this);
        if (typeof fileNames === "string") { fileNames = fileNames.split(","); }
        A.reduce(fileNames, this.config, reducer, callback);
    }
};
