var bane = require("bane");
var buster = require("buster");
var assert = buster.assert;
var refute = buster.refute;
var remoteRunner = require("../../../lib/runners/browser/remote-runner");

buster.testCase("Remote runner", {
    setUp: function () {
        this.clock = this.useFakeTimers();
        this.emitter = bane.createEventEmitter();

        this.emit = function (event, data, clientId) {
            return this.emitter.emit(event, {
                data: data,
                clientId: clientId
            });
        };

        this.subscribeTo = function (event) {
            var listener = this.spy();
            this.runner.on(event, listener);

            return listener;
        };

        this.subscribeToMany = function () {
            var listeners = [];

            for (var i = 0, l = arguments.length; i < l; ++i) {
                listeners.push(this.subscribeTo(arguments[i]));
            }

            return listeners;
        };

        this.uas = ["Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.2.12) Gecko/20101027 Ubuntu/10.10 (maverick) Firefox/4.0",
                        "Mozilla/5.0 (X11; U; Linux i686; en-US) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/11.0.517.44 Safari/534.7"];
    },

    "starting a run": {
        setUp: function () {
            var logger = { debug: this.stub() };
            var config = { config: 42 };
            this.runner = remoteRunner.create(this.emitter, logger, config);
            this.slaves = [{ id: 1 }, { id: 2 }];
        },

        "emits tests:run when setting slaves": function (done) {
            this.emitter.on("tests:run", done(function (config) {
                assert.isObject(config);
            }));

            this.runner.setSlaves(this.slaves);
        },

        "emits tests:run with config": function (done) {
            this.emitter.on("tests:run", done(function (config) {
                assert.equals(config, { config: 42 });
            }));

            this.runner.setSlaves(this.slaves);
        },

        "sets client info when setting slaves": function () {
            this.runner.setSlaves([{ id: 1, userAgent: this.uas[0] }]);

            assert.match(this.runner.getClient(1), {
                browser: "Firefox",
                version: "4.0",
                os: { family: "Ubuntu" }
            });
        },

        "enumerates similar user agents": function () {
            this.runner.setSlaves([
                { id: 1, userAgent: this.uas[0] },
                { id: 2, userAgent: this.uas[0] }
            ]);

            assert.equals(this.runner.getClient(1).toString(), "Firefox 4.0, Ubuntu 10.10");
            assert.equals(this.runner.getClient(2).toString(), "Firefox 4.0, Ubuntu 10.10 (2)");
        },

        "enumerates all user agents from same browser": function () {
            this.runner.setSlaves([
                { id: 1, userAgent: this.uas[0] },
                { id: 2, userAgent: this.uas[0] },
                { id: 3, userAgent: this.uas[0] },
                { id: 4, userAgent: this.uas[0] }
            ]);

            assert.equals(this.runner.getClient(4).toString(), "Firefox 4.0, Ubuntu 10.10 (4)");
        },

        "emits client:connect for every slave": function () {
            var listener = this.spy();
            this.runner.on("client:connect", listener);

            this.runner.setSlaves([
                { id: 1, userAgent: this.uas[0] },
                { id: 2, userAgent: this.uas[1] }
            ]);

            assert.calledTwice(listener);
            assert.match(listener.args[1][0], {
                browser: "Chrome",
                version: "11.0",
                os: { family: "Linux i686" }
            });
        }
    },

    "while tests are running": {
        setUp: function () {
            var logger = { debug: this.stub() };
            this.runner = remoteRunner.create(this.emitter, logger);
            this.runner.setSlaves([
                { id: 1, userAgent: this.uas[0] },
                { id: 2, userAgent: this.uas[1] }
            ]);
        },

        "emits progress:suite:start event": function () {
            var listener = this.subscribeTo("progress:suite:start");
            this.emit("suite:start", null, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" }
            });
        },

        "emits progress:suite:start event for all clients": function () {
            var listener = this.subscribeTo("progress:suite:start");
            this.emit("suite:start", null, 1);
            this.emit("suite:start", null, 2);

            assert.calledTwice(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" }
            });
            assert.match(listener.args[1][0], {
                client: { id: 2, browser: "Chrome" }
            });
        },

        "emits progress:suite:end event": function () {
            var listener = this.subscribeTo("progress:suite:end");
            this.emit("suite:end", null, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" }
            });
        },

        "emits progress:suite:end event for all clients": function () {
            var listener = this.subscribeTo("progress:suite:end");
            this.emit("suite:end", null, 1);
            this.emit("suite:end", null, 2);

            assert.calledTwice(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" }
            });
            assert.match(listener.args[1][0], {
                client: { id: 2, browser: "Chrome" }
            });
        },

        "emits progress:test:success event": function () {
            var listener = this.subscribeTo("progress:test:success");
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:success", { name: "test #1" }, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" },
                name: "test #1",
                contexts: ["Test case"]
            });
        },

        "emits progress:test:success event for different clients": function () {
            var listener = this.subscribeTo("progress:test:success");
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("context:start", { name: "Test case" }, 2);
            this.emit("test:success", { name: "test #1" }, 2);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 2, browser: "Chrome" },
                name: "test #1"
            });

            assert.equals(listener.args[0][0].contexts, ["Test case"]);
        },

        "emits progress:test:error event": function () {
            var listener = this.subscribeTo("progress:test:error");
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:error", { name: "test #1", error: { message: "!" } }, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" },
                name: "test #1",
                contexts: ["Test case"],
                error: { message: "!" }
            });
        },

        "emits progress:test:failure event": function () {
            var listener = this.subscribeTo("progress:test:failure");
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:failure", { name: "test #1", error: { message: "!" } }, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" },
                name: "test #1",
                contexts: ["Test case"],
                error: { message: "!" }
            });
        },

        "emits progress:test:failure event for nested test": function () {
            var listener = this.subscribeTo("progress:test:failure");
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("context:start", { name: "In situation" }, 1);
            this.emit("test:failure", { name: "test #1", error: { message: "!" } }, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" },
                name: "test #1",
                contexts: ["Test case", "In situation"],
                error: { message: "!" }
            });
        },

        "emits progress:test:failure event for middle nested test": function () {
            var listener = this.subscribeTo("progress:test:failure");
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("context:start", { name: "In situation" }, 1);
            this.emit("context:end", { name: "In situation" }, 1);
            this.emit("context:start", { name: "Other" }, 1);
            this.emit("test:failure", { name: "test #1", error: { message: "!" } }, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" },
                name: "test #1",
                contexts: ["Test case", "Other"],
                error: { message: "!" }
            });
        },

        "emits progress:test:timeout event": function () {
            var listener = this.subscribeTo("progress:test:timeout");
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:timeout", { name: "test #1" }, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                client: { id: 1, browser: "Firefox" },
                name: "test #1",
                contexts: ["Test case"]
            });
        }
    },

    "when context is completed": {
        setUp: function () {
            var logger = { debug: this.stub() };
            this.runner = remoteRunner.create(this.emitter, logger);
            this.runner.setSlaves([
                { id: 1, userAgent: this.uas[0] },
                { id: 2, userAgent: this.uas[1] }
            ]);
        },

        "emits test runner events": function () {
            var listeners = this.subscribeToMany(
                "context:start", "context:end", "test:success",
                "test:setUp", "test:tearDown", "test:start");

            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:setUp", { name: "test #1" }, 1);
            this.emit("test:start", { name: "test #1" }, 1);
            this.emit("test:tearDown", { name: "test #1" }, 1);
            this.emit("test:success", { name: "test #1" }, 1);

            refute.called(listeners[0]);

            this.emit("context:end", { name: "Test case" }, 1);

            assert.calledTwice(listeners[0]);
            assert.equals(listeners[0].args[0][0], { name: "Firefox 4.0, Ubuntu 10.10" });
            assert.equals(listeners[0].args[1][0], { name: "Test case" });
            assert.calledTwice(listeners[1]);
            assert.equals(listeners[1].args[0][0], { name: "Test case" });
            assert.equals(listeners[1].args[1][0], { name: "Firefox 4.0, Ubuntu 10.10" });
            assert.calledOnce(listeners[2]);
            assert.calledWith(listeners[2], { name: "test #1" });
            assert.calledOnce(listeners[3]);
            assert.calledWith(listeners[3], { name: "test #1" });
            assert.calledOnce(listeners[4]);
            assert.calledWith(listeners[4], { name: "test #1" });
            assert.calledOnce(listeners[5]);
            assert.calledWith(listeners[5], { name: "test #1" });
        },

        "emits log through console property": function () {
            var logger = { log: this.spy() };
            this.runner.console.bind(logger, ["log"]);

            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("log", { level: "log", message: "Hey" }, 1);
            this.emit("context:end", { name: "Test case" }, 1);

            assert.calledOnce(logger.log);
            assert.calledWith(logger.log, { level: "log", message: "Hey" });
        },

        "emits context:unsupported event": function () {
            var listener = this.spy();
            this.runner.on("context:unsupported", listener);

            this.emit("context:unsupported", { name: "Test case" }, 1);

            assert.calledOnce(listener);
        },

        "should not emit context:unsupported event while in nested context": function () {
            var listener = this.spy();
            this.runner.on("context:unsupported", listener);

            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("context:unsupported", { name: "Something" }, 1);
            refute.called(listener);

            this.emit("context:end", { name: "Test case" }, 1);
            assert.calledOnce(listener);
        },

        "emits test runner test status events": function () {
            var listeners = this.subscribeToMany(
                "test:error", "test:failure", "test:timeout", "test:deferred");

            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:error", { name: "test #1" }, 1);
            this.emit("test:failure", { name: "test #2" }, 1);
            this.emit("test:timeout", { name: "test #3" }, 1);
            this.emit("test:deferred", { name: "test #4" }, 1);
            this.emit("context:end", { name: "Test case" }, 1);

            assert.calledOnce(listeners[0]);
            assert.calledWith(listeners[0], { name: "test #1" });
            assert.calledOnce(listeners[1]);
            assert.calledWith(listeners[1], { name: "test #2" });
            assert.calledOnce(listeners[2]);
            assert.calledWith(listeners[2], { name: "test #3" });
            assert.calledOnce(listeners[3]);
            assert.calledWith(listeners[3], { name: "test #4" });
        },

        "should not re-emit old test runner events": function () {
            var listener = this.subscribeTo("test:error");

            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:error", { name: "test #1" }, 1);
            this.emit("context:end", { name: "Test case" }, 1);
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:failure", { name: "test #2" }, 1);
            this.emit("context:end", { name: "Test case" }, 1);

            assert.calledOnce(listener);
        },

        "should not emit until full context is ready": function () {
            var listener = this.subscribeTo("test:error");

            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:error", { name: "test #1" }, 1);
            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:failure", { name: "test #2" }, 1);
            this.emit("context:end", { name: "Test case" }, 1);

            refute.called(listener);
            this.emit("context:end", { name: "Test case" }, 1);

            assert.calledOnce(listener);
        },

        "emits timed out setup": function () {
            var listeners = [
                this.subscribeTo("test:setUp"),
                this.subscribeTo("test:async"),
                this.subscribeTo("test:timeout")
            ];

            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:setUp", { name: "test #1" }, 1);
            this.emit("test:async", { name: "test #1" }, 1);
            this.emit("test:timeout", { name: "test #1" }, 1);
            this.emit("context:end", { name: "Test case" }, 1);

            assert.calledOnce(listeners[0]);
            assert.calledOnce(listeners[1]);
            assert.calledOnce(listeners[2]);
        },

        "emits context start/stop in correct order": function () {
            var out = [];

            this.runner.on("context:start", function (ctx) {
                out.push("START " + ctx.name);
            });

            this.runner.on("context:end", function (ctx) {
                out.push("STOP " + ctx.name);
            });

            this.runner.on("test:success", function (test) {
                out.push("YAY " + test.name);
            });


            this.emit("context:start", { name: "Test case" }, 1);
            this.emit("test:success", { name: "test #1" }, 1);
            this.emit("context:start", { name: "Inner" }, 1);
            this.emit("test:success", { name: "test #2" }, 1);
            this.emit("context:start", { name: "Inner inner" }, 1);
            this.emit("test:success", { name: "test #3" }, 1);
            this.emit("context:end", { name: "Inner inner" }, 1);
            this.emit("context:end", { name: "Inner" }, 1);
            this.emit("context:start", { name: "Inner #2" }, 1);
            this.emit("test:success", { name: "test #4" }, 1);
            this.emit("context:end", { name: "Inner #2" }, 1);
            this.emit("context:end", { name: "Test case" }, 1);

            assert.equals(out, [
                "START Firefox 4.0, Ubuntu 10.10",
                "START Test case", "YAY test #1",
                "START Inner", "YAY test #2",
                "START Inner inner", "YAY test #3", "STOP Inner inner",
                "STOP Inner",
                "START Inner #2", "YAY test #4", "STOP Inner #2",
                "STOP Test case",
                "STOP Firefox 4.0, Ubuntu 10.10"
            ]);
        }
    },

    "test suites": {
        setUp: function () {
            this.createRunner = function (slaves) {
                var logger = { debug: this.stub() };
                this.runner = remoteRunner.create(this.emitter, logger);
                var uas = this.uas;
                this.runner.setSlaves(slaves.map(function (slave, i) {
                    return { id: slave.id, userAgent: uas[i % uas.length] };
                }));
            };
        },

        "emits suite:start only once": function () {
            this.createRunner([{ id: 1 }, { id: 2 }]);
            var listener = this.subscribeTo("suite:start");

            this.emit("suite:start", {}, 1);
            this.emit("suite:start", {}, 2);

            assert.calledOnce(listener);
        },

        "should not emit suite:end when clients are still in progress": function () {
            this.createRunner([{ id: "23-df" }, { id: "24-ef" }]);
            var listener = this.subscribeTo("suite:end");

            this.emit("suite:start", {}, "23-df");
            this.emit("suite:start", {}, "24-ef");
            this.emit("suite:end", {}, "23-df");

            refute.called(listener);
        },

        "emits suite:end when all clients are finished": function () {
            this.createRunner([{ id: "23-df" }, { id: "24-ef" }]);
            var listener = this.subscribeTo("suite:end");

            this.emit("suite:start", {}, "23-df");
            this.emit("suite:start", {}, "24-ef");
            this.emit("suite:end", {}, "24-ef");
            this.emit("suite:end", {}, "23-df");

            assert.calledOnce(listener);
        },

        "should not emit suite:end until ready - interleaved suites": function () {
            this.createRunner([{ id: 1 }, { id: 2 }, { id: 3 },
                               { id: 4 }, { id: 5 }]);
            var listener = this.subscribeTo("suite:end");

            this.emit("suite:start", {}, 1);
            this.emit("suite:start", {}, 2);
            this.emit("suite:end", {}, 2);
            this.emit("suite:start", {}, 3);
            this.emit("suite:start", {}, 4);
            this.emit("suite:end", {}, 1);
            this.emit("suite:end", {}, 3);
            this.emit("suite:start", {}, 5);
            this.emit("suite:end", {}, 4);

            refute.called(listener);
            this.emit("suite:end", {}, 5);

            assert.calledOnce(listener);
        },

        "should not emit suite:end if some clients have not yet started": function () {
            this.createRunner([{ id: 1 }, { id: 2 }]);
            var listener = this.subscribeTo("suite:end");

            this.emit("suite:start", {}, 1);
            this.emit("suite:end", {}, 1);
            refute.called(listener);

            this.emit("suite:start", {}, 2);
            this.emit("suite:end", {}, 2);
            assert.calledOnce(listener);
        },

        "should not skip client that starts after others finished": function () {
            var logger = { debug: this.stub() };
            this.runner = remoteRunner.create(this.emitter, logger);
            this.runner.setSlaves([{ id: 1 }, { id: 2 }]);
            var listener = this.subscribeTo("suite:end");

            this.emit("ready", { id: 1 }, 1, bane.createEventEmitter());
            this.emit("suite:start", {}, 1);
            this.emit("suite:end", {}, 1);
            refute.called(listener);

            this.emit("ready", { id: 2 }, 2, bane.createEventEmitter());
            this.emit("suite:start", {}, 2);
            this.emit("suite:end", {}, 2);
            assert.calledOnce(listener);
        },

        "ignores unknown clients": function () {
            this.runner = remoteRunner.create(this.emitter, [{ id: 1 }, { id: 2 }]);
            this.runner.logger = { debug: this.stub() };
            var listener = this.subscribeTo("suite:end");

            this.emit("ready", { id: 1 }, 1, bane.createEventEmitter());
            this.emit("suite:start", {}, 1);
            this.emit("suite:end", {}, 1);
            refute.called(listener);

            this.emit("ready", { id: 3 }, 3, bane.createEventEmitter());
            this.emit("suite:start", {}, 3);
            this.emit("suite:end", {}, 3);
            refute.called(listener);
        },

        "summarizes stats for suite:end": function () {
            this.createRunner([{ id: 1 }, { id: 2 }]);
            var listener = this.subscribeTo("suite:end");

            this.emit("suite:start", {}, 1);
            this.emit("suite:start", {}, 2);

            this.emit("suite:end", {
                contexts: 5,
                tests: 10,
                errors: 2,
                failures: 3,
                assertions: 14,
                timeouts: 2,
                deferred: 1,
                ok: false
            }, 1);

            this.emit("suite:end", {
                contexts: 6,
                tests: 10,
                errors: 1,
                failures: 1,
                assertions: 4,
                timeouts: 1,
                deferred: 0,
                ok: false
            }, 2);

            assert.equals(listener.args[0][0], {
                clients: 2,
                contexts: 11,
                tests: 20,
                errors: 3,
                failures: 4,
                assertions: 18,
                timeouts: 3,
                deferred: 1,
                ok: false
            });
        }
    },

    "client timeouts": {
        setUp: function () {
            var logger = { debug: this.stub() };
            this.runner = remoteRunner.create(this.emitter, logger);
            this.connect = function () {
                this.runner.setSlaves([
                    { id: 1, userAgent: this.uas[0] },
                    { id: 2, userAgent: this.uas[1] }
                ]);
            };
        },

        "emits client:timeout if client is unresponsive for 15s": function () {
            this.connect();
            var listener = this.spy();
            this.runner.on("client:timeout", listener);

            this.clock.tick(14999);
            this.emit("context:start", { name: "Test" }, 1);
            refute.called(listener);

            this.clock.tick(1);
            assert.calledOnce(listener);
            assert.match(listener.args[0][0], { browser: "Chrome" });
        },

        "emits client:timeout if client is unresponsive for custom timeout": function () {
            this.runner.timeout = 2000;
            this.connect();
            var listener = this.spy();
            this.runner.on("client:timeout", listener);

            this.clock.tick(1999);
            this.emit("context:start", { name: "Test" }, 1);
            refute.called(listener);

            this.clock.tick(1);
            assert.calledOnce(listener);
            assert.match(listener.args[0][0], { browser: "Chrome" });
        },

        "should not emit client:timeout after 15s if there has been activity": function () {
            this.connect();
            var listener = this.spy();
            this.runner.on("client:timeout", listener);

            this.clock.tick(7500);
            this.emit("context:start", { name: "Test" }, 1);
            this.emit("context:start", { name: "Test" }, 2);

            this.clock.tick(7500);
            refute.called(listener);
        },

        "completes run with only one client if other timed out": function () {
            this.connect();
            var listener = this.spy();
            this.runner.on("suite:end", listener);

            this.clock.tick(7500);
            this.emit("suite:start", null, 1);
            this.emit("context:start", { name: "Test" }, 1);
            this.emit("context:end", { name: "Test" }, 1);
            this.clock.tick(7500);
            this.emit("suite:end", null, 1);

            assert.calledOnce(listener);
        },

        "cleans up timers when suite completes": function () {
            this.connect();
            var listener = this.spy();
            this.runner.on("client:timeout", listener);

            this.emit("suite:start", null, 1);
            this.emit("suite:end", null, 1);
            this.emit("suite:start", null, 2);
            this.emit("suite:end", null, 2);

            this.clock.tick(15000);

            refute.called(listener);
        },

        "ignores suite messages from timed out client": function () {
            this.connect();
            var listener = this.spy();
            this.runner.on("suite:start", listener);
            this.runner.on("progress:suite:start", listener);
            this.runner.on("progress:suite:end", listener);
            this.runner.on("suite:end", listener);

            this.clock.tick(15000);
            this.emit("suite:start", null, 1);
            this.emit("suite:end", null, 1);

            refute.called(listener);
        },

        "ignores context messages from timed out client": function () {
            this.connect();
            var listener = this.spy();
            this.runner.on("context:start", listener);
            this.runner.on("context:unsupported", listener);
            this.runner.on("context:end", listener);

            this.clock.tick(15000);
            this.emit("context:start", { name: "Tests" }, 1);
            this.emit("context:unsupported", { name: "Tests" }, 1);
            this.emit("context:end", { name: "Tests" }, 1);

            refute.called(listener);
        },

        "ignores test messages from timed out client": function () {
            this.connect();
            var listener = this.spy();
            this.runner.on("progress:test:success", listener);
            this.runner.on("progress:test:error", listener);
            this.runner.on("progress:test:failure", listener);
            this.runner.on("progress:test:timeout", listener);
            this.runner.on("log", listener);
            this.runner.on("test:start", listener);
            this.runner.on("test:setUp", listener);
            this.runner.on("test:tearDown", listener);
            this.runner.on("test:success", listener);
            this.runner.on("test:error", listener);
            this.runner.on("test:failure", listener);
            this.runner.on("test:timeout", listener);
            this.runner.on("test:deferred", listener);

            this.clock.tick(15000);
            this.emit("context:start", { name: "Tests" }, 1);
            this.emit("test:start", { name: "#1" }, 1);
            this.emit("test:setUp", { name: "#1" }, 1);
            this.emit("test:success", { name: "#1" }, 1);
            this.emit("test:error", { name: "#1" }, 1);
            this.emit("test:failure", { name: "#1" }, 1);
            this.emit("test:timeout", { name: "#1" }, 1);
            this.emit("test:deferred", { name: "#1" }, 1);
            this.emit("log", { name: "#1" }, 1);
            this.emit("context:end", { name: "Tests" }, 1);

            refute.called(listener);
        }
    },

    "custom events": {
        setUp: function () {
            this.runner = remoteRunner.create(this.emitter, [{ id: 1 }]);
            this.emit("ready", this.uas[0], 1, bane.createEventEmitter());
        },

        "emits custom event": function () {
            var listener = this.subscribeTo("some:event");
            this.emit("some:event", { id: 42, name: "Hey!" }, 1);

            assert.calledOnce(listener);
            assert.match(listener.args[0][0], {
                data: { id: 42, name: "Hey!" }
            });
        }
    }
});
