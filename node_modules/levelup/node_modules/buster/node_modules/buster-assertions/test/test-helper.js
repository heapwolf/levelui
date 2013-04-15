if (typeof module === "object" && typeof require === "function") {
    var assert = require("assert");
    var sinon = require("sinon");

    var buster = {
        assertions: require("./../lib/buster-assertions"),
        util: require("buster-util")
    };
}

var testHelper = (function () {
    var ba = buster.assertions;

    function slice(args, index) {
        return Array.prototype.slice.call(args, index);
    }

    function assertFailureEvent(callback) {
        var fails = this.failListener.callCount;
        var passes = this.okListener.callCount;
        ba.throwOnFailure = false;

        try {
            callback();
        } catch (e) {
            assert.fail("Assertion threw when it should not: " + e.message);
        }

        assert.equal(this.failListener.callCount, fails + 1,
                     "Fail listener was not called once: " +
                     this.failListener.callCount - fails);
        assert.equal(this.okListener.callCount, passes,
                     "Pass listener was unexpectedly called");
    }

    function assertionFailureEventTest(callback) {
        return function () {
            assertFailureEvent.call(this, callback);
        };
    }

    function passingAssertionTest(type, assertion, args) {
        return function () {
            var initialCount = ba.count;
            var callStr = type + "." + assertion + "(" + args.join(", ") + ")";

            try {
                ba[type][assertion].apply(ba, args);
            } catch (e) {
                if (typeof console != "undefined") {
                    console.log("Failed: " + callStr);
                } else {
                    buster.util.puts("Failed: " + callStr);
                }
            }

            assert.equal(
                this.okListener.callCount, 1,
                "Expected buster.assertions to emit the pass event once for " + callStr);
            sinon.assert.calledWith(this.okListener, type + "." + assertion);
            assert.equal(1, ba.count - initialCount);
            sinon.assert.notCalled(ba.fail);
            sinon.assert.notCalled(this.failListener);
        };
    }

    function failingAssertionTest(type, assertion, args) {
        return function () {
            var initialCount = ba.count;
            var callStr = type + "." + assertion + "(" + args.join(", ") + ")";

            try {
                ba[type][assertion].apply(ba, args);

                if (typeof console != "undefined") {
                    console.log("Unexpectedly passed: " + callStr);
                } else {
                    buster.util.puts("Unexpectedly passed: " + callStr);
                }
            } catch (e) {}

            assert.equal(ba.fail.callCount, 1,
                     "Expected buster.assertions.fail to be called once for " + callStr +
                         ", was called " + ba.fail.callCount + " times");

            assert.equal(1, ba.count - initialCount);
            sinon.assert.notCalled(this.okListener);
            sinon.assert.calledOnce(this.failListener);

            assertFailureEvent.call(this, function () {
                ba[type][assertion].apply(ba, args);
            });
        };
    }

    function assertionMessageTest(type, assertion, message, args) {
        var test = function () {
            var msg;

            try {
                ba[type][assertion].apply(ba, args);
                throw new Error(type + "." + assertion + " expected to fail");
            } catch (e) {
                assert.equal(e.name, "AssertionError", e.name + ": " + e.message);
                assert.equal(e.message, message, "Message was " + e.message + ", " +
                             "expected " + message);
                msg = e.message;
            }

            var expected = test.expectedFormats;

            if (typeof expected != "number") {
                expected = args.length;

                if (typeof args[args.length - 1] == "string") {
                    expected -= 1;
                }
            }

            assert.ok(ba.format.callCount >= expected);

            for (var i = 0, l = expected; i < l; ++i) {
                if (isNaN(args[i]) && isNaN(ba.format.args[i][0])) {
                    continue;
                }

                assert.ok(ba.format.calledWith(args[i]));
            }

            assert.equal(this.failListener.args[0][0].name, "AssertionError");
            assert.equal(this.failListener.args[0][0].message, msg);
        };

        return test;
    }

    function assertionTests(type, assertion, callback) {
        var tests = {
            setUp: testHelper.setUp,
            tearDown: testHelper.tearDown
        };

        var prefix = type + "." + assertion + " should ";

        function pass(name) {
            tests[prefix + "pass " + name] = passingAssertionTest(
                type, assertion, slice(arguments, 1), name);
        }

        function fail(name) {
            tests[prefix + "fail " + name] =
                failingAssertionTest(type, assertion, slice(arguments, 1));
        }

        function msg(name, message) {
            tests[prefix + name] =
                assertionMessageTest(type, assertion, message, slice(arguments, 2));

            return tests[prefix + name];
        }

        callback.call(tests, pass, fail, msg);
        return buster.util.testCase(type + "." + assertion + "Test", tests);
    }

    return {
        setUp: function () {
            this.sandbox = sinon.sandbox.create();
            this.sandbox.spy(ba, "fail");

            ba.format = sinon.spy(function (object) {
                return "" + object;
            });

            this.okListener = sinon.spy();
            ba.on("pass", this.okListener);
            this.failListener = sinon.spy();
            ba.on("failure", this.failListener);
        },

        tearDown: function () {
            delete ba.listeners;
            ba.count = 0;
            this.sandbox.restore();

            delete ba.throwOnFailure;
        },

        assertionFailureEventTest: assertionFailureEventTest,
        assertionTests: assertionTests
    };
}());

if (typeof module == "object") {
    module.exports = testHelper;
}
