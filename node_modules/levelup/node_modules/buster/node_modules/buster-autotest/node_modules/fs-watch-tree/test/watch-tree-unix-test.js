var buster = require("buster");
var watchTree = require("../lib/watch-tree-unix").watchTree;
var walkTree = require("../lib/walk-tree");
var helper = require("./helper");
var path = require("path");
var fs = require("fs");
var rmrf = require("rimraf");

function p(filePath) {
    return path.resolve(helper.ROOT, filePath);
}

function assertWatched(spy, path) {
    for (var i = 0, l = spy.callCount; i < l; ++i) {
        if (spy.getCall(i).args[0] == path) {
            buster.assertions.emit("pass");
            return true;
        }
    }

    var e = new Error("Expected " + path + " to be watched, but wasn't\n" +
                      spy.printf("%C"));
    e.name = "AssertionError";
    buster.assertions.emit("failure", e);
}

function watchTest(options) {
    return function (done) {
        var self = this;

        this.onWatch = function () {
            if (fs.watch.callCount == this.expectedCount) {
                setTimeout(function () {
                    options.assert.call(self);
                    done();
                }, 10);
            }
        };

        options.act.call(this);
    };
}

function eventTest(options) {
    return watchTest({
        act: function () {
            this.callback = this.spy();

            if (options.act) {
                options.act.call(this);
            } else {
                watchTree(helper.ROOT, this.callback);
            }
        },

        assert: function () {
            var ev = options && options.event || {};
            fs.watch.args[0][1](ev.type, ev.file);
            options.assert.call(this);
        }
    });
}

buster.testCase("watch-tree-unix", {
    setUp: function () {
        fs.mkdirSync(helper.ROOT, "0755");

        helper.mktreeSync({
            "a-dir": { a1: {}, a2: { a21: {}, a22: {}, a23: "" } },
            "b-dir": { b1: "", b2: "", b3: {}, b4: { b41: { b411: {} } } }
        });

        var self = this;
        this.onWatch = function () {};
        this.expectedCount = 11;
        this.watcher = buster.eventEmitter.create();
        this.watcher.close = this.stub();
        this.stub(fs, "watch", function () {
            self.onWatch.apply(self, arguments);
            return self.watcher;
        });
    },

    tearDown: function (done) {
        rmrf(helper.ROOT, done);
    },

    "walks tree": function () {
        this.stub(walkTree, "walkTree");

        watchTree("/home/christian");

        assert.calledOnce(walkTree.walkTree);
        assert.calledWith(walkTree.walkTree, "/home/christian");
    },

    "watches each directory": watchTest({
        act: function () {
            watchTree(helper.ROOT);
        },

        assert: function () {
            assert.equals(fs.watch.callCount, 11);
            assertWatched(fs.watch, helper.ROOT);
            assertWatched(fs.watch, p("a-dir"));
            assertWatched(fs.watch, p("a-dir/a1"));
            assertWatched(fs.watch, p("a-dir/a2"));
            assertWatched(fs.watch, p("a-dir/a2/a21"));
            assertWatched(fs.watch, p("a-dir/a2/a22"));
            assertWatched(fs.watch, p("b-dir"));
            assertWatched(fs.watch, p("b-dir/b3"));
            assertWatched(fs.watch, p("b-dir/b4"));
            assertWatched(fs.watch, p("b-dir/b4/b41"));
            assertWatched(fs.watch, p("b-dir/b4/b41/b411"));
        }
    }),

    "returns endable object": watchTest({
        act: function () {
            this.watch = watchTree(helper.ROOT);
        },

        assert: function () {
            this.watch.end();
            assert.equals(this.watcher.close.callCount, 11);
        }
    }),

    "should not watch excluded directory": watchTest({
        act: function () {
            this.expectedCount = 6;
            watchTree(helper.ROOT, { exclude: ["b-dir"] });
        },

        assert: function () {
            assert.equals(fs.watch.callCount, 6);
            assertWatched(fs.watch, helper.ROOT);
            assertWatched(fs.watch, p("a-dir"));
            assertWatched(fs.watch, p("a-dir/a1"));
            assertWatched(fs.watch, p("a-dir/a2"));
            assertWatched(fs.watch, p("a-dir/a2/a21"));
            assertWatched(fs.watch, p("a-dir/a2/a22"));
        }
    }),

    "should not exclude directories without options": watchTest({
        act: function () {
            watchTree(helper.ROOT, function () {});
        },

        assert: function () {
            assert.equals(fs.watch.callCount, 11);
        }
    }),

    "calls callback with event": eventTest({
        event: { type: "change", file: "buster.js" },

        assert: function () {
            assert.calledOnce(this.callback);
            var event = this.callback.args[0][0];
            assert.match(event, { name: path.join(helper.ROOT, "buster.js") });
            assert(!event.isMkdir());
            refute(event.isDirectory());
        }
    }),

    "calls callback with directory event": eventTest({
        event: { type: "change", file: "a-dir" },

        assert: function () {
            var event = this.callback.args[0][0];
            assert(event.isDirectory());
        }
    }),

    "calls callback with mkdir event": eventTest({
        event: { type: "change", file: "c" },

        act: function () {
            watchTree(helper.ROOT, this.callback);
            helper.mktreeSync({ c: {} });
        },

        assert: function () {
            assert(this.callback.args[0][0].isMkdir());
        }
    }),

    "should not call callback with excluded file": eventTest({
        act: function () {
            watchTree(helper.ROOT, { exclude: ["#"] }, this.callback);
        },

        event: { type: "change", file: ".#buster.js" },

        assert: function () {
            refute.called(this.callback);
        }
    }),

    "automatically watches new diretories": watchTest({
        act: function () {
            watchTree(helper.ROOT);
        },

        assert: function () {
            var callCount = fs.watch.callCount;
            helper.mktreeSync({ newone: {} });
            fs.watch.args[0][1]("change", "newone");

            assert.equals(fs.watch.callCount, callCount + 1);
            assertWatched(fs.watch, path.join(fs.watch.args[0][0], "newone"));
        }
    })
});
