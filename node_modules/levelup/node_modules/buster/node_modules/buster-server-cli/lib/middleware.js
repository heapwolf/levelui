var fs = require("fs");
var ejs = require("ejs");
var path = require("path");
var ramp = require("ramp");
var platform = require("platform");
var rr = require("ramp-resources");
var TEMPLATE_ROOT = path.join(__dirname, "../views");

function template(templateRoot, name, locals, callback) {
    var templatePath = path.join(templateRoot, name + ".ejs");
    fs.readFile(templatePath, "utf-8", function (err, data) {
        if (err) { throw err; }
        callback(ejs.render(data, { locals: locals }));
    });
}

function addHeader(name, templateRoot, masterOfPuppets) {
    template(templateRoot, "header", { name: name }, function (string) {
        var rs = rr.createResourceSet();
        rs.addResource({ path: "/", content: string });
        masterOfPuppets.setHeader(rs, 80);
    });
}

module.exports = {
    create: function (httpServer, options) {
        var server = Object.create(this);
        options = options || {};
        server.templateRoot = options.templateRoot || TEMPLATE_ROOT;
        server.captureServer = ramp.createServer();
        server.captureServer.logger = options.logger;
        server.name = options.name;
        addHeader(server.name, server.templateRoot, server.captureServer);
        if (httpServer) { server.captureServer.attach(httpServer); }
        return server;
    },

    respond: function (req, res) {
        if (this.serveTemplate(req, res)) { return true; }
        return false;
    },

    serveTemplate: function (req, res) {
        if (req.url !== "/") { return; }
        res.writeHead(200, { "Content-Type": "text/html" });
        var slaves = this.captureServer.slaves().map(function (slave) {
            return platform.parse(slave.userAgent);
        });
        template(this.templateRoot, "index", {
            slaves: slaves,
            name: this.name
        }, function (string) {
            res.end(string);
        });
        return true;
    }
};
