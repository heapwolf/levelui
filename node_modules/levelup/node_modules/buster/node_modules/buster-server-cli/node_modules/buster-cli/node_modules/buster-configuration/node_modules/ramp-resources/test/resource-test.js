var buster = require("buster");
var when = require("when");
var resource = require("../lib/resource");
require("./test-helper.js");

buster.testCase("Resources", {
    "create": {
        "fails without resource": function () {
            assert.invalidResource("/here", null, "No content");
        },

        "fails without content, or backend": function () {
            assert.invalidResource("/here", {}, "No content");
        },

        "fails with both content and backend": function () {
            assert.invalidResource("/here", {
                content: "Something",
                backend: "http://localhost:8080"
            }, "Resource cannot have both content and backend");
        },

        "fails with encoding and backend": function () {
            assert.invalidResource("/here", {
                encoding: "utf-8",
                backend: "http://localhost:8080"
            }, "Proxy resource cannot have hard-coded encoding");
        },

        "fails with invalid backend URL": function () {
            assert.invalidResource("/here", {
                backend: "::/::localhost"
            }, "Invalid proxy backend '::/::localhost'");
        },

        "does not fail with only etag": function () {
            var rs = resource.create("/path", { etag: "abc123" });
            assert.defined(rs);
        },

        "returns resource": function () {
            var rs = resource.create("/path", {
                content: "Something"
            });

            assert.defined(rs);
        },

        "creates cacheable resources by default": function () {
            var rs = resource.create("/path", {
                content: "Something"
            });

            assert(rs.cacheable);
        },

        "creates uncacheable resource": function () {
            var rs = resource.create("/path", {
                content: "Something",
                cacheable: false
            });

            assert.isFalse(rs.cacheable);
        }
    },

    "headers": {
        "are never null": function () {
            var rs = resource.create("/path", { content: "Hey" });
            assert.defined(rs.headers());
        },

        "reflect configured values": function () {
            var rs = resource.create("/path", {
                content: "Hey",
                headers: {
                    "Content-Type": "application/xhtml",
                    "Content-Length": 3
                }
            });

            assert.equals(rs.headers(), {
                "Content-Type": "application/xhtml",
                "Content-Length": "3"
            });
        },

        "has default Content-Type": function () {
            var rs = resource.create("/path", { content: "Hey" });

            assert.defined(rs.headers()["Content-Type"]);
        },

        "includes etag when set": function () {
            var rs = resource.create("/path", {
                etag: "1234abc",
                content: "Hey"
            });

            assert.equals(rs.header("ETag"), "1234abc");
        },

        "are empty for backend resource": function () {
            var rs = resource.create("/api", { backend: "http://localhost" });

            assert.equals(rs.headers(), {});
        }
    },

    "Content-Type": {
        "defaults to text/html and utf-8": function () {
            var rs = resource.create("/path", { content: "<!DOCTYPE html>" });

            assert.equals(rs.header("Content-Type"),
                          "text/html; charset=utf-8");
        },

        "defaults to text/html and set charset": function () {
            var rs = resource.create("/path", {
                encoding: "iso-8859-1",
                content: "<!DOCTYPE html>"
            });

            assert.equals(rs.header("Content-Type"),
                          "text/html; charset=iso-8859-1");
        },

        "defaults to text/css for CSS files": function () {
            var rs = resource.create("/path.css", {
                content: "body {}"
            });

            assert.equals(rs.header("Content-Type"),
                          "text/css; charset=utf-8");
        },

        "defaults to application/javascript for JS files": function () {
            var rs = resource.create("/path.js", {
                content: "function () {}"
            });

            assert.equals(rs.header("Content-Type"),
                          "application/javascript; charset=utf-8");
        },

        "does not include charset for binary files": function () {
            var rs = resource.create("/file.png", {
                content: new Buffer([])
            });

            assert.equals(rs.header("Content-Type"), "image/png");
        },

        "defaults encoding to base64 for binary files": function () {
            var rs = resource.create("/file.png", {
                content: new Buffer([])
            });

            assert.equals(rs.encoding, "base64");
        }
    },

    "with string content": {
        "serves string as content": function (done) {
            var rs = resource.create("/path.js", {
                content: "console.log(42);"
            });

            assert.content(rs, "console.log(42);", done);
        }
    },

    "with buffer content": {
        "assumes utf-8 encoded string": function (done) {
            var bytes = [231, 167, 129, 227, 129, 175, 227, 130, 172];
            var rs = resource.create("/path.txt", {
                content: new Buffer(bytes)
            });

            assert.content(rs, "私はガ", done);
        },

        "encodes png with base64": function (done) {
            var rs = resource.create("/3x3-cross.png", {
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

            assert.content(rs, "iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYA" +
                           "AABWKLW/AAAAAXNSR0IArs4c6QAAAAZiS0dEAGgAVwBWu/pLB" +
                           "wAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wBBRYICH" +
                           "0/co4AAAAIdEVYdENvbW1lbnQA9syWvwAAABRJREFUCNdjYGB" +
                           "g+M8AATAak/EfAFnNBPwrgq/rAAAAAElFTkSuQmCC", done);
        }
    },

    "respondsTo": {
        "true when path matches resource path": function () {
            var rs = resource.create("/file.js", { content: "Yo" });
            assert(rs.respondsTo("/file.js"));
        },

        "true when path sans trailing slash == resource path": function () {
            var rs = resource.create("/file", { content: "Yo" });
            assert(rs.respondsTo("/file/"));
        },

        "true when path == resource path sans trailing slash": function () {
            var rs = resource.create("/file/", { content: "Yo" });
            assert(rs.respondsTo("/file"));
        },

        "false for different paths": function () {
            var rs = resource.create("/styles.css", { content: "Yo" });
            refute(rs.respondsTo("/"));
        },

        "false for partial path match": function () {
            var rs = resource.create("/styles", { content: "Yo" });
            refute(rs.respondsTo("/styles/page.css"));
        }
    },

    "with backend": {
        "content is proxy instance": function () {
            var rs = resource.create("/api", { backend: "localhost" });

            assert.isObject(rs.content());
            assert.isFunction(rs.content().respond);
        },

        "content is always same proxy instance": function () {
            var rs = resource.create("/api", { backend: "localhost" });

            assert.same(rs.content(), rs.content());
        },

        "defaults port to 80": function () {
            var rs = resource.create("/api", { backend: "localhost" });

            assert.equals(rs.content().port, 80);
        },

        "defaults path to nothing": function () {
            var rs = resource.create("/api", { backend: "localhost" });

            assert.equals(rs.content().path, "");
        },

        "overrides default port": function () {
            var rs = resource.create("/api", { backend: "localhost:79" });

            assert.equals(rs.content().port, 79);
        },

        "overrides default path": function () {
            var rs = resource.create("/api", { backend: "localhost/yep" });

            assert.equals(rs.content().path, "/yep");
            assert.equals(rs.content().getProxyPath(), "/api");
        },

        "uses full URL": function () {
            var rs = resource.create("/api", {
                backend: "http://something:8080/crowd/"
            });

            assert.match(rs.content(), {
                host: "something",
                port: 8080,
                path: "/crowd"
            });
        },

        "respondsTo": {
            setUp: function () {
                this.rs = resource.create("/api", { backend: "localhost" });
            },

            "responds to requests for root path": function () {
                assert(this.rs.respondsTo("/api"));
            },

            "responds to requests for nested resource": function () {
                assert(this.rs.respondsTo("/api/2.0/index"));
            },

            "does not respond to requests outside root path": function () {
                refute(this.rs.respondsTo("/2.0/index"));
            }
        }
    },

    "with function content": {
        "resolves with content function return value": function (done) {
            var rs = resource.create("/api", { content: function () {
                return "42";
            } });

            assert.content(rs, "42", done);
        },

        "resolves content() when function promise resolves": function (done) {
            var d = when.defer();
            var rs = resource.create("/api", { content: function () {
                return d.promise;
            } });

            d.resolver.resolve("OMG");
            assert.content(rs, "OMG", done);
        },

        "rejects content() when function promise rejects": function (done) {
            var d = when.defer();
            var rs = resource.create("/api", { content: function () {
                return d.promise;
            } });

            d.resolver.reject("OMG");
            rs.content().then(function () {}, done(function (err) {
                assert.equals(err, "OMG");
            }));
        },

        "calls content function with resource as this": function () {
            var content = this.spy();
            var rs = resource.create("/api", { content: content });

            rs.content();

            assert.calledOnce(content);
            assert.calledOn(content, rs);
        }
    },

    "processors": {
        "process content": function (done) {
            var rs = resource.create("/path", {
                content: "Hey"
            });

            rs.addProcessor(function (resource, content) {
                return content + "!!";
            });

            assert.content(rs, "Hey!!", done);
        },

        "process content in a chain": function (done) {
            var rs = resource.create("/path", {
                content: "Hey"
            });

            rs.addProcessor(function (resource, content) {
                return content + "!!";
            });
            rs.addProcessor(function (resource, content) {
                return content + "??";
            });

            assert.content(rs, "Hey!!??", done);
        },

        "processes deferred content": function (done) {
            var rs = resource.create("/path", {
                content: function () { return "42"; }
            });

            rs.addProcessor(function (resource, content) {
                return content + "!!";
            });
            rs.addProcessor(function (resource, content) {
                return content + "??";
            });

            assert.content(rs, "42!!??", done);
        },

        "leaves content untouched if returns undefined": function (done) {
            var rs = resource.create("/path", {
                content: function () { return "42"; }
            });

            rs.addProcessor(function (resource, content) {});

            assert.content(rs, "42", done);
        },

        "blanks content by returning blank string": function (done) {
            var rs = resource.create("/path", {
                content: function () { return "42"; }
            });

            rs.addProcessor(function (resource, content) { return ""; });

            assert.content(rs, "", done);
        },

        "rejects if string content processor throws": function (done) {
            var rs = resource.create("/path", { content: "Hey" });
            rs.addProcessor(function () { throw new Error("Process fail"); });

            rs.content().then(done(function () {
                buster.assertions.fail("Expected to fail");
            }), done(function (err) {
                assert.match(err.message, "Process fail");
            }));
        },

        "rejects if function content processor throws": function (done) {
            var rs = resource.create("/path", {
                content: this.stub().returns("Hey")
            });
            rs.addProcessor(function () { throw new Error("Process fail"); });

            rs.content().then(done(function () {
                buster.assertions.fail("Expected to fail");
            }), done(function (err) {
                assert.match(err.message, "Process fail");
            }));
        },

        "creates etag hash": function () {
            var rs = resource.create("/path", {
                content: "Hey"
            });

            rs.addProcessor(function () {});

            assert.equals(rs.etag, "e4575dc296fb6f90f3d605701361e143b2ac55b9");
        },

        "updates existing etag": function () {
            var rs = resource.create("/path", {
                etag: "123",
                content: "Hey"
            });

            rs.addProcessor(function () {});

            assert.equals(rs.etag, "5f46fdd28899bea84ebb9af2a1d0ffa32c0cca05");
        },

        "always update existing etag": function () {
            var rs = resource.create("/path", {
                etag: "123",
                content: "Hey"
            });

            rs.addProcessor(function () {});
            rs.addProcessor(function () { return "OK"; });

            assert.equals(rs.etag, "4b0b20e81e9db06b84fc7589e22507eb3d3db04c");
        }
    },

    "process": {
        setUp: function () {
            this.content = this.stub().returns("Something");
            this.rs = resource.create("/path", { content: this.content });
        },

        "does not resolve content if no processors": function (done) {
            this.rs.process().then(done(function () {
                refute.called(this.content);
            }.bind(this)));
        },

        "resolves and processes content with one processor": function (done) {
            var processor = this.stub().returns("");
            this.rs.addProcessor(processor);

            this.rs.process().then(done(function () {
                assert.calledOnce(this.content);
                assert.calledOnceWith(processor, this.rs, "Something");
            }.bind(this)));
        },

        "yields null when not processing": function (done) {
            this.rs.process().then(done(function (content) {
                assert.isNull(content);
            }.bind(this)));
        },

        "yields processed content": function (done) {
            var processor = this.stub().returns("\m/");
            this.rs.addProcessor(processor);

            this.rs.process().then(done(function (content) {
                assert.equals(content, "\m/");
            }.bind(this)));
        },

        "fails if processor throws": function (done) {
            this.rs.addProcessor(this.stub().throws());

            this.rs.process().then(function () {}, done(function (err) {
                assert.defined(err);
            }));
        }
    },

    "enclose": {
        "wraps content in an iife": function (done) {
            var rs = resource.create("/path", {
                content: this.stub().returns("var a = 42;"),
                enclose: true
            });

            rs.content().then(done(function (content) {
                assert.equals(content, "(function () {var a = 42;}.call(this));");
            }.bind(this)));
        },

        "adds exports to iife": function (done) {
            var rs = resource.create("/path", {
                content: this.stub().returns("var a = 42;"),
                enclose: true,
                exports: ["a"]
            });

            rs.content().then(done(function (content) {
                assert.equals(content, "(function (global) {var a = 42;global.a=a;}.call(this, typeof global != \"undefined\" ? global : this));");
            }.bind(this)));
        }
    },

    "serialize": {
        "fails if content rejects": function (done) {
            var d = when.defer();
            d.resolver.reject("MEH");
            var res = resource.create("/meh", {
                content: function () { return d.promise; }
            });

            res.serialize().then(function () {}, done(function (err) {
                assert.defined(err);
                assert.match(err, "MEH");
            }));
        },

        "fails if content throws": function (done) {
            var res = resource.create("/meh", {
                content: function () { throw new Error("MEH"); }
            });

            res.serialize().then(function () {}, done(function (err) {
                assert.defined(err);
                assert.match(err, "MEH");
            }));
        },

        "includes enclose property if true": function (done) {
            var res = resource.create("/meh", {
                content: "Hey",
                enclose: true
            });

            res.serialize().then(done(function (serialized) {
                assert.isTrue(serialized.enclose);
            }));
        },

        "includes exports if set": function (done) {
            var res = resource.create("/meh", {
                content: "Hey",
                enclose: true,
                exports: ["a", "b"]
            });

            res.serialize().then(done(function (serialized) {
                assert.equals(serialized.exports, ["a", "b"]);
            }));
        },

        "fails if content processor throws": function (done) {
            var res = resource.create("/meh", {
                content: function () { return "Content"; }
            });

            res.addProcessor(function () { throw new Error("Meh"); });

            res.serialize().then(function () {}, done(function (err) {
                assert.defined(err);
                assert.match(err, "Meh");
            }));
        },

        "includes cacheable flag": function (done) {
            var res = resource.create("/meh", {
                content: function () { return "Content"; }
            });

            res.serialize().then(done(function (serialized) {
                assert(serialized.cacheable);
            }), function () {});
        }
    }
});
