/**
 * A simple client that reads a JSON file specifying a resource set, serializes
 * it and posts it to a server along with a mount point to have it served.
 * Resource sets are serialized using a cache manifest produced by the server.
 * This manifest helps ramp-resources not read things from disk if they are
 * already in an updated version on the server.
 */
var http = require("http");
var fs = require("fs");
var rs = require("../../lib/ramp-resources");
var B = require("buster-core");

if (process.argv.length < 3) {
    console.log("Usage:");
    console.log("    node publish.js resource-config.json /mount-point [port]");
    process.exit();
}

var PORT = parseInt(process.argv[4] || 8090, 10);

function getJsonBody(res, callback) {
    res.setEncoding("utf-8");
    var body = "";
    res.on("data", function (chunk) { body += chunk; });
    res.on("end", function () {
        callback(JSON.parse(body));
    });
}

function die(message, error) {
    console.log(message);
    console.log(error.stack);
    process.exit();
}

function getConfig(file, callback) {
    fs.readFile(file, "utf-8", function (err, content) {
        if (err) {
            die("Failed loading " + file, e);
        }
        try {
            callback(JSON.parse(content));
        } catch (e) {
            die(file + " contained invalid JSON", e);
        }
    });
}

function getCache(callback) {
    http.request({
        host: "localhost",
        port: PORT,
        method: "GET",
        path: "/cache"
    }, function (res) {
        res.setEncoding("utf-8");
        getJsonBody(res, callback);
    }).end();
}

var cached, config;

function publish() {
    if (!cached || !config) { return; }
    var resourceSet = rs.resourceSet.create(__dirname);
    resourceSet.addResources(config);
    console.log("Built resource set");
    resourceSet.serialize(cached).then(function (serialized) {
        if ("VERBOSE" in process.env) {
            console.log(serialized);
        }
        var req = http.request({
            host: "localhost",
            port: PORT,
            method: "POST",
            path: "/resources"
        }, function (res) {
            console.log("Mounted resource set", process.argv[2],
                        "on http://localhost:" + PORT + process.argv[3]);
        });

        var payload = JSON.stringify({
            mountPoint: process.argv[3],
            resourceSet: serialized
        });
        console.log("Transferring approximately", payload.length, "bytes");
        req.end(payload, "utf-8");
    });
}

getConfig(process.argv[2], function (cfg) {
    console.log("Loaded configuration", process.argv[2]);
    config = cfg;
    publish();
});

getCache(function (c) {
    console.log("Downloaded cache manifest");
    cached = c;
    publish();
});
