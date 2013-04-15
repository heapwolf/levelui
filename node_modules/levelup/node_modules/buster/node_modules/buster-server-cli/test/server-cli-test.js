var helper = require("./test-helper").requestHelperFor("localhost", "9999");
var cliHelper = require("buster-cli/lib/test-helper");
var http = require("http");
var bane = require("bane");
var buster = require("buster");
var assert = buster.assert;
var refute = buster.refute;
var serverCli = require("../lib/server-cli");
var testServer = require("../lib/middleware");
var run = helper.runTest;

buster.testCase("buster-server binary", {
    setUp: function () {
        this.stub(process, "exit");
        this.stdout = cliHelper.writableStream("stdout");
        this.stderr = cliHelper.writableStream("stderr");
        this.cli = serverCli.create(this.stdout, this.stderr, {
            missionStatement: "Server for automating",
            binary: "buster-server"
        });
    },

    tearDown: function (done) {
        cliHelper.clearFixtures(done);
    },

    "run": {
        "prints to stderr if option handling fails": function (done) {
            helper.run(this, ["--hey"], done(function (err, server) {
                refute.stderr(/^$/);
            }));
        },

        "prints help message": function (done) {
            helper.run(this, ["--help"], done(function () {
                assert.stdout("Server for automating");
                assert.stdout("-h/--help");
                assert.stdout("-p/--port");
            }));
        },

        "starts server on default port": function (done) {
            var createServer = this.stub(this.cli, "createServer");
            helper.run(this, [], done(function (err, server) {
                assert.calledOnce(createServer);
                assert.calledWith(createServer, 1111);
            }));
        },

        "starts server on specified port": function (done) {
            var createServer = this.stub(this.cli, "createServer");
            helper.run(this, ["-p", "3200"], done(function () {
                assert.calledOnce(createServer);
                assert.calledWith(createServer, 3200);
            }));
        },

        "prints message if address is already in use": function (done) {
            var error = new Error("EADDRINUSE, Address already in use");
            this.stub(this.cli, "createServer").throws(error);
            helper.run(this, ["-p", "3200"], done(function () {
                assert.stderr("Address already in use. Pick another " +
                              "port with -p/--port to start buster-server");
            }));
        },

        "prints message if address is already in use (async)": function (done) {
            var server = bane.createEventEmitter();
            server.listen = this.spy();
            this.stub(http, "createServer").returns(server);
            this.stub(testServer, "create");

            helper.run(this, ["-p", "3200"], done(function () {
                assert.stderr("Address already in use. Pick another " +
                              "port with -p/--port to start buster-server");
            }.bind(this)));

            var error = new Error("EADDRINUSE, Address already in use");
            server.emit("error", error);
        },

        "binds to specified address": function (done) {
            var createServer = this.stub(this.cli, "createServer");
            helper.run(this, ["-b", "0.0.0.0"], done(function () {
                assert.calledOnce(createServer);
                assert.calledWithExactly(createServer, 1111, "0.0.0.0");
            }));
        },

        "binds to undefined when address not specified": function (done) {
            var createServer = this.stub(this.cli, "createServer");
            helper.run(this, [], done(function () {
                assert.calledOnce(createServer);
                assert.calledWithExactly(createServer, 1111, undefined);
            }));
        },

        "calls the function for capturing a headless browser if -c was passed": function(done) {
            var createServer = this.stub(this.cli, "createServer");
            var captureHeadlessBrowser = this.stub(this.cli, "captureHeadlessBrowser");

            helper.run(this, ["-c"], done(function () {
                assert.calledOnce(captureHeadlessBrowser);
                assert.calledWithExactly(captureHeadlessBrowser, "http://localhost:1111");
            }));
        },

        "calls the function for capturing a headless browser if --capture-headless was passed": function(done) {
            var createServer = this.stub(this.cli, "createServer");
            var captureHeadlessBrowser = this.stub(this.cli, "captureHeadlessBrowser");

            helper.run(this, ["--capture-headless"], done(function () {
                assert.calledOnce(captureHeadlessBrowser);
                assert.calledWithExactly(captureHeadlessBrowser, "http://localhost:1111");
            }));
        },

        "creates a phantom session if relevant parameter was passed": function(done) {
            var createServer = this.stub(this.cli, "createServer");
            var createPhantom = this.stub(this.cli.phantom, "create");

            helper.run(this, ["-c"], done(function() {
                assert.calledOnce(createPhantom);
            }));
        }
    },

    "createServer": {
        setUp: function (done) {
            this.server = this.cli.createServer(9999);
            this.ua = "Mozilla/5.0 (X11; Linux x86_64; rv:2.0.1) " +
                "Gecko/20100101 Firefox/4.0.1";
            done();
        },

        tearDown: function (done) {
            this.server.on("close", done);
            this.server.close();
        },

        "redirects client when capturing": function (done) {
            helper.get("/capture", done(function (res, body) {
                assert.equals(res.statusCode, 302);
                assert.match(res.headers.location,
                             /\/slaves\/[0-9a-z\-]+\/browser$/);
            }));
        },

        "serves header when captured": function (done) {
            helper.captureSlave(this.ua, function (e) {
                var url = e.e.slave.prisonPath.replace("/browser", "/header");
                helper.get(url, done(function (res, body) {
                    e.teardown();
                    assert.equals(res.statusCode, 200);
                    assert.match(body, "test slave");
                }));
            });
        },

        "serves static pages": function (done) {
            helper.get("/stylesheets/buster.css", done(function (res, body) {
                assert.equals(res.statusCode, 200);
                assert.match(body, "body {");
            }));
        },

        "serves templated pages": function (done) {
            helper.get("/", done(function (res, body) {
                assert.equals(res.statusCode, 200);
                assert.match(body, "<h1>Capture browser as test slave</h1>");
            }));
        },

        "reports no slaves initially": function (done) {
            helper.get("/", done(function (res, body) {
                assert.equals(res.statusCode, 200);
                assert.match(body, "<h2>No captured slaves</h2>");
            }));
        },

        "reports connected slaves": function (done) {
            helper.captureSlave(this.ua, function (slave) {
                helper.get("/", done(function (res, body) {
                    slave.teardown();
                    assert.equals(res.statusCode, 200);
                    assert.match(body, "<h2>Captured slaves (1)</h2>");
                }));
            });
        },

        "reports name of connected clients": function (done) {
            helper.captureSlave(this.ua, function (slave) {
                helper.get("/", done(function (res, body) {
                    slave.teardown();
                    assert.match(body, "<li class=\"firefox linux\">");
                    assert.match(body,
                                 "<h3>Firefox 4.0.1 on Linux 64-bit</h3>");
                }));
            });
        },

        "reports name newly connected ones": function (done) {
            helper.get("/", function (res, body) {
                helper.captureSlave(this.ua, function (slave) {
                    helper.get("/", done(function (res, body) {
                        slave.teardown();
                        assert.match(body, "<li class=\"firefox linux\">");
                        assert.match(body,
                                     "<h3>Firefox 4.0.1 on Linux 64-bit</h3>");
                    }));
                });
            }.bind(this));
        }
    }
});
