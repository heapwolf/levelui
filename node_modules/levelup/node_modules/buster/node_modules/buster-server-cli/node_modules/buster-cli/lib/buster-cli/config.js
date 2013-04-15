var B = require("buster-core");
var Path = require("path");
var fs = require("fs");
var configuration = require("buster-configuration");
var Minimatch = require("minimatch").Minimatch;

function prop(name) {
    return function (object) {
        return object[name];
    };
}

function nameAndEnv(group) {
    return group.name + " (" + group.environment + ")";
}

function noGroupsError(cli, file, groups, options) {
    // groupFilter() => RegExp|null, if not null use the original string
    var groupFilter = cli.groupFilter(options) && options["-g"].value;
    var envFilter = cli.environmentFilter(options);
    var message = file + " contains no configuration groups";
    var mapper;

    if (envFilter) {
        mapper = prop("environment");
        message += " for environment '" + envFilter + "'";
    }
    if (groupFilter) {
        mapper = prop("name");
        message += " that matches '" + groupFilter + "'";
    }
    if (envFilter && groupFilter) { mapper = nameAndEnv; }
    if (envFilter || groupFilter) {
        message += "\nTry one of:\n  " + groups.map(mapper).join("\n  ");
    }

    return new Error(message);
}

function filterTests(filters, config) {
    var matchers = filters.map(function (filter) {
        return new Minimatch(filter);
    });
    if (matchers.length === 0) { return; }
    config.on("load:tests", function (rs) {
        rs.filter(function (resource) {
            var file = Path.join(rs.rootPath, resource.path);
            return matchers.every(function (m) { return !m.match(file); });
        }).forEach(function (resource) { rs.remove(resource.path); });
    });
}

function emptyFiles(config) {
    return config.sources.reduce(function (files, source) {
        if (config.groups.map(prop("source")).indexOf(source) < 0) {
            files.push(source);
        }
        return files;
    }, []);
}

module.exports = {
    create: function (cli, options) {
        options = options || {};
        var config = B.extend(B.create(this), {
            baseName: options.baseName,
            cli: cli
        });
        if (options.defaultLocations) {
            cli.defaultLocations = options.defaultLocations;
        }
        cli.opt(["-c", "--config"], {
            description: "Test configuration file",
            hasValue: true
        });
        return config;
    },

    addGroupOption: function () {
        this.cli.opt(["-g", "--config-group"], {
            description: "Test configuration group(s) to load",
            hasValue: true
        });
    },

    addTestsOption: function () {
        this.cli.opt(["-t", "--tests"], {
            description: "Test files (within active configuration) to run",
            hasValue: true
        });
    },

    addEnvOption: function () {
        this.cli.opt(["-e", "--environment"], {
            description: "Test configuration environment to load",
            hasValue: true
        });
    },

    groupFilter: function (options) {
        var filter = options["-g"] && options["-g"].value;
        return (filter && new RegExp(filter, "i")) || null;
    },

    environmentFilter: function (options) {
        return options["-e"] && options["-e"].value;
    },

    testFilters: function (options) {
        if (!options["-t"] || !options["-t"].value) { return []; }
        return options["-t"].value.split(",").map(function (path) {
            return Path.resolve(process.cwd(), path);
        });
    },

    requireConfigFiles: function (fileName, callback) {
        this.findFiles(process.cwd(), fileName, function (err, files) {
            var sig = this.opt.signature;
            if (files.length === 0 && fileName) {
                return callback(new Error(sig + ": " + fileName +
                                          " did not match any files"));
            }
            if (files.length === 0) {
                return callback(new Error(sig + " not provided, and none of\n[" +
                                          this.defaultFiles.join(", ") + "] exist"));
            }
            try {
                callback(null, files.map(function (f) {
                    return inflate(configuration.create(), f);
                }));
            } catch (e) {
                callback(e);
            }
        }.bind(this));
    },

    filter: function (config, options) {
        config.filterEnv(this.environmentFilter(options));
        config.filterGroup(this.groupFilter(options));
        filterTests(this.testFilters(options), config);
        return config;
    },

    loadConfig: function (options, callback) {
        configuration.create().loadFiles(
            (options["-c"].value || "").split(","),
            this.baseName,
            this.defaultLocations,
            function (err, config) {
                if (err) {
                    err.message = options["-c"].signature + ": " + err.message;
                    return callback(err);
                }
                var groups = config.groups.slice();
                this.filter(config, options);
                var files = emptyFiles(config);
                if (files.length > 0) {
                    return callback(noGroupsError(
                        this,
                        files.join(","),
                        groups,
                        options
                    ));
                }
                callback(null, config.groups);
            }.bind(this)
        );
    }
};


// TODO
// this.opt == -c
// this.groupOpt == -g
// this.testsOpt == -t
// this.envOpt == -e
