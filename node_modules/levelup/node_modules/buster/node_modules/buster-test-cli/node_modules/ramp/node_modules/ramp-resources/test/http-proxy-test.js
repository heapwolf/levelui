var buster = require("buster");
var http = require("http");
var httpProxy = require("../lib/http-proxy");
var h = require("./test-helper");

buster.testCase("HTTP proxy", {
    setUp: function (done) {
        var self = this;
        this.proxyMiddleware = httpProxy.create("localhost", 2222);

        this.proxy = http.createServer(function (req, res) {
            self.proxyMiddleware.respond(req, res);
        });

        this.backend = h.createProxyBackend(2222);
        this.proxy.listen(2233, done);
    },

    tearDown: function (done) {
        var cb = buster.countdown(2, done);
        this.backend.close(cb);
        this.proxy.on("close", cb);
        this.proxy.close();
    },

    "incoming requests": {
        "forwards request to backend": function (done) {
            h.req().end();
            this.backend.onRequest = done(function (req, res) {
                assert(true);
            });
        },

        "forwards method and path": function (done) {
            h.req({ method: "GET", path: "/buster" }).end();
            this.backend.onRequest = done(function () {
                assert.match(this.requests[0].req, {
                    method: "GET",
                    url: "/buster"
                });
            });
        },

        "forwards url with query parameters": function (done) {
            h.req({ path: "/buster?id=23" }).end();

            this.backend.onRequest = done(function (req, res) {
                assert.match(req, { url: "/buster?id=23" });
            });
        },

        "forwards POST body": function (done) {
            var req = h.req({ method: "POST" });
            req.write("Yo, hey");
            req.end();

            this.backend.onRequest = done(function (req, res, body) {
                assert.equals(body, "Yo, hey");
            });
        },

        "forwards headers": function (done) {
            h.req({ headers: {
                "Expires": "Sun, 15 Mar 2012 12:18 26 GMT",
                "X-Buster": "Yes"
            }}).end();

            this.backend.onRequest = done(function (req, res) {
                assert.match(req.headers, {
                    "expires": "Sun, 15 Mar 2012 12:18 26 GMT",
                    "x-buster": "Yes"
                });
            });
        }
    },

    "responses": {
        "sends response": function (done) {
            h.req({}, done(function () {
                assert(true);
            })).end();

            this.backend.onRequest = function (req, res) {
                res.writeHead(200);
                res.end();
            };
        },

        "forwards response code": function (done) {
            h.req({}, done(function (req, res) {
                assert.equals(res.statusCode, 202);
            })).end();

            this.backend.onRequest = function (req, res) {
                res.writeHead(202);
                res.end();
            };
        },

        "forwards response body": function (done) {
            h.req({}, done(function (req, res, body) {
                assert.equals(body, "Yo, hey");
            })).end();

            this.backend.onRequest = function (req, res) {
                res.writeHead(200);
                res.end("Yo, hey");
            };
        },

        "forwards headers": function (done) {
            h.req({}, done(function (req, res) {
                assert.match(res.headers, {
                    "expires": "Sun, 15 Mar 2012 12:18 26 GMT",
                    "x-buster": "Yes"
                });
            })).end();

            this.backend.onRequest = function (req, res) {
                res.writeHead(200, {
                    "Expires": "Sun, 15 Mar 2012 12:18 26 GMT",
                    "X-Buster": "Yes"
                });
                res.end();
            };
        },

        "responds with 503 when backend is down": function (done) {
            this.proxyMiddleware = httpProxy.create("localhost", 2220);

            h.req({}, done(function (req, res) {
                assert.equals(res.statusCode, 503);
            })).end();
        }
    },

    "close": {
        "closes pending request": function (done) {
            h.req({}, done(function (req, res) {
                assert.equals(res.statusCode, 503);
            })).end();

            this.backend.onRequest = function (req, res) {
                this.proxyMiddleware.close();
            }.bind(this);
        },

        "does not close finished requests": function (done) {
            var calls = 0;

            h.req({}, function (req, res) {
                assert.equals(res.statusCode, 200);

                h.req({}, done(function (req, res) {
                    assert.equals(res.statusCode, 503);
                })).end();
            }).end();

            this.backend.onRequest = function (req, res) {
                if (calls === 0) {
                    res.end("OK");
                } else {
                    refute.exception(function () {
                        this.proxyMiddleware.close();
                    }.bind(this));
                }
                calls++;
            }.bind(this);
        }
    },

    "backend context path": {
        setUp: function () {
            this.proxyMiddleware = httpProxy.create("localhost", 2222, "/app");
        },

        "forwards requests to scoped path": function (done) {
            h.req({ method: "GET", path: "/buster" }).end();

            this.backend.onRequest = done(function () {
                assert.equals(this.requests[0].req.url, "/app/buster");
            });
        },

        "avoids double slash": function (done) {
            this.proxyMiddleware.path = "/app/";
            h.req({ method: "GET", path: "/buster" }).end();

            this.backend.onRequest = done(function () {
                assert.equals(this.requests[0].req.url, "/app/buster");
            });
        },

        "strips context path from Location response header": function (done) {
            h.req({method: "GET", path: "/buster"}, done(function (req, res) {
                assert.equals(res.headers.location, "/buster");
            })).end();

            this.backend.onRequest = function (req, res) {
                res.writeHead(302, { "Location": "/app/buster" });
                res.end();
            };
        }
    },

    "proxy context path": {
        setUp: function () {
            this.proxyMiddleware = httpProxy.create("localhost", 2222);
            this.proxyMiddleware.setProxyPath("/buster");
        },

        "forwards requests to stripped path": function (done) {
            h.req({ method: "GET", path: "/buster/" }).end();

            this.backend.onRequest = done(function () {
                assert.equals(this.requests[0].req.url, "/");
            });
        },

        "adds missing slash": function (done) {
            h.req({ method: "GET", path: "/buster" }).end();

            this.backend.onRequest = done(function () {
                assert.equals(this.requests[0].req.url, "/");
            });
        },

        "avoids double slash": function (done) {
            this.proxyMiddleware.setProxyPath("/buster/");
            h.req({ method: "GET", path: "/buster/bundle.js" }).end();

            this.backend.onRequest = done(function () {
                assert.equals(this.requests[0].req.url, "/bundle.js");
            });
        },

        "adds context path to Location response header": function (done) {
            var url = "/buster/sumptn";
            h.req({ method: "GET", path: url }, done(function (req, res) {
                assert.equals(res.headers.location, "/buster/other");
            })).end();

            this.backend.onRequest = function (req, res) {
                res.writeHead(302, { "Location": "/other" });
                res.end();
            };
        }
    },

    "proxy context path and backend path": {
        setUp: function () {
            this.proxyMiddleware = httpProxy.create("localhost", 2222, "/foo");
            this.proxyMiddleware.setProxyPath("/bar");
        },

        "forwards requests to correct path": function (done) {
            h.req({method: "GET", path: "/bar/baz"}, done(function (r, res) {
                assert.equals(res.headers.location, "/bar/foo/zing");
            })).end();

            this.backend.onRequest = function (req, res) {
                assert.equals(req.url, "/foo/baz");
                res.writeHead(301, { Location: "/foo/zing" });
                res.end();
            };
        }
    }
});
