var buster = require("buster");
var args = require("./../lib/posix-argv-parser");

buster.testCase("posix-argv-parser", {
    setUp: function () {
        this.a = args.create();
    },

    "not passing any options": function () {
        assert.exception(function () {
            this.a.createOption([]);
        }.bind(this));
    },

    "handling non-existent option errors": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse(["-z"], done(function (errors) {
            assert.equals(errors.length, 1);
            assert.match(errors[0], /unknown argument/i);
            assert.match(errors[0], "-z");
        }));
    },

    "one and two dash option with both passed, single first": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["--port"]);

        this.a.parse(["-p", "--port"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 1);
            assert(options["--port"].isSet);
            assert.equals(options["--port"].timesSet, 1);
        }));
    },

    "one and two dash option with both passed, double first": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["--port"]);

        this.a.parse(["--port", "-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 1);
            assert(options["--port"].isSet);
            assert.equals(options["--port"].timesSet, 1);
        }));
    },

    "one and two dash option with only double dash passed": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["--port"]);

        this.a.parse(["--port"], done(function (errors, options) {
            refute(options["-p"].isSet);
            assert(options["--port"].isSet);
            assert.equals(options["--port"].timesSet, 1);
        }));
    },

    "one and two dash option with only single dash passed": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["--port"]);

        this.a.parse(["-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 1);
            refute(options["--port"].isSet);
        }));
    },

    "same option specified twice in one option": function () {
        assert.exception(function () {
            this.a.createOption(["-p", "-p"]);
        }.bind(this));

        assert.exception(function () {
            this.a.createOption(["--port", "--port"]);
        }.bind(this));
    },

    "same option specified in a different option": function () {
        this.a.createOption(["-p"]);

        assert.exception(function () {
            this.a.createOption(["-p"]);
        }.bind(this));

        this.a.createOption(["--port"]);

        assert.exception(function () {
            this.a.createOption(["--port"]);
        }.bind(this));
    },

    "after operand separator": function (done) {
        this.a.createOption(["--port"]);

        this.a.parse(["--", "--port"], done(function (errors, options) {
            assert.defined(errors);
        }));
    },

    "yields options to parse callback": function (done) {
        this.a.createOption(["--port", "-p"], { hasValue: true });
        this.a.createOption(["--help"]);

        this.a.parse(["--port", "4210"], done(function (err, options) {
            assert.match(options["--port"], { value: "4210" });
            assert.match(options["-p"], { value: "4210" });
            assert.isFalse(options["--help"].isSet);
        }));
    },

    "yields options with named operand": function (done) {
        this.a.createOperand("filter");

        this.a.parse(["yay"], done(function (err, options) {
            assert.equals(options.filter.value, "yay");
        }));
    },

    "yields greedy operand value as array": function (done) {
        this.a.createOperand("filter", { greedy: true });

        this.a.parse(["yay", "man"], done(function (err, options) {
            assert.equals(options.filter.value, ["yay", "man"]);
        }));
    },

    "transforms": {
        "transforms value": function (done) {
            var transform = this.stub().returns(1337);
            this.a.createOption(["-p"], {
                hasValue: true,
                transform: transform
            });

            this.a.parse(["-p", "1337"], done(function (err, options) {
                assert.calledOnce(transform);
                assert.same(options["-p"].value, 1337);
            }));
        },

        "fails if transform is not a function": function () {
            assert.exception(function () {
                this.a.createOption(["-p"], {
                    hasValue: true,
                    transform: {}
                });
            }.bind(this));
        },

        "fails if transform throws": function (done) {
            this.a.createOption(["-p"], {
                hasValue: true,
                transform: this.stub().throws(new TypeError("Oh no"))
            });

            this.a.parse(["-p", "1337"], done(function (errors, options) {
                assert(errors);
                assert.match(errors[0], "Oh no");
            }));
        },

        "validates raw untransformed value": function (done) {
            var validatorValue;
            this.a.createOption(["-p"], {
                hasValue: true,
                validators: [function (opt) { validatorValue = opt.value; }],
                transform: this.stub().returns(1337)
            });

            this.a.parse(["-p", "AAA"], done(function (errors, options) {
                assert.equals(validatorValue, "AAA");
            }));
        },

        "does not call transform if validation fails": function (done) {
            var transform = this.stub();
            this.a.createOption(["-p"], {
                hasValue: true,
                validators: [args.validators.integer()],
                transform: transform
            });

            this.a.parse(["-p", "AAA"], done(function (errors, options) {
                assert(errors);
                refute.called(transform);
            }));
        }
    },

    "includes non-provided arguments in results": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse([], done(function (errors, options) {
            assert.isFalse(options["-p"].isSet);
        }));
    },

    "uses default value for not provided option": function (done) {
        this.a.createOption(["-p"], { defaultValue: "hey" });
        this.a.parse([], done(function (errors, options) {
            assert.equals(options["-p"].value, "hey");
        }));
    },

    "keeps noop description property": function () {
        this.a.createOption(["-p"], { description: "Use for related data" });
        this.a.createOperand({ description: "Bla bla" });

        assert.match(this.a.options[0].description, "Use for");
        assert.match(this.a.options[1].description, "Bla bla");
    },

    "fails gracefully on non-existent option": function (done) {
        this.a.createOption(["-p"]);

        this.a.parse(["-node"], done(function (errors, options) {
            assert.match(errors[0], "Unknown option '-node'");
        }));
    }
});
