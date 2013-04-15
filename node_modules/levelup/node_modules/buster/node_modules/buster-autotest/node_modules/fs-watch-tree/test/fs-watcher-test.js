var buster = require("buster");
var fs = require("fs");

var fsWatcher = require("../lib/fs-watcher");

buster.testCase('fs-watcher', {
    setUp: function () {
        this.closer = { close: this.spy() };
        this.stub(fs, "watch").returns(this.closer);
        this.watcher = fsWatcher.create();
    },

    "watches files": function () {
        this.watcher.watch({ name: "file.txt" }, this.spy());
        assert.calledOnceWith(fs.watch, "file.txt");
    },

    "calls back when file changes": function () {
        var spy = this.spy();
        var file = { name: "file.txt" };
        this.watcher.watch(file, spy);

        fs.watch.yield("change");

        assert.calledOnceWith(spy, "change", file);
    },

    "unwatches files": function () {
        this.watcher.watch({ name: "file.txt" }, this.spy());
        this.watcher.unwatch({ name: "file.txt" });

        assert.calledOnce(this.closer.close);
    },

    "unwatches directories": function () {
        this.watcher.fileSeparator = "/";

        this.watcher.watch({ name: "files" }, this.spy());
        this.watcher.watch({ name: "files/file1.txt" }, this.spy());
        this.watcher.watch({ name: "files/file2.txt" }, this.spy());
        this.watcher.watch({ name: "filesystem.txt" }, this.spy());
        this.watcher.watch({ name: "notes/file1.txt" }, this.spy());

        this.watcher.unwatchDir({ name: "files" });

        assert.calledThrice(this.closer.close);
    },

    "closes watches": function () {
        this.watcher.watch({ name: "file1.txt" }, this.spy());
        this.watcher.watch({ name: "file2.txt" }, this.spy());
        this.watcher.end();

        assert.calledTwice(this.closer.close);
    }
});
