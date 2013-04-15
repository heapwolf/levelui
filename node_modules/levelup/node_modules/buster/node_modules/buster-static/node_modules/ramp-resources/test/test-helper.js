var B = require("buster");
var resource = require("../lib/resource");
var when = require("when");
var http = require("http");

function verifyResourceError(message, e) {
    if (e.name !== "InvalidResourceError") {
        this.fail("Expected resource.create to fail with " +
                  "InvalidResourceError, but failed with " + e.name);
    }
    if (!new RegExp(message).test(e.message)) {
        this.fail("Expected InvalidResourceError message (" +
                  e.message + ") to match " + message);
    }
    return true;
}

B.assertions.add("invalidResource", {
    assert: function (path, res, message) {
        try {
            if (typeof path === "string") {
                resource.create(path, res);
                return false;
            } else {
                var ret;
                path.addResource(res).then(function () {}, function (err) {
                    ret = verifyResourceError(message, err);
                });
                return ret;
            }
        } catch (e) {
            return verifyResourceError(message, e);
        }
    },
    assertMessage: "Expected to fail"
});

B.assertions.add("content", {
    assert: function (resource, expected, done) {
        resource.content().then(done(function (actual) {
            assert.same(actual, expected);
        }), done(function (err) {
            buster.log(err.stack);
            B.assertions.fail("content() rejected");
        }));
        return true;
    }
});

B.assertions.add("resourceEqual", {
    assert: function (res1, res2, done) {
        var equal = res1.path === res2.path &&
            res1.etag === res2.etag &&
            res1.encoding === res2.encoding &&
            B.assertions.deepEqual(res1.headers(), res2.headers());
        if (!equal) { return false; }

        when.all([res1.content(), res2.content()]).then(function (contents) {
            assert.equals(contents[0], contents[1]);
            done();
        });
        return true;
    },
    assertMessage: "Expected resources ${0} and ${1} to be the same"
});

exports.reqBody = function (res, encoding, callback) {
    var data = "";
    res.setEncoding(encoding);
    res.on("data", function (chunk) { data += chunk; });
    res.on("end", function () { callback(data); });
};

exports.req = function (opt, callback) {
    opt = opt || {};
    var encoding = opt.encoding || "utf-8";
    delete opt.encoding;
    var req = http.request(buster.extend({
        method: "GET",
        host: "localhost",
        port: 2233
    }, opt));
    req.on("response", function (res) {
        exports.reqBody(res, encoding, function (data) {
            if (callback) {
                callback(req, res, data);
            }
        });
    });
    return req;
};

exports.createServer = function createServer(middleware, done) {
    var server = http.createServer(function (req, res) {
        if (!middleware.respond(req, res)) {
            res.writeHead(418);
            res.end("Short and stout");
        }
    });
    server.listen(2233, done);
    return server;
};

exports.serverTearDown = function serverTearDown(done) {
    this.server.on("close", done);
    this.server.close();
};

exports.createProxyBackend = function (port) {
    var backend = { requests: [] };

    var server = http.createServer(function (req, res) {
        backend.requests.push({ req: req, res: res });
        if (backend.onRequest) {
            exports.reqBody(req, "utf-8", function (body) {
                backend.onRequest(req, res, body);
            });
        }
    });
    server.listen(port);

    backend.close = function (done) {
        var i, l;
        for (i = 0, l = backend.requests.length; i < l; ++i) {
            if (!backend.requests[i].res.ended) {
                backend.requests[i].res.end();
            }
        }
        server.on("close", done);
        server.close();
    };

    return backend;
};
