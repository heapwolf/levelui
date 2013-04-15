/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global buster, require, module*/
(function () {
    var isCommonJS = typeof require == "function" && typeof module == "object";
    if (isCommonJS) buster = require("buster-core");
    var toString = Object.prototype.toString;
    var slice = Array.prototype.slice;
    var assert, refute, ba = buster.assertions = buster.eventEmitter.create();

    if (isCommonJS) {
        module.exports = buster.assertions;
    }

    function countAssertion() {
        if (typeof ba.count != "number") {
            ba.count = 0;
        }

        ba.count += 1;
    }

    ba.count = countAssertion;

    function assertEnoughArguments(name, args, num) {
        if (args.length < num) {
            ba.fail("[" + name + "] Expected to receive at least " +
                        num + " argument" + (num > 1 ? "s" : ""));
            return false;
        }

        return true;
    }

    function defineAssertion(type, name, func, fl, messageValues) {
        ba[type][name] = function () {
            var fullName = type + "." + name;
            countAssertion();
            if (!assertEnoughArguments(fullName, arguments, fl || func.length)) return;

            var failed = false;

            var ctx = {
                fail: function () {
                    failed = true;
                    var failArgs = [type, name].concat(slice.call(arguments));
                    fail.apply(this, failArgs);
                    return true;
                }
            };

            var args = slice.call(arguments, 0);

            if (typeof messageValues == "function") {
                args = messageValues.apply(this, args);
            }

            if (!func.apply(ctx, arguments)) {
                return fail.apply(ctx, [type, name, "message"].concat(args));
            }

            if (!failed) {
                ba.emit.apply(ba, ["pass", fullName].concat(args));
            }
        };
    }

    ba.add = function (name, options) {
        var refuteArgs;

        if (options.refute) {
            refuteArgs = options.refute.length;
        } else {
            refuteArgs = options.assert.length;
            options.refute = function () {
                return !options.assert.apply(this, arguments);
            };
        }

        var values = options && options.values; // TODO: Remove
        defineAssertion("assert", name, options.assert, options.assert.length, values);
        defineAssertion("refute", name, options.refute, refuteArgs, values);

        assert[name].message = options.assertMessage;
        refute[name].message = options.refuteMessage;

        if (options.expectation) {
            if (ba.expect && ba.expect.wrapAssertion) {
                ba.expect.wrapAssertion(name, options.expectation);
            } else {
                assert[name].expectationName = options.expectation;
                refute[name].expectationName = options.expectation;
            }
        }
    };

    function interpolate(string, property, value) {
        return string.replace(new RegExp("\\$\\{" + property + "\\}", "g"), value);
    }

    function interpolatePosArg(message, values) {
        var value;
        values = values || [];

        for (var i = 0, l = values.length; i < l; i++) {
            message = interpolate(message, i, ba.format(values[i]));
        }

        return message;
    }

    function interpolateProperties(msg, properties) {
        for (var prop in properties) {
            msg = interpolate(msg, prop, ba.format(properties[prop]));
        }

        return msg || "";
    }

    function fail(type, assertion, msg) {
        delete this.fail;
        var message = interpolateProperties(
            interpolatePosArg(ba[type][assertion][msg] || msg,
                              [].slice.call(arguments, 3)), this);
        ba.fail("[" + type + "." + assertion + "] " + message);
    }

    function isDate(value) {
        // Duck typed dates, allows objects to take on the role of dates
        // without actually being dates
        return typeof value.getTime == "function" &&
            value.getTime() == value.valueOf();
    }

    ba.isDate = isDate;

    // Fixes NaN === NaN (should be true) and
    // -0 === +0 (should be false)
    // http://wiki.ecmascript.org/doku.php?id=harmony:egal
    function egal(x, y) {
        if (x === y) {
            // 0 === -0, but they are not identical
            return x !== 0 || 1 / x === 1 / y;
        }
        
        // NaN !== NaN, but they are identical.
        // NaNs are the only non-reflexive value, i.e., if x !== x,
        // then x is a NaN.
        // isNaN is broken: it converts its argument to number, so
        // isNaN("foo") => true
        return x !== x && y !== y;
    }

    function areEqual(expected, actual) {
        if (egal(expected, actual)) {
            return true;
        }

        // Elements are only equal if expected === actual
        if (buster.isElement(expected) || buster.isElement(actual)) {
            return false;
        }

        // null and undefined only pass for null === null and
        // undefined === undefined
        /*jsl: ignore*/
        if (expected == null || actual == null) {
            return actual === expected;
        }
        /*jsl: end*/

        if (isDate(expected) || isDate(actual)) {
            return isDate(expected) && isDate(actual) &&
                expected.getTime() == actual.getTime();
        }

        var useCoercingEquality = typeof expected != "object" || typeof actual != "object";

        if (expected instanceof RegExp && actual instanceof RegExp) {
            if (expected.toString() != actual.toString()) {
                return false;
            }

            useCoercingEquality = false;
        }

        // Arrays can only be equal to arrays
        var expectedStr = toString.call(expected);
        var actualStr = toString.call(actual);

        // Coerce and compare when primitives are involved
        if (useCoercingEquality) {
            return expectedStr != "[object Array]" && actualStr != "[object Array]" &&
                expected == actual;
        }

        var expectedKeys = ba.keys(expected);
        var actualKeys = ba.keys(actual);

        if (isArguments(expected) || isArguments(actual)) {
            if (expected.length != actual.length) {
                return false;
            }
        } else {
            if (typeof expected != typeof actual || expectedStr != actualStr ||
                expectedKeys.length != actualKeys.length) {
                return false;
            }
        }

        var key;

        for (var i = 0, l = expectedKeys.length; i < l; i++) {
            key = expectedKeys[i];
            if (!Object.prototype.hasOwnProperty.call(actual, key) ||
                !areEqual(expected[key], actual[key])) {
                return false;
            }
        }

        return true;
    }

    ba.deepEqual = areEqual;

    assert = ba.assert = function assert(actual, message) {
        countAssertion();
        if (!assertEnoughArguments("assert", arguments, 1)) return;

        if (!actual) {
            var val = ba.format(actual);
            ba.fail(message || "[assert] Expected " + val + " to be truthy");
        } else {
            ba.emit("pass", "assert", message || "", actual);
        }
    };

    assert.toString = function () {
        return "buster.assert";
    };

    refute = ba.refute = function (actual, message) {
        countAssertion();
        if (!assertEnoughArguments("refute", arguments, 1)) return;

        if (actual) {
            var val = ba.format(actual);
            ba.fail(message || "[refute] Expected " + val + " to be falsy");
        } else {
            ba.emit("pass", "refute", message || "", actual);
        }
    };

    assert.message = "[assert] Expected ${0} to be truthy";
    ba.count = 0;

    ba.fail = function (message) {
        var exception = new Error(message);
        exception.name = "AssertionError";

        try {
            throw exception;
        } catch (e) {
            ba.emit("failure", e);
        }

        if (typeof ba.throwOnFailure != "boolean" || ba.throwOnFailure) {
            throw exception;
        }
    };

    ba.format = function (object) {
        return "" + object;
    };

    function msg(message) {
        if (!message) { return ""; }
        return message + (/[.:!?]$/.test(message) ? " " : ": ");
    }

    function actualAndExpectedMessageValues(actual, expected, message) {
        return [actual, expected, msg(message)]
    }

    function actualMessageValues(actual) {
        return [actual, msg(arguments[1])];
    }

    function actualAndTypeOfMessageValues(actual) {
        return [actual, typeof actual, msg(arguments[1])];
    }

    ba.add("same", {
        assert: function (actual, expected) {
            return egal(actual, expected);
        },
        refute: function (actual, expected) {
            return !egal(actual, expected);
        },
        assertMessage: "${2}${0} expected to be the same object as ${1}",
        refuteMessage: "${2}${0} expected not to be the same object as ${1}",
        expectation: "toBe",
        values: actualAndExpectedMessageValues
    });

    function multiLineStringDiff(actual, expected, message) {
        if (actual == expected) return true;

        var message = interpolatePosArg(assert.equals.multiLineStringHeading, [message]),
            actualLines = actual.split("\n"),
            expectedLines = expected.split("\n"),
            lineCount = Math.max(expectedLines.length, actualLines.length),
            lines = [];

        for (var i = 0; i < lineCount; ++i) {
            if (expectedLines[i] != actualLines[i]) {
                lines.push("line " + (i + 1) + ": " + (expectedLines[i] || "") +
                           "\nwas:    " + (actualLines[i] || ""));
            }
        }

        ba.fail("[assert.equals] " + message + lines.join("\n\n"));
        return false;
    }

    ba.add("equals", {
        assert: function (actual, expected) {
            if (typeof actual == "string" && typeof expected == "string" &&
                (actual.indexOf("\n") >= 0 || expected.indexOf("\n") >= 0)) {
                var message = msg(arguments[2]);
                return multiLineStringDiff.call(this, actual, expected, message);
            }

            return areEqual(actual, expected);
        },

        refute: function (actual, expected) {
            return !areEqual(actual, expected);
        },

        assertMessage: "${2}${0} expected to be equal to ${1}",
        refuteMessage: "${2}${0} expected not to be equal to ${1}",
        expectation: "toEqual",
        values: actualAndExpectedMessageValues
    });

    assert.equals.multiLineStringHeading = "${0}Expected multi-line strings to be equal:\n";

    ba.add("greater", {
        assert: function (actual, expected) {
            return actual > expected;
        },

        assertMessage: "${2}Expected ${0} to be greater than ${1}",
        refuteMessage: "${2}Expected ${0} to be less than or equal to ${1}",
        expectation: "toBeGreaterThan",
        values: actualAndExpectedMessageValues
    });

    ba.add("less", {
        assert: function (actual, expected) {
            return actual < expected;
        },

        assertMessage: "${2}Expected ${0} to be less than ${1}",
        refuteMessage: "${2}Expected ${0} to be greater than or equal to ${1}",
        expectation: "toBeLessThan",
        values: actualAndExpectedMessageValues
    });

    ba.add("defined", {
        assert: function (actual) {
            return typeof actual != "undefined";
        },
        assertMessage: "${2}Expected to be defined",
        refuteMessage: "${2}Expected ${0} (${1}) not to be defined",
        expectation: "toBeDefined",
        values: actualAndTypeOfMessageValues
    });

    ba.add("isNull", {
        assert: function (actual) {
            return actual === null;
        },
        assertMessage: "${1}Expected ${0} to be null",
        refuteMessage: "${1}Expected not to be null",
        expectation: "toBeNull",
        values: actualMessageValues
    });

    function match(object, matcher) {
        if (matcher && typeof matcher.test == "function") {
            return matcher.test(object);
        }

        if (typeof matcher == "function") {
            return matcher(object) === true;
        }

        if (typeof matcher == "string") {
            matcher = matcher.toLowerCase();
            var notNull = typeof object === "string" || !!object;
            return notNull && ("" + object).toLowerCase().indexOf(matcher) >= 0;
        }

        if (typeof matcher == "number") {
            return matcher == object;
        }

        if (typeof matcher == "boolean") {
            return matcher === object;
        }

        if (matcher && typeof matcher == "object") {
            for (var prop in matcher) {
                if (!match(object[prop], matcher[prop])) {
                    return false;
                }
            }

            return true;
        }

        throw new Error("Matcher (" + ba.format(matcher) + ") was not a " +
                        "string, a number, a function, a boolean or an object");
    }

    ba.match = match;

    ba.add("match", {
        assert: function (actual, matcher) {
            var passed;

            try {
                passed = match(actual, matcher);
            } catch (e) {
                return this.fail("exceptionMessage", e.message, msg(arguments[2]));
            }

            return passed;
        },

        refute: function (actual, matcher) {
            var passed;

            try {
                passed = match(actual, matcher);
            } catch (e) {
                return this.fail("exceptionMessage", e.message);
            }

            return !passed;
        },

        assertMessage: "${2}${0} expected to match ${1}",
        refuteMessage: "${2}${0} expected not to match ${1}",
        expectation: "toMatch",
        values: actualAndExpectedMessageValues
    });

    assert.match.exceptionMessage = "${1}${0}";
    refute.match.exceptionMessage = "${1}${0}";

    ba.add("isObject", {
        assert: function (actual) {
            return typeof actual == "object" && !!actual;
        },
        assertMessage: "${2}${0} (${1}) expected to be object and not null",
        refuteMessage: "${2}${0} expected to be null or not an object",
        expectation: "toBeObject",
        values: actualAndTypeOfMessageValues
    });

    ba.add("isFunction", {
        assert: function (actual) {
            return typeof actual == "function";
        },
        assertMessage: "${2}${0} (${1}) expected to be function",
        refuteMessage: "${2}${0} expected not to be function",
        expectation: "toBeFunction",
        values: function (actual) {
            return [("" + actual).replace("\n", ""), typeof actual, msg(arguments[1])];
        }
    });

    ba.add("isTrue", {
        assert: function (actual) {
            return actual === true;
        },
        assertMessage: "${1}Expected ${0} to be true",
        refuteMessage: "${1}Expected ${0} to not be true",
        expectation: "toBeTrue",
        values: actualMessageValues
    });

    ba.add("isFalse", {
        assert: function (actual) {
            return actual === false;
        },
        assertMessage: "${1}Expected ${0} to be false",
        refuteMessage: "${1}Expected ${0} to not be false",
        expectation: "toBeFalse",
        values: actualMessageValues
    });

    ba.add("isString", {
        assert: function (actual) {
            return typeof actual == "string";
        },
        assertMessage: "${2}Expected ${0} (${1}) to be string",
        refuteMessage: "${2}Expected ${0} not to be string",
        expectation: "toBeString",
        values: actualAndTypeOfMessageValues
    });

    ba.add("isBoolean", {
        assert: function (actual) {
            return typeof actual == "boolean";
        },
        assertMessage: "${2}Expected ${0} (${1}) to be boolean",
        refuteMessage: "${2}Expected ${0} not to be boolean",
        expectation: "toBeBoolean",
        values: actualAndTypeOfMessageValues
    });

    ba.add("isNumber", {
        assert: function (actual) {
            return typeof actual == "number" && !isNaN(actual);
        },
        assertMessage: "${2}Expected ${0} (${1}) to be a non-NaN number",
        refuteMessage: "${2}Expected ${0} to be NaN or another non-number value",
        expectation: "toBeNumber",
        values: actualAndTypeOfMessageValues
    });

    ba.add("isNaN", {
        assert: function (actual) {
            return typeof actual == "number" && isNaN(actual);
        },
        assertMessage: "${2}Expected ${0} to be NaN",
        refuteMessage: "${2}Expected not to be NaN",
        expectation: "toBeNaN",
        values: actualAndTypeOfMessageValues
    });

    ba.add("isArray", {
        assert: function (actual) {
            return toString.call(actual) == "[object Array]";
        },
        assertMessage: "${2}Expected ${0} to be array",
        refuteMessage: "${2}Expected ${0} not to be array",
        expectation: "toBeArray",
        values: actualAndTypeOfMessageValues
    });

    function isArrayLike(object) {
        return toString.call(object) == "[object Array]" ||
            (!!object && typeof object.length == "number" &&
            typeof object.splice == "function") ||
            ba.isArguments(object);
    }

    ba.isArrayLike = isArrayLike;

    ba.add("isArrayLike", {
        assert: function (actual) {
            return isArrayLike(actual);
        },
        assertMessage: "${2}Expected ${0} to be array like",
        refuteMessage: "${2}Expected ${0} not to be array like",
        expectation: "toBeArrayLike",
        values: actualAndTypeOfMessageValues
    });

    function captureException(callback) {
        try {
            callback();
        } catch (e) {
            return e;
        }

        return null;
    }

    ba.captureException = captureException;

    assert.exception = function (callback, exception, message) {
        countAssertion();
        if (!assertEnoughArguments("assert.exception", arguments, 1)) return

        if (!callback) {
            return;
        }

        var err = captureException(callback);
        message = msg(message);

        if (!err) {
            if (exception) {
                return fail.call({}, "assert", "exception", "typeNoExceptionMessage",
                                 message, exception);
            } else {
                return fail.call({}, "assert", "exception", "message",
                                 message, exception);
            }
        }

        if (exception && err.name != exception) {
            if (typeof window != "undefined" && typeof console != "undefined") {
                console.log(err);
            }

            return fail.call({}, "assert", "exception", "typeFailMessage",
                             message, exception, err.name, err.message);
        }

        ba.emit("pass", "assert.exception", message, callback, exception);
    };

    assert.exception.typeNoExceptionMessage = "${0}Expected ${1} but no exception was thrown";
    assert.exception.message = "${0}Expected exception";
    assert.exception.typeFailMessage = "${0}Expected ${1} but threw ${2} (${3})";
    assert.exception.expectationName = "toThrow";

    refute.exception = function (callback) {
        countAssertion();
        if (!assertEnoughArguments("refute.exception", arguments, 1)) return;

        var err = captureException(callback);

        if (err) {
            fail.call({}, "refute", "exception", "message",
                      msg(arguments[1]), err.name, err.message, callback);
        } else {
            ba.emit("pass", "refute.exception", callback);
        }
    };

    refute.exception.message = "${0}Expected not to throw but threw ${1} (${2})";
    refute.exception.expectationName = "toThrow";

    ba.add("near", {
        assert: function (actual, expected, delta) {
            return Math.abs(actual - expected) <= delta;
        },
        assertMessage: "${3}Expected ${0} to be equal to ${1} +/- ${2}",
        refuteMessage: "${3}Expected ${0} not to be equal to ${1} +/- ${2}",
        expectation: "toBeNear",
        values: function (actual, expected, delta, message) {
            return [actual, expected, delta, msg(message)];
        }
    });

    ba.add("hasPrototype", {
        assert: function (actual, protoObj) {
            return protoObj.isPrototypeOf(actual);
        },
        assertMessage: "${2}Expected ${0} to have ${1} on its prototype chain",
        refuteMessage: "${2}Expected ${0} not to have ${1} on its prototype chain",
        expectation: "toHavePrototype",
        values: actualAndExpectedMessageValues
    });

    ba.add("contains", {
        assert: function (haystack, needle) {
            for (var i = 0; i < haystack.length; i++) {
                if (haystack[i] === needle) {
                    return true;
                }
            }
            return false;
        },
        assertMessage: "${2}Expected [${0}] to contain ${1}",
        refuteMessage: "${2}Expected [${0}] not to contain ${1}",
        expectation: "toContain",
        values: actualAndExpectedMessageValues
    });

    ba.add("tagName", {
        assert: function (element, tagName) {
            if (!element.tagName) {
                return this.fail("noTagNameMessage", tagName, element, msg(arguments[2]));
            }

            return tagName.toLowerCase &&
                tagName.toLowerCase() == element.tagName.toLowerCase();
        },
        assertMessage: "${2}Expected tagName to be ${0} but was ${1}",
        refuteMessage: "${2}Expected tagName not to be ${0}",
        expectation: "toHaveTagName",
        values: function (element, tagName, message) {
            return [tagName, element.tagName, msg(message)];
        }
    });

    assert.tagName.noTagNameMessage = "${2}Expected ${1} to have tagName property";
    refute.tagName.noTagNameMessage = "${2}Expected ${1} to have tagName property";

    function indexOf(arr, item) {
        for (var i = 0, l = arr.length; i < l; i++) {
            if (arr[i] == item) {
                return i;
            }
        }

        return -1;
    }

    ba.add("className", {
        assert: function (element, className) {
            if (typeof element.className == "undefined") {
                return this.fail("noClassNameMessage", className, element, msg(arguments[2]));
            }

            var expected = typeof className == "string" ? className.split(" ") : className;
            var actual = element.className.split(" ");

            for (var i = 0, l = expected.length; i < l; i++) {
                if (indexOf(actual, expected[i]) < 0) {
                    return false;
                }
            }

            return true;
        },
        assertMessage: "${2}Expected object's className to include ${0} but was ${1}",
        refuteMessage: "${2}Expected object's className not to include ${0}",
        expectation: "toHaveClassName",
        values: function (element, className, message) {
            return [className, element.className, msg(message)];
        }
    });

    assert.className.noClassNameMessage = "${2}Expected object to have className property";
    refute.className.noClassNameMessage = "${2}Expected object to have className property";

    if (typeof module != "undefined") {
        ba.expect = function () {
            ba.expect = require("./buster-assertions/expect");
            return ba.expect.apply(exports, arguments);
        };
    }

    function isArguments(obj) {
        if (typeof obj != "object" || typeof obj.length != "number" ||
            toString.call(obj) == "[object Array]") {
            return false;
        }

        if (typeof obj.callee == "function") {
            return true;
        }

        try {
            obj[obj.length] = 6;
            delete obj[obj.length];
        } catch (e) {
            return true;
        }

        return false;
    }

    ba.isArguments = isArguments;

    ba.keys = function (object) {
        var keys = [];

        for (var prop in object) {
            if (Object.prototype.hasOwnProperty.call(object, prop)) {
                keys.push(prop);
            }
        }

        return keys;
    };
}());
