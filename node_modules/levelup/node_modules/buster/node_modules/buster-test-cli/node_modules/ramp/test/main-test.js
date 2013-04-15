var buster = require("buster-node");
var assert = buster.assert;

var rampResources = require("ramp-resources");
var h = require("./helpers/test-helper");
var cp = require("child_process");
var sys = require("sys");

buster.testCase("Main", {
    setUp: function (done) {
        this.serverBundle = h.createServerBundle(0, this, done);
    },

    tearDown: function (done) {
        this.serverBundle.tearDown(done);
    },

    "test one browser": function (done) {
        var self = this;

        this.b.capture(done(function (e, browser) {
            assert.equals(e.slaves.length, 1);
            assert.match(e.slaves[0], e.slave);
        }));
    },

    "test multiple browsers": function (done) {
        var self = this;

        this.b.capture(function (e1, browser) {
            assert.equals(e1.slaves.length, 1);

            self.b.capture(function (e2, browser2) {
                assert.equals(e2.slaves.length, 2);

                var timesCalled = 0;
                self.c.on("slave:freed", function (e) {
                    switch(++timesCalled) {
                    case 1:
                        assert.equals(e.slaves.length, 1);
                        break;
                    case 2:
                        assert.equals(e.slaves.length, 0);
                        done();
                        break;
                    }
                });

                browser.kill().then(function () {
                    browser2.kill().then(function(){});
                });
            });
        });
    },

    "test loading second session": function (done) {
        var self = this;
        assert(true);
        var rs = rampResources.createResourceSet();

        this.b.capture(function (e, browser) {
            self.c.createSession(rs).then(function (sc1) {
                sc1.onLoad(function () {
                    sc1.end();
                });

                sc1.onUnload(function () {
                    self.c.createSession(rs).then(function (sc2) {
                        sc2.onLoad(done);
                    });
                });
            });
        });
    },

    "test recaptures when server restarts": function (done) {
        var self = this;
        var oldServerBundle = this.serverBundle;

        var timesCaptured = 0;

        this.c.connect();
        this.c.on("slave:captured", function () {
            if (++timesCaptured == 2) {
                assert(true);
                oldServerBundle.tearDownBrowsers().then(done);
            }
        });

        this.b.capture(function (slave, browser) {
            self.serverBundle.tearDownServer().then(function () {
                self.serverBundle = h.createServerBundle(self.port, self, function () {
                });
            });
        });
    },

    "test is able to relative path lookups in slaves": function (done) {
        var self = this;

        var rs = rampResources.createResourceSet();
        rs.addResource({
            path: "/",
            content: [
                '<!DOCTYPE html>',
                '<html>',
                '  <head>',
                '    <script src="foo.js"></script>',
                '  </head>',
                '  <body></body>',
                '</html>'].join("\n")
        });
        rs.addResource({
            path: "/foo.js",
            content: [
                'window.addEventListener("load", function () {',
                '  buster.emit("veryclever", 123);',
                '});'].join("\n")
        });

        this.b.capture(function (e, browser) {
            self.c.createSession(rs).then(function (sc) {
                sc.on("veryclever", done(function (e) {
                    assert.equals(e.data, 123);
                }));
            });
        });
    },

    "test provides buster.env.contextPath": function (done) {
        var self = this;

        var rs = rampResources.createResourceSet();
        rs.addResource({
            path: "/foo.js",
            content: 'var e = document.createElement("script"); e.src = buster.env.contextPath + "/bar.js"; document.body.appendChild(e);'
        });
        rs.addResource({
            path: "/bar.js",
            content: 'buster.emit("nicelydone", 123);'
        });
        rs.loadPath.append("/foo.js");

        this.b.capture(function (e, browser) {
            self.c.createSession(rs).then(function (sc) {
                sc.on("nicelydone", done(function (e) {
                    assert.equals(e.data, 123);
                }));
            });
        });
    },

    "test provides buster.env.id": function (done) {
        var self = this;

        var rs = rampResources.createResourceSet();
        rs.addResource({
            path: "/foo.js",
            content: 'buster.emit("kindofblue", buster.env.id);'
        });
        rs.loadPath.append("/foo.js");

        this.b.capture(function (e, browser) {
            var slave = e.slave;
            self.c.createSession(rs).then(function (sc) {
                sc.on("kindofblue", done(function (e) {
                    assert.equals(e.data, slave.id);
                }));
            });
        });
    },

    "test provides user agent": function (done) {
        var self = this;

        this.b.capture(done(function (e, browser) {
            assert.match(e.slave.userAgent, "PhantomJS");
        }));
    },

    "emits session lifecycle events to server client": function (done) {
        var self = this;
        var rs = rampResources.createResourceSet();
        var sessionClient;

        this.b.capture(function (e, browser) {
            var slave = e.slave;
            self.c.createSession(rs).then(function (sc) {
                sessionClient = sc;
            });
        });

        this.c.on("session:started", function (sess) {
            assert.equals(sess.id, sessionClient.sessionId);
            sessionClient.end();
        });
        this.c.on("session:ended", function (sess) {
            assert.equals(sess.id, sessionClient.sessionId);
            done();
        });
    },

    "kills session when server client spawning it dies": function (done) {
        var self = this;
        this.b.capture(function (e, browser) {
            var sc = cp.spawn("node", [__dirname + "/main-test-session-client.js", self.port]);
            sc.stdout.setEncoding("utf8");
            sc.stdout.on("data", function (data) {
                sys.print("[SC PROCESS] ", data);
            });

            self.c.on("session:started", function (sess) {
                sc.kill();
            });

            self.c.on("session:ended", function (sess) {
                assert(true);
                done();
            });
        });
    },

    "test emits event when slave dies": function (done) {
        this.b.capture(function (e, browser) {
            browser.kill();
        })

        this.c.on("slave:freed", done(function (e) {
            assert(true);
        }));
    }
});
