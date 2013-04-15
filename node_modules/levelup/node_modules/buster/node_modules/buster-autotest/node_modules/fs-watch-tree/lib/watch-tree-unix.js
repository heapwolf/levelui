var path = require("path");
var fs = require("fs");
var wt = require("./walk-tree");

function createEvent(dirs, event, dir, fileName) {
    var fullPath = path.join(dir, fileName);
    var exists = dirs.some(function (d) { return d === fullPath; });
    var statObj;

    function stat() {
        if (statObj) { return statObj; }
        if (!fullPath) {
            statObj = { isDirectory: function () { return false; } };
        } else {
            try {
                statObj = fs.statSync(fullPath);
            } catch (e) {
                statObj = {
                    isDirectory: function () { return false; },
                    deleted: true
                };
            }
        }
        return statObj;
    }

    return {
        name: fullPath,

        isDirectory: function () {
            return stat().isDirectory();
        },

        isMkdir: function () {
            return this.isDirectory() && !exists;
        },

        isDelete: function () {
            return !!stat().deleted;
        },

        isModify: function () {
            return !this.isDelete() && !this.isMkdir();
        }
    };
}

function watch(state, dir, options, callback) {
    return fs.watch(dir, function (event, fileName) {
        var e = createEvent(state.dirs, event, dir, fileName);

        if (e.isDirectory() && e.isMkdir()) {
            addWatch(state, e.name, options, callback);
        }

        if (!wt.isExcluded(e.name, options.exclude) &&
            typeof callback == "function") {
            callback(e);
        }
    });
}

function addWatch(state, dir, options, callback) {
    state.dirs = state.dirs || [];
    state.dirs.push(dir);
    state.watches = state.watches || [];
    state.watches.push(watch(state, dir, options, callback));
}

function watchTree(dir, options, callback) {
    if (arguments.length == 2 && typeof options == "function") {
        callback = options;
        options = {};
    }

    var state = {};
    options = options || {};
    options.exclude = wt.excludeRegExes(options.exclude);

    addWatch(state, dir, options, callback);
    wt.walkTree(dir, options, function (err, dir) {
        if (err) return;
        addWatch(state, dir, options, callback);
    });

    return {
        end: function () {
            state.watches.forEach(function (w) { w.close(); });
        }
    };
}

module.exports = {
    watchTree: watchTree
};
