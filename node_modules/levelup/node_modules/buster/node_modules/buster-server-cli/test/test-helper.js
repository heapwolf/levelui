var http = require("http");
var ramp = require("ramp");

var helper = module.exports = {
    run: function (tc, args, callback) {
        tc.cli.run(args, function (err, server) {
            if (server && server.close) { server.close(); }
            callback.call(tc, err, server);
        });
    },

    requestHelperFor: function (host, port) {
        var helper = Object.create(this);
        helper.host = host;
        helper.port = port;

        return helper;
    },

    request: function (method, url, headers, callback) {
        if (typeof headers === "function") {
            callback = headers;
            headers = {};
        }

        http.request({
            method: method.toUpperCase(),
            host: this.host || "localhost",
            port: this.getPort(),
            path: url,
            headers: headers
        }, function (res) {
            var body = "";
            res.on("data", function (chunk) { body += chunk; });
            res.on("end", function () { callback(res, body); });
        }).end();
    },

    getPort: function () {
        return this.port || 9999;
    },

    get: function (url, headers, callback) {
        return this.request("GET", url, headers, callback);
    },

    post: function (url, headers, callback) {
        return this.request("POST", url, headers, callback);
    },

    captureSlave: function (ua, callback) {
        ramp.testHelper.captureSlave(this.getPort(), ua).then(callback);
    }
};
