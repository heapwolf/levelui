/*jslint onevar: false, browser: true, eqeqeq: false, nomen: false,
         plusplus: false, regexp: false*/
/*global require, __dirname*/
if (typeof module === "object" && typeof require === "function") {
    var assert = require("assert");
    var sinon = require("sinon");
    var testHelper = require("../test-helper");

    var buster = {
        assertions: require("../../lib/buster-assertions"),
        util: require("buster-util")
    };
}

var expect = buster.assertions.expect;

buster.util.testCase("ExpectTest", {
    setUp: testHelper.setUp,
    tearDown: testHelper.tearDown,

    "should be function": function () {
        assert.equal(typeof expect, "function");
    },

    "should bind assert.equals to argument": function () {
        assert.doesNotThrow(function () {
            expect({}).toEqual({});
        });
    },

    "should fail assertion if a not equals b": function () {
        try {
            expect({ id: 42 }).toEqual({ bleh: "Nah" });
            throw new Error("Did not throw");
        } catch (e) {
            assert.equal(e.message, "[expect.toEqual] [object Object] expected to be equal to [object Object]");
        }
    },

    "should fail assertion by calling buster.assert.fail": function () {
        try {
            expect({ id: 42 }).toEqual({ bleh: "Nah" });
        } catch (e) {}

        assert.ok(buster.assertions.fail.calledOnce);
    },

    "should emit assertion pass event": function () {
        var listener = sinon.spy();
        buster.assertions.on("pass", listener);

        expect({ id: 42 }).toEqual({ id: 42 });

        assert.ok(listener.calledOnce);
    },

    "should emit assertion fail event": function () {
        var listener = sinon.spy();
        buster.assertions.on("failure", listener);
        buster.assertions.throwOnFailure = false;

        expect({ id: 42 }).toEqual({ id: 22 });

        assert.ok(listener.calledOnce);
    },

    "should expose refutation as expectation too": function () {
        try {
            expect({ id: 42 }).not.toEqual({ id: 42 });
            throw new Error("Did not throw");
        } catch (e) {
            assert.equal(e.message, "[expect.not.toEqual] [object Object] expected not to be equal to [object Object]");
        }
    },

    "should expose all assertions": function () {
        var obj = { id: 42 };

        expect(obj).toBe(obj);
        expect(obj).not.toBe({ id: 42 });
        expect(obj).toEqual({ id: 42 });
        expect(obj).not.toEqual({});
        expect(obj).toBeObject();
        expect(false).not.toBeObject();
        expect(function () {}).toBeFunction();
        expect({}).not.toBeFunction();
        expect(null).toBeDefined();
        expect(undefined).not.toBeDefined();
        expect(null).toBeNull();
        expect(42).not.toBeNull();
        expect(obj).toMatch({ id: 42 });
        expect(obj).not.toMatch({ id: 37 });
        expect(function () { throw new TypeError("Oops"); }).toThrow("TypeError");
        expect(function () {}).not.toThrow();
        expect({ tagName: "li" }).toHaveTagName("li");
        expect({ tagName: "ol" }).not.toHaveTagName("li");
        expect({ className: "a b c" }).toHaveClassName("b");
        expect({ className: "a b c" }).not.toHaveClassName("d");
        expect(true).toBeTruthy();
        expect(false).not.toBeTruthy();
        expect(false).toBeFalsy();
        expect(true).not.toBeFalsy();
        expect(3).toBeCloseTo(3, 0);
        expect(2).not.toBeCloseTo(3, 0.5);
        expect(2).toBeGreaterThan(1);
        expect(1).not.toBeGreaterThan(2);
        expect(1).toBeLessThan(2);
        expect(2).not.toBeLessThan(1);
        expect([0,1,2]).toContain(1);
        expect([0,1,2]).not.toContain(3);
    }
});
