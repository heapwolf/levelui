var buster = require("buster");
var args = require("./../lib/posix-argv-parser");
var shorthand = require("./../lib/shorthand");

buster.testCase("Shorthands", {
    setUp: function () {
        this.a = args.create();
    },

    "test creating shorthand for option": function (done) {
        this.a.createOption(["--port"]);
        this.a.addShorthand("-p", ["--port"]);

        this.a.parse(["-p"], done(function (errors, options) {
            refute(errors);
            assert(options["--port"].isSet);
        }));
    },

    "test shorthand for option with value and setting value": function (done) {
        this.a.createOption(["--port"], { hasValue: true });
        this.a.addShorthand("-p", ["--port", "1234"]);

        this.a.parse(["-p"], done(function (errors, options) {
            refute(errors);
            assert(options["--port"].isSet);
            assert.equals(options["--port"].value, "1234");
        }));
    },

    "test shorthand for option with value not setting value": function (done) {
        this.a.createOption(["--port"], { hasValue: true });
        this.a.addShorthand("-p", ["--port"]);

        this.a.parse(["-p"], done(function (errors, options) {
            assert.defined(errors);
            assert.match(errors[0], /no value specified/i);
            assert.match(errors[0], "--port");
        }));
    },

    "test shorthand expanding to none existing options": function (done) {
        this.a.addShorthand("-p", ["--port"]);

        this.a.parse(["-p"], done(function (errors, options) {
            assert.defined(errors);
            assert.match(errors[0], /unknown argument/i);
        }));
    },

    "test duplicate shorthand": function () {
        this.a.addShorthand("-p", ["--port"]);

        assert.exception(function () {
            this.a.addShorthand("-p", ["--port"]);
        }.bind(this));
    },

    "test shorthand for option that already exists": function () {
        this.a.createOption(["-p"]);

        assert.exception(function () {
            this.a.addShorthand("-p", ["--port"]);
        }.bind(this));
    },

    "test shorthand that isn't a valid flag": function () {
        assert.exception(function () {
            this.a.addShorthand("cake", ["--port"]);
        }.bind(this));

        assert.exception(function () {
            this.a.addShorthand("1234", ["--port"]);
        }.bind(this));

        assert.exception(function () {
            this.a.addShorthand("p-", ["--port"]);
        }.bind(this));
    },

    "test shorthand without option": function () {
        try {
            this.a.addShorthand(null, ["--port"]);
            throw new Error("Expected to throw");
        } catch (e) {
            assert.match(e.message, /invalid option/i);
        }
    },

    "test shorthand without argv": function () {
        try {
            this.a.addShorthand("-p", null);
            throw new Error("Expected to throw");
        } catch (e) {
            assert.match(e.message, /must be an array/i);
        }
    },

    "test operand and shorthand integration": function (done) {
        this.a.createOption(["-e"], { hasValue: true });
        this.a.createOperand();
        this.a.addShorthand("--node", ["-e", "node"]);

        this.a.parse(["--node", "foo"], done(function (errors, options) {
            refute(errors);
            assert.equals(options["-e"].value, "node");
            assert.equals(options.OPD.value, "foo");
        }));
    },

    "expand": {
        "returns args untouched if shorthand is not present": function () {
            var sh = shorthand.create("-x", ["--zuul", "dana"]);
            var args = ["-a", "42", "--help"];

            assert.equals(sh.expand(args), args);
        },

        "expands shorthand for the last option": function () {
            var sh = shorthand.create("-x", ["--zuul", "dana"]);
            var args = ["-a", "42", "-x"];

            assert.equals(sh.expand(args), ["-a", "42", "--zuul", "dana"]);
        },

        "expands shorthand for middle option": function () {
            var sh = shorthand.create("-x", ["--zuul", "dana"]);
            var args = ["-a", "42", "-x", "--yo", "mister"];

            assert.equals(sh.expand(args),
                          ["-a", "42", "--zuul", "dana", "--yo", "mister"]);
        },

        "expands all occurrences of shorthand": function () {
            var sh = shorthand.create("-x", ["--zuul", "dana"]);
            var args = ["-x", "-x", "--yo"];

            assert.equals(sh.expand(args),
                          ["--zuul", "dana", "--zuul", "dana", "--yo"]);
        },

        "does not modify argument": function () {
            var sh = shorthand.create("-x", ["--zuul", "dana"]);
            var args = ["-x", "-x", "--yo"];
            var expanded = sh.expand(args);

            assert.equals(args, ["-x", "-x", "--yo"]);
            refute.equals(args, expanded);
        }
    }
});
