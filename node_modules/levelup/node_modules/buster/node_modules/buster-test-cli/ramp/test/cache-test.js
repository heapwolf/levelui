var buster = require("buster");
var assert = buster.assert;

var rampResources = require("ramp-resources");
var h = require("./helpers/test-helper");

buster.testCase("Cache", {
    setUp: function (done) {
        this.serverBundle = h.createServerBundle(0, this, done);
    },

    tearDown: function (done) {
        this.serverBundle.tearDown(done);
    },

    "test getting event from initialized cached session": function (done) {
        var self = this;

        this.b.capture(function (e, browser) {
            var rs = rampResources.createResourceSet();
            rs.addResource({
                path: "/test.js",
                content: 'buster.emit("some:event", 123);'
            });
            rs.loadPath.append("/test.js");

            self.c.createSession(rs, {cache: true}).then(function (sessionClient) {
                sessionClient.on("some:event", done(function (e) {
                    assert.equals(e.data, 123);
                }));
            });
        });
    }
});
