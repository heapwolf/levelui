var buster = require("buster");
var assert = buster.assert;

var rampResources = require("ramp-resources");
var h = require("./helpers/test-helper");

buster.testCase("Joinable and unjoinable", {
    setUp: function (done) {
        this.serverBundle = h.createServerBundle(0, this, done);
    },

    tearDown: function (done) {
        this.serverBundle.tearDown(done);
    },

    "starting a session with no slaves captured": function (done) {
        var rs = rampResources.createResourceSet();
        this.c.createSession(rs, {}).then(function (sessionClient) {
            sessionClient.onAbort(done(function (e) {
                assert(e.error);
            }));
        });
    }
});
