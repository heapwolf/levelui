if (typeof module === "object" && typeof require === "function") {
    var sinon = require("sinon");
    var buster = require("buster-core");

    buster.extend(buster, {
        assertions: require("buster-assertions"),
        testCase: require("../../lib/buster-test/test-case"),
        testRunner: require("../../lib/buster-test/test-runner"),
        spec: require("../../lib/buster-test/spec"),
        util: require("buster-util")
    });
}

buster.spec.expose();

(function () {
    var assert = buster.assertions.assert;

    function recordEvents(runner) {
        var contexts = [];
        var events = [];

        runner.on("context:start", function (context) {
            contexts.push(context.name);
            events.push("start: " + context.name);
        });

        runner.on("context:end", function (context) {
            contexts.pop();
            events.push("end: " + context.name);
        });

        runner.on("test:setUp", function (test) {
            events.push("setUp: " + contexts.join(" ") + " " + test.name);
        });

        runner.on("test:tearDown", function (test) {
            events.push("tearDown: " + contexts.join(" ") + " " + test.name);
        });

        runner.on("test:start", function (test) {
            events.push("start: " + contexts.join(" ") + " " + test.name);
        });

        runner.on("test:error", function (result) {
            events.push("error: " + contexts.join(" ") + " " + result.name);
        });

        runner.on("test:failure", function (result) {
            events.push("failed: " + contexts.join(" ") + " " + result.name);
        });

        runner.on("test:success", function (test) {
            events.push("passed: " + contexts.join(" ") + " " + test.name);
        });

        return events;
    }

    buster.util.testCase("TestRunnerIntegrationTest", {
        "emits all test case events in proper order": function (test) {
            var mathRandom = Math.random;
            Math.random = function () { return 0; };
            var assertionError = new Error("Test failed");
            assertionError.name = "AssertionError";
            var error = new Error("Oops");

            var context = buster.testCase("TestCase", {
                setUp: function () {},
                tearDown: function () {},
                test1: function () {},
                test2: sinon.stub().throws(assertionError),

                context1: {
                    setUp: function () {},
                    tearDown: function () {},
                    test11: sinon.stub().throws(error),
                    test12: function () {}
                },

                context2: {
                    setUp: function () {},
                    tearDown: function () {},
                    test21: function () {},
                    test22: function () {}
                }
            });

            var runner = buster.create(buster.testRunner);
            runner.failOnNoAssertions = false;
            var events = recordEvents(runner);

            var expected = "start: TestCase\n" +
                "start: context1\n" +
                "setUp: TestCase context1 test11\n" +
                "start: TestCase context1 test11\n" +
                "tearDown: TestCase context1 test11\n" +
                "error: TestCase context1 test11\n" +
                "setUp: TestCase context1 test12\n" +
                "start: TestCase context1 test12\n" +
                "tearDown: TestCase context1 test12\n" +
                "passed: TestCase context1 test12\n" +
                "end: context1\n" +
                "start: context2\n" +
                "setUp: TestCase context2 test21\n" +
                "start: TestCase context2 test21\n" +
                "tearDown: TestCase context2 test21\n" +
                "passed: TestCase context2 test21\n" +
                "setUp: TestCase context2 test22\n" +
                "start: TestCase context2 test22\n" +
                "tearDown: TestCase context2 test22\n" +
                "passed: TestCase context2 test22\n" +
                "end: context2\n" +
                "setUp: TestCase test1\n" +
                "start: TestCase test1\n" +
                "tearDown: TestCase test1\n" +
                "passed: TestCase test1\n" +
                "setUp: TestCase test2\n" +
                "start: TestCase test2\n" +
                "tearDown: TestCase test2\n" +
                "failed: TestCase test2\n" +
                "end: TestCase";

            runner.runSuite([context]).then(test.end(function () {
                Math.random = mathRandom;
                assert.equals(events.join("\n"), expected);
            }));
        },

        "should emit all spec events in proper order": function (test) {
            var mathRandom = Math.random;
            Math.random = function () { return 0; };
            var assertionError = new Error("Test failed");
            assertionError.name = "AssertionError";
            var error = new Error("Oops");

            var context = describe("TestCase", function () {
                before(function () {});
                after(function () {});
                it("test1", function () {});
                it("test2", sinon.stub().throws(assertionError));

                describe("context1", function () {
                    before(function () {});
                    after(function () {});
                    it("test11", sinon.stub().throws(error));
                    it("test12", function () {});
                });

                describe("context2", function () {
                    before(function () {});
                    after(function () {});
                    it("test21", function () {});
                    it("test22", function () {});
                });
            });

            var runner = buster.create(buster.testRunner);
            runner.failOnNoAssertions = false;
            var events = recordEvents(runner);

            var expected = "start: TestCase\n" +
                "start: context1\n" +
                "setUp: TestCase context1 test11\n" +
                "start: TestCase context1 test11\n" +
                "tearDown: TestCase context1 test11\n" +
                "error: TestCase context1 test11\n" +
                "setUp: TestCase context1 test12\n" +
                "start: TestCase context1 test12\n" +
                "tearDown: TestCase context1 test12\n" +
                "passed: TestCase context1 test12\n" +
                "end: context1\n" +
                "start: context2\n" +
                "setUp: TestCase context2 test21\n" +
                "start: TestCase context2 test21\n" +
                "tearDown: TestCase context2 test21\n" +
                "passed: TestCase context2 test21\n" +
                "setUp: TestCase context2 test22\n" +
                "start: TestCase context2 test22\n" +
                "tearDown: TestCase context2 test22\n" +
                "passed: TestCase context2 test22\n" +
                "end: context2\n" +
                "setUp: TestCase test1\n" +
                "start: TestCase test1\n" +
                "tearDown: TestCase test1\n" +
                "passed: TestCase test1\n" +
                "setUp: TestCase test2\n" +
                "start: TestCase test2\n" +
                "tearDown: TestCase test2\n" +
                "failed: TestCase test2\n" +
                "end: TestCase";

            runner.runSuite([context]).then(test.end(function () {
                Math.random = mathRandom;
                assert.equals(events.join("\n"), expected);
            }));
        }
    });
}());
