/*
 * os-watch stubs out and simulates the behavior of fs.watch on different
 * platforms.
 *
 * Usage:
 *
 *     var os = osWatch.on(this, "windows"); // `this` is the test context
 *
 *     os.create("file")
 *     os.change("file")
 *     os.mkdir("dir")
 *     os.rmdir("dir")
 *     os.rm("file")
 *     os.rename("file", "new") // todo
 *     os.move("file", "dir") // todo
 *
 * Platforms:
 *
 *     unix
 *     windows // todo
 *     osx
 *     integration (no stubbing)
 *
 */

var fs = require("fs");
var path = require("path");
var when = require("when");

var base = path.basename;
var dir = path.dirname;

var unique = new Date().getTime();
var noop = function () {};

var is = function (file) { return function (watcher) { return file === watcher.file; }; };

var notEq = function (watcher) { return function (w) { return w !== watcher; }; };

function removeWatcher(watcher) {
    this.watchers = this.watchers.filter(notEq(watcher));
}

function watch (file, callback) {
    var watcher = {
        file: file,
        callback: callback
    };
    this.watchers.push(watcher);
    return { close: removeWatcher.bind(this, watcher) };
}

function event(file, event, info) {
    return when.all(this.watchers.filter(is(file)).map(function (watcher) {
        return watcher.callback(event, info);
    }));
}

function wait() {
    var d = when.defer();
    setTimeout(d.resolve, 300);
    return d.promise;
}

function setUp(context) {
    this.watchers = [];
    context.stub(fs, "watch", watch.bind(this));
}

var platforms = {
    "integration": {
        setUp: function () {
            this.watchers = [];
            // counting watchers is unsupported in integration tests
            // but this makes sure that the "end" test runs after all :-P
        },
        change: wait,
        create: wait,
        rm: wait,
        mkdir: wait,
        rmdir: wait
    },

    "osx": {
        setUp: setUp,

        change: function (file) {
            return event.call(this, file, "change", null);
        },

        create: function (file) {
            return event.call(this, dir(file), "rename", null);
        },

        rm: function (file) {
            return when.all([
                event.call(this, dir(file), "rename", null),
                event.call(this, file, "rename", null)
            ]);
        },

        mkdir: function (file) {
            return event.call(this, dir(file), "rename", null);
        },

        rmdir: function (file) {
            return event.call(this, dir(file), "rename", null);
        }
    },

    "unix": {
        setUp: setUp,

        change: function (file) {
            return when.all([
                event.call(this, dir(file), "change", base(file)),
                event.call(this, file, "change", base(file))
            ]);
        },

        create: function (file) {
            return when.all([
                event.call(this, dir(file), "rename", base(file)),
                event.call(this, dir(file), "change", base(file))
            ]);
        },

        rm: function (file) {
            return when.all([
                event.call(this, dir(file), "rename", base(file)),
                event.call(this, file, "change", base(file)),
                event.call(this, file, "rename", base(file)),
                event.call(this, file, "rename", base(file))
            ]);
        },

        mkdir: function (file) {
            return event.call(this, dir(file), "rename", base(file));
        },

        rmdir: function (file) {
            return when.all([
                event.call(this, dir(file), "rename", base(file)),
                event.call(this, file, "rename", base(file)),
                event.call(this, file, "rename", base(file))
            ]);
        }
    },

    "windows": {
        setUp: setUp,

        change: function (file) {
            return when.all([
                event.call(this, dir(file), "change", base(file)),
                event.call(this, file, "change", base(file)),
                event.call(this, dir(file), "change", base(file)),
                event.call(this, file, "change", base(file))
            ]);
        },

        create: function (file) {
            return when.all([
                event.call(this, dir(dir(file)), "change", base(dir(file))),
                event.call(this, dir(file), "rename", base(file)),
                event.call(this, dir(dir(file)), "change", base(dir(file))),
                event.call(this, dir(file), "change", base(file))
            ]);
        },

        rm: function (file) {
            return when.all([
                event.call(this, dir(file), "rename", null),
                event.call(this, file, "rename", base(file))
            ]);
        },

        mkdir: function (file) {
            return when.all([
                event.call(this, dir(file), "rename", base(file)),
                event.call(this, dir(dir(file)), "change", base(dir(file)))
            ]);
        },

        rmdir: function (file) {
            return when.all([
                event.call(this, dir(file), "rename", null),
                event.call(this, file, "rename", base(file)),
                event.call(this, dir(dir(file)), "change", base(dir(file)))
            ]);
        }
    }
};



module.exports = {
    on: function (context, platform) {
        var instance = Object.create(this);
        var os = Object.create(platforms[platform]);
        os.setUp(context);
        instance.os = os;
        return instance;
    },

    get watchers() { return this.os.watchers; },

    change: function (file) {
        var d = when.defer(), os = this.os;
        fs.writeFile(file, unique++, function () {
            os.change(file).then(d.resolve, d.resolve);
        });
        return d.promise;
    },

    create: function (file) {
        var d = when.defer(), os = this.os;
        fs.writeFile(file, unique++, function () {
            os.create(file).then(d.resolve, d.resolve);
        });
        return d.promise;
    },

    rm: function (file) {
        var d = when.defer(), os = this.os;
        fs.unlink(file, function () {
            os.rm(file).then(d.resolve, d.resolve);
        });
        return d.promise;
    },

    mkdir: function (file) {
        var d = when.defer(), os = this.os;
        fs.mkdir(file, function () {
            os.mkdir(file).then(d.resolve, d.resolve);
        });
        return d.promise;
    },

    rmdir: function (file) {
        var d = when.defer(), os = this.os;
        fs.rmdir(file, function () {
            os.rmdir(file).then(d.resolve, d.resolve);
        });
        return d.promise;
    }
};
