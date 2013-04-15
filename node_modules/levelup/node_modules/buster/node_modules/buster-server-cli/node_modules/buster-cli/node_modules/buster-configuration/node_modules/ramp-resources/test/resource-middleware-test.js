var buster = require("buster");
var resourceSet = require("../lib/resource-set");
var resourceMiddleWare = require("../lib/resource-middleware");
var when = require("when");
var Path = require("path");
var h = require("./test-helper");

function createResourceSets() {
    var resourceSets = {
        withBuster: resourceSet.create(),
        withSinon: resourceSet.create()
    };

    resourceSets.withBuster.addResource({
        path: "/buster.js",
        content: "OK",
        headers: { "X-Buster": "Yes" }
    });

    resourceSets.withBuster.loadPath.append("/buster.js");
    resourceSets.withSinon.addResource({ path: "/sinon.js", content: "Hey" });

    return resourceSets;
}

function proxySetUp(options) {
    return function (done) {
        this.backend = h.createProxyBackend(2222);
        this.resources = resourceMiddleWare.create();
        this.rs = resourceSet.create();
        this.rs.addResource({ path: options.path, backend: options.backend });
        this.resources.mount(options.mountPoint, this.rs);
        this.server = h.createServer(this.resources, done);
    };
}

function proxyTearDown(done) {
    var cb = buster.countdown(2, done);
    this.backend.close(cb);
    h.serverTearDown.call(this, cb);
}

buster.testCase("Resource middleware", {
    setUp: function () {
        this.sets = createResourceSets();
    },

    "no resource sets": {
        setUp: function (done) {
            this.resources = resourceMiddleWare.create();
            this.server = h.createServer(this.resources, done);
        },

        tearDown: h.serverTearDown,

        "arbitrary is not handled": function (done) {
            h.req({ path: "/hey" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "root is not handeled": function (done) {
            h.req({ path: "/" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "requests for context path is not handled": function (done) {
            this.resources.setContextPath("/ctx/1");
            h.req({ path: "/ctx/1" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "requests for context path with slash is not handled": function (done) {
            this.resources.setContextPath("/ctx/1");
            h.req({ path: "/ctx/1/" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "requests below contextPath are not handled": function (done) {
            this.resources.setContextPath("/resources");

            h.req({ path: "/elsewhere" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        }
    },

    "mount": {
        "fails if mounting nothing": function () {
            var middleware = resourceMiddleWare.create();
            assert.exception(function () {
                middleware.mount("/", null);
            });
        }
    },

    "resource set mounted": {
        setUp: function (done) {
            this.resources = resourceMiddleWare.create();
            this.resources.mount("/", this.sets.withBuster);
            this.server = h.createServer(this.resources, done);
        },

        tearDown: h.serverTearDown,

        "arbitrary path is not handled": function (done) {
            h.req({ path: "/arbitrary" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "serves root resource with loadPath scripts": function (done) {
            h.req({ path: "/" }, done(function (req, res, body) {
                assert.equals(res.headers["content-type"],
                              "text/html; charset=utf-8");
                assert.match(body, "<script");
                assert.match(body, "src=\"/buster.js\"");
            })).end();
        },

        "serves custom root resource with loadPath scripts": function (done) {
            this.sets.withBuster.addResource({
                path: "/",
                content: "<html></html>"
            });

            h.req({ path: "/" }, done(function (req, res, body) {
                assert.equals(res.headers["content-type"],
                              "text/html; charset=utf-8");
                assert.match(body, "<html><script");
                assert.match(body, "src=\"/buster.js\"");
                assert.match(body, "</script></html>");
            })).end();
        },

        "serves blank root resource with loadPath scripts": function (done) {
            this.sets.withBuster.addResource({
                path: "/",
                content: "<h1>Yo"
            });

            h.req({ path: "/" }, done(function (req, res, body) {
                assert.equals(res.headers["content-type"],
                              "text/html; charset=utf-8");
                assert.match(body, "<h1>Yo<script");
                assert.match(body, "src=\"/buster.js\"");
                assert.match(body, "</script>");
            })).end();
        },

        "serves root resource with custom scripts location": function (done) {
            this.sets.withBuster.addResource({
                path: "/",
                content: "<html>foo{{scripts}}bar</html>"
            });

            h.req({ path: "/" }, done(function (req, res, body) {
                refute.match(body, "{{scripts}}")
                assert.match(body, "<html>foo<script");
                assert.match(body, "src=\"/buster.js\"");
                assert.match(body, "</script>bar</html>");
            })).end();
        },

        "serves matching resource": function (done) {
            h.req({ path: "/buster.js" }, done(function (req, res, body) {
                assert.equals(res.statusCode, 200);
                assert.equals(body, "OK");
            })).end();
        },

        "responds with 500 if resource content fails": function (done) {
            var d = when.defer();
            d.resolver.reject("Bleh");
            this.sets.withBuster.addResource({
                path: "/dabomb",
                content: function () { return d.promise; }
            });

            h.req({ path: "/dabomb" }, done(function (req, res, body) {
                assert.equals(res.statusCode, 500);
                assert.match(body, "Bleh");
            })).end();
        },

        "responds with 500 and stack trace when available": function (done) {
            var d = when.defer();
            d.resolver.reject(new Error("Damnit"));
            this.sets.withBuster.addResource({
                path: "/dabomb",
                content: function () { return d.promise; }
            });

            h.req({ path: "/dabomb" }, done(function (req, res, body) {
                assert.equals(res.statusCode, 500);
                assert.match(body, Path.join("test", "resource-middleware-test"));
                assert.match(body, "Damnit");
            })).end();
        },

        "responds with 500 when resource content throws": function (done) {
            this.sets.withBuster.addResource({
                path: "/dabomb",
                content: function () { throw new Error("Oh noes"); }
            });

            h.req({ path: "/dabomb" }, done(function (req, res, body) {
                assert.equals(res.statusCode, 500);
                assert.match(body, "Oh noes");
            })).end();
        },

        "serves resource with headers": function (done) {
            h.req({ path: "/buster.js" }, done(function (req, res, body) {
                assert.equals(res.headers["content-type"],
                              "application/javascript; charset=utf-8");
                assert.equals(res.headers["x-buster"], "Yes");
            })).end();
        },

        "ignores url parameters": function (done) {
            h.req({ path: "/buster.js?123" }, done(function (req, res, body) {
                assert.equals(body, "OK");
            })).end();
        },

        "serves binary resource correctly": function (done) {
            this.sets.withBuster.addResource({
                path: "/3x3-cross.png",
                content: new Buffer([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0,
                                     13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0, 0,
                                     3, 8, 6, 0, 0, 0, 86, 40, 181, 191, 0, 0,
                                     0, 1, 115, 82, 71, 66, 0, 174, 206, 28,
                                     233, 0, 0, 0, 6, 98, 75, 71, 68, 0, 104,
                                     0, 87, 0, 86, 187, 250, 75, 7, 0, 0, 0, 9,
                                     112, 72, 89, 115, 0, 0, 11, 19, 0, 0, 11,
                                     19, 1, 0, 154, 156, 24, 0, 0, 0, 7, 116,
                                     73, 77, 69, 7, 220, 1, 5, 22, 8, 8, 125,
                                     63, 114, 142, 0, 0, 0, 8, 116, 69, 88, 116,
                                     67, 111, 109, 109, 101, 110, 116, 0, 246,
                                     204, 150, 191, 0, 0, 0, 20, 73, 68, 65, 84,
                                     8, 215, 99, 96, 96, 96, 248, 207, 0, 1, 48,
                                     26, 147, 241, 31, 0, 89, 205, 4, 252, 43,
                                     130, 175, 235, 0, 0, 0, 0, 73, 69, 78, 68,
                                     174, 66, 96, 130]),
                encoding: "base64"
            });

            h.req({
                path: "/3x3-cross.png",
                encoding: "base64"
            }, done(function (req, res, body) {
                assert.equals(body, "iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABW" +
                              "KLW/AAAAAXNSR0IArs4c6QAAAAZiS0dEAGgAVwBWu/pLBw" +
                              "AAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wBBRYI" +
                              "CH0/co4AAAAIdEVYdENvbW1lbnQA9syWvwAAABRJREFUCN" +
                              "djYGBg+M8AATAak/EfAFnNBPwrgq/rAAAAAElFTkSuQmCC");
            })).end();
        }
    },

    "resource set mounted at path": {
        setUp: function (done) {
            this.resources = resourceMiddleWare.create();
            this.resources.mount("/buster/2.0", this.sets.withBuster);
            this.server = h.createServer(this.resources, done);
        },

        tearDown: h.serverTearDown,

        "serves resource": function (done) {
            h.req({
                path: "/buster/2.0/buster.js"
            }, done(function (req, res, body) {
                assert.equals(res.statusCode, 200);
                assert.equals(body, "OK");
            })).end();
        },

        "ignores trailing slash in mount path": function (done) {
            this.resources.mount("/buster/2.0/", this.sets.withSinon);
            h.req({
                path: "/buster/2.0/buster.js"
            }, done(function (req, res, body) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "redirects to root resource": function (done) {
            this.resources.mount("/buster/2.0/", this.sets.withSinon);
            h.req({
                path: "/buster/2.0"
            }, done(function (req, res, body) {
                assert.equals(res.statusCode, 302);
                assert.equals(res.headers.location, "/buster/2.0/");
            })).end();
        },

        "serves separate resource set at different location": function (done) {
            this.resources.mount("/sinon/", this.sets.withSinon);
            h.req({
                path: "/sinon/sinon.js"
            }, done(function (req, res, body) {
                assert.equals(res.statusCode, 200);
                assert.equals(body, "Hey");
            })).end();
        },

        "does not leak between multiple resource sets": function (done) {
            this.resources.mount("/sinon/", this.sets.withSinon);
            h.req({
                path: "/sinon/buster.js"
            }, done(function (req, res, body) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "serves resource under context path": function (done) {
            this.resources.setContextPath("/MEGA-COMPU-GLOBAL-HYPER-NET");
            h.req({
                path: "/MEGA-COMPU-GLOBAL-HYPER-NET/buster/2.0/buster.js"
            }, done(function (req, res, body) {
                assert.equals(res.statusCode, 200);
                assert.equals(body, "OK");
            })).end();
        },

        "serves multiple sets in context path": function (done) {
            this.resources.setContextPath("/a/b/c");
            this.resources.mount("/sinon/", this.sets.withSinon);
            h.req({
                path: "/a/b/c/sinon/sinon.js"
            }, done(function (req, res, body) {
                assert.equals(res.statusCode, 200);
                assert.equals(body, "Hey");
            })).end();
        },

        "modifies script tags accordingly": function (done) {
            h.req({ path: "/buster/2.0/" }, done(function (req, res, body) {
                assert.match(body, "src=\"/buster/2.0/buster.js\"");
            })).end();
        },

        "modifies script tags with context path": function (done) {
            this.resources.setContextPath("/a/b/c");
            h.req({
                path: "/a/b/c/buster/2.0/"
            }, done(function (req, res, body) {
                assert.match(body, "src=\"/a/b/c/buster/2.0/buster.js\"");
            })).end();
        }
    },

    "with context path": {
        setUp: function (done) {
            this.resources = resourceMiddleWare.create("/ctx/1");
            this.resources.mount("/", this.sets.withBuster);
            this.server = h.createServer(this.resources, done);
        },

        tearDown: h.serverTearDown,

        "serves resource from context path": function (done) {
            h.req({ path: "/ctx/1/buster.js" }, done(function (req, res, body) {
                assert.equals(res.statusCode, 200);
                assert.equals(body, "OK");
            })).end();
        },

        "modifies script tags accordingly": function (done) {
            h.req({ path: "/ctx/1/" }, done(function (req, res, body) {
                assert.match(body, "src=\"/ctx/1/buster.js\"");
            })).end();
        },

        "serves default root resource at context path": function (done) {
            this.resources.setContextPath("/ctx/1");

            h.req({ path: "/ctx/1" }, done(function (req, res, body) {
                assert.match(body, "<!DOCTYPE html>");
            })).end();
        },

        "serves default root with trailing slash": function (done) {
            this.resources.setContextPath("/ctx/1/");

            h.req({ path: "/ctx/1/" }, done(function (req, res, body) {
                assert.match(body, "<!DOCTYPE html>");
            })).end();
        }
    },

    "with proxy resource matching path": {
        setUp: proxySetUp({
            path: "/app",
            mountPoint: "/",
            backend: "localhost:2222/app"
        }),

        tearDown: proxyTearDown,

        "hits backend through proxy": function (done) {
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/app");
            });
            h.req({ path: "/app" }).end();
        },

        "proxys request with url parameters": function (done) {
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/app?id=2");
            });
            h.req({ path: "/app?id=2" }).end();
        },

        "proxys any request matching root url": function (done) {
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/app/service.json");
            });
            h.req({ path: "/app/service.json" }).end();
        },

        "proxys POST requests": function (done) {
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/app/service.json");
                assert.equals(req.method, "POST");
            });
            h.req({
                method: "POST",
                path: "/app/service.json"
            }).end("Booyah");
        },

        "strips context path prior to proxy": function (done) {
            this.resources.setContextPath("/sessions");

            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/app/service.json");
                assert.equals(req.method, "POST");
            });
            h.req({
                method: "POST",
                path: "/sessions/app/service.json"
            }).end("Booyah");
        }
    },

    "with proxy resource on different path": {
        setUp: proxySetUp({
            path: "/app",
            mountPoint: "/",
            backend: "localhost:2222/test-app"
        }),

        tearDown: proxyTearDown,

        "hits backend through proxy": function (done) {
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/test-app");
            });
            h.req({ path: "/app" }).end();
        },

        "strips context path prior to proxy": function (done) {
            this.resources.setContextPath("/sessions");

            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/test-app/service.json");
                assert.equals(req.method, "POST");
            });
            h.req({
                method: "POST",
                path: "/sessions/app/service.json"
            }).end("Booyah");
        }
    },

    "with proxy resource on mount path": {
        setUp: proxySetUp({
            path: "/app",
            mountPoint: "/here/be/proxy",
            backend: "localhost:2222"
        }),

        tearDown: proxyTearDown,

        "hits backend through proxy": function (done) {
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/");
            });
            h.req({ path: "/here/be/proxy/app" }).end();
        },

        "hits backend through proxy with context path": function (done) {
            this.resources.setContextPath("/oh/my");
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/");
            });
            h.req({ path: "/oh/my/here/be/proxy/app" }).end();
        }
    },

    "with proxy resource on mount path and different path": {
        setUp: proxySetUp({
            path: "/app",
            mountPoint: "/here/be/proxy",
            backend: "localhost:2222/elsewhere"
        }),

        tearDown: proxyTearDown,

        "hits backend through proxy": function (done) {
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/elsewhere/stuff");
            });
            h.req({ path: "/here/be/proxy/app/stuff" }).end();
        },

        "hits backend through proxy with context path": function (done) {
            this.resources.setContextPath("/oh/my");
            this.backend.onRequest = done(function (req, res) {
                assert.equals(req.url, "/elsewhere");
            });
            h.req({ path: "/oh/my/here/be/proxy/app" }).end();
        }
    },

    "unmount": {
        setUp: function (done) {
            this.resources = resourceMiddleWare.create();
            this.resources.mount("/buster", this.sets.withBuster);
            this.server = h.createServer(this.resources, done);
        },

        tearDown: h.serverTearDown,

        "stops serving resource set at path": function (done) {
            this.resources.unmount("/buster");
            h.req({ path: "/buster/buster.js" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "ignores trailing slash when unmounting": function (done) {
            this.resources.unmount("/buster/");
            h.req({ path: "/buster/buster.js" }, done(function (req, res) {
                assert.equals(res.statusCode, 418);
            })).end();
        },

        "keeps serving other resource sets": function (done) {
            this.resources.mount("/sinon", this.sets.withSinon);
            this.resources.unmount("/buster");
            h.req({ path: "/sinon/sinon.js" }, done(function (req, res, body) {
                assert.equals(res.statusCode, 200);
                assert.equals(body, "Hey");
            })).end();
        },

        "with no argument unmounts everything": function (done) {
            this.resources.mount("/sinon", this.sets.withSinon);
            this.resources.unmount();
            h.req({ path: "/sinon/sinon.js" }, function (req, res, body) {
                assert.equals(res.statusCode, 418);
                h.req({ path: "/buster/buster.js" }, done(function (req, res, body) {
                    assert.equals(res.statusCode, 418);
                })).end();
            }).end();
        }
    },

    "unmounting proxy": {
        setUp: proxySetUp({
            path: "/app",
            mountPoint: "/here/be/proxy",
            backend: "localhost:2222/elsewhere"
        }),

        tearDown: proxyTearDown,

        "ends pending request": function (done) {
            var proxy = this.rs.get("/app").content();
            this.spy(proxy, "close");

            this.backend.onRequest = done(function (req, res) {
                this.resources.unmount();
                assert.calledOnce(proxy.close);
            }.bind(this));
            h.req({ path: "/here/be/proxy/app/stuff" }).end();
        }
    },

    "mountPoints": {
        setUp: function () {
            this.resources = resourceMiddleWare.create();
        },

        "returns empty array when nothing is mounted": function () {
            assert.equals(this.resources.mountPoints(), []);
        },

        "returns array of single mount point": function () {
            this.resources.mount("/buster", this.sets.withBuster);
            assert.equals(this.resources.mountPoints(), ["/buster"]);
        },

        "returns array of mount points in prioritized order": function () {
            this.resources.mount("/sinon/baby", this.sets.withSinon);
            this.resources.mount("/buster", this.sets.withBuster);
            assert.equals(this.resources.mountPoints(),
                          ["/sinon/baby", "/buster"]);
        },

        "does not include unmounted set": function () {
            this.resources.mount("/sinon/baby", this.sets.withSinon);
            this.resources.unmount("/sinon/baby");
            assert.equals(this.resources.mountPoints(), []);
        }
    }
});
