var buster = require("buster");
var busterCli = require("../lib/buster-cli");
var cliHelper = require("../lib/test-helper");
var v = busterCli.validators;

buster.testCase("buster-cli", {
    setUp: function () {
        this.cli = busterCli.create();
        this.stub(this.cli, "exit");
        var stdout = this.stdout = cliHelper.writableStream("stdout");
        var stderr = this.stderr = cliHelper.writableStream("stderr");
        this.logger = this.cli.createLogger(this.stdout, this.stderr);
    },

    "logger level": {
        "is set to log by default": function () {
            this.logger.info("Yo man");
            this.logger.log("Hey");

            refute.stdout("Yo man");
            assert.stdout("Hey");
        },

        "is set to info with --log-level": function (done) {
            this.cli.parseArgs(["--log-level", "info"], done(function () {
                this.logger.info("Yo man");
                this.logger.log("Hey");

                assert.stdout("Yo man");
            }.bind(this)));
        },

        "includes --log-level in help output": function (done) {
            this.cli.addHelpOption();
            this.cli.parseArgs(["-h"], done(function () {
                assert.stdout("-l/--log-level");
                assert.stdout("Set logging level");
            }));
        },

        "fails for -l without argument": function (done) {
            this.cli.parseArgs(["-l"], done(function () {
                assert.stderr("No value specified");
            }.bind(this)));
        },

        "fails if providing illegal logging level": function (done) {
            this.cli.parseArgs(["-l", "dubious"], done(function () {
                assert.stderr("one of [error, warn, log, info, debug], " +
                              "got dubious");
            }));
        },

        "//is set to info with -v": function (done) {
            this.cli.parseArgs(["-v"], done(function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");

                refute.stdout("Yo man");
                assert.stdout("Hey");
            }.bind(this)));
        },

        "//is set to debug with -vv": function (done) {
            this.cli.parseArgs(["-vv"], done(function () {
                this.logger.debug("Yo man");
                this.logger.info("Hey");

                assert.stdout("Yo man");
            }.bind(this)));
        },

        "fails if setting -v more than twice": function (done) {
            this.cli.parseArgs(["-vvv"], done(function () {
                assert.stderr("-v/--verbose: can only be set 2 times.");
            }));
        }
    },

    "generic help output": {
        "includes mission statement": function (done) {
            var statement = "A small CLI that only lives in the test suite.";
            this.cli.addHelpOption(statement);

            this.cli.parseArgs(["--help"], done(function () {
                assert.stdout(statement);
            }));
        },

        "includes description": function (done) {
            var desc = "How about that.";
            this.cli.addHelpOption("Yo", desc);
            this.cli.parseArgs(["--help"], done(function () {
                assert.stdout(desc);
            }));
        },

        "lists help output for all options, including --help": function (done) {
            var portOpt = this.cli.opt(["-p", "--port"], {
                description: "Help text is here."
            });
            this.cli.addHelpOption();
            this.cli.parseArgs(["--help"], done(function () {
                assert.stdout(/-h\/--help \s*Show this message\./);
                assert.stdout(/-p\/--port \s*Help text is here\./);
            }));
        }
    },

    "help topics": {
        setUp: function () {
            this.helpTopics = {
                "topic": "This is the text for the topic.",
                "other": "Another topic"
            };
            this.cli.addHelpOption("Yo", "Here ya go", this.helpTopics);
        },

        "are listed with the description of --help": function (done) {
            this.cli.parseArgs(["--help"], done(function () {
                assert.stdout("See also -h/--help [topic,other].");
            }));
        },

        "prints topic help with --help sometopic": function (done) {
            this.cli.parseArgs(["--help", "topic"], done(function () {
                assert.stdout("This is the text for the topic.\n");
            }));
        },

        "prints error message with --help noneexistingtopic": function (done) {
            this.cli.parseArgs(["--help", "doesnotexist"], done(function () {
                assert.stderr("No such help topic " +
                              "'doesnotexist'. Try without a specific help " +
                              "topic, or one of: topic,other.\n");
            }));
        },

        "prints topic unwrapped when just one topic": function (done) {
            var cli = busterCli.create();
            cli.createLogger(this.stdout, this.stderr);
            cli.addHelpOption(
                "", "", { "topic": "This is the text for the topic." }
            );

            cli.parseArgs(["--help"], done(function () {
                assert.stdout("See also -h/--help topic.");
            }));
        },

        "should not print topic information when no topics": function (done) {
            var cli = busterCli.create();
            cli.createLogger(this.stdout, this.stderr);
            cli.addHelpOption(
                "", "", { "topic": "This is the text for the topic." }
            );

            cli.parseArgs(["--help"], done(function () {
                refute.stdout("See also --help [].");
            }));
        }
    },

    "options": {
        setUp: function () {
            this.cli.addHelpOption();
        },

        "are addressable by short key": function (done) {
            this.cli.opt(["-p", "--port"], {
                description: "Help text is here."
            });
            this.cli.parseArgs(["-p"], done(function (errors, options) {
                assert(options["-p"].isSet);
            }));
        },

        "is addressable by long key": function (done) {
            this.cli.opt(["-p", "--port"], {
                description: "Help text is here."
            });
            this.cli.parseArgs(["--port"], done(function (errors, options) {
                assert(options["-p"].isSet);
            }));
        },

        "restricted to list of values": {
            setUp: function () {
                this.cli.opt(["-a", "--aaa"], {
                    description: "Aaaaa!",
                    values: ["foo", "bar", "baz"]
                });
            },

            "lists available options in help output": function (done) {
                this.cli.parseArgs(["--help"], done(function () {
                    assert.stdout("One of foo, bar, baz.");
                }.bind(this)));
            },

            "gets passed value": function (done) {
                this.cli.parseArgs(["-a", "bar"], done(function (errors, options) {
                    assert.equals(options["-a"].value, "bar");
                }.bind(this)));
            },

            "errors for value not in the list": function (done) {
                this.cli.parseArgs(["-a", "lolcat"], done(function () {
                    refute.stderr(/^$/);
                }));
            }
        },

        "with default value": {
            setUp: function () {
                this.aaaOpt = this.cli.opt(["-f", "--ffff"], {
                    description: "Fffffuuu",
                    defaultValue: "DRM"
                });
            },

            "prints default in help text": function (done) {
                this.cli.parseArgs(["--help"], done(function () {
                    assert.stdout("Default is DRM.");
                }));
            },

            "has default value": function (done) {
                this.cli.parseArgs([], done(function (errors, options) {
                    assert.equals(options["-f"].value, "DRM");
                }.bind(this)));
            },

            "provides overridden value": function (done) {
                this.cli.parseArgs(["-f", "gaming consoles"], done(function (e, options) {
                    assert.equals(options["-f"].value, "gaming consoles");
                }.bind(this)));
            },

            "fails with no value": function (done) {
                this.cli.parseArgs(["-f"], done(function () {
                    refute.stderr(/^$/);
                }));
            }
        },

        "with value": {
            setUp: function () {
                this.cli.opt(["-s", "--ss"], {
                    description: "A creeper.",
                    hasValue: true
                });
            },

            "gets value assigned": function (done) {
                this.cli.parseArgs(["-s", "ssssBOOOOOM!"], done(function (e, options) {
                    assert.equals(options["-s"].value, "ssssBOOOOOM!");
                }.bind(this)));
            }
        },

        "with validator": {
            setUp: function () {
                this.cli.opt(["-c", "--character"], {
                    description: "Character.",
                    validators: [v.required("Here's a custom error msg.")]
                });
            },

            "validates": function (done) {
                this.cli.parseArgs([], done(function () {
                    assert.stderr("Here's a custom error msg.");
                }));
            }
        }
    },

    "operand": {
        setUp: function () {
            this.cli.addHelpOption();
            this.cli.opd("Foo", { description: "Does a foo." });
        },

        "is listed in --help output": function (done) {
            this.cli.parseArgs(["-h"], done(function () {
                assert.stdout(/Foo + {3}Does a foo/);
            }));
        },

        "gets value assigned": function (done) {
            this.cli.parseArgs(["some value"], done(function (errors, options) {
                assert.equals(options.Foo.value, "some value");
            }.bind(this)));
        }
    },

    "panicking": {
        "logs to stderr": function () {
            this.cli.err("Uh-oh! Trouble!");

            assert.stdout(/^$/);
            assert.stderr("Uh-oh! Trouble!");
        }
    },

    "configuration": {
        setUp: function () {
            cliHelper.cdFixtures();
            this.cli.addConfigOption("seaman");
        },

        tearDown: cliHelper.clearFixtures,

        "fails if config does not exist": function (done) {
            this.cli.parseArgs(["-c", "file.js"], function (errors, options) {
                this.cli.loadConfig(options, done(function (err) {
                    assert.match(err.message, "-c/--config: file.js did not match any files");
                }));
            }.bind(this));
        },

        "fails if default config does not exist": function (done) {
            this.cli.parseArgs([], function (errors, options) {
                this.cli.loadConfig(options, done(function (err) {
                    assert.defined(err);
                    assert.match(err.message,
                                 "-c/--config: No file provided, and none of\n" +
                                 "[seaman.js, test/seaman.js, spec/seaman.js]" +
                                 " exist");
                }));
            }.bind(this));
        },

        "fails if configuration has no groups": function (done) {
            cliHelper.writeFile("seaman.js", "");

            this.cli.parseArgs([], function (errors, options) {
                this.cli.loadConfig(options, done(function (err) {
                    assert(err);
                    assert.match(err.message,
                                 "seaman.js contains no configuration");
                }));
            }.bind(this));
        },

        "configuration with --config": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                });
                cliHelper.writeFile("seaman.js", "module.exports = " + json);
                cliHelper.writeFile("seaman2.js", "module.exports = " + json);
            },

            "loads configuration": function (done) {
                this.cli.parseArgs(["-c", "seaman.js"], function (errors, options) {
                    this.cli.loadConfig(options, done(function (err, groups) {
                        assert.defined(groups);
                    }));
                }.bind(this));
            },

            "loads multiple configuration files": function (done) {
                this.cli.parseArgs(["-c", "seaman.js,seaman2.js"], function (e, opts) {
                    this.cli.loadConfig(opts, done(function (err, groups) {
                        assert.equals(groups.length, 4);
                    }));
                }.bind(this));
            },

            "fails if one of many configuration files has no groups": function (done) {
                cliHelper.writeFile("seaman3.js", "");

                this.cli.parseArgs(["-c", "seaman.js,seaman3.js"], function (e, opts) {
                    this.cli.loadConfig(opts, done(function (err) {
                        assert(err);
                        assert.match(err.message,
                                     "seaman3.js contains no configuration");
                    }));
                }.bind(this));
            }
        },

        "config groups": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                });
                cliHelper.writeFile("seaman.js", "module.exports = " + json);
            },

            tearDown: cliHelper.clearFixtures,

            "should only yield config for provided group": function (done) {
                this.cli.parseArgs(["-g", "Browser tests"], function (err, options) {
                    this.cli.loadConfig(options, done(function (err, groups) {
                        assert.equals(groups.length, 1);
                        assert.equals(groups[0].name, "Browser tests");
                    }));
                }.bind(this));
            },

            "only yields config for fuzzily matched group": function (done) {
                this.cli.parseArgs(["-g", "browser"], function (errors, options) {
                    this.cli.loadConfig(options, done(function (err, groups) {
                        assert.equals(groups.length, 1);
                        assert.equals(groups[0].name, "Browser tests");
                    }));
                }.bind(this));
            },

            "fails if no groups match": function (done) {
                this.cli.parseArgs(["-g", "stuff"], function (errors, options) {
                    this.cli.loadConfig(options, done(function (err, groups) {
                        assert.match(err.message,
                                     "seaman.js contains no configuration " +
                                     "groups that matches 'stuff'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "Browser tests");
                        assert.match(err.message, "Node tests");
                    }));
                }.bind(this));
            }
        },

        "config environments": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": { environment: "node" },
                    "Browser tests": { environment: "browser" }
                });
                cliHelper.writeFile("seaman.js", "module.exports = " + json);
            },

            "only yields config for provided environment": function (done) {
                this.cli.parseArgs(["-e", "node"], function (errors, options) {
                    this.cli.loadConfig(options, done(function (err, groups) {
                        assert.equals(groups.length, 1);
                        assert.equals(groups[0].name, "Node tests");
                    }));
                }.bind(this));
            },

            "matches config environments with --environment": function (done) {
                this.cli.parseArgs(["--environment", "browser"], function (e, opts) {
                    this.cli.loadConfig(opts, done(function (err, groups) {
                        assert.equals(groups.length, 1);
                        assert.equals(groups[0].name, "Browser tests");
                    }));
                }.bind(this));
            },

            "fails if no environments match": function (done) {
                this.cli.parseArgs(["-e", "places"], function (errors, options) {
                    this.cli.loadConfig(options, done(function (err, groups) {
                        assert(err);
                        assert.match(err.message,
                                     "seaman.js contains no configuration " +
                                     "groups for environment 'places'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "browser");
                        assert.match(err.message, "node");
                    }));
                }.bind(this));
            },

            "fails if no groups match environment and group": function (done) {
                this.cli.parseArgs(["-e", "node", "-g", "browser"], function (e, opt) {
                    this.cli.loadConfig(opt, done(function (err) {
                        assert(err);
                        assert.match(err.message,
                                     "seaman.js contains no configuration " +
                                     "groups for environment 'node' that " +
                                     "matches 'browser'");
                        assert.match(err.message, "Try one of");
                        assert.match(err.message, "Node tests (node)");
                        assert.match(err.message, "Browser tests (browser)");
                    }));
                }.bind(this));
            }
        },

        "config files": {
            setUp: function () {
                var json = JSON.stringify({
                    "Node tests": {
                        environment: "node",
                        sources: ["src/1.js"],
                        tests: ["test/**/*.js"]
                    }
                });
                cliHelper.writeFile("seaman.js", "module.exports = " + json);
                cliHelper.writeFile("src/1.js", "Src #1");
                cliHelper.writeFile("test/1.js", "Test #1");
                cliHelper.writeFile("test/2.js", "Test #2");
                cliHelper.writeFile("test/other/1.js", "Other test #1");
                cliHelper.writeFile("test/other/2.js", "Other test #2");
            },

            tearDown: cliHelper.clearFixtures,

            "strips unmatched files in tests": function (done) {
                this.cli.parseArgs(["--tests", "test/1.js"], function (errors, opts) {
                    this.cli.loadConfig(opts, function (err, groups) {
                        groups[0].resolve().then(done(function (rs) {
                            assert.equals(rs.loadPath.paths().length, 2);
                            refute.defined(rs.get("test2.js"));
                        }));
                    });
                }.bind(this));
            },

            "matches directories in tests": function (done) {
                this.cli.parseArgs(["--tests", "test/other/**"], function (err, opts) {
                    this.cli.loadConfig(opts, function (err, groups) {
                        groups[0].resolve().then(done(function (rs) {
                            assert.equals(rs.loadPath.paths().length, 3);
                            assert.defined(rs.get("test/other/1.js"));
                            refute.defined(rs.get("test/2.js"));
                        }));
                    });
                }.bind(this));
            },

            "resolves relative paths": function (done) {
                var cwd = process.cwd();
                process.chdir("..");
                var dir = cwd.replace(process.cwd() + "/", "");

                var args = ["-c", dir + "/seaman.js",
                            "--tests", dir + "/test/1.js"];
                this.cli.parseArgs(args, function (e, opt) {
                    this.cli.loadConfig(opt, function (err, groups) {
                        groups[0].resolve().then(done(function (rs) {
                            assert.equals(rs.loadPath.paths().length, 2);
                            refute.defined(rs.get("test2.js"));
                        }));
                    });
                }.bind(this));
            }
        }
    },

    "cli customization": {
        setUp: function () {
            this.busterOpt = process.env.BUSTER_OPT;
        },

        tearDown: function () {
            process.env.BUSTER_OPT = this.busterOpt;
        },

        "adds command-line options set with environment variable": function () {
            var stub = this.stub(this.cli.args, "parse");
            this.cli.environmentVariable = "BUSTER_OPT";
            process.env.BUSTER_OPT = "--color none -r specification";

            this.cli.parseArgs([]);

            assert.calledWith(stub, ["--color", "none", "-r", "specification"]);
        },

        "does not add cli options when no env variable is set": function () {
            var stub = this.stub(this.cli.args, "parse");
            process.env.BUSTER_OPT = "--color none -r specification";

            this.cli.parseArgs([]);

            assert.calledWith(stub, []);
        }
    }
});
