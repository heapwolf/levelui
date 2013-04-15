if (typeof module === "object" && typeof require === "function") {
    var buster = require("buster-core");
}

(function () {
    function proxyName(event) {
        return function (arg) {
            this.emit(event, { name: arg.name });
        };
    }

    function proxyNameAndError(event) {
        return function (test) {
            var data = {
                name: test.name,
                error: {
                    name: test.error.name,
                    message: test.error.message,
                    stack: test.error.stack
                }
            };
            if (test.error.source) { data.error.source = test.error.source; }
            this.emit(event, data);
        };
    }

    var jsonProxy = buster.extend(buster.create(buster.eventEmitter), {
        create: function (emitter) {
            var proxy = buster.create(this);

            if (emitter) {
                proxy.on = buster.bind(emitter, "on");
                proxy.emit = buster.bind(emitter, "emit");
                proxy.addListener = buster.bind(emitter, "addListener");
                proxy.hasListener = buster.bind(emitter, "hasListener");
            }

            return proxy;
        },

        listen: function (runner) {
            runner.bind(this, {
                "context:start": "contextStart", "context:end": "contextEnd",
                "context:unsupported": "contextUnsupported",
                "test:async": "testAsync", "test:timeout": "testTimeout",
                "test:setUp": "testSetUp", "test:tearDown": "testTearDown",
                "test:start": "testStart", "test:error": "testError",
                "test:failure": "testFailure", "test:success": "testSuccess",
                "test:deferred": "testDeferred", "suite:end": "suiteEnd",
                "suite:start": "suiteStart", "uncaughtException": "uncaughtException",
                "runner:focus": "runnerFocus"
            });

            return this;
        },

        suiteStart: function () {
            this.emit("suite:start");
        },

        contextStart: proxyName("context:start"),
        contextEnd: proxyName("context:end"),
        testSetUp: proxyName("test:setUp"),
        testTearDown: proxyName("test:tearDown"),
        testStart: proxyName("test:start"),
        testAsync: proxyName("test:async"),
        testDeferred: proxyName("test:deferred"),
        testError: proxyNameAndError("test:error"),
        testFailure: proxyNameAndError("test:failure"),
        testTimeout: proxyNameAndError("test:timeout"),

        runnerFocus: function (data) {
            this.emit("runner:focus");
        },

        contextUnsupported: function (data) {
            this.emit("context:unsupported", {
                context: { name: data.context.name },
                unsupported: data.unsupported
            });
        },

        uncaughtException: function (error) {
            this.emit("uncaughtException", {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        },

        testSuccess: function (test) {
            this.emit("test:success", {
                name: test.name,
                assertions: test.assertions
            });
        },

        suiteEnd: function (stats) {
            this.emit("suite:end", {
                contexts: stats.contexts,
                tests: stats.tests,
                errors: stats.errors,
                failures: stats.failures,
                assertions: stats.assertions,
                timeouts: stats.timeouts,
                deferred: stats.deferred,
                ok: stats.ok
            });
        },

        log: function (msg) {
            this.emit("log", msg);
        }
    });

    if (typeof module != "undefined") {
        module.exports = jsonProxy;
    } else {
        buster.reporters = buster.reporters || {};
        buster.reporters.jsonProxy = jsonProxy;
    }
}());
