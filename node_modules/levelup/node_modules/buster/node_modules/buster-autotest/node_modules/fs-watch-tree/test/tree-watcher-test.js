var buster = require("buster");
var fs = require("fs");
var rmrf = require("rimraf");
var path = require("path");

var helper = require("./helper");
var osWatch = require("./os-watch-helper");

var treeWatcher = require("../lib/tree-watcher");

function p() {
    var names = [helper.ROOT].concat([].slice.call(arguments));
    return path.join.apply(path, names);
}

function eventTest(options) {
    return function (done) {
        var spy = this.spy();
        this.watcher.on(options.event, spy);

        options.action.call(this).then(done(function () {
            assert.calledOnce(spy);
        }));
    };
}

function createTree(callback) {
    fs.mkdir(helper.ROOT, "0755", function () {
        helper.mktree({
            subdir: { "nested.txt": "", "ignored.txt": "" },
            deleteme: {},
            ignored: {},
            "exists.txt": ""
        }).then(callback);
    });
}

function testPlatform(platform) {
    buster.testCase('tree-watcher-' + platform, {
        setUp: function (done) {
            this.timeout = 1000;
            createTree(function () {
                this.os = osWatch.on(this, platform);
                this.watcher = treeWatcher.create(helper.ROOT, ["ignored"]);
                this.watcher.init().then(done);
            }.bind(this));
        },

        tearDown: function (done) {
            rmrf(helper.ROOT, done);
        },

        "end closes all the watches": function () {
            this.watcher.end();
            assert.equals(this.os.watchers.length, 0);
        },

        "emits 'file:change'": eventTest({
            event: "file:change",
            action: function () {
                return this.os.change(p("exists.txt"));
            }
        }),

        "emits 'file:change' for nested files": eventTest({
            event: "file:change",
            action: function () {
                return this.os.change(p("subdir", "nested.txt"));
            }
        }),

        "emits 'file:create'": eventTest({
            event: "file:create",
            action: function () {
                return this.os.create(p("spanking-new.txt"));
            }
        }),

        "emits 'file:delete'": eventTest({
            event: "file:delete",
            action: function () {
                return this.os.rm(p("exists.txt"));
            }
        }),

        "emits 'dir:create'": eventTest({
            event: "dir:create",
            action: function () {
                return this.os.mkdir(p("newone"));
            }
        }),

        "emits 'dir:delete'": eventTest({
            event: "dir:delete",
            action: function () {
                return this.os.rmdir(p("deleteme"));
            }
        }),

        "ignores files": function (done) {
            var spy = this.spy();
            this.watcher.on("file:change", spy);

            this.os.change(p("subdir", "ignored.txt")).then(done(function () {
                refute.called(spy);
            }));
        },

        "ignores directories": function (done) {
            var spy = this.spy();
            this.watcher.on("file:create", spy);

            this.os.create(p("ignored", "file.txt")).then(done(function () {
                refute.called(spy);
            }));
        },

        "watches new files": function (done) {
            this.os.create(p("newfile.txt")).then(function () {
                var spy = this.spy();
                this.watcher.on("file:change", spy);
                this.os.change(p("newfile.txt")).then(done(function () {
                    assert.calledOnce(spy);
                }));
            }.bind(this));
        }
    });
}

["unix", "osx", "windows"].forEach(testPlatform);

// testPlatform("integration");
