var fs = require("fs");
var path = require("path");

function isExcluded(file, excludes) {
    for (var i = 0, l = excludes.length; i < l; ++i) {
        if (excludes[i].test(file)) {
            return true;
        }
    }

    return false;
}

function excludeRegExes(excludes) {
    if (!excludes) return [];

    return excludes.map(function (exclude) {
        if (typeof exclude == "string") {
            return new RegExp(exclude);
        } else {
            return exclude;
        }
    });
}

function fileProcessor(directory, excludes, callback) {
    return function (item) {
        var file = path.join(directory, item);

        fs.stat(file, function (err, stat) {
            if (err) return callback(err);
            if (!stat.isDirectory() || isExcluded(file, excludes)) return;
            callback(null, file);
            walkTreeWithExcludes(file, excludes, callback);
        });
    };
}

function walkTreeWithExcludes(directory, excludes, callback) {
    fs.readdir(directory, function (err, items) {
        if (err) return callback(err);
        items.forEach(fileProcessor(directory, excludes, callback));
    });
}

module.exports = {
    walkTree: function walkTree(directory, options, callback) {
        if (arguments.length == 2 && typeof options == "function") {
            callback = options;
            options = null;
        }

        var excludes = excludeRegExes(options && options.exclude);
        walkTreeWithExcludes(directory, excludes, callback);
    }
};

module.exports.excludeRegExes = excludeRegExes;
module.exports.isExcluded = isExcluded;
