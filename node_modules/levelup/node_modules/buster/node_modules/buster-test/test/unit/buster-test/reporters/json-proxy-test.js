if (typeof module === "object" && typeof require === "function") {
    var sinon = require("sinon");
    var buster = require("buster-core");

    buster.extend(buster, {
        assertions: require("buster-assertions"),
        reporters: require("../../../../lib/buster-test/reporters")
    });

    buster.util = require("buster-util");
}

var assert = buster.assertions.assert;

buster.util.testCase("JSONProxyTest", {
    setUp: function () {
        this.runner = buster.create(buster.eventEmitter);
        this.proxy = buster.reporters.jsonProxy.create().listen(this.runner);
    },

    "should emit suite:start": function () {
        var listener = sinon.spy();
        this.proxy.on("suite:start", listener);
        this.runner.emit("suite:start");

        assert(listener.calledOnce);
    },

    "should emit serializable context object to context:start": function () {
        var listener = sinon.spy();
        this.proxy.on("context:start", listener);
        this.runner.emit("context:start", { name: "Context", meth: function () {} });

        assert.equals(listener.args[0][0], { name: "Context" });
    },

    "should emit serializable context object to context:end": function () {
        var listener = sinon.spy();
        this.proxy.on("context:end", listener);
        this.runner.emit("context:end", { name: "Context", meth: function () {} });

        assert.equals(listener.args[0][0], { name: "Context" });
    },

    "should emit serializable context object to context:unsupported": function () {
        var listener = sinon.spy();
        this.proxy.on("context:unsupported", listener);

        this.runner.emit("context:unsupported", {
            context: {
                name: "Context",
                meth: function () {}
            },
            unsupported: ["A"]
        });

        assert.equals(listener.args[0][0], {
            context: { name: "Context" },
            unsupported: ["A"]
        });
    },

    "should emit serializable test object to test:async": function () {
        var listener = sinon.spy();
        this.proxy.on("test:async", listener);
        this.runner.emit("test:async", { name: "should go", func: function (done) {} });

        assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:setUp": function () {
        var listener = sinon.spy();
        this.proxy.on("test:setUp", listener);
        this.runner.emit("test:setUp", { name: "should go", func: function () {} });

        assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:tearDown": function () {
        var listener = sinon.spy();
        this.proxy.on("test:tearDown", listener);
        this.runner.emit("test:tearDown", { name: "should go", func: function () {} });

        assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:deferred": function () {
        var listener = sinon.spy();
        this.proxy.on("test:deferred", listener);
        this.runner.emit("test:deferred", { name: "should go", func: function () {} });

        assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:start": function () {
        var listener = sinon.spy();
        this.proxy.on("test:start", listener);
        this.runner.emit("test:start", { name: "should go", func: function () {} });

        assert.equals(listener.args[0][0], { name: "should go" });
    },

    "should emit serializable test object to test:error": function () {
        var listener = sinon.spy();
        this.proxy.on("test:error", listener);
        this.runner.emit("test:error", {
            name: "should go",
            func: function () {},
            error: {
                name: "Error",
                message: "Something went wrong",
                stack: "Trouble@here",
                toString: function () {}
            }
        });

        assert.equals(listener.args[0][0], {
            name: "should go",
            error: {
                name: "Error",
                message: "Something went wrong",
                stack: "Trouble@here"
            }
        });
    },

    "should emit serializable test object to test:failure": function () {
        var listener = sinon.spy();
        this.proxy.on("test:failure", listener);
        this.runner.emit("test:failure", {
            name: "should go",
            func: function () {},
            error: {
                name: "AssertionError",
                message: "Expected a to be equal to b",
                stack: "Trouble@here",
                toString: function () {}
            }
        });

        assert.equals(listener.args[0][0], {
            name: "should go",
            error: {
                name: "AssertionError",
                message: "Expected a to be equal to b",
                stack: "Trouble@here"
            }
        });
    },

    "should emit serializable test object to test:timeout": function () {
        var listener = sinon.spy();
        this.proxy.on("test:timeout", listener);
        this.runner.emit("test:timeout", {
            name: "should go",
            func: function () {},
            error: {
                name: "TimeoutError",
                message: "Yo",
                stack: "",
                source: "setUp"
            }
        });

        assert.equals(listener.args[0][0], {
            name: "should go",
            error: {
                name: "TimeoutError",
                message: "Yo",
                stack: "",
                source: "setUp"
            }
        });
    },

    "should emit serializable test name and assertion count to test success": function () {
        var listener = sinon.spy();
        this.proxy.on("test:success", listener);

        this.runner.emit("test:success", {
            name: "should go", func: function () {}, assertions: 13
        });

        assert.equals(listener.args[0][0], {
            name: "should go", assertions: 13
        });
    },

    "should emit stats to suite:end": function () {
        var listener = sinon.spy();
        this.proxy.on("suite:end", listener);

        this.runner.emit("suite:end", {
            contexts: 2, tests: 3, errors: 0, failures: 1, assertions: 12,
            timeouts: 0, deferred: 0, ok: false
        });

        assert.equals(listener.args[0][0], {
            contexts: 2, tests: 3, errors: 0, failures: 1, assertions: 12,
            timeouts: 0, deferred: 0, ok: false
        });
    },

    "should emit log messages": function () {
        var listener = sinon.spy();
        this.proxy.on("log", listener);
        this.runner.bind(this.proxy, ["log"]);

        this.runner.emit("log", { level: "log", message: "Hey!" });

        assert(listener.calledOnce);
        assert.equals(listener.args[0][0],
                             { level: "log", message: "Hey!" });
    },

    "should emit serializable error to uncaughtException": function () {
        var listener = sinon.spy();
        this.proxy.on("uncaughtException", listener);

        this.runner.emit("uncaughtException", {
            name: "Error",
            message: "Something went wrong",
            stack: "Trouble@here",
            toString: function () {}
        });

        assert(listener.calledOnce);

        assert.equals(listener.args[0][0], {
            name: "Error",
            message: "Something went wrong",
            stack: "Trouble@here"
        });
    }
});

buster.util.testCase("JsonProxyCustomEmitterTest", {
    setUp: function () {
        this.runner = buster.create(buster.eventEmitter);
        this.emitter = buster.create(buster.eventEmitter);
        this.proxy = buster.reporters.jsonProxy.create(this.emitter).listen(this.runner);
    },

    "should emit events on custom emitter": function () {
        var listener = sinon.spy();
        this.emitter.on("test:start", listener);

        this.runner.emit("test:start", { name: "should do something" });

        assert(listener.calledOnce);
        assert.equals(listener.args[0][0], { name: "should do something" });
    }
});
