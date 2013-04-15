/*
 * - keeps track of watched files
 * - simplifies closing all watchers
 * - simplifies closing some watchers, like all those under a directory
 */

var fs = require("fs");

var isWindows = process.platform === 'win32'; // the path library does not
var fileSeparator = isWindows ? "\\" : "/";   // expose the fileSeparator :-o

function close(o) { o.closer.close(); }

function forEachWatcher(fn) {
    for (var key in this.watchers) {
        if (this.watchers.hasOwnProperty(key)) {
            fn(this.watchers[key]);
        }
    }
}

function isInDir(file, dir) {
    var dirPath = dir.name + this.fileSeparator;
    return file.name.substring(0, dirPath.length) === dirPath;
}

module.exports = {
    create: function () {
        var instance = Object.create(this);
        instance.watchers = {};
        instance.fileSeparator = fileSeparator;
        return instance;
    },

    watch: function (file, callback) {
        if (this.watchers[file.name]) {
            throw new Error("Already watching " + file.name);
        }

        var closer = fs.watch(file.name, function (event) {
            return callback(event, file);
        });

        this.watchers[file.name] = {
            file: file,
            closer: closer
        };
    },

    unwatch: function (file) {
        close(this.watchers[file.name]);
        delete this.watchers[file.name];
    },

    unwatchDir: function (dir) {
        this.unwatch(dir);
        forEachWatcher.call(this, function (watcher) {
            var file = watcher.file;
            if (isInDir.call(this, file, dir)) { this.unwatch(file); }
        }.bind(this));
    },

    end: function () {
        forEachWatcher.call(this, close);
    }
};