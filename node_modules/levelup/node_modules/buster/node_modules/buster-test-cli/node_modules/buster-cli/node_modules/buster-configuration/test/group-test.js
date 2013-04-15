var buster = require("buster");
var assert = buster.assert;
var refute = buster.refute;
var bcGroup = require("../lib/group");
var fs = require("fs");
var Path = require("path");

function assertContainsResources(group, resources, done) {
    group.resolve().then(function (resourceSet) {
        resources.forEach(function (path) {
            assert.isObject(resourceSet.get(path));
        });
        done();
    });
}

function assertResource(group, path, content, done) {
    group.resolve().then(function (resourceSet) {
        var resource = resourceSet.get(path);
        assert.defined(resource);
        resource.content().then(function (actual) {
            assert.equals(actual, content);
            done();
        }, done);
    });
}

function assertLoad(group, load, done) {
    group.resolve().then(function (resourceSet) {
        assert.equals(resourceSet.loadPath.paths(), load);
        done();
    }, done(function (err) {
        buster.log(err);
        assert(false);
    }));
}

buster.testCase("configuration group", {
    "creates resources with root path": function (done) {
        var group = bcGroup.create({
            resources: ["foo.js", "bar.js"]
        }, __dirname + "/fixtures");

        assertContainsResources(group, ["/bar.js", "/foo.js"], done);
    },

    "gets file contents as actual content": function (done) {
        var group = bcGroup.create({
            resources: ["foo.js"]
        }, __dirname + "/fixtures");

        group.resolve().then(function (resourceSet) {
            resourceSet.get("/foo.js").content().then(done(function (content) {
                assert.equals(content, "var thisIsTheFoo = 5;");
            }));
        });
    },

    "resolves globs": function (done) {
        var group = bcGroup.create({
            resources: ["*.js"]
        }, __dirname + "/fixtures");

        assertContainsResources(group, ["/bar.js", "/foo.js"], done);
    },

    "adds resource as object with path": function (done) {
        var group = bcGroup.create({
            resources: [{ path: "foo.js", content: "Ok" }]
        }, __dirname + "/fixtures");

        assertContainsResources(group, ["/foo.js"], done);
    },

    "respects custom headers": function (done) {
        var group = bcGroup.create({
            resources: [{
                path: "foo.js",
                content: "Ok",
                headers: { "X-Foo": "Bar" }
            }]
        }, __dirname + "/fixtures");

        group.resolve().then(done(function (rs) {
            assert.match(rs.get("/foo.js").headers(), {"X-Foo": "Bar"});
        }));
    },

    "fails for file outside root": function (done) {
        var group = bcGroup.create({
            resources: ["../../*.js"]
        }, __dirname + "/fixtures");

        group.resolve().then(function (rs) {
            buster.log("Oops!");
        }, done(function (err) {
            assert.match(err, Path.join("..", "buster.js"));
            assert.match(err, "outside the project root");
            assert.match(err, "set rootPath to the desired root");
        }));
    },

    "adds backend resource": function (done) {
        var group = bcGroup.create({
            resources: [{ path: "foo", backend: "http://10.0.0.1/" }]
        });

        group.resolve().then(done(function (resourceSet) {
            assert.equals(resourceSet.get("/foo").backend, "http://10.0.0.1/");
        }));
    },

    "adds combined resources": function (done) {
        var group = bcGroup.create({
            resources: ["foo.js", "bar.js",
                        { path: "/bundle.js", combine: ["/foo.js", "/bar.js"] }]
        }, __dirname + "/fixtures");

        var combined = "var thisIsTheFoo = 5;var helloFromBar = 1;";
        assertResource(group, "/bundle.js", combined, done);
    },

    "adds resources with content for non-existent file": function (done) {
        var group = bcGroup.create({
            resources: [{
                path: "/does-not-exist.txt",
                content: "Hello, World"
            }]
        }, __dirname + "/fixtures");

        assertResource(group, "/does-not-exist.txt", "Hello, World", done);
    },

    "adds resources with content for file that exists": function (done) {
        var group = bcGroup.create({
            resources: [{ path: "/foo.js", content: "Hello, World" }]
        }, __dirname + "/fixtures");

        assertResource(group, "/foo.js", "Hello, World", done);
    },

    "loads resource as source": function (done) {
        var group = bcGroup.create({
            resources: ["foo.js"],
            sources: ["foo.js"]
        }, __dirname + "/fixtures");

        assertLoad(group, ["/foo.js"], done);
    },

    "adds sourcees to load and add them as file resources": function (done) {
        var group = bcGroup.create({
            sources: ["foo.js", "bar.js"]
        }, __dirname + "/fixtures");

        var next = buster.countdown(2, done);
        assertContainsResources(group, ["/foo.js", "/bar.js"], next);
        assertLoad(group, ["/foo.js", "/bar.js"], next);
    },

    "creates group without file system access": function (done) {
        var group = bcGroup.create({
            resources: [{ path: "/hey", content: "// OK" }],
            sources: ["/hey"]
        });

        assertLoad(group, ["/hey"], done);
    },

    "adds source files via glob pattern": function (done) {
        var group = bcGroup.create({
            sources: ["*.js"]
        }, __dirname + "/fixtures");

        assertContainsResources(group, ["/foo.js", "/bar.js"], done);
    },

    "libs, sources and tests in right order with globbing": function (done) {
        var group = bcGroup.create({
            libs: ["fo*.js"],
            sources: ["b*r.js"],
            tests: ["test/*.js"]
        }, __dirname + "/fixtures");

        var paths = ["/foo.js", "/bar.js", "/test/my-testish.js"];
        var callback = buster.countdown(2, done);

        assertContainsResources(group, paths, callback);
        assertLoad(group, paths, callback);
    },

    "loads tests and testHelpers in right order": function (done) {
        var group = bcGroup.create({
            testHelpers: ["test/*.js"],
            tests: ["b*r.js"]
        }, __dirname + "/fixtures");

        var paths = ["/test/my-testish.js", "/bar.js"];
        var callback = buster.countdown(2, done);

        assertContainsResources(group, paths, callback);
        assertLoad(group, paths, callback);
    },

    "loads deps, sources and specs in right order": function (done) {
        var group = bcGroup.create({
            deps: ["fo*.js"],
            src: ["b*r.js"],
            specs: ["test/*.js"]
        }, __dirname + "/fixtures");

        assertLoad(group, ["/foo.js", "/bar.js", "/test/my-testish.js"], done);
    },

    "loads libs, deps and sources in right order": function (done) {
        var group = bcGroup.create({
            deps: ["fo*.js"],
            libs: ["b*r.js"],
            sources: ["test/*.js"]
        }, __dirname + "/fixtures");

        assertLoad(group, ["/foo.js", "/bar.js", "/test/my-testish.js"], done);
    },

    "loads test libs and spec libs in right order": function (done) {
        var group = bcGroup.create({
            specHelpers: ["fo*.js"],
            testHelpers: ["b*r.js"]
        }, __dirname + "/fixtures");

        assertLoad(group, ["/foo.js", "/bar.js"], done);
    },

    "loads libs, src and sources in right order": function (done) {
        var group = bcGroup.create({
            libs: ["ba*.js"],
            src: ["f*.js"],
            sources: ["test/*.js"]
        }, __dirname + "/fixtures");

        assertLoad(group, ["/bar.js", "/foo.js", "/test/my-testish.js"], done);
    },

    "server address": {
        "is parsed": function () {
            var group = bcGroup.create({
                server: "http://localhost:1234/buster"
            }, __dirname + "/fixtures");

            assert.match(group.server, {
                hostname: "localhost",
                port: 1234,
                pathname: "/buster"
            });
        },

        "is parsed without path": function () {
            var group = bcGroup.create({
                server: "http://localhost:1234"
            }, __dirname + "/fixtures");

            assert.match(group.server, {
                hostname: "localhost",
                port: 1234,
                pathname: "/"
            });
        }
    },

    "environments": {
        "is set": function () {
            var group = bcGroup.create({ environment: "node" });
            assert.equals(group.environment, "node");
        },

        "defaults to browser": function () {
            var group = bcGroup.create({});
            assert.equals(group.environment, "browser");
        },

        "is set via env shorthand": function () {
            var group = bcGroup.create({ env: "node" });
            assert.equals(group.environment, "node");
        }
    },

    "autoRun": {
        "is set": function () {
            var group = bcGroup.create({ autoRun: true });
            assert.equals(group.options.autoRun, true);
        },

        "is not set by default": function () {
            var group = bcGroup.create({});
            refute.defined(group.options.autoRun);
        }
    },

    "supports duplicate items in sources for ordering": function (done) {
        var group = bcGroup.create({
            sources: ["foo.js", "foo.js", "*.js"]
        }, __dirname + "/fixtures");

        assertLoad(group, ["/foo.js", "/bar.js"], done);
    },

    "framework": {
        setUp: function () {
            this.group = bcGroup.create({}, __dirname + "/fixtures");
        },

        "allows extension with events": function (done) {
            this.group.on("load:framework", function (resourceSet) {
                resourceSet.addResource({
                    path: "/stuff",
                    content: "Oh yeah!"
                });
            });

            this.group.resolve().then(function (rs) {
                assert.defined(rs.get("/stuff"));
                rs.get("/stuff").content().then(done(function (content) {
                    assert.equals(content, "Oh yeah!");
                }));
            });
        }
    },

    "load:resources": {
        "fires when everything is loaded": function (done) {
            var group = bcGroup.create({
                sources: ["foo.js"]
            }, __dirname + "/fixtures");

            group.on("load:framework", function (resourceSet) {
                resourceSet.addResource({
                    path: "/stuff",
                    content: "Oh yeah!"
                });
            });

            group.on("load:resources", function (resourceSet) {
                resourceSet.addResource("bar.js");
            });

            group.resolve().then(done(function (resourceSet) {
                assert.isObject(resourceSet.get("/foo.js"));
                assert.isObject(resourceSet.get("/bar.js"));
                assert.isObject(resourceSet.get("/stuff"));
            }));
        }
    },

    "does not resolve multiple times": function (done) {
        var group = bcGroup.create({
            libs: ["foo.js"]
        }, __dirname + "/fixtures");

        group.resolve().then(function (resourceSet) {
            group.resolve().then(done(function (rs) {
                assert.same(resourceSet, rs);
            }));
        });
    },

    "resource load hooks": {
        "can override dependencies": function (done) {
            var group = bcGroup.create({
                deps: ["foo.js"]
            }, __dirname + "/fixtures");

            group.on("load:libs", function (resourceSet) {
                resourceSet.appendLoad("bar.js");
            });

            assertLoad(group, ["/foo.js", "/bar.js"], done);
        },

        "triggers with resolved glob patterns": function (done) {
            var group = bcGroup.create({
                deps: ["*.js"]
            }, __dirname + "/fixtures");

            var resources = [];
            group.on("load:libs", function (resourceSet) {
                resources.push(resourceSet[0].path);
                resources.push(resourceSet[1].path);
            });

            group.resolve().then(done(function () {
                assert.equals(resources, ["/bar.js", "/foo.js"]);
            }));
        },

        "fires dependencies only once for libs/deps": function (done) {
            var group = bcGroup.create({
                deps: ["foo.js"],
                libs: ["bar.js"]
            }, __dirname + "/fixtures");

            group.on("load:libs", function (resourceSet) {
                resourceSet.remove("/foo.js");
                resourceSet.remove("/bar.js");
            });

            group.resolve().then(done(function (resourceSet) {
                assert.equals(resourceSet.length, 0);
            }));
        },

        "fires sources once for src/sources": function (done) {
            var group = bcGroup.create({
                src: ["foo.js"],
                sources: ["bar.js"]
            }, __dirname + "/fixtures");

            group.on("load:sources", function (sources) {
                sources.remove("/foo.js");
                sources.remove("/bar.js");
            });

            group.resolve().then(done(function (resourceSet) {
                assert.equals(resourceSet.length, 0);
                assert.equals(resourceSet.loadPath.paths(), []);
            }));
        },

        "fires tests once for specs/tests": function (done) {
            var group = bcGroup.create({
                tests: ["foo.js"],
                specs: ["bar.js"]
            }, __dirname + "/fixtures");

            group.on("load:tests", function (tests) {
                tests.remove("/foo.js");
            });

            group.resolve().then(done(function (resourceSet) {
                assert.equals(resourceSet.length, 1);
            }));
        }
    },

    "extended configuration": {
        setUp: function () {
            this.group = bcGroup.create({
                libs: ["foo.js"],
                server: "localhost:9191",
                autoRun: true
            }, __dirname + "/fixtures");
        },

        "inherits libs from parent group": function (done) {
            var group = this.group.extend();

            group.resolve().then(done(function (resourceSet) {
                assert.defined(resourceSet.get("/foo.js"));
            }));
        },

        "does not modify parent group resources": function (done) {
            var group = this.group.extend({
                sources: ["bar.js"]
            }, __dirname + "/fixtures");

            this.group.resolve().then(function (rs) {
                group.resolve().then(done(function (grs) {
                    assert.defined(grs.get("/bar.js"));
                    refute.defined(rs.get("/bar.js"));
                }));
            });
        },

        "mixes load from both groups": function (done) {
            var group = this.group.extend({
                sources: ["bar.js"]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function (resourceSet) {
                assert.equals(resourceSet.loadPath.paths(),
                              ["/foo.js", "/bar.js"]);
            }));
        },

        "does not modify parent group load": function (done) {
            var group = this.group.extend({
                tests: ["bar.js"]
            }, __dirname + "/fixtures");

            this.group.resolve().then(function (resourceSet) {
                group.resolve().then(done(function () {
                    assert.equals(resourceSet.loadPath.paths(), ["/foo.js"]);
                }));
            });
        },

        "uses libs from both in correct order": function (done) {
            var group = this.group.extend({
                libs: ["bar.js"]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function (resourceSet) {
                assert.equals(resourceSet.loadPath.paths(),
                              ["/foo.js", "/bar.js"]);
            }));
        },

        "includes extensions": function (done) {
            var create = this.stub().returns({});
            var original = bcGroup.create({
                extensions: [{ create: create }]
            }, __dirname + "/fixtures");
            var group = original.extend({}, __dirname + "/fixtures");

            original.resolve();
            group.resolve().then(done(function (resourceSet) {
                assert.calledTwice(create);
            }));
        },

        "includes extensions with custom configuration": function (done) {
            var create = this.stub().returns({});
            var original = bcGroup.create({
                extensions: [{ name: "amd", create: create }],
                amd: { id: 42 }
            }, __dirname + "/fixtures");
            var group = original.extend({}, __dirname + "/fixtures");

            original.resolve();
            group.resolve().then(done(function (resourceSet) {
                assert.calledTwice(create);
                assert.equals(create.args[1][0], { id: 42 });
            }));
        },

        "inherits server setting": function () {
            var group = this.group.extend({ libs: [] });
            assert.match(group.server, { hostname: "localhost", port: 9191 });
        },

        "overrides server setting": function () {
            var group = this.group.extend({ server: "localhost:7878" });
            assert.match(group.server, { port: 7878 });
        },

        "inherits environment": function () {
            var group = this.group.extend({ libs: [] });
            assert.equals(group.environment, "browser");
        },

        "overrides environment": function () {
            var group = this.group.extend({ environment: "node", libs: [] });
            assert.equals(group.environment, "node");
        },

        "inherits autoRun option": function () {
            var group = this.group.extend({ libs: [] });
            assert(group.options.autoRun);
        },

        "overrides autoRun option": function () {
            var group = this.group.extend({ autoRun: false, libs: [] });
            refute(group.options.autoRun);
        }
    },

    "extensions": {
        setUp: function () {
            this.create = this.stub().returns({});
            this.module = { create: this.create };
        },

        "loads object extension": function (done) {
            var group = bcGroup.create({});
            group.extensions.push({});

            group.resolve().then(done(function () {
                assert.equals(group.extensions.length, 1);
            }));
        },

        "fails for string extension": function (done) {
            var group = bcGroup.create({
                extensions: ["buster-lint"]
            });

            group.resolve().then(done, done(function (err) {
                assert.match(err.message, "require(\"buster-lint\")");
            }));
        },

        "loads all extensions": function (done) {
            var group = bcGroup.create({
                extensions: [{ name: "baluba" }, { name: "swan" }]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function () {
                assert.equals(group.extensions.length, 2);
            }));
        },

        "calls create on extensions": function (done) {
            var group = bcGroup.create({
                extensions: [this.module]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function () {
                assert.calledOnceWith(this.create);
            }.bind(this)));
        },

        "fails gracefully if extensions is not array": function (done) {
            var group = bcGroup.create({
                extensions: this.module
            }, __dirname + "/fixtures");

            group.resolve().then(function () {}, done(function (err) {
                assert.match(err,
                             "`extensions' should be an array");
            }.bind(this)));
        },

        "configures object extension by name": function (done) {
            var create = this.stub().returns({});
            var group = bcGroup.create({
                extensions: [{
                    name: "duda",
                    create: create
                }],
                duda: { id: 42 }
            }, __dirname + "/fixtures");

            group.resolve().then(done(function () {
                assert.calledOnceWith(create, { id: 42 });
            }.bind(this)));
        },

        "does not fail if extension has no create method": function (done) {
            var group = bcGroup.create({
                extensions: [{}]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function () {
                assert(true);
            }), done);
        },

        "calls configure on extension": function (done) {
            var configure = this.spy();

            var group = bcGroup.create({
                extensions: [{ configure: configure }]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function () {
                assert.calledOnceWith(configure, group);
            }));
        },

        "calls hook on all extensions": function (done) {
            var hooks = [this.spy(), this.spy()];

            var group = bcGroup.create({
                extensions: [{ myevent: hooks[0] }, { myevent: hooks[1] }]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function () {
                group.runExtensionHook("myevent", 1, 4, 2);
                assert.calledOnceWith(hooks[0], 1, 4, 2);
                assert.calledOnceWith(hooks[1], 1, 4, 2);
            }));
        },

        "skips hook on extensions with no corresponding method": function (done) {
            var group = bcGroup.create({
                extensions: [{ myevent: this.spy() }, {}]
            }, __dirname + "/fixtures");

            group.resolve().then(done(function () {
                refute.exception(function () {
                    group.runExtensionHook("myevent", 1, 4, 2);
                });
            }));
        },

        "runs extension hook before resolving": function () {
            var hook = this.spy();

            var group = bcGroup.create({
                extensions: [{ myevent: hook }]
            }, __dirname + "/fixtures");

            group.runExtensionHook("myevent", { id: 42 });
            assert.calledOnceWith(hook, { id: 42 });
        },

        "runs extension hook before and after resolving": function (done) {
            var hook = this.spy();

            var group = bcGroup.create({
                extensions: [{ myevent: hook }]
            }, __dirname + "/fixtures");

            group.runExtensionHook("myevent", { id: 42 });
            group.extensions.push({ myevent: hook });

            group.resolve().then(done(function () {
                group.runExtensionHook("myevent", { id: 73 });
                assert.calledThrice(hook);
                assert.calledWith(hook, { id: 73 });
            }));
        },

        "runs all extension hooks on same instance": function (done) {
            var extension = {
                create: function () { return Object.create(this); },
                hookA: this.spy(),
                hookB: this.spy()
            };

            var group = bcGroup.create({
                extensions: [extension]
            }, __dirname + "/fixtures");

            group.runExtensionHook("hookA");
            group.runExtensionHook("hookB");

            group.resolve().then(done(function () {
                assert.same(extension.hookA.thisValues[0],
                            extension.hookB.thisValues[0]);
            }));
        }
    },

    "unknown options": {
        "cause an error": function (done) {
            var group = bcGroup.create({
                thingie: "Oh noes"
            });

            group.resolve().then(function () {}, done(function (err) {
                assert.defined(err);
            }));
        },

        "include custom message": function (done) {
            var group = bcGroup.create({
                load: [""]
            });

            group.resolve().then(function () {}, done(function (err) {
                assert.match(err, "Did you mean one of");
            }));
        }
    }
});
