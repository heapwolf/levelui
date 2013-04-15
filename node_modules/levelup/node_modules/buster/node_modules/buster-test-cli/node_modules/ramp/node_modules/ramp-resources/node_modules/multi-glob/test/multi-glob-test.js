var buster = require("buster");
var async = require("async");
var _ = require("lodash");
var glob = {};
var vm = require("vm");
var fs = require("fs");

var sandbox = {
    buster: buster,
    require: function (name) {
        if (name === "async") { return async; }
        if (name === "lodash") { return _; }
        return function () {
            return glob.glob.apply(glob, arguments);
        };
    },
    module: {}
};

var lib = require("path").join(__dirname, "../lib/multi-glob.js");
var code = fs.readFileSync(lib, "utf-8");
vm.runInNewContext(code, sandbox);
var g = sandbox.module.exports;

buster.testCase("Multi-glob", {
    setUp: function () {
        glob.glob = this.stub();
    },

    "calls glob with pattern": function () {
        g.glob("lib/buster.js");

        assert.calledOnceWith(glob.glob, "lib/buster.js");
    },

    "calls glob with provided options": function () {
        var args = { silent: true };
        g.glob("lib/buster.js", args);

        assert.calledOnceWith(glob.glob, "lib/buster.js", args);
    },

    "calls glob with empty options when none are provided": function () {
        g.glob("lib/buster.js");

        assert.equals(glob.glob.args[0].length, 3);
        assert.isFunction(glob.glob.args[0][2]);
    },

    "calls glob once with each pattern": function () {
        g.glob(["lib/buster.js", "src/buster.js"]);

        assert.calledTwice(glob.glob);
        assert.calledWith(glob.glob, "lib/buster.js");
        assert.calledWith(glob.glob, "src/buster.js");
    },

    "calls callback with result from glob": function () {
        var callback = this.spy();
        glob.glob.yields(null, ["lib/buster.js"]);

        g.glob("lib/buster.js", callback);

        assert.calledOnceWith(callback, null, ["lib/buster.js"]);
    },

    "calls callback with combnined results from glob": function () {
        var callback = this.spy();
        glob.glob.withArgs("lib/buster.js").yields(null, ["lib/buster.js"]);
        var files = ["src/buster.js", "src/stuff.js"];
        glob.glob.withArgs("src/*.js").yields(null, files);

        g.glob(["lib/buster.js", "src/*.js"], callback);

        assert.calledWith(callback, null,
                          ["lib/buster.js", "src/buster.js", "src/stuff.js"]);
    },

    "calls callback once with glob error": function () {
        var callback = this.spy();
        glob.glob.withArgs("lib/buster.js").yields({ message: "Oh no" });
        var files = ["src/buster.js", "src/stuff.js"];
        glob.glob.withArgs("src/*.js").yields(null, files);

        g.glob(["lib/buster.js", "src/*.js"], callback);

        assert.calledWith(callback, { message: "Oh no" });
    },

    "ignore duplicated items from glob": function () {
        var callback = this.spy();
        glob.glob.withArgs("src/foo.js").yields(null, ["src/foo.js"]);
        var files = ["src/foo.js", "src/bar.js"];
        glob.glob.withArgs("src/*.js").yields(null, files);

        g.glob(["src/foo.js", "src/*.js"], callback);

        assert.calledWith(callback, null, ["src/foo.js", "src/bar.js"]);
    },

    "strict": {
        "fails on glob that matches no patterns": function () {
            var callback = this.spy();
            glob.glob.withArgs("src/foo.js").yields(null, []);

            g.glob(["src/foo.js"], { strict: true }, callback);

            assert.match(callback.args[0][0], {
                message: "'src/foo.js' matched no files"
            });
        }
    }
});
