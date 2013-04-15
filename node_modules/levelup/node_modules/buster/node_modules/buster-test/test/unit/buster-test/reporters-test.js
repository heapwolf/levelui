if (typeof module === "object" && typeof require === "function") {
    var buster = { reporters: require("../../../lib/buster-test/reporters") };
    buster.util = require("buster-util");
    var assert = require("buster-assertions").assert;
    var sinon = require("sinon");

    buster.util.testCase("Reporters test", sinon.testCase({
        "should load built-in reporter": function () {
            assert.equals(buster.reporters.xml, buster.reporters.load("xml"));
        }
    }, "should"));
}