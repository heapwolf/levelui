var fs = require("fs");
var ejs = require("ejs");
var path = require("path");
var cli = require("buster-cli");
var bTest = require("buster-test");
var stackFilter = require("stack-filter");
var runAnalyzer = require("./run-analyzer");
var TEMPLATE_ROOT = path.join(__dirname, "../views");
var when = require("when");
var _ = require("lodash");

var colorOpt = {
    none: { color: false, bright: false },
    dim: { color: true, bright: false },
    bright: { color: true, bright: true }
};

function files(config) {
    return (config.resourceSet && config.resourceSet.load) || [];
}

function template(templateRoot, name, locals, callback) {
    var templatePath = path.join(templateRoot, name + ".ejs");
    var content = fs.readFileSync(templatePath, "utf-8");
    return ejs.render(content, { locals: locals });
}

function helpTopics(templateRoot) {
    return {
        get reporters () {
            var reporters = bTest.reporters;
            return template(templateRoot, "help-reporters", {
                reporters: Object.keys(reporters).filter(function (r) {
                    return typeof reporters[r] === "object";
                })
            });
        }
    };
}

function reporter(errMsg) {
    return function (arg) {
        if (!arg.value) { return; }
        try {
            bTest.reporters.load(arg.value);
        } catch (e) {
            throw new Error(
                arg.signature + ": " + errMsg.replace("${1}", arg.value) +
                    "\n" + e.message + "\nLearn more about reporters with `" +
                    path.basename(process.argv[1]) + " -h reporters`"
            );
        }
    };
};

function addCLIArgs(cli) {
    cli.opt(["-r", "--reporter"], {
        description: "Test output reporter",
        defaultValue: "dots",
        validators: [reporter("No such reporter '${1}'")]
    });

    cli.opt(["-C", "--color"], {
        description: "Output color scheme",
        values: ["dim", "bright", "none"],
        defaultValue: "bright"
    });

    cli.opt(["-s", "--server"], {
        description: "Hostname and port to a running buster-server instance",
        defaultValue: "http://localhost:1111"
    });

    cli.opt(["-R", "--reset"], {
        description: "Don't use cached resources on the server."
    }),

    cli.opt(["-W", "--warnings"], {
        description: "Warnings to print",
        values: ["fatal", "error", "warning", "all", "none"],
        defaultValue: "all"
    });

    cli.opt(["-F", "--fail-on"], {
        description: "Fail on warnings at this level",
        values: ["fatal", "error", "warning"],
        defaultValue: "fatal"
    });

    cli.opt(["-q", "--quiet-log"], {
        description: "Don't print log messages from passing tests"
    });

    cli.opt(["-o", "--release-console"], {
        description: "By default, Buster captures log messages from " +
                     "console.log and friends. It does so by replacing " +
                     "the global console object with the buster.console " +
                     "object. This option skips this hijacking."
    });

    cli.opt(["-p", "--static-paths"], {
        description: "Serve files over a static URL on the server. Reusing " +
                     "paths across test runs makes it possible to use " +
                     "breakpoints, but increases the risk of stale resources " +
                     "due to the browser caching too eagerly"
    });

    cli.opt(["-f", "--full-stacks"], {
        description: "Full, unfiltered stack traces for errors. " +
            "By default, Buster attempts to filter out test framework " +
            "files from your stack traces, so you can focus on your side " +
            "of the story. For the really nasty cases though, it helps " +
            "being able to see everything untouched."
    });

    cli.opd("FILTER", {
        description: "Partial match against names of tests to run",
        greedy: true
    });

    cli.shorthand("--node", ["-e", "node"]);
    cli.shorthand("--browser", ["-e", "browser"]);
}

var EX_SOFTWARE = 70;

function exitCode(runs) {
    var tests = 0;
    for (var i = 0, l = runs.length; i < l; ++i) {
        if (runs[i].error) { return runs[i].error.code || EX_SOFTWARE; }
        if (!runs[i].results.ok) { return 1; }
        tests += runs[i].results.tests || 0;
    }
    return tests > 0 ? 0 : 1;
}

function serverConfig(args) {
    var server = args["--server"].value;
    server = (/^:/.test(server) ? "127.0.0.1" : "") + server;
    return (!/^http\:\/\//.test(server) ? "http://" : "") + server;
}

function prepareOptions(prefs, args) {
    return _.extend({
        reporter: args["--reporter"].value,
        filters: args.FILTER.value,
        cwd: process.cwd(),
        server: serverConfig(args),
        cacheResources: !args["--reset"].isSet,
        warnings: args["--warnings"].value,
        failOn: args["--fail-on"].value,
        captureConsole: !cli.pref(prefs, args["--release-console"], "test.releaseConsole"),
        staticResourcesPath: args["--static-paths"].isSet,
        logPassedMessages: !cli.pref(prefs, args["--quiet-log"], "test.quietLog")
    }, colorOpt[cli.pref(prefs, args["--color"], "test.color")]);
}

function addExtensions(extensions, env, config) {
    var ext = extensions && extensions[env] || [];
    config.extensions = ext.concat(config.extensions || []);
}

function configureStackFilters(prefs, args) {
    if (cli.pref(prefs, args["--full-stacks"], "test.fullStacks")) {
        stackFilter.filters = [];
    } else {
        stackFilter.filters = [
            "buster/bundle",
            "browser/prison",
            "buster/node_modules"
        ];
    }

    if (buster) {
        buster.stackFilter = stackFilter;
    }
}

module.exports = {
    create: function (stdout, stderr, options) {
        options = options || {};
        var c = cli.create(options);
        var logger = c.createLogger(stdout, stderr);
        if (options.missionStatement) {
            c.addHelpOption(
                options.missionStatement,
                options.description || "",
                helpTopics(options.templateRoot || TEMPLATE_ROOT)
            );
        }
        return _.extend(Object.create(this), {
            cli: c,
            logger: logger,
            runners: options.runners || {},
            configBaseName: options.configBaseName || "buster",
            preferences: options.preferences,
            extensions: options.extensions
        });
    },

    run: function (cliArgs, callback) {
        callback = callback || function () {};
        this.cli.addConfigOption(this.configBaseName);
        addCLIArgs(this.cli);
        this.cli.parseArgs(cliArgs, function (err, options) {
            if (err || this.cli.loggedHelp) {
                return callback(err, !err && this);
            }
            configureStackFilters(this.preferences, options);
            this.cli.loadConfig(options, function (err, groups) {
                if (err) {
                    this.logger.e(err.message);
                    return callback(err);
                }
                this.runConfigGroups(
                    groups, prepareOptions(this.preferences, options), callback
                );
            }.bind(this));
        }.bind(this));
    },

    runConfigGroups: function (configGroups, options, callback) {
        var runs = [];
        var groups = configGroups.slice();
        var nextGroup = function (err, results) {
            if (err || results) { runs.push({ error: err, results: results }); }
            var config = groups.shift();
            if (!config) {
                this.summary(runs);
                return this.exit(exitCode(runs), callback);
            }
            this.runConfig(config, options, nextGroup);
        }.bind(this);
        nextGroup();
    },

    runConfig: function (config, options, callback) {
        addExtensions(this.extensions, config.environment, config);
        this.logger.info("Running tests:", config.name);
        this.logger.debug("Loading:", "\n  " + files(config).join("\n  "));
        this.loadRunner(config.environment, function (err, runner) {
            if (err) {
                this.logger.error("Unable to run configuration '" +
                                  config.name + "': " + err.message);
                return callback(err);
            }
            var analyzer = runAnalyzer.create(this.logger, options);
            analyzer.run(runner, config, callback);
        }.bind(this));
    },

    loadRunner: function (env, callback) {
        var runnerModule = this.runners[env];
        if (!runnerModule) {
            return callback(new Error("No runner for environment '" + env +
                                      "'.\nTry one of: " +
                                      Object.keys(this.runners).join(", ")));
        }
        callback(null, _.extend(Object.create(runnerModule), {
            logger: this.logger
        }));
    },

    summary: function (runs) {
        var err, i, l;
        for (i = 0, l = runs.length; i < l; ++i) {
            if (runs[i].error) {
                err = runs[i].error;
                this.logger.error(err.message);
                this.logger.info(err.stack);
                return;
            }
        }
    },

    exit: function (exitCode, callback) {
        callback(exitCode);
        //this.cli.exit(exitCode);
        flushAndShutdown(exitCode);
    },

    // TODO/TMP: Not sure about this
    runners: {
        get node() { return require("./runners/node"); },
        get browser() { return require("./runners/browser"); }
    }
};

function flushAndShutdown(exitCode) {
    setTimeout(function () {
        process.exit(exitCode);
    }, 100);

    process.stdout.on("drain", function() {
        process.exit(exitCode);
    });

    process.stderr.on("drain", function() {
        process.exit(exitCode);
    });
}
