/* fs-filtered finds files in a dir, stats them all, and adds full path names.
 * It takes a set of exclusions that it uses to filter out files and dirs.
 *
 * Usage no filters:
 *
 *     fsFiltered.statFiles(dir, function (files) {});
 *
 * With filters:
 *
 *     var f = fsFiltered.create(["node_modules", "vendor"]);
 *     f.statFiles(dir, function (files) {});
 *
 */

var fs = require("fs");
var path = require("path");
var async = require("./async");

function statFile(file, callback) {
    fs.stat(file, function (err, stats) {
        if (err) return callback(err);
        stats.name = file;
        callback(null, stats);
    });
}

function fullPath(dir) {
    return function (file) { return path.join(dir, file); };
}

function exclude(patterns) {
    return function (path) {
        return patterns.every(function (pattern) { return !path.match(pattern); });
    };
}

function statFiles(dir, callback) {
    var excludes = this.excludes || [];

    fs.readdir(dir, function (err, items) {
        if (err) return callback(err);

        items = items.map(fullPath(dir)).filter(exclude(excludes));
        async.map(statFile, items, callback);
    });
}

function create(excludes) {
    return Object.create(this, {
        excludes: { value: excludes }
    });
}

module.exports.statFile = statFile;
module.exports.statFiles = statFiles;
module.exports.create = create;
