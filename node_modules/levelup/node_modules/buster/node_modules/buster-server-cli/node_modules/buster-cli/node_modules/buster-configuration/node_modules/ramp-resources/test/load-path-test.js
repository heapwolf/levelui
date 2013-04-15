var buster = require("buster");
var resourceSet = require("../lib/resource-set");
require("./test-helper.js");

buster.testCase("Load path", {
    setUp: function () {
        this.rs = resourceSet.create();
    },

    "append": {
        "fails if resource does not exist": function () {
            assert.exception(function () {
                this.rs.loadPath.append("/foo.js");
            }.bind(this));
        },

        "adds existing resource to path": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.loadPath.append("/foo.js");

            assert.equals(this.rs.loadPath.paths(), ["/foo.js"]);
        },

        "adds multiple existing resources to path": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.loadPath.append(["/foo.js", "/bar.js"]);

            assert.equals(this.rs.loadPath.paths(), ["/foo.js", "/bar.js"]);
        },

        "adds resources in order": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.loadPath.append("/foo.js");
            this.rs.loadPath.append("/bar.js");

            assert.equals(this.rs.loadPath.paths(), ["/foo.js", "/bar.js"]);
        },

        "skips existing paths": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.addResource({ path: "/baz.js", content: "Ok" });
            this.rs.loadPath.append("/foo.js");
            this.rs.loadPath.append(["/bar.js", "/foo.js"]);

            assert.equals(this.rs.loadPath.paths(), ["/foo.js", "/bar.js"]);
        }
    },

    "prepend": {
        "fails if resource does not exist": function () {
            assert.exception(function () {
                this.rs.loadPath.prepend("/foo.js");
            }.bind(this));
        },

        "adds existing resource to path": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.loadPath.prepend("/foo.js");

            assert.equals(this.rs.loadPath.paths(), ["/foo.js"]);
        },

        "adds multiple existing resources to path": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.loadPath.prepend(["/foo.js", "/bar.js"]);

            assert.equals(this.rs.loadPath.paths(), ["/foo.js", "/bar.js"]);
        },

        "prepends multiple resources in order": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.addResource({ path: "/baz.js", content: "Ok" });
            this.rs.loadPath.append("/baz.js");
            this.rs.loadPath.prepend(["/foo.js", "/bar.js"]);

            assert.equals(this.rs.loadPath.paths(),
                          ["/foo.js", "/bar.js", "/baz.js"]);
        },

        "adds resources in reverse order": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.loadPath.prepend("/foo.js");
            this.rs.loadPath.prepend("/bar.js");

            assert.equals(this.rs.loadPath.paths(), ["/bar.js", "/foo.js"]);
        },

        "skips existing paths": function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.addResource({ path: "/baz.js", content: "Ok" });
            this.rs.loadPath.prepend("/foo.js");
            this.rs.loadPath.prepend(["/bar.js", "/foo.js"]);

            assert.equals(this.rs.loadPath.paths(), ["/bar.js", "/foo.js"]);
        }
    },

    "remove": {
        setUp: function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.addResource({ path: "/foobar.js", content: "Ok!!" });
            this.rs.loadPath.append(["/foo.js", "/bar.js", "/foobar.js"]);
        },

        "removes resource from load path": function () {
            this.rs.loadPath.remove("/bar.js");

            assert.equals(this.rs.loadPath.paths(), ["/foo.js", "/foobar.js"]);
        },

        "removes first resource from load path": function () {
            this.rs.loadPath.remove("/foo.js");

            assert.equals(this.rs.loadPath.paths(), ["/bar.js", "/foobar.js"]);
        },

        "removes last resource from load path": function () {
            this.rs.loadPath.remove("/foobar.js");

            assert.equals(this.rs.loadPath.paths(), ["/foo.js", "/bar.js"]);
        }
    },

    "clear": {
        setUp: function () {
            this.rs.addResource({ path: "/foo.js", content: "Ok" });
            this.rs.addResource({ path: "/bar.js", content: "Ok" });
            this.rs.addResource({ path: "/foobar.js", content: "Ok!!" });
            this.rs.loadPath.append(["/foo.js", "/bar.js", "/foobar.js"]);
        },

        "removes everything from load path": function () {
            this.rs.loadPath.clear();

            assert.equals(this.rs.loadPath.paths(), []);
        }
    },

    "paths": {
        "returns copy": function () {
            var paths = this.rs.loadPath.paths();
            paths.push(42);

            refute.equals(this.rs.loadPath.paths(), paths);
        }
    }
});
