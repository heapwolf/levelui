var http = require("http");
var when = require("when");
var url = require("url");
var qs = require("querystring");
var path = require("path");
var resource = require("./resource");

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

    function getResource(mounted, path, mimeType) {
        var resourceSet = (mounted && mounted.resourceSet) || [];
        var resource = resourceSet.filter(function (resource) {
            return resource.respondsTo(path);
        })[0];
        if (!resource && mounted && path === "/") {
            return defaultResource;
        }
        var toServe = mimeType ? resource.getContentFor(mimeType) : resource;
        return toServe || resource;
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

    function loadPaths(mounted, paths, mimeType) {
        return paths.filter(function (path) {
            return !!mounted.resourceSet.get(path).getContentFor(mimeType);
        }).map(function (p) {
            var type = mounted.resourceSet.get(p).mimeType();
            var qParam = type !== mimeType ? "?rampMimeType=" + mimeType : "";
            return contextPath + mounted.mountPoint + p + qParam;
        });
    }

    function scriptTagsFor(paths) {
        return paths.reduce(function (html, path) {
            return html + "<script src=\"" + path + "\"></script>";
        }, "");
    }

    function linkTagsFor(paths) {
        return paths.reduce(function (html, path) {
            return html + "<link rel=\"stylesheet\" type=\"text/css\" " +
                "href=\"" + path + "\">";
        }, "");
    }

    function embedScripts(content, scripts) {
        if ((/\{\{scripts\}\}/).test(content)) {
            return content.replace("{{scripts}}", scripts);
        }
        if ((/<\/body>/).test(content)) {
            return content.replace("</body>", scripts + "</body>");
        }
        if (/<\/html>/.test(content)) {
            return content.replace("</html>", scripts + "</html>");
        }
        return content + scripts;
    }

    function embedStylesheets(content, styles) {
        if ((/\{\{styles\}\}/).test(content)) {
            return content.replace("{{styles}}", styles);
        }
        if ((/<\/head>/).test(content)) {
            return content.replace("</head>", styles + "</head>");
        }
        if (/<body>/.test(content)) {
            return content.replace("<body>", styles + "<body>");
        }
        if (/<html>/.test(content)) {
            return content.replace("<html>", "<html>" + styles);
        }
        return styles + content;
    }

    // Embed tags in the root resource that loads paths from the load path.
    //
    // JavaScript resources, or resources that have application/javascript
    // alternatives are loaded using script tags, and placed either where
    // "{{scripts}}" directs, or at the end of the document.
    //
    // Ramp resources uses application/javascript (over text/javascript), as
    // suggested by http://www.rfc-editor.org/rfc/rfc4329.txt
    //
    // CSS resources, or resources that have text/css alternatives are loaded
    // using link tags, and placed wither where "{{styles}}" directs, or, if
    // possible, in the head of the document. If neither "{{styles}}" or <head>
    // is present, add link tags to the beginning of the document.
    //
    function prepare(mounted, resource, content) {
        var paths = mounted.resourceSet.loadPath.paths();
        if (resource.path !== "/" || paths.length === 0) {
            return new Buffer(content, resource.encoding);
        }

        var mime = "application/javascript";
        var scripts = scriptTagsFor(loadPaths(mounted, paths, mime));
        var styles = linkTagsFor(loadPaths(mounted, paths, "text/css"));
        return embedStylesheets(embedScripts(content, scripts), styles);
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

    function parseUrl(reqUrl) {
        var parsed = url.parse(reqUrl);
        return {
            pathname: parsed.pathname.replace(ctxRegexp, "") || "/",
            params: qs.parse(parsed.query)
        };
    }

    function resourcePath(mounted, reqUrl) {
        var mountPoint = strippedPath(mounted && mounted.mountPoint);
        if (!mountPoint) { return reqUrl; }
        return reqUrl.replace(new RegExp("^" + mountPoint), "");
    }

    function unmount(mountPoint) {
        var resourceSet = resourceSets[strippedPath(mountPoint)];
        if (!resourceSet) { return; }
        resourceSet.filter(function (r) {
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
            var mp;
            for (mp in resourceSets) { unmount(mp); }
        },

        /**
         * Handle HTTP request. Returns true if request will be handled,
         * false otherwise (i.e. there is no matching resource in the resource
         * set).
         */
        respond: function (req, res) {
            if (!handle(req.url)) { return; }
            var parsedUrl = parseUrl(req.url);
            var path = parsedUrl.pathname;
            var mimeType = parsedUrl.params.rampMimeType;
            var mounted = getMounted(path);
            var resource = getResource(
                mounted,
                resourcePath(mounted, path),
                mimeType
            );
            if (resource) {
                if (resource.backend) {
                    serveProxyResource(mounted.mountPoint, resource, req, res);
                } else {
                    serveResource(mounted, resource, req, res);
                }
            } else {
                path = path + "/";
                mounted = getMounted(path);
                resource = getResource(
                    mounted,
                    resourcePath(mounted, path),
                    mimeType
                );
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
