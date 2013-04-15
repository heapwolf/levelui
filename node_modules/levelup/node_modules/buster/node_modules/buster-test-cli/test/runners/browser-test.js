var buster = require("buster");
var referee = buster.referee;
var assert = buster.assert;
var refute = buster.refute;
var bane = require("bane");
var streamLogger = require("stream-logger");
var browserRunner = require("../../lib/runners/browser");
var testRun = browserRunner.testRun;
var ramp = require("ramp");
var when = require("when");
var cliHelper = require("buster-cli/lib/test-helper");
var remoteRunner = require("../../lib/runners/browser/remote-runner");
var progressReporter = require("../../lib/runners/browser/progress-reporter");
var reporters = require("buster-test").reporters;

function fakeConfig(tc) {
    return bane.createEventEmitter({
        resolve: tc.stub().returns(when.defer().promise),
        runExtensionHook: tc.stub()
    });
}

function fakeSession(tc) {
    return bane.createEventEmitter({
        onStart: tc.stub(),
        onLoad: tc.stub().yields([{}]),
        onEnd: tc.stub(),
        onUnload: tc.stub(),
        onAbort: tc.stub(),
        end: tc.stub()
    });
}

function fakeServerClient(tc) {
    return {
        connect: tc.stub().returns(when()),
        createSession: tc.stub().returns(when(fakeSession(tc)))
    };
}

function testRemoteRunnerOption(options, expected) {
    return function () {
        options = options || {};
        var run = testRun.create(fakeConfig(this), options, this.logger);

        run.runTests(this.session);

        var actual = remoteRunner.create.args[0][2];
        assert.match(actual, expected);
    };
}

buster.testCase("Browser runner", {
    setUp: function () {
        this.stub(process, "on");
        this.runner = Object.create(browserRunner);
        this.stdout = cliHelper.writableStream("stdout");
        this.stderr = cliHelper.writableStream("stderr");
        this.logger = streamLogger(this.stdout, this.stderr);
        this.runner.logger = this.logger;
        this.remoteRunner = bane.createEventEmitter();
        this.remoteRunner.setSlaves = this.spy();
        this.stub(remoteRunner, "create").returns(this.remoteRunner);
    },

    "server client": {
        setUp: function () {
            var client = fakeServerClient(this);
            this.stub(ramp, "createServerClient").returns(client);
        },

        "creates server client": function () {
            this.runner.run(fakeConfig(this), {});

            assert.calledOnce(ramp.createServerClient);
        },

        "creates client for configured location": function () {
            this.runner.run(fakeConfig(this), { server: "http://127.0.0.1:1200" });

            assert.calledWith(ramp.createServerClient, "1200", "127.0.0.1");
        }
    },

    "session creation": {
        setUp: function () {
            var client = this.serverClient = fakeServerClient(this);
            this.stub(ramp, "createServerClient").returns(this.serverClient);
            this.config = fakeConfig(this);

            referee.add("sessionOptions", {
                assert: function (opts) {
                    this.actual = client.createSession.args[0][1];
                    return referee.match(this.actual, opts);
                },
                assertMessage: "Expected createSession to be called with " +
                    "options ${0}, but was called with ${actual}"
            });
        },

        "not when config is not resolved": function () {
            this.runner.run(this.config, {});

            refute.called(this.serverClient.createSession);
        },

        "with configured resource set": function () {
            this.config.resolve.returns(when([42]));

            this.runner.run(this.config, {});

            assert.calledOnce(this.serverClient.createSession);
            assert.calledWith(this.serverClient.createSession, [42]);
        },

        "with uncached resource set": function () {
            var resourceSet = [
                { path: "/a.js", cacheable: true },
                { path: "/b.js", cacheable: false },
                { path: "/c.js", cacheable: true }
            ];
            this.config.resolve.returns(when(resourceSet));

            this.runner.run(this.config, {
                cacheable: false
            });

            assert.isFalse(resourceSet[0].cacheable);
            assert.isFalse(resourceSet[1].cacheable);
            assert.isFalse(resourceSet[2].cacheable);
        },

        "with cached resource set": function () {
            var resourceSet = [
                { path: "/a.js", cacheable: true },
                { path: "/c.js", cacheable: true }
            ];
            this.config.resolve.returns(when(resourceSet));

            this.runner.run(this.config, {
                cacheable: true
            });

            assert.isTrue(resourceSet[0].cacheable);
            assert.isTrue(resourceSet[1].cacheable);
        },

        "is unjoinable": function () {
            this.config.resolve.returns(when([{}]));

            this.runner.run(this.config, {});

            assert.sessionOptions({ joinable: false });
        },

        "uses dynamic resource paths by default": function () {
            this.config.resolve.returns(when([{}]));

            this.runner.run(this.config, {});

            assert.sessionOptions({ staticResourcesPath: false });
        },

        "uses static resource paths": function () {
            this.config.resolve.returns(when([{}]));

            this.runner.run(this.config, {
                staticResourcePath: true
            });

            assert.sessionOptions({ staticResourcesPath: false });
        },

        "runs session with testRun object": function () {
            var session = fakeSession(this);
            this.serverClient.createSession.returns(when(session));
            var deferred = when.defer();
            this.config.resolve.returns(deferred);

            var run = this.runner.run(this.config, {});
            this.stub(run, "runTests").yields();
            deferred.resolve([]);

            assert.calledOnce(run.runTests);
            assert.calledWith(run.runTests, session);
        },

        "adds resolved config options to options": function () {
            var deferred = when.defer();
            this.config.resolve.returns(deferred.promise);

            var run = this.runner.run(this.config, { id: 42 });
            this.stub(run, "runTests").yields();
            this.config.options = { things: "stuff" };
            deferred.resolve([]);

            assert.equals(run.options, {
                id: 42,
                things: "stuff"
            });
        },

        "calls callback with internally thrown error": function () {
            var callback = this.spy();
            var deferred = when.defer();
            this.config.resolve.returns(deferred.promise);

            var run = this.runner.run(this.config, { id: 42 }, callback);
            this.stub(run, "runTests").throws();

            refute.exception(function () {
                deferred.resolve([]);
            });

            assert.calledOnce(callback);
            assert.defined(callback.args[0][0].message);
        }
    },

    "abort": {
        setUp: function () {
            this.serverClient = fakeServerClient(this);
            this.stub(ramp, "createServerClient").returns(this.serverClient);
            this.config = fakeConfig(this);
        },

        "prevents session creation": function (done) {
            var deferred = when.defer();
            this.config.resolve.returns(deferred.promise);

            var run = this.runner.run(this.config, {}, done(function () {
                refute.called(this.serverClient.createSession);
            }.bind(this)));

            run.abort();
            deferred.resolve({});
        },

        "ends session if running": function (done) {
            this.config.resolve.returns(when([]));
            var session = fakeSession(this);
            var deferred = when.defer();
            this.serverClient.createSession.returns(deferred.promise);

            var run = this.runner.run(this.config, {}, function () {
                process.nextTick(done(function () {
                    assert.calledOnce(session.end);
                }));
            });

            run.abort();
            deferred.resolve(session);
        },

        "calls run-callback with abort error": function (done) {
            var deferred = when.defer();
            this.config.resolve.returns(deferred);

            var run = this.runner.run(this.config, {}, done(function (err) {
                assert.equals(err.code, 42);
            }));

            run.abort({ code: 42 });
            deferred.resolve({});
        },

        "sets error code if not present": function (done) {
            var deferred = when.defer();
            this.config.resolve.returns(deferred);

            var run = this.runner.run(this.config, {}, done(function (err) {
                assert.equals(err.code, 70);
            }));

            run.abort({});
            deferred.resolve({});
        }
    },

    "uncaught exceptions": {
        setUp: function () {
            this.session = fakeSession(this);
            this.run = testRun.create(fakeConfig(this), {}, this.logger);
        },

        "listens for uncaught exceptions": function () {
            this.run.runTests(this.session);
            this.session.emit("uncaughtException", { data: { message: "Oh" } });

            assert.stderr("Uncaught exception:");
            assert.stderr("Oh");
        },

        "does not listen for uncaught exceptions if already handled": function () {
            this.session.on("uncaughtException", function () {});
            this.run.runTests(this.session);
            this.session.emit("uncaughtException", { data: { message: "Oh" } });

            refute.stderr("Uncaught exception:");
            refute.stderr("Oh");
        },

        "prints uncaught exceptions without colors": function () {
            this.run.runTests(this.session);
            this.session.emit("uncaughtException", { data: { message: "Oh" } });

            var stderr = this.stderr.toString();
            refute.match(this.stderr, "\x1b");
        },

        "prints uncaught exceptions in yellow": function () {
            var run = testRun.create(fakeConfig(this), { color: true }, this.logger);
            run.runTests(this.session);
            this.session.emit("uncaughtException", { data: { message: "Oh" } });

            var stderr = this.stderr.toString();
            assert.equals(stderr.indexOf("\x1b[33mUncaught exception:"), 0);
        },

        "prints uncaught exceptions in bright yellow": function () {
            var run = testRun.create(fakeConfig(this), {
                color: true,
                bright: true
            }, this.logger);
            run.runTests(this.session);
            this.session.emit("uncaughtException", { data: { message: "Oh" } });

            assert.match(this.stderr, "\x1b[1m\x1b[33mUncaught exception:");
        },

        "does not print uncaught exceptions if handled by reporter": "TODO"
    },

    "runTests": {
        setUp: function () {
            this.session = fakeSession(this);
            this.createRun = function (options) {
                return testRun.create(
                    fakeConfig(this),
                    options || {},
                    this.logger
                );
            };
        },

        "testRun extension hook": {
            "triggers with runners": function () {
                var config = fakeConfig(this);
                var run = testRun.create(config, {}, this.logger);

                run.runTests(this.session);

                assert.called(config.runExtensionHook);
                assert.calledWith(
                    config.runExtensionHook,
                    "testRun",
                    this.remoteRunner,
                    this.session
                );
            },

            "aborts run when hook throws": function () {
                var config = fakeConfig(this);
                config.runExtensionHook.throws("Oh noes");
                var run = testRun.create(config, {}, this.logger);

                run.runTests(this.session, function (err) {
                    assert.equals(err.code, 70);
                    assert.calledOnce(this.session.end);
                }.bind(this));
            }
        },

        "remote runner": {
            "creates remote runner with slaves": function () {
                this.stub(remoteRunner, "setSlaves");
                var run = testRun.create(fakeConfig(this), {}, this.logger);
                this.session.onLoad.yields([{ id: 42 }]);

                run.runTests(this.session);

                assert.calledOnce(remoteRunner.create);
                assert.calledWith(remoteRunner.create, this.session);
                assert.calledOnce(this.remoteRunner.setSlaves);
                assert.calledWith(this.remoteRunner.setSlaves, [{ id: 42 }]);
            },

            "defaults failOnNoAssertions to true": testRemoteRunnerOption({}, {
                failOnNoAssertions: true
            }),

            "configures to not fail on no assertions": testRemoteRunnerOption({
                failOnNoAssertions: false
            }, {
                failOnNoAssertions: false
            }),

            "defaults auto-run to true": testRemoteRunnerOption({}, {
                autoRun: true
            }),

            "configures to not auto-run": testRemoteRunnerOption({
                autoRun: false
            }, {
                autoRun: false
            }),

            "defaults filters to null": function () {
                var run = testRun.create(fakeConfig(this), {}, this.logger);

                run.runTests(this.session);

                refute.defined(remoteRunner.create.args[0][2].filters);
            },

            "includes filters": testRemoteRunnerOption({
                filters: ["1", "2"]
            }, {
                filters: ["1", "2"]
            }),

            "captures console by default": testRemoteRunnerOption({}, {
                captureConsole: true
            }),

            "configures to not capture console": testRemoteRunnerOption({
                captureConsole: false
            }, {
                captureConsole: false
            })
        },

        "with no connected slaves": {
            setUp: function () {
                this.session.onLoad.yields([]);
                this.run = testRun.create(fakeConfig(this), {}, this.logger);
            },

            "does not set remote runner slaves": function () {
                this.run.runTests(this.session, function () {});
                refute.called(this.remoteRunner.setSlaves);
            },

            "generates understandable error": function (done) {
                this.run.runTests(this.session, done(function (err) {
                    assert.match(err, {
                        message: "No slaves connected, nothing to do",
                        type: "NoSlavesError",
                        code: 76
                    });
                }));
            },

            "ends session": function () {
                this.run.runTests(this.session, function () {});
                assert.calledOnce(this.session.end);
            },

            "//does not call done until session closes":
            "TODO: session.end is currently not async. augustl?"
        },

        "reporter": {
            setUp: function () {
                this.spy(progressReporter, "create");
                this.spy(reporters.dots, "create");
            },

            "defaults to progress reporter": function () {
                var run = this.createRun();
                run.runTests(this.session);

                assert.calledOnce(progressReporter.create);
                assert.match(progressReporter.create.args[0][0], {
                    color: false,
                    bright: false
                });
            },

            "uses progress reporter with the dots reporter": function () {
                var run = this.createRun({ reporter: "dots" });
                run.runTests(this.session);

                assert.called(progressReporter.create);
                assert.calledOnce(reporters.dots.create);
            },

            "skips progress reporter when providing reporter": function () {
                this.spy(reporters.specification, "create");
                var run = this.createRun({ reporter: "specification" });
                run.runTests(this.session);

                refute.called(progressReporter.create);
                assert.calledOnce(reporters.specification.create);
            },

            "loads reporter using buster-test's loader": function () {
                this.spy(reporters, "load");
                var run = this.createRun({ reporter: "dots" });
                run.runTests(this.session);

                assert.calledOnceWith(reporters.load, "dots");
            },

            "progress reporter should respect color settings": function () {
                var run = this.createRun({ color: true, bright: true });
                run.runTests(this.session);

                assert.match(progressReporter.create.args[0][0], {
                    color: true,
                    bright: true
                });
            },

            "uses logger as output stream for remote reporter": function () {
                var run = this.createRun();
                run.runTests(this.session);
                var ostream = progressReporter.create.args[0][0].outputStream;
                ostream.write(".");
                ostream.write(".");
                ostream.write(" OK!");

                assert.stdout(".. OK!");
            },

            "adds client on progress reporter when client connects": function () {
                this.stub(progressReporter, "addSlave");

                var run = this.createRun();
                run.runTests(this.session);
                var client = { id: 42 };
                this.remoteRunner.emit("client:connect", client);

                assert.calledOnce(progressReporter.addSlave);
                assert.calledWith(progressReporter.addSlave, 42, client);
            },

            "initializes reporter": function () {
                var run = this.createRun();
                run.runTests(this.session);

                assert.match(reporters.dots.create.args[0][0], {
                    color: false,
                    bright: false,
                    displayProgress: false,
                    logPassedMessages: false
                });
            },

            "logs messages for passed tests": function () {
                var run = this.createRun({ logPassedMessages: true });
                run.runTests(this.session);

                assert.match(reporters.dots.create.args[0][0], {
                    logPassedMessages: true
                });
            },

            "initializes reporter with custom properties": function () {
                var run = this.createRun({
                    color: true,
                    bright: true,
                    displayProgress: true
                });
                run.runTests(this.session);

                assert.match(reporters.dots.create.args[0][0], {
                    color: true,
                    bright: true
                });
            },

            "builds cwd from session server and root": function () {
                this.session.resourcesPath = "/aaa-bbb/resources";
                var run = this.createRun({ server: "localhost:1111" });
                run.runTests(this.session);

                assert.match(reporters.dots.create.args[0][0], {
                    cwd: "http://localhost:1111/aaa-bbb/resources"
                });
            },

            "builds cwd from non-default session server and root": function () {
                this.session.resourcesPath = "/aaa-bbb/resources";
                var run = this.createRun({ server: "somewhere:2524" });
                run.runTests(this.session);

                assert.match(reporters.dots.create.args[0][0], {
                    cwd: "http://somewhere:2524/aaa-bbb/resources"
                });
            },

            "sets number of contexts in package name": function () {
                var run = this.createRun();
                run.runTests(this.session);

                var reporter = reporters.dots.create.returnValues[0];
                assert.equals(reporter.contextsInPackageName, 2);
            },

            "makes reporter listen for events from runner": function () {
                this.stub(reporters.dots, "listen");
                var run = this.createRun();
                run.runTests(this.session);

                assert.calledOnce(reporters.dots.listen);
                assert.calledWith(reporters.dots.listen, this.remoteRunner);
            }
        },

        "beforeRun extension hook": {
            setUp: function () {
                this.run = testRun.create(fakeConfig(this), {}, this.logger);
                this.config = this.run.config;
            },

            "triggers beforeRun": function () {
                this.run.runTests(this.session, function () {});
                assert.called(this.config.runExtensionHook);
                assert.calledWith(this.config.runExtensionHook, "beforeRun");
            },

            "aborts if beforeRun hook throws": function () {
                this.config.runExtensionHook.throws();
                this.run.runTests(this.session, function () {});

                refute.called(this.session.onLoad);
            },

            "calls callback if beforeRun hook throws": function () {
                var callback = this.spy();
                this.config.runExtensionHook.throws();
                this.run.runTests(this.session, callback);

                assert.called(callback);
            }
        },

        "closing session": {
            setUp: function () {
                this.run = this.createRun();

                // Avoid having actual reporters printing to STDOUT
                this.stub(reporters, "load").returns({
                    create: this.stub().returns({ listen: this.stub() })
                });
            },

            "ends session on suite:end": function () {
                this.run.runTests(this.session, function () {});
                this.remoteRunner.emit("suite:end");

                assert.calledOnce(this.session.end);
            },

            "prints to stdout": function () {
                var stdout = this.stdout.toString();
                this.run.endSession(this.session);

                refute.equals(this.stdout, stdout);
            },

            "calls run callback when done": function () {
                var callback = this.spy();

                this.run.runTests(this.session, callback);
                this.remoteRunner.emit("suite:end", { ok: true });

                assert.calledOnce(callback);
                assert.calledWith(callback, null, { ok: true });
            },

            "prints to stderr on unsuccesful session close":
            "TODO: session.end is not currently async",

            "calls done with error on failed session close":
            "TODO: session.end is not currently async. Should fail with code 75"
        }
    },

    "error handling": {
        setUp: function () {
            this.run = testRun.create(fakeConfig(this), {
                server: "localhost:1111"
            }, this.logger);
            this.sessionDeferred = when.defer();
            this.client = {
                connect: this.stub().returns(when()),
                createSession: this.stub().returns(this.sessionDeferred)
            };
        },

        "session preparation error": function (done) {
            this.stub(ramp, "createServerClient").returns({
                connect: this.stub().returns(when({}))
            });
            var config = fakeConfig(this);
            config.resolve.returns(when({}));
            var options = { server: "localhost:1111" };

            var cb = done(function (err) {
                assert.match(err.message, "serializing");
            });

            this.run = testRun.create(config, options, this.logger, cb);
            this.run.startSession = function (client, callback) {
                return function () { callback({ message: "Failed serializing resources" }); };
            };
            this.run.start();
        },

        "session creation error": function () {
            this.sessionDeferred.reject({ message: "Djeez" });
            var callback = this.spy();

            this.run.startSession(this.client, callback)([]);

            assert.calledOnce(callback);
            assert.match(callback.args[0][0].message, "Failed creating session");
        },

        "yields understandable error if server cannot be reached": function () {
            this.sessionDeferred.reject(new Error("ECONNREFUSED, Connection refused"));
            var callback = this.spy();

            this.run.startSession(this.client, callback)([]);

            var message = callback.args[0][0].message;
            assert.match(message, "Unable to connect to server");
            assert.match(message, "http://localhost:1111");
            assert.match(message, "Please make sure that buster-server is running");
            assert.equals(callback.args[0][0].code, 75);
        },

        "files": {
            setUp: function () {
                this.stub(ramp, "createServerClient").returns(this.client);
                this.config = fakeConfig(this);
                this.configDeferred = when.defer();
                this.config.resolve.returns(this.configDeferred);
                this.stub(process, "cwd").returns("/home/christian/projects/buster/sample");
            },

            "yields understandable error if pattern matches no files": function () {
                this.configDeferred.reject(new Error("ENOENT, No such file or directory '/home/christian/projects/buster/sample/src/*.js'"));
                var callback = this.spy();

                var run = testRun.create(this.config, {}, this.logger, callback);
                run.start();

                assert.calledOnce(callback);
                assert.match(callback.args[0][0].message, "pattern 'src/*.js' does not match any files");
                assert.equals(callback.args[0][0].code, 65);
            },

            "yields understandable error if a file could not be found": function () {
                this.configDeferred.reject(new Error("ENOENT, No such file or directory '/home/christian/projects/buster/sample/src/trim.js'"));
                var callback = this.spy();

                var run = testRun.create(this.config, {}, this.logger, callback);
                run.start();

                assert.calledOnce(callback);
                assert.match(callback.args[0][0].message, "Configured path 'src/trim.js' is not a file or directory");
                assert.equals(callback.args[0][0].code, 65);
            },

            "yields understandable error if config fails to resolve": function () {
                this.configDeferred.reject({ message: "Failed loading configuration: Oh noes" });
                var callback = this.spy();

                var run = testRun.create(this.config, {}, this.logger, callback);
                run.start();

                assert.calledOnce(callback);
                assert.match(callback.args[0][0].message, "Failed loading configuration: Oh noes");
            }
        }
    },

    // TODO: Test that the actual message from the abort event is passed
    // correctly.
    "ends session when session aborts itself": function (done) {
        var serverClient = fakeServerClient(this);
        this.stub(ramp, "createServerClient").returns(serverClient);

        var config = fakeConfig(this);
        config.resolve.returns(when([]));

        var session = fakeSession(this);
        var deferred = when.defer();
        deferred.resolve(session);
        serverClient.createSession.returns(deferred.promise);

        var run = this.runner.run(config, {}, done);

        assert.calledOnce(session.onAbort, "Did not hook onAbort");
        session.onAbort.getCall(0).args[0]({message: "An error from the session"});
    }
});
