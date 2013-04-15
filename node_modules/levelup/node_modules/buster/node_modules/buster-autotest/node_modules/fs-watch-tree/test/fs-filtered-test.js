var buster = require("buster");
var fs = require("fs");

var fsFiltered = require("../lib/fs-filtered");

var p = require("path").join;

buster.testCase('fs-filtered', {
    setUp: function () {
        this.stub(fs, "readdir").yields(null, ["file1", "file2", ".#meh"]);
        this.stub(fs, "stat");
        fs.stat.withArgs(p("tmp", "file1")).yields(null, { stats: "yo" });
        fs.stat.withArgs(p("tmp", "file2")).yields(null, { stats: "ho" });
        fs.stat.withArgs(p("tmp", ".#meh")).yields(null, { stats: "no" });
    },

    "stats all files in a directory": function () {
        var callback = this.spy();
        fsFiltered.statFiles("tmp", callback);

        assert.calledWith(fs.readdir, "tmp");
        assert.calledOnceWith(callback, null, [
            { name: p("tmp", "file1"), stats: "yo" },
            { name: p("tmp", "file2"), stats: "ho" },
            { name: p("tmp", ".#meh"), stats: "no" }
        ]);
    },

    "filters out unwanted files": function () {
        var callback = this.spy();
        fsFiltered.create(["#"]).statFiles("tmp", callback);

        assert.calledWith(fs.readdir, "tmp");
        assert.calledOnceWith(callback, null, [
            { name: p("tmp", "file1"), stats: "yo" },
            { name: p("tmp", "file2"), stats: "ho" }
        ]);
    }
});
