var treeWatcher = require("./tree-watcher");

function t() { return true; };
function f() { return false; };

var defaultEvent = {
    isMkdir: f,
    isDelete: f,
    isModify: f
};

function watchTree(dir, options, callback) {
    if (arguments.length == 2 && typeof options == "function") {
        callback = options;
        options = {};
    }
    options = options || {};

    var watcher = treeWatcher.create(dir, options.exclude || []);

    var eventHandler = function (type) {
        return function (file) {
            var e = Object.create(defaultEvent);
            e.isDirectory = file.isDirectory() ? t : f;
            e.name = file.name;
            e[type] = t;
            callback(e);
        };
    };

    watcher.on("dir:create", eventHandler("isMkdir"));
    watcher.on("dir:delete", eventHandler("isDelete"));
    watcher.on("file:delete", eventHandler("isDelete"));
    watcher.on("file:change", eventHandler("isModify"));
    watcher.on("file:create", eventHandler("isModify"));

    watcher.init();

    return {
        end: function () { watcher.end(); }
    };
}

module.exports = {
    watchTree: watchTree
};