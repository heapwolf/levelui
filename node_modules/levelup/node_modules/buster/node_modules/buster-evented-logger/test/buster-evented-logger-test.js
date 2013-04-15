if (typeof module === "object" && typeof require === "function") {
    var sinon = require("sinon");

    var buster = {
        assertions: require("buster-assertions"),
        eventedLogger: require("../lib/buster-evented-logger"),
        util: require("buster-util")
    };
}

var assert = buster.assertions.assert;
var refute = buster.assertions.refute;

buster.util.testCase("EventedLoggerTest", {
    setUp: function () {
        this.logger = buster.eventedLogger.create();
        this.listener = sinon.spy();
    },

    "should emit log event when logging": function () {
        this.logger.on("log", this.listener);
        this.logger.log("Hey");

        assert(this.listener.calledOnce);
        assert(this.listener.calledWith({
            level: "log", message: "Hey"
        }));
    },

    "should emit all arguments to log": function () {
        this.logger.on("log", this.listener);
        this.logger.log("Hey", {}, [2, 3], "There");

        assert(this.listener.calledOnce);

        assert.match(this.listener.args[0][0].message,
                     /^Hey (\{\})|(\[object Object\]) \[?2,3\]? There$/);
    },

    "should emit log event when warning": function () {
        this.logger.on("log", this.listener);
        this.logger.warn("Hey");

        assert(this.listener.calledOnce);
        assert(this.listener.calledWith({
            level: "warn", message: "Hey"
        }));
    },

    "should emit log event when erring": function () {
        this.logger.on("log", this.listener);
        this.logger.error("Hey");

        assert(this.listener.calledOnce);
        assert(this.listener.calledWith({
            level: "error", message: "Hey"
        }));
    },

    "should emit log event when debugging": function () {
        this.logger.on("log", this.listener);
        this.logger.debug("Hey");

        assert(this.listener.calledOnce);
        assert(this.listener.calledWith({
            level: "debug", message: "Hey"
        }));
    },

    "should only emit errors when level is error": function () {
        this.logger.level = "error";
        this.logger.on("log", this.listener);
        this.logger.debug("Hey");
        this.logger.log("Hey");
        this.logger.warn("Hey");
        this.logger.error("Hey");

        assert(this.listener.calledOnce);
        assert.equals(this.listener.args[0][0].level, "error");
    },

    "should emit errors and warnings when level is warn": function () {
        this.logger.level = "warn";
        this.logger.on("log", this.listener);
        this.logger.debug("Hey");
        this.logger.log("Hey");
        this.logger.warn("Hey");
        this.logger.error("Hey");

        assert(this.listener.calledTwice);
        assert.equals(this.listener.args[0][0].level, "warn");
        assert.equals(this.listener.args[1][0].level, "error");
    },

    "should emit log, errors and warnings when level is log": function () {
        this.logger.level = "log";
        this.logger.on("log", this.listener);
        this.logger.debug("Hey");
        this.logger.log("Hey");
        this.logger.warn("Hey");
        this.logger.error("Hey");

        assert(this.listener.calledThrice);
        assert.equals(this.listener.args[0][0].level, "log");
        assert.equals(this.listener.args[1][0].level, "warn");
        assert.equals(this.listener.args[2][0].level, "error");
    },

    "should emit everything when level is debug": function () {
        this.logger.level = "debug";
        this.logger.on("log", this.listener);
        this.logger.debug("Hey");
        this.logger.log("Hey");
        this.logger.warn("Hey");
        this.logger.error("Hey");

        assert.equals(this.listener.callCount, 4);
    },

    "should format arguments with eventedLogger.format": function () {
        sinon.stub(this.logger, "format").returns("#");
        this.logger.on("log", this.listener);
        this.logger.log("Hey", {}, [], 23);

        assert.equals(this.logger.format.callCount, 4);
        assert.equals(this.listener.args[0][0].message, "# # # #");
    },

    "should provide formatter as create option": function () {
        var listener = sinon.spy();
        var formatter = sinon.stub().returns("#");

        var logger = buster.eventedLogger.create({ formatter: formatter });
        logger.on("log", listener);
        logger.log("Hey", {}, [], 23);

        assert.equals(formatter.callCount, 4);
        assert.equals(listener.args[0][0].message, "# # # #");
    },

    "should create logger with custom default level": function () {
        var listener = sinon.spy();
        var logger = buster.eventedLogger.create({ level: "error" });

        logger.on("log", listener);
        logger.warn("Hey");

        refute(listener.called);
    },

    "should create logger with custom levels": function () {
        var listener = sinon.spy();
        var logger = buster.eventedLogger.create({
            levels: ["err", "warn", "info", "debug", "scream"]
        });

        logger.on("log", listener);

        logger.scream("Hey");
        logger.debug("Hey");
        logger.info("Hey");
        logger.warn("Hey");
        logger.err("Hey");

        refute.defined(listener.log);
        assert.equals(listener.callCount, 5);
        assert.equals(listener.args[0][0].level, "scream");
        assert.equals(listener.args[1][0].level, "debug");
        assert.equals(listener.args[2][0].level, "info");
        assert.equals(listener.args[3][0].level, "warn");
        assert.equals(listener.args[4][0].level, "err");
    },

    "should log return value from function": function () {
        this.logger.on("log", this.listener);
        this.logger.log(function () {
            return "Hey";
        });

        assert(this.listener.calledOnce);
        assert(this.listener.calledWith({
            level: "log", message: "Hey"
        }));
    },

    "should not call logged function if logging to silenced level": function () {
        var logged = sinon.spy();
        this.logger.level = "error";
        this.logger.debug(logged);

        refute(logged.called);
    },

    "should log function if instructed to": function () {
        var logger = buster.eventedLogger.create({ logFunctions: true });
        logger.on("log", this.listener);
        logger.log(function () { return "Hey"; });

        assert(this.listener.calledOnce);
        assert(this.listener.calledWith({
            level: "log", message: "function () { return \"Hey\"; }"
        }));
    }
});
