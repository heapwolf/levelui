var buster = require("buster");
var rr = require("../../lib/ramp-resources");
var iife = require("../../lib/processors/iife");
require("../test-helper");

buster.testCase("Processors", {
    "iife processor": {
        setUp: function () {
            this.resource = rr.createResource("/buster.js", {
                content: "var buster = {};"
            });
        },

        "wraps content in IIFE": function (done) {
            this.resource.addProcessor(iife());
            var content = "(function () {var buster = {};}.call(this));";

            assert.content(this.resource, content, done);
        },

        "exports single variable by assigning to global": function (done) {
            this.resource.addProcessor(iife(["buster"]));

            assert.content(this.resource,
                           "(function (global) {var buster = {};" +
                           "global.buster=buster;}.call(this, " +
                           "typeof global != \"undefined\" ? global : this));",
                           done);
        },

        "exports multiple variables by assigning to global": function (done) {
            this.resource.addProcessor(iife(["buster", "sinon"]));

            assert.content(this.resource,
                           "(function (global) {var buster = {};" +
                           "global.buster=buster;" +
                           "global.sinon=sinon;}.call(this, " +
                           "typeof global != \"undefined\" ? global : this));",
                           done);
        },

        "separates exports from contents with semicolon": function (done) {
            this.resource = rr.createResource("/buster.js", {
                content: "var buster = {}"
            });
            this.resource.addProcessor(iife(["buster"]));

            assert.content(this.resource,
                           "(function (global) {var buster = {};" +
                           "global.buster=buster;}.call(this, " +
                           "typeof global != \"undefined\" ? global : this));",
                           done);
        }
    }
});