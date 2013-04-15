var buster = require("buster");
var assert = buster.assert;
var refute = buster.refute;
var cliHelper = require("buster-cli/lib/test-helper");
var testCli = require("../lib/test-cli");
var runAnalyzer = require("../lib/run-analyzer");
var stackFilter = require("stack-filter");

function fakeRunner(thisp, environment) {
    return {
        environment: environment,
        run: thisp.stub().returns({}).yields()
    };
}

function testArgumentOption(args, options) {
    return function (done) {
        this.cli.run(["-c", this.config].concat(args), done(function () {
            assert.match(this.runners.browser.run.args[0][1], options);
        }.bind(this)));
    };
}

buster.testCase("Test CLI", {
    setUp: function () {
        this.stdout = cliHelper.writableStream("stdout");
        this.stderr = cliHelper.writableStream("stderr");
        this.runners = {
            node: fakeRunner(this, "node"),
            browser: fakeRunner(this, "browser")
        };
        this.cli = testCli.create(this.stdout, this.stderr, {
            environmentVariable: "BUSTER_TEST_OPT",
            missionStatement: "Run Buster tests on a capture server",
            runners: this.runners
        });
        this.exit = this.cli.cli.exit = this.spy();
        cliHelper.cdFixtures();
    },

    tearDown: function (done) {
        cliHelper.clearFixtures(done);
    },

    "help": {
        "prints reporter help": function (done) {
            this.cli.run(["--help", "reporters"], done(function (err, cli) {
                assert.stdout("a set of built-in reporters");
            }));
        },

        "prints regular help": function (done) {
            this.cli.run(["--help"], done(function (err, cli) {
                assert.stdout("Run Buster tests");
            }));
        }
    },

    "configuration option": {
        "recognizes --config option": function (done) {
            process.chdir(__dirname);
            this.cli.run(["--config", "file.js"], done(function (err, client) {
                var message = "-c/--config: file.js did not match any files";
                assert.stderr(message);
                assert.match(err.message, message);
            }.bind(this)));
        }
    },

    "explicit environment": {
        setUp: function () {
            cliHelper.writeFile("buster-buggy.js",
                                "var config = module.exports;" +
                                "config.server = { environment: 'phonegap' }");
        },

        "fails when environment does not exist": function (done) {
            var args = ["-c", "buster-buggy.js", "-e", "phonegap"];
            this.cli.run(args, done(function () {
                assert.stderr("No runner for environment 'phonegap'.");
                assert.stderr("Try one of");
                assert.stderr("node");
                assert.stderr("browser");
            }));
        }
    },

    "stack filter": {
        setUp: function () {
            this.filters = stackFilter.filters;
        },

        tearDown: function () {
            stackFilter.filters = this.filters;
        },

        "does not filter stack traces": function (done) {
            stackFilter.filters = ["a", "b"];
            this.cli.run(["--full-stacks"], done(function () {
                assert.equals(stackFilter.filters, []);
            }));
        },

        "does not filter stack traces with short option": function (done) {
            stackFilter.filters = ["a", "b"];
            this.cli.run(["-f"], done(function () {
                assert.equals(stackFilter.filters, []);
            }));
        },

        "filters stack traces by default": function (done) {
            stackFilter.filters = [];
            this.cli.run([], done(function () {
                refute.equals(stackFilter.filters, []);
            }));
        }
    },

    "node runs": {
        setUp: function () {
            cliHelper.writeFile("buster.js", "var config = module.exports;" +
                                "config.server = { environment: 'node' }");
        },

        "loads node runner": function (done) {
            this.cli.run([], done(function () {
                assert.calledOnce(this.runners.node.run);
                refute.equals(this.runners.node.run.thisValues[0],
                              this.runners.node);
            }.bind(this)));
        },

        "provides runner with logger": function (done) {
            this.cli.run([], done(function () {
                assert.equals(this.cli.logger,
                              this.runners.node.run.thisValues[0].logger);
            }.bind(this)));
        },

        "runs runner with config and options": function (done) {
            this.cli.run([], done(function () {
                var args = this.runners.node.run.args;
                assert.match(args[0][1], { reporter: "dots" });
                assert.equals(args[0][0].environment, "node");
            }.bind(this)));
        },

        "transfers filters to node runner": function (done) {
            this.cli.run(["should-"], done(function () {
                assert.equals(this.runners.node.run.args[0][1].filters,
                              ["should-"]);
            }.bind(this)));
        },

        "fails if reporter does not exist": function (done) {
            this.cli.run(["-r", "bogus"], done(function () {
                assert.match(this.stderr, "No such reporter 'bogus'");
            }.bind(this)));
        }
    },

    "with preferences": {
        setUp: function () {
            this.prefsink = { get: this.stub() };
            this.config = cliHelper.writeFile(
                "buster2.js",
                "var config = module.exports;" +
                    "config.server = { environment: 'browser' }"
            );
            this.cli = testCli.create(this.stdout, this.stderr, {
                runners: this.runners,
                preferences: this.prefsink
            });
            this.cli.cli.exit = this.spy();
            this.filters = stackFilter.filters;
        },

        tearDown: function () {
            stackFilter.filters = this.filters;
        },

        "skips stack trace filtering": function (done) {
            stackFilter.filters = ["a", "b"];
            this.prefsink.get.withArgs("test.fullStacks").returns(true);

            this.cli.run(["-c", this.config], done(function () {
                assert.equals(stackFilter.filters, []);
            }.bind(this)));
        },

        "uses color preference": function (done) {
            this.prefsink.get.withArgs("test.color").returns("none");

            this.cli.run(["-c", this.config], done(function () {
                assert.match(this.runners.browser.run.args[0][1], {
                    color: false
                });
            }.bind(this)));
        },

        "uses color option as default": function (done) {
            this.prefsink.get.withArgs("test.color").returns("none");
            var args = ["-c", this.config, "-C", "dim"];

            this.cli.run(args, done(function () {
                assert.match(this.runners.browser.run.args[0][1], {
                    color: true,
                    bright: false
                });
            }.bind(this)));
        },

        "uses release console preference": function (done) {
            this.prefsink.get.withArgs("test.releaseConsole").returns(true);

            this.cli.run(["-c", this.config], done(function () {
                assert.match(this.runners.browser.run.args[0][1], {
                    captureConsole: false
                });
            }.bind(this)));
        },

        "uses release console argument": function (done) {
            this.prefsink.get.withArgs("test.releaseConsole").returns(false);
            var args = ["-c", this.config, "--release-console"];

            this.cli.run(args, done(function () {
                assert.match(this.runners.browser.run.args[0][1], {
                    captureConsole: false
                });
            }.bind(this)));
        },


        "uses quiet log preference": function (done) {
            this.prefsink.get.withArgs("test.quietLog").returns(true);

            this.cli.run(["-c", this.config], done(function () {
                assert.match(this.runners.browser.run.args[0][1], {
                    logPassedMessages: false
                });
            }.bind(this)));
        },

        "uses quiet log argument": function (done) {
            this.prefsink.get.withArgs("test.quietLog").returns(false);
            var args = ["-c", this.config, "--quiet-log"];

            this.cli.run(args, done(function () {
                assert.match(this.runners.browser.run.args[0][1], {
                    logPassedMessages: false
                });
            }.bind(this)));
        }
    },

    "browser runs": {
        setUp: function () {
            this.config = cliHelper.writeFile(
                "buster2.js",
                "var config = module.exports;" +
                    "config.server = { environment: 'browser' }"
            );
        },

        "loads browser runner": function (done) {
            this.cli.run(["-c", this.config], done(function () {
                assert.calledOnce(this.runners.browser.run);
                refute.equals(this.runners.browser.run.thisValues[0],
                              this.runners.browser);
            }.bind(this)));
        },

        "loads browser with server setting": testArgumentOption([], {
            server: "http://localhost:1111"
        }),

        "loads browser with specific server setting": testArgumentOption(
            ["-s", "127.0.0.1:1234"],
            { server: "http://127.0.0.1:1234" }
        ),

        "allows hostnameless server config": testArgumentOption(
            ["--server", "127.0.0.1:5678"],
            { server: "http://127.0.0.1:5678" }
        ),

        "allows full server url, including protocol": testArgumentOption(
            ["-s", "http://lol:1234"],
            { server: "http://lol:1234" }
        ),

        "skips caching": function (done) {
            var run = {};
            var runner = { run: this.stub().returns(run).yields() };
            this.stub(this.cli, "loadRunner").yields(null, runner);

            this.cli.run(["-c", this.config, "-R"], done(function () {
                refute(run.cacheable);
            }.bind(this)));
        },

        "is cacheable by default": function (done) {
            var run = { id: 42 };
            var runner = { run: this.stub().returns(run).yields() };
            this.stub(this.cli, "loadRunner").yields(null, runner);

            this.cli.run(["-c", this.config], function () {
                process.nextTick(done(function () {
                    assert(run.cacheable);
                }));
            });
        },

        "sets warning level": testArgumentOption(
            ["-W", "all"],
            { warnings: "all" }
        ),

        "sets warning level with long option": testArgumentOption(
            ["--warnings", "warning"],
            { warnings: "warning" }
        ),

        "sets warning fail level": testArgumentOption(
            ["-F", "fatal"],
            { failOn: "fatal" }
        ),

        "sets warning fail level with long option": testArgumentOption(
            ["--fail-on", "error"],
            { failOn: "error" }
        ),

        "captures console by default": testArgumentOption(
            [],
            { captureConsole: true }
        ),

        "releases console": testArgumentOption(
            ["--release-console"],
            { captureConsole: false }
        ),

        "sets release console with short option": testArgumentOption(
            ["-o"],
            { captureConsole: false }
        ),

        "logs all messages": testArgumentOption(
            [],
            { logPassedMessages: true }
        ),

        "does not log passing tests": testArgumentOption(
            ["--quiet-log"],
            { logPassedMessages: false }
        ),

        "does not log passing tests with short option": testArgumentOption(
            ["-q"],
            { logPassedMessages: false }
        ),

        "sets static resource path": testArgumentOption(
            ["--static-paths"],
            { staticResourcesPath: true }
        ),

        "sets static resource path with short option": testArgumentOption(
            ["-p"],
            { staticResourcesPath: true }
        ),

        "transfers filters": testArgumentOption(
            ["//should-"],
            { filters: ["//should-"] }
        )
    },

    "analyzer": {
        setUp: function () {
            this.config = cliHelper.writeFile(
                "buster2.js",
                "var config = module.exports;" +
                    "config.server = { environment: 'browser' }"
            );
        },

        "creates run analyzer": function (done) {
            this.spy(runAnalyzer, "create");
            this.cli.run(["-c", this.config], done(function () {
                assert.calledOnceWith(runAnalyzer.create, this.cli.logger);
                assert.match(runAnalyzer.create.args[0][1], {
                    bright: true,
                    color: true
                });
            }.bind(this)));
        },

        "runs configuration group": function (done) {
            var run = this.spy();
            this.stub(runAnalyzer, "create").returns({ run: run });

            this.cli.run(["-c", this.config]);

            setTimeout(done(function () {
                assert.calledOnce(run);
            }), 10);
        }
    },

    "configuration": {
        setUp: function () {
            var type = typeof process.env.BUSTER_TEST_OPT;
            this.busterOptBlank = type !== "string";
            this.busterOpt = process.env.BUSTER_TEST_OPT;
            this.config = cliHelper.writeFile(
                "buster2.js",
                "var config = module.exports;" +
                    "config.server = { environment: 'browser' }"
            );
        },

        tearDown: function () {
            process.env.BUSTER_TEST_OPT = this.busterOpt;
            if (this.busterOptBlank) { delete process.env.BUSTER_TEST_OPT; }
        },

        "//adds CLI options set with $BUSTER_TEST_OPT": function (done) {
            process.env.BUSTER_TEST_OPT = "--color dim -r specification";
            this.cli.run(["-c", this.config], done(function () {
                assert.calledOnce(this.runners.node.run);
                assert.match(this.runners.node.run.args[0][1], {
                    color: true,
                    bright: false,
                    reporter: "specification"
                });
            }.bind(this)));
        },

        "processes one group at a time": function () {
            var callback = this.spy();
            this.runners.fake = { run: this.stub().returns({}) };
            this.cli.runConfigGroups([
                { environment: "fake", id: 1, runExtensionHook: this.spy() },
                { environment: "fake", id: 2, runExtensionHook: this.spy() }
            ], {}, callback);

            assert.calledOnce(this.runners.fake.run);
            refute.called(callback);
        },

        "processes next group when previous is done": function () {
            var callback = this.spy();
            this.runners.fake = { run: this.stub().yields().returns({}) };
            this.cli.runConfigGroups([
                { environment: "fake", id: 1, runExtensionHook: this.spy() },
                { environment: "fake", id: 2, runExtensionHook: this.spy() }
            ], {}, callback);

            assert.calledTwice(this.runners.fake.run);
            assert.calledOnce(callback);
        }
    },

    "with --color option": {
        setUp: function () {
            this.config = cliHelper.writeFile(
                "buster2.js",
                "var config = module.exports;" +
                    "config.server = { environment: 'node' }"
            );
        },

        "skips ansi escape sequences when set to none": function (done) {
            this.cli.run(["-c", this.config, "-C", "none"], done(function () {
                assert.match(this.runners.node.run.args[0][1], {
                    color: false,
                    bright: false
                });
            }.bind(this)));
        }
    },

    "exit": {
        setUp: function () {
            this.done = this.spy();
            this.nextGroup = -1;
            this.runners.fake = {
                run: function (group, options, callback) {
                    this.nextGroup += 1;
                    callback.apply(null, this.results[this.nextGroup]);
                    return {};
                }.bind(this)
            };
            this.fakeConfig = {
                environment: "fake",
                runExtensionHook: this.spy()
            };
        },

        "with code 0 when single test configuration passes": function () {
            this.results = [[null, { ok: true, tests: 1 }]];
            this.cli.runConfigGroups([this.fakeConfig], {}, this.done);
            assert.calledOnceWith(this.exit, 0);
        },

        "with code 0 when two test configurations pass": function () {
            this.results = [[null, { ok: true, tests: 1 }],
                            [null, { ok: true, tests: 1 }]];
            this.cli.runConfigGroups([this.fakeConfig, {
                environment: "fake",
                runExtensionHook: this.spy()
            }], {}, this.done);
            assert.calledOnceWith(this.exit, 0);
        },

        "with code 1 when no tests were run": function () {
            this.results = [[null, { ok: true, tests: 0 }]];
            this.cli.runConfigGroups([this.fakeConfig], {}, this.done);
            assert.calledOnceWith(this.exit, 1);
        },

        "with code 1 when single test configuration fails": function () {
            this.results = [[null, { ok: false, tests: 1 }]];
            this.cli.runConfigGroups([this.fakeConfig], {}, this.done);
            assert.calledOnceWith(this.exit, 1);
        },

        "with code 1 when one of several test configus fails": function () {
            this.results = [[null, { ok: true, tests: 1 }],
                            [null, { ok: false, tests: 1 }]];
            this.cli.runConfigGroups([this.fakeConfig, {
                environment: "fake",
                runExtensionHook: this.spy()
            }], {}, this.done);
            assert.calledOnceWith(this.exit, 1);
        },

        "uses exception status code": function () {
            this.results = [[{ code: 13 }]];
            this.cli.runConfigGroups([this.fakeConfig], {}, this.done);
            assert.calledOnceWith(this.exit, 13);
        },

        "defaults code to EX_SOFTWARE for code-less exception": function () {
            this.results = [[{}]];
            this.cli.runConfigGroups([this.fakeConfig], {}, this.done);
            assert.calledOnceWith(this.exit, 70);
        },

        "fails for single failed configuration": function () {
            var ok = [null, { ok: true }];
            this.results = [ok, ok, [{ code: 99 }], ok];
            var group = this.fakeConfig;
            var groups = [group, group, group, group];
            this.cli.runConfigGroups(groups, {}, this.done);
            assert.calledOnceWith(this.exit, 99);
        },

        "logs error before exit": function () {
            this.results = [[{ code: 99, message: "Oh snap" }]];
            var group = this.fakeConfig;
            var groups = [group, group, group, group];
            this.cli.runConfigGroups(groups, {}, this.done);

            assert.stderr("Oh snap");
        }
    },

    "extensions": {
        setUp: function () {
            this.extensions = {
                node: [{ id: 42 }, { id: 13 }],
                browser: [{ id: 1 }, { id: 2 }]
            };
            this.runners = {
                node: { run: this.stub().returns({}) },
                browser: { run: this.stub().returns({}) }
            };
            this.config = { environment: "node", runExtensionHook: this.spy() };
        },

        "are preloaded for environment": function () {
            var cli = testCli.create(this.stdout, this.stderr, {
                extensions: this.extensions,
                runners: this.runners
            });

            cli.runConfig(this.config, {}, function () {});

            assert.equals(this.config.extensions, [{ id: 42 }, { id: 13 }]);
        },

        "are initialized empty": function () {
            var cli = testCli.create(this.stdout, this.stderr, {
                runners: this.runners
            });
            cli.runConfig(this.config, {}, function () {});

            assert.equals(this.config.extensions, []);
        },

        "are prepended to existing extensions": function () {
            var cli = testCli.create(this.stdout, this.stderr, {
                extensions: this.extensions,
                runners: this.runners
            });
            this.config.extensions = [{ id: 4 }];
            cli.runConfig(this.config, {}, function () {});

            assert.equals(this.config.extensions,
                          [{ id: 42 }, { id: 13 }, { id: 4 }]);
        }
    }
});
