var sinon = require("sinon");
var buster = require("buster-core");
var assertions = require("buster-assertions");
var tapReporter = require("../../../../lib/buster-test/reporters/tap");
var busterUtil = require("buster-util");
var assert = assertions.assert;
var refute = assertions.refute;
var helper = require("./test-helper");

busterUtil.testCase("TAPReporterTest", sinon.testCase({
    setUp: function () {
        this.io = helper.io();
        this.assertIO = helper.assertIO;
        this.runner = buster.eventEmitter.create();
        this.runner.console = buster.eventEmitter.create();

        this.reporter = tapReporter.create({
            io: this.io
        }).listen(this.runner);

        this.test = function (name, result, data) {
            var event = buster.extend({ name: "no. 1" }, data);
            this.runner.emit("test:start", event);
            this.runner.emit("test:" + result, event);
        };
    },

    "should print the plan": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "success");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("1..1");
    },

    "should print the plan for three tests": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "success");
        this.test("no. 2", "success");
        this.test("no. 3", "success");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("1..3");
    },

    "should print the plan for five tests in nested contexts": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context no. 1" });
        this.test("no. 1", "success");
        this.test("no. 2", "success");
        this.runner.emit("context:end", { name: "Context no. 1" });
        this.runner.emit("context:start", { name: "Context no. 2" });
        this.test("no. 3", "success");
        this.runner.emit("context:start", { name: "Context no. 3" });
        this.test("no. 4", "success");
        this.runner.emit("context:start", { name: "Context no. 4" });
        this.test("no. 5", "success");
        this.runner.emit("context:end", { name: "Context no. 4" });
        this.runner.emit("context:end", { name: "Context no. 3" });
        this.runner.emit("context:end", { name: "Context no. 2" });
        this.runner.emit("suite:end");

        this.assertIO("1..5");
    },

    "should print ok line for passed test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "success");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("ok 1 Context no. 1");
    },

    "should print not ok line for failed test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "failure");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1");
    },

    "should print not ok line for errored test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "error");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1");
    },

    "should print not ok line for timed out test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "timeout");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1");
    },

    "should print TODO directive for pending tests": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "deferred");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1 # TODO Deferred");
    },

    "should print TODO directive with comment": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "deferred", { comment: "Later y'all" });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1 # TODO Later y'all");
    },

    "should print SKIP directive for unsupported requirement": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("context:unsupported", {
            context: { name: "Context 2" },
            unsupported: ["A"]
        });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context 2 # SKIP Unsupported requirement: A");
    },

    "should print SKIP directive for all unsupported requirements": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("context:unsupported", {
            context: { name: "Context 2" },
            unsupported: ["A", "B"]
        });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context 2 # SKIP Unsupported requirements: A, B");
    }
}, "should"));
