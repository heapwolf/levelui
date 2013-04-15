var buster = require("buster");
var busterConfiguration = require("../lib/buster-configuration");

buster.testCase("buster-configuration", {
    setUp: function () {
        this.c = busterConfiguration.create();
        this.rootPath = __dirname;
    },

    "addGroup": {
        "adds group": function () {
            this.c.addGroup("My group", {}, this.rootPath);

            assert.equals(this.c.groups.length, 1);
            var group = this.c.groups[0];
            assert.equals(group.name, "My group");
        },

        "creates extended group": function (done) {
            this.c.addGroup("My group 1", {
                sources: ["fixtures/foo.js"]
            }, __dirname);

            var group = this.c.addGroup("My group 2", {
                "extends": "My group 1",
                "autoRun": true
            });

            group.resolve().then(done(function (err) {
                assert.equals(group.resourceSet.loadPath.paths(),
                              ["/fixtures/foo.js"]);
                assert(group.options.autoRun);
            }.bind(this)));
        }
    },

    "loadFile": {
        "loads groups from config file": function () {
            this.c.loadFile(__dirname + "/../buster");
            assert.equals(this.c.groups.length, 1);
        },

        "uses explicit file name": function () {
            this.c.loadFile(__dirname + "/fixtures/dups/file.js");
            assert.equals(this.c.groups.length, 1);
        },

        "sets source on groups": function () {
            process.chdir(__dirname);
            this.c.loadFile("fixtures/dups/file.js");
            assert.equals(this.c.groups[0].source, "fixtures/dups/file.js");
        },

        "sets sources on configuration": function () {
            this.c.loadFile("fixtures/dups/file.js");
            assert.equals(this.c.sources, ["fixtures/dups/file.js"]);
        },

        "handles non-existing file": function () {
            this.c.loadFile(__dirname + "/does-not-exist");
            assert.equals(this.c.groups.length, 0);
        }
    },

    "filterEnv": {
        setUp: function () {
            this.node = { environment: "node" };
            this.browser = { environment: "browser" };
        },

        "filters groups on environment": function () {
            this.c.addGroup("My group 1", this.node, this.rootPath);
            this.c.addGroup("My group 2", this.node, this.rootPath);
            this.c.addGroup("My group 3", this.browser, this.rootPath);

            this.c.filterEnv("node");

            assert.equals(this.c.groups.length, 2);
        },

        "ignores non-string environment filters": function () {
            this.c.addGroup("My group 1", this.node, this.rootPath);
            this.c.addGroup("My group 2", this.browser, this.rootPath);

            this.c.filterEnv(null).filterEnv({}).filterEnv(1234).filterEnv([]);

            assert.equals(this.c.groups.length, 2);
        }
    },

    "filterGroup": {
        "filters groups on name": function () {
            this.c.addGroup("The test", {}, this.rootPath);
            this.c.addGroup("test the foo", {}, this.rootPath);
            this.c.addGroup("foo the bar", {}, this.rootPath);

            this.c.filterGroup(/test/);

            assert.equals(this.c.groups.length, 2);
            assert.match(this.c.groups, [{
                name: "The test"
            }, {name: "test the foo"}]);
        }
    },

    "load events": {
        "delegates to groups": function () {
            this.c.groups = [buster.eventEmitter.create(),
                             buster.eventEmitter.create()];

            var listener = this.spy();
            this.c.on("load:sources", listener);
            this.c.groups[0].emit("load:sources", 42);
            this.c.groups[1].emit("load:sources", 43);

            assert.calledWith(listener, 42);
            assert.calledWith(listener, 43);
        },

        "delegates to groups added after listen": function () {
            var listener = this.spy();
            this.c.on("load:sources", listener);

            this.c.addGroup("Some group", {});
            this.c.groups[0].emit("load:sources", 42);

            assert.calledOnceWith(listener, 42);
        }
    },

    "framework events": {
        "delegates to groups": function () {
            this.c.groups = [buster.eventEmitter.create(),
                             buster.eventEmitter.create()];

            var listener = this.spy();
            this.c.on("load:resources", listener);
            this.c.groups[0].emit("load:resources", 42);
            this.c.groups[1].emit("load:resources", 43);

            assert.calledWith(listener, 42);
            assert.calledWith(listener, 43);
        },

        "delegates to groups added after listen": function () {
            var listener = this.spy();
            this.c.on("load:resources", listener);

            this.c.addGroup("Some group", {});
            this.c.groups[0].emit("load:resources", 42);

            assert.calledOnceWith(listener, 42);
        }
    }
});
