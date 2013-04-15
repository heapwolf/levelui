var buster = require("buster-node");
var assert = buster.assert;

var rampResources = require("ramp-resources");
var h = require("./helpers/test-helper");

buster.testRunner.timeout = 4000;
buster.testCase("Session lifecycle", {
    setUp: function (done) {
        this.serverBundle = h.createServerBundle(0, this, done);
    },

    tearDown: function (done) {
        this.serverBundle.tearDown(done);
    },

    "calls callbacks for instantly queued session": function (done) {
        var self = this;

        this.b.capture(function (e, browser) {
            var rs = rampResources.createResourceSet();

            self.c.createSession(rs).then(function (sessionClient) {
                var startSpy = self.spy();
                sessionClient.onStart(startSpy);
                var loadSpy = self.spy();
                sessionClient.onLoad(loadSpy);
                var endSpy = self.spy();
                sessionClient.onEnd(endSpy);
                var unloadSpy = self.spy();
                sessionClient.onUnload(unloadSpy);

                sessionClient.onLoad(function () {
                    sessionClient.end();
                });

                sessionClient.onUnload(done(function () {
                    assert(startSpy.calledOnce);
                    assert(loadSpy.calledOnce);
                    assert(startSpy.calledBefore(loadSpy));
                    assert.equals(loadSpy.getCall(0).args[0], [e.slave]);
                    assert(endSpy.calledOnce);
                    assert(loadSpy.calledBefore(endSpy));
                    assert(unloadSpy.calledOnce);
                    assert(endSpy.calledBefore(unloadSpy));
                }));
            });
        });
    },

    "calls callbacks when starting queued session": function (done) {
        var self = this;
        var rs = rampResources.createResourceSet();

        this.b.capture(function (e, browser) {
            self.c.createSession(rs).then(function (sc1) {
                sc1.onLoad(function () {
                    sc1.end();
                });
                sc1.onEnd(function () {
                    self.c.createSession(rs).then(function (sc2) {
                        var startSpy = self.spy();
                        sc2.onStart(startSpy);
                        var loadSpy = self.spy();
                        sc2.onLoad(loadSpy);
                        var endSpy = self.spy();
                        sc2.onEnd(endSpy);
                        var unloadSpy = self.spy();
                        sc2.onUnload(unloadSpy);

                        sc2.onLoad(function () {
                            sc2.end();
                        });

                        sc2.onUnload(done(function () {
                            assert(startSpy.calledOnce);
                            assert(loadSpy.calledOnce);
                            assert(startSpy.calledBefore(loadSpy));
                            assert.equals(loadSpy.getCall(0).args[0], [e.slave]);
                            assert(endSpy.calledOnce);
                            assert(loadSpy.calledBefore(endSpy));
                            assert(unloadSpy.calledOnce);
                        assert(endSpy.calledBefore(unloadSpy));
                        }));
                    });
                });
            });
        });
    }
});
