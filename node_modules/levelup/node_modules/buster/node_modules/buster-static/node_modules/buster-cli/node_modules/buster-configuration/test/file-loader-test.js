var path = require('path');
var buster = require("buster");
var configuration = require("../lib/buster-configuration");
var fileLoader = require("../lib/file-loader");
var helper = require("./test-helper");

buster.testCase("File loader", {
    setUp: function () {
        helper.cdFixtures();
        this.loader = fileLoader.create(configuration.create(), "seaman");
    },

    tearDown: helper.clearFixtures,

    "fails if config does not exist": function (done) {
        this.loader.load("file.js", done(function (err) {
            assert.match(err.message, "file.js did not match any files");
        }));
    },

    "fails if config is a directory": function (done) {
        helper.mkdir("seaman");

        this.loader.load("seaman", done(function (err, config) {
            assert.match(err.message, "seaman did not match any files");
        }));
    },

    "fails if default config does not exist": function (done) {
        this.loader.load("", done(function (err, config) {
            buster.log(err, config);
            assert.defined(err);
            assert.match(err.message,
                         "No file provided, and none of\n" + "[" +
                         path.join("seaman.js") + ", " +
                         path.join("test", "seaman.js") + ", " +
                         path.join("spec", "seaman.js") +
                         "]" + " exist");
        }));
    },

    "fails if config contains errors": function (done) {
        helper.writeFile("seaman.js", "modul.exports");

        this.loader.load("seaman.js", done(function (err, config) {
            assert.match(err.message,
                         "Error loading configuration seaman.js");
            assert.match(err.message, "modul is not defined");
            assert.match(err.stack, /\d+:\d+/);
        }.bind(this)));
    },

    "with multiple available files": {
        setUp: function () {
            var json = JSON.stringify({
                "Node tests": { environment: "node" },
                "Browser tests": { environment: "browser" }
            });
            helper.writeFile("seaman.js", "module.exports = " + json);
            helper.writeFile("seaman2.js", "module.exports = " + json);
        },

        "loads configuration": function (done) {
            this.loader.load("seaman.js", done(function (err, config) {
                assert.defined(config.groups);
            }));
        },

        "loads multiple configuration files": function (done) {
            this.loader.load(["seaman.js", "seaman2.js"], done(function (err, config) {
                assert.equals(config.groups.length, 4);
            }));
        },

        "loads multiple configuration files from glob": function (done) {
            this.loader.load("seaman*", done(function (err, config) {
                assert.equals(config.groups.length, 4);
            }));
        }
    },

    "smart configuration loading": {
        setUp: function () {
            helper.mkdir("somewhere/nested/place");
            this.assertConfigLoaded = function (done) {
                this.loader.load([], done(function (err, config) {
                    refute.defined(err);
                }));
            };
        },

        tearDown: helper.clearFixtures,

        "with config in root directory": {
            setUp: function () {
                var cfg = { environment: "node" };
                helper.writeFile("seaman.js", "module.exports = " +
                                    JSON.stringify({ "Node tests": cfg }));
            },

            "finds configuration in parent directory": function (done) {
                process.chdir("somewhere");
                this.assertConfigLoaded(done);
            },

            "finds configuration three levels down": function (done) {
                process.chdir("somewhere/nested/place");
                this.assertConfigLoaded(done);
            }
        },

        "with config in root/test directory": {
            setUp: function () {
                var cfg = { environment: "node" };
                helper.mkdir("test");
                helper.writeFile("test/seaman.js", "module.exports = " +
                                    JSON.stringify({ "Node tests": cfg }));
            },

            "finds configuration in parent directory": function (done) {
                process.chdir("somewhere");
                this.assertConfigLoaded(done);
            },

            "finds configuration three levels down": function (done) {
                process.chdir("somewhere/nested/place");
                this.assertConfigLoaded(done);
            }
        }
    }
});
