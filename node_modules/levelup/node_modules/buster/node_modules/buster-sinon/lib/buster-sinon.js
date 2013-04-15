/*jslint onevar: false, eqeqeq: false*/
/*global require*/
(function (buster, sinon) {
    var ba, testRunner, stackFilter, format;

    if (typeof require == "function" && typeof module == "object") {
        sinon = require("sinon");
        buster = require("buster-core");
        ba = require("buster-assertions");
        format = require("buster-format");
        testRunner = require("buster-test").testRunner;
        stackFilter = require("buster-test").stackFilter;
    } else {
        ba = buster.assertions;
        format = buster.format;
        testRunner = buster.testRunner;
        stackFilter = buster.stackFilter;
    }

    if (stackFilter && stackFilter.filters) {
        stackFilter.filters.push("lib/sinon");
    }

    sinon.expectation.pass = function (assertion) {
        ba.emit("pass", assertion);
    };

    sinon.expectation.fail = function (message) {
        ba.fail(message);
    };

    if (testRunner) {
        testRunner.onCreate(function (runner) {
            runner.on("test:setUp", function (test) {
                var config = sinon.getConfig(sinon.config);
                config.useFakeServer = false;
                var sandbox = sinon.sandbox.create();
                sandbox.inject(test.testCase);

                test.testCase.useFakeTimers = function () {
                    return sandbox.useFakeTimers.apply(sandbox, arguments);
                };

                test.testCase.useFakeServer = function () {
                    return sandbox.useFakeServer.apply(sandbox, arguments);
                };

                test.testCase.sandbox = sandbox;
                var testFunc = test.func;
            });

            runner.on("test:tearDown", function (test) {
                try {
                    test.testCase.sandbox.verifyAndRestore();
                } catch (e) {
                    runner.assertionFailure(e);
                }
            });
        });
    }

    if (format) {
        var formatter = buster.create(format);
        formatter.quoteStrings = false;
        sinon.format = buster.bind(formatter, "ascii");
    }

    if (!ba || !sinon) { return; }

    // Sinon assertions for buster
    function verifyFakes() {
        var method, isNot;

        for (var i = 0, l = arguments.length; i < l; ++i) {
            method = arguments[i];
            isNot = (method || "fake") + " is not ";

            if (!method) this.fail(isNot + "a spy");
            if (typeof method != "function") this.fail(isNot + "a function");
            if (typeof method.getCall != "function") this.fail(isNot + "stubbed");
        }

        return true;
    }

    var sf = sinon.spy.formatters;
    var spyValues = function (spy) { return [spy, sf.c(spy), sf.C(spy)]; };

    ba.add("called", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.called;
        },
        assertMessage: "Expected ${0} to be called at least once but was never called",
        refuteMessage: "Expected ${0} to not be called but was called ${1}${2}",
        expectation: "toHaveBeenCalled",
        values: spyValues
    });

    function slice(arr, from, to) {
        return [].slice.call(arr, from, to);
    }

    ba.add("callOrder", {
        assert: function (spy) {
            var args = buster.isArray(spy) ? spy : arguments;
            verifyFakes.apply(this, args);
            if (sinon.calledInOrder(args)) return true;

            this.expected = [].join.call(args, ", ");
            this.actual = sinon.orderByFirstCall(slice(args)).join(", ");
        },

        assertMessage: "Expected ${expected} to be called in order but were called as ${actual}",
        refuteMessage: "Expected ${expected} not to be called in order"
    });

    function addCallCountAssertion(count) {
        var c = count.toLowerCase();

        ba.add("called" + count, {
            assert: function (spy) {
                verifyFakes.call(this, spy);
                return spy["called" + count];
            },
            assertMessage: "Expected ${0} to be called " + c + " but was called ${1}${2}",
            refuteMessage: "Expected ${0} to not be called exactly " + c + "${2}",
            expectation: "toHaveBeenCalled" + count,
            values: spyValues
        });
    }

    addCallCountAssertion("Once");
    addCallCountAssertion("Twice");
    addCallCountAssertion("Thrice");

    function valuesWithThis(spy, thisObj) {
        return [spy, thisObj, spy.printf && spy.printf("%t") || ""];
    }

    ba.add("calledOn", {
        assert: function (spy, thisObj) {
            verifyFakes.call(this, spy);
            return spy.calledOn(thisObj);
        },
        assertMessage: "Expected ${0} to be called with ${1} as this but was called on ${2}",
        refuteMessage: "Expected ${0} not to be called with ${1} as this",
        expectation: "toHaveBeenCalledOn",
        values: valuesWithThis
    });

    ba.add("alwaysCalledOn", {
        assert: function (spy, thisObj) {
            verifyFakes.call(this, spy);
            return spy.alwaysCalledOn(thisObj);
        },
        assertMessage: "Expected ${0} to always be called with ${1} as this but was called on ${2}",
        refuteMessage: "Expected ${0} not to always be called with ${1} as this",
        expectation: "toHaveAlwaysBeenCalledOn",
        values: valuesWithThis
    });

    function formattedArgs(args, i) {
        for (var l = args.length, result = []; i < l; ++i) {
            result.push(sinon.format(args[i]));
        }

        return result.join(", ");
    }

    function spyAndCalls(spy) {
        return [spy, formattedArgs(arguments, 1), spy.printf && spy.printf("%C")];
    }

    ba.add("calledWith", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.calledWith.apply(spy, slice(arguments, 1));
        },
        assertMessage: "Expected ${0} to be called with arguments ${1}${2}",
        refuteMessage: "Expected ${0} not to be called with arguments ${1}${2}",
        expectation: "toHaveBeenCalledWith",
        values: spyAndCalls
    });

    ba.add("alwaysCalledWith", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.alwaysCalledWith.apply(spy, slice(arguments, 1));
        },
        assertMessage: "Expected ${0} to always be called with arguments ${1}${2}",
        refuteMessage: "Expected ${0} not to always be called with arguments${1}${2}",
        expectation: "toHaveAlwaysBeenCalledWith",
        values: spyAndCalls
    });

    ba.add("calledOnceWith", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.calledOnce && spy.calledWith.apply(spy, slice(arguments, 1));
        },
        assertMessage: "Expected ${0} to be called once with arguments ${1}${2}",
        refuteMessage: "Expected ${0} not to be called once with arguments ${1}${2}",
        expectation: "toHaveBeenCalledOnceWith",
        values: spyAndCalls
    });

    ba.add("calledWithExactly", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.calledWithExactly.apply(spy, slice(arguments, 1));
        },
        assertMessage: "Expected ${0} to be called with exact arguments ${1}${2}",
        refuteMessage: "Expected ${0} not to be called with exact arguments${1}${2}",
        expectation: "toHaveBeenCalledWithExactly",
        values: spyAndCalls
    });

    ba.add("alwaysCalledWithExactly", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.alwaysCalledWithExactly.apply(spy, slice(arguments, 1));
        },
        assertMessage: "Expected ${0} to always be called with exact arguments ${1}${2}",
        refuteMessage: "Expected ${0} not to always be called with exact arguments${1}${2}",
        expectation: "toHaveAlwaysBeenCalledWithExactly",
        values: spyAndCalls
    });

    function spyAndException(spy, exception) {
        return [spy, spy.printf && spy.printf("%C")];
    }

    ba.add("threw", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.threw(arguments[1]);
        },
        assertMessage: "Expected ${0} to throw an exception${1}",
        refuteMessage: "Expected ${0} not to throw an exception${1}",
        expectation: "toHaveThrown",
        values: spyAndException
    });

    ba.add("alwaysThrew", {
        assert: function (spy) {
            verifyFakes.call(this, spy);
            return spy.alwaysThrew(arguments[1]);
        },
        assertMessage: "Expected ${0} to always throw an exception${1}",
        refuteMessage: "Expected ${0} not to always throw an exception${1}",
        expectation: "toAlwaysHaveThrown",
        values: spyAndException
    });
}(typeof buster == "object" ? buster : null, typeof sinon == "object" ? sinon : null));
