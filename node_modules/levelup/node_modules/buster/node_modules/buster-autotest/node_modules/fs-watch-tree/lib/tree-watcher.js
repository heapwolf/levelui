/*
 * - watches all files in a directory for events
 *
 * Usage:
 *
 *     var watcher = treeWatcher.create(dir, ignoredPatterns);
 *
 *     watcher.on("file:change", handler);
 *     watcher.on("file:delete", handler);
 *     watcher.on("file:create", handler);
 *     watcher.on("dir:change", handler);
 *     watcher.on("dir:delete", handler);
 *     watcher.on("dir:create", handler);
 *
 *     watcher.init();
 *
 * dir is the path to the directory
 * ignoredPatterns is an array of strings/regexes to ignore
 *
 * init() returns a promise for when all the watchers are ready
 *
 * You can also stop the watching with:
 *
 *     watcher.end();
 *
 */

var fs = require("fs");
var when = require("when");
var EventEmitter = require("events").EventEmitter;
var changeTracker = require("./change-tracker");

function notDirectory(file) {
    return !file.isDirectory();
}

function throttle(fn, threshold) {
    var last = 0;
    return function () {
        var now = new Date().getTime();
        if (now - last >= threshold) {
            last = now;
            return fn.apply(this, arguments);
        }
    };
}

function partial(fn, arg) {
    return fn.bind(null, arg); // yes, it's dumbed down
}

function create(root, excludes) {
    var emitter = new EventEmitter();
    var watcher = require("./fs-watcher").create();
    var fsFiltered = require("./fs-filtered").create(excludes);

    function emit(event, file) {
        var type = file.isDirectory() ? "dir" : "file";
        emitter.emit(type + ":" + event, file);
    }

    var emitCreate = partial(emit, "create");
    var emitDelete = partial(emit, "delete");

    function watchDir(dir) {
        var d = when.defer();
        var statFiles = fsFiltered.statFiles.bind(fsFiltered, dir.name);

        statFiles(function (err, files) {
            if (err) { return d.reject(err); }

            var tracker = changeTracker.create(statFiles, files);

            tracker.on("create", watch);
            tracker.on("delete", unwatch);

            tracker.on("create", emitCreate);
            tracker.on("delete", emitDelete);

            watcher.watch(dir, function () { return tracker.poll(); });

            when.all(files.map(watch)).then(d.resolve);
        });

        return d.promise;
    }

    function emitChange(file, event) {
        if (event === "change") {
            emitter.emit("file:change", file);
        };
    }

    // throttle file:change since Windows fires a couple events per actual
    // change. 10 ms seems enough to catch the duplicates
    function watchFile(file) {
        watcher.watch(file, throttle(partial(emitChange, file), 10));
        return when(true);
    }

    function watch(file) {
        if (file.isDirectory()) {
            return watchDir(file);
        } else {
            return watchFile(file);
        }
    }

    function unwatch(file) {
        if (file.isDirectory()) {
            watcher.unwatchDir(file);
        } else {
            watcher.unwatch(file);
        }
    }

    function init() {
        var d = when.defer();

        fsFiltered.statFile(root, function (err, file) {
            if (err) { return d.reject(err); }

            watchDir(file).then(d.resolve);
        });

        return d.promise;
    }

    function end() {
        watcher.end();
    }

    emitter.init = init;
    emitter.end = end;

    return emitter;
}

module.exports = { create: create };
