var buster = require("buster-node");
var assert = buster.assert;
var refute = buster.refute;

var h = require("./helpers/test-helper");
var rampTestHelper = require("../lib/ramp").testHelper;

buster.testCase("Test helper", {
    setUp: function (done) {
        this.serverBundle = h.createServerBundle(0, this, done);
        this.timeout = 4000;
    },

    tearDown: function (done) {
        this.serverBundle.tearDown(done);
    },

    "should capture a slave against an actual server": function (done) {
        var actualUA = "My user agent";
        var promise = rampTestHelper.captureSlave(this.port, actualUA);

        promise.then(done(function (e) {
            assert(e.e);
            assert.equals(e.e.slaves, [e.e.slave]);

            var slave = e.e.slave;
            assert(slave);
            assert.equals(slave.userAgent, actualUA);
        }));
    },

    "should provide teardown": function (done) {
        var actualUA = "My user agent";
        var promise = rampTestHelper.captureSlave(this.port, actualUA);

        promise.then(done(function (e) {
            assert(e.teardown);
            e.teardown();
        }));
    }
});
