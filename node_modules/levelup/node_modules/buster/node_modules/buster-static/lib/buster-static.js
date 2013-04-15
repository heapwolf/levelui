var B = require("buster-core");
var bCli = require("buster-cli");
var fs = require("fs");
var http = require("http");
var resourceMiddleware = require("ramp-resources").resourceMiddleware;

// TODO: add test coverage (integration test?)
function configureGroup(group, extensions) {
    group.extensions = extensions;
    group.on("load:framework", function (resourceSet) {
        // Test bed
        resourceSet.addResource({
            path: "/",
            file: __dirname + "/index.html"
        });

        // Wiring between framework and user test cases
        resourceSet.addResources([{
            file: require.resolve("buster-test/lib/buster-test/reporters/html"),
            path: "/buster/html-reporter.js"
        }, {
            file: require.resolve("buster-test/lib/buster-test/stack-filter"),
            path: "/buster/stack-filter.js"
        }, {
            file: require.resolve("./browser-wiring"),
            path: "/buster/static-browser-wiring.js"
        }]);

        // Some neat CSS
        resourceSet.addResource({
            file: require.resolve("buster-test/resources/buster-test.css"),
            path: "/buster-test.css"
        });

        // Runner
        var options = { resetDocument: false };
        if (group.config.hasOwnProperty("autoRun")) {
            options.autoRun = group.config.autoRun;
        }
        resourceSet.addResource({
            content: "buster.ready(" + JSON.stringify(options) + ");",
            path: "/buster/browser-run.js"
        });

        resourceSet.then(function (rs) {
            rs.loadPath.append(["/buster/stack-filter.js",
                                "/buster/html-reporter.js",
                                "/buster/static-browser-wiring.js"]);
        });
    });

    group.on("load:resources", function (resourceSet) {
        resourceSet.loadPath.append(["/buster/browser-run.js"]);
    });

    // Load in the builtins
    // group.bundleFramework();
}

function runWithConfigGroup(cli, resourceSet, options) {
    if (options["Output dir"].isSet) {
        cli.writeToDisk(resourceSet);
    } else {
        cli.startServer(resourceSet, options["--port"].value);
    }
}

function startServer(resourceSet, port, logger) {
    var middleware = resourceMiddleware.create();
    middleware.mount("/", resourceSet);
    var server = http.createServer(function (req, res) {
        if (middleware.respond(req, res)) { return; }
        res.writeHead(404);
        res.write("Not found");
        res.end();
    });
    server.listen(port);

    logger.log("Starting server on http://localhost:" + port + "/");

    return server;
}

function addCLIArgs(cli) {
    cli.addConfigOption("buster");

    cli.opt(["-p", "--port"], {
        description: "The port to run the server on.",
        defaultValue: 8282
    });

    cli.opd("Output dir", "The directory to write the files to.");
}

module.exports = B.extend({
    create: function (stdout, stderr, options) {
        options = options || {};
        var cli = bCli.create();
        return B.extend(B.create(this), {
            cli: cli,
            logger: cli.createLogger(stdout, stderr),
            extensions: options.extensions || []
        });
    },

    run: function (cliArgs) {
        var self = this;
        addCLIArgs(this.cli);
        this.cli.parseArgs(cliArgs, function (err, options) {
            if (err) {
                self.logger.error(err.message);
                process.exit(1);
            }

            self.cli.loadConfig(options, function (err, groups) {
                if (err) {
                    return self.logger.error(err.message);
                }
                if (groups[0]) {
                    configureGroup(groups[0], self.extensions);
                    groups[0].resolve().then(function (resourceSet) {
                        runWithConfigGroup(self, resourceSet, options);
                    }, function (err) {
                        self.logger.error(err.message);
                    });
                } else {
                    self.logger.error("No 'browser' group found in specified " +
                                      "configuration file.");
                }
            });
        });
    },

    startServer: function (resourceSet, port) {
        this.httpServer = startServer(resourceSet, port, this.logger);
    },

    writeToDisk: function (resourceSet) {
        console.log("Not yet supported");
    }
});
