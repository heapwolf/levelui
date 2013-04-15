/**
 * A simple server illustrating how to serve a resource set on the server using
 * the resource set middleware and cache (for optimal performance).
 */
var http = require("http");
var rs = require("../../lib/ramp-resources");
var HOUR = 1000 * 60 * 60;
var MB = 1024;

// These two objects should live as long as your server lives
var middleware = rs.resourceMiddleware.create("/resources");
var cache = rs.resourceSetCache.create({ ttl: HOUR, maxSize: 100 * MB });

/**
 * This function expects a payload, e.g.:
 * { mountPoint: "/somewhere", resourceSet: {} }
 * The resourceSet is deserialized, inflated by the cache then mounted on the
 * middleware under the provided path
 */
function mount(payload) {
    rs.resourceSet.deserialize(payload.resourceSet).then(function (rs) {
        cache.inflate(rs).then(function (resourceSet) {
            console.log("Mounting resource set at", payload.mountPoint);
            middleware.mount(payload.mountPoint, resourceSet);
        }, function (e) {
            console.log("Failed inflating resource set from cache:", e.stack);
        });
    }, function (e) {
        console.log("Failed deserializing resource set:", e.stack);
    });
}

function getJsonBody(req, callback) {
    req.setEncoding("utf-8");
    var body = "";
    req.on("data", function (chunk) { body += chunk; });
    req.on("end", function () {
        callback(JSON.parse(body));
    });
}

function serveIndex(req, res) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.write("<h1>ramp-resources webserver demo</h1>");
    res.write("<h2>Here are my resource sets:</h2>");
    res.write("<ul>");
    middleware.mountPoints().forEach(function (mp) {
        res.write("<li><a href=\"/resources" + mp + "/\">" + mp + "</a></li>");
    });
    res.write("</ul>");
    res.write("<h2>Here's my cache manifest</h2>");
    res.write("<p><a href=\"/cache\">Cache manifest</a></p>");
    res.end();
}

http.createServer(function (req, res) {
    if (req.method == "POST" && req.url == "/resources") {
        getJsonBody(req, mount);
        res.writeHead(200);
        return res.end();
    }

    if (req.method == "GET" && req.url == "/cache") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(cache.resourceVersions()));
    }

    if (middleware.respond(req, res)) {
        console.log("GET", req.url);
        return;
    }

    if (req.url == "/") {
        return serveIndex(req, res);
    }

    res.writeHead(418, { "X-I-AM": "A teapot" });
    res.end("Short and stout");
}).listen(parseInt(process.argv[2] || 8090, 10));
