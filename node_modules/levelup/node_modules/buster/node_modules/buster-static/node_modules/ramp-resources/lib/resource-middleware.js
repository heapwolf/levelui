var buster = require("buster-core");
var resource = require("./resource");
var http = require("http");
var when = require("when");
var url = require("url");
var path = require("path");

/**
 * Create middleware capable of serving a resource set over HTTP
 */
exports.create = function (contextPath) {
    var resourceSets = {}, ctxRegexp;

    var defaultResource = resource.create("/", {
        content: "<!DOCTYPE html><html lang=\"en\"><head>" +
            "<meta charset=\"utf-8\"><title>Buster.JS</title>" +
            "</head><body></body></html>"
    });

    function getResource(mounted, path) {
        var resourceSet = (mounted && mounted.resourceSet) || [];
        var resource = resourceSet.filter(function (resource) {
            return resource.respondsTo(path);
        })[0];
        if (!resource && mounted && path === "/") {
            return defaultResource;
        }
        return resource;
    }

    function getMounted(reqUrl) {
        var mountPoint;
        for (mountPoint in resourceSets) {
            if (reqUrl.indexOf(mountPoint) === 0) {
                return {
                    resourceSet: resourceSets[mountPoint],
                    mountPoint: mountPoint
                };
            }
        }
    }

    // TODO
    // The script injection may be replaced with a more generalized
    // load path loader. This would be plugged into the middleware, and
    // would allow different implementations to do different things -
    // script tags is one, loading scripts in svg another, AMD yet
    // another.
    //
    function prepare(mounted, resource, content) {
        var paths = mounted.resourceSet.loadPath.paths();
        if (resource.path !== "/" || paths.length === 0) {
            return new Buffer(content, resource.encoding);
        }

        var ctx = mounted.mountPoint;
        var resolvePaths = function (p) { return contextPath + ctx + p; };
        var scripts = paths.map(resolvePaths).map(function (p) {
            return "<script src=\"" + p + "\"></script>";
        }).join("");
        if (/{{scripts}}/.test(content)) {
            return content.replace("{{scripts}}", scripts);
        }
        if (/<\/body>/.test(content)) {
            return content.replace("</body>", scripts + "</body>");
        }
        if (/<\/html>/.test(content)) {
            return content.replace("</html>", scripts + "</html>");
        }
        return content + scripts;
    }

    function ok(res, headers, content) {
        res.writeHead(200, headers);
        res.end(content);
    }

    function resourceFailed(res, err) {
        res.writeHead(500);
        var errStr = err instanceof Error ? err.stack : err.toString();
        res.end("Failed serving resource: " + errStr);
    }

    function serveResource(mounted, resource, req, res) {
        try {
            resource.content().then(function (content) {
                var preparedContent = prepare(mounted, resource, content);
                ok(res, resource.headers(), preparedContent);
            }, function (err) {
                resourceFailed(res, err);
            });
        } catch (err) {
            resourceFailed(res, err);
        }
    }

    function serveProxyResource(mountPoint, resource, req, res) {
        var proxy = resource.content();
        proxy.setProxyPath(contextPath + mountPoint + resource.path);
        proxy.respond(req, res);
    }

    function strippedPath(path) {
        return (path || "").replace(/\/?$/, "");
    }

    function setContextPath(path) {
        contextPath = path;
        ctxRegexp = new RegExp("^" + strippedPath(path));
    }

    function handle(reqUrl) {
        return ctxRegexp.test(reqUrl);
    }

    function pathName(reqUrl) {
        return url.parse(reqUrl).pathname.replace(ctxRegexp, "") || "/";
    }

    function resourcePath(mounted, reqUrl) {
        var mountPoint = strippedPath(mounted && mounted.mountPoint);
        if (!mountPoint) { return reqUrl; }
        return reqUrl.replace(new RegExp("^" + mountPoint), "");
    }

    function unmount(mountPoint) {
        resourceSets[strippedPath(mountPoint)].filter(function (r) {
            return r.backend;
        }).forEach(function (proxy) {
            proxy.content().close();
        });

        delete resourceSets[strippedPath(mountPoint)];
    }

    setContextPath(contextPath || "");

    return {
        setContextPath: setContextPath,

        mountPoints: function () {
            return Object.keys(resourceSets);
        },

        mount: function (mountPoint, resourceSet) {
            if (!resourceSet) {
                throw new Error("Provide a resourceSet to mount");
            }
            resourceSets[strippedPath(mountPoint)] = resourceSet;
        },

        unmount: function (mountPoint) {
            if (mountPoint) { return unmount(mountPoint); }
            for (mountPoint in resourceSets) { unmount(mountPoint); }
        },

        /**
         * Handle HTTP request. Returns true if request will be handled,
         * false otherwise (i.e. there is no matching resource in the resource
         * set).
         */
        respond: function (req, res) {
            if (!handle(req.url)) { return; }
            var path = pathName(req.url);
            var mounted = getMounted(path);
            var resource = getResource(mounted, resourcePath(mounted, path));
            if (resource) {
                if (resource.backend) {
                    serveProxyResource(mounted.mountPoint, resource, req, res);
                } else {
                    serveResource(mounted, resource, req, res);
                }
            } else {
                path = path + "/";
                mounted = getMounted(path);
                resource = getResource(mounted, resourcePath(mounted, path));
                if (resource) {
                    res.writeHead(302, { location: path });
                    res.end();
                    return true;
                }
                return false;
            }
            return true;
        }
    };
};
