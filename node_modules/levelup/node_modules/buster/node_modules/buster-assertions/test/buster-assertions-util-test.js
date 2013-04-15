if (typeof module === "object" && typeof require === "function") {
    var assert = require("assert");

    var buster = {
        util: require("buster-util"),
        assertions: require("../lib/buster-assertions")
    };
}

(function () {
    var create = function (obj) {
        function F() {}
        F.prototype = obj;
        return new F();
    };

    var ba = buster.assertions;
    var expect = ba.expect;
    expect();

    buster.util.testCase("IsArgumentsTest", {
        "should recognize real arguments object": function () {
            assert.ok(ba.isArguments(arguments));
        },

        "should reject primitive": function () {
            assert.ok(!ba.isArguments(42));
        },

        "should reject object without length": function () {
            assert.ok(!ba.isArguments({}));
        },

        "should reject array": function () {
            assert.ok(!ba.isArguments([]));
        }
    });

    buster.util.testCase("KeysTest", {
        "should return keys of object": function () {
            var obj = { a: 1, b: 2, c: 3 };

            assert.equal(ba.keys(obj).sort().join(""), "abc");
        },

        "should exclude inherited properties": function () {
            var obj = { a: 1, b: 2, c: 3 };
            var obj2 = create(obj);
            obj2.d = 4;
            obj2.e = 5;

            assert.deepEqual(ba.keys(obj2).sort().join(""), "de");
        }
    });

    buster.util.testCase("AddAssertionTest", {
        "should add expectation if expect property is set": function () {
            ba.add("isFoo", {
                assert: function (actual) {
                    return actual == "foo";
                },
                assertMessage: "Expected ${1} to be foo!",
                refuteMessage: "Expected not to be foo!",
                expectation: "toBeFoo"
            });

            expect("foo").toBeFoo();
        }
    });
}());
