/*jslint maxlen: 100*/
var buster = require("buster");
var args = require("./../lib/posix-argv-parser");
var when = require("when");

buster.testCase("Operands", {
    setUp: function () {
        this.a = args.create();
    },

    "test plain operand": function (done) {
        this.a.createOperand();

        this.a.parse(["123abc"], done(function (errors, options) {
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, "123abc");
        }));
    },

    "test single dash option and operand with option first": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand();

        this.a.parse(["-p", "123abc"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options["-p"].timesSet, 1);
            assert.match(options.OPD.value, "123abc");
        }));
    },

    "test single dash option and operand with operand first": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand();

        this.a.parse(["123abc", "-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options["-p"].timesSet, 1);
            assert.match(options.OPD.value, "123abc");
        }));
    },

    "test single dash option with value and operand": function (done) {
        this.a.createOption(["-p"], { hasValue: true });
        this.a.createOperand();

        this.a.parse(["-p", "123abc"], done(function (errors, options) {
            assert.equals(options["-p"].value, "123abc");
            refute(options.OPD.isSet);
        }));
    },

    "test single dash option with value and operand without option after operand": function (done) {
        this.a.createOption(["-p"], { hasValue: true });
        this.a.createOperand();

        this.a.parse(["123abc", "-p", "test"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "test");

            assert(options.OPD.isSet);
            assert.match(options.OPD.value, "123abc");
        }));
    },

    "test double dash option and operand with option first": function (done) {
        this.a.createOption(["--port"]);
        this.a.createOperand();

        this.a.parse(["--port", "123abc"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert(options["--port"].timesSet, 1);
            assert.match(options.OPD.value, "123abc");
        }));
    },

    "test double dash option and operand with operand first": function (done) {
        this.a.createOption(["--port"]);
        this.a.createOperand();

        this.a.parse(["123abc", "--port"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert(options["--port"].timesSet, 1);
            assert.match(options.OPD.value, "123abc");
        }));
    },

    "test double dash option with value and operand": function (done) {
        this.a.createOption(["--port"], { hasValue: true });
        this.a.createOperand();

        this.a.parse(["--port", "123abc"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].value, "123abc");
            refute(options.OPD.isSet);
        }));
    },

    "test double dash option with value and operand with option after operand": function (done) {
        this.a.createOption(["--port"], { hasValue: true });
        this.a.createOperand();

        this.a.parse(["123abc", "--port", "test"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].value, "test");
            assert(options.OPD.isSet);
            assert.match(options.OPD.value, "123abc");
        }));
    },

    "test not setting operand with required validator": function (done) {
        var opd = this.a.createOperand({
            validators: [args.validators.required()]
        });

        this.a.parse([], done(function (errors) {
            assert.defined(errors);
            assert.equals(errors.length, 1);
        }));
    },

    "test creating option with operand present": function () {
        this.a.createOperand(args.OPD_DIRECTORY);

        refute.exception(function () {
            this.a.createOption(["-p"]);
        }.bind(this));
    },

    "test specifying operand after double dash": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand();

        this.a.parse(["-p", "--", "gocha"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, "gocha");
        }));
    },

    "test specifying operand starting with dash after double dash": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand("rest");

        this.a.parse(["-p", "--", "-gocha"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options.rest.isSet);
            assert.equals(options.rest.value, "-gocha");
        }));
    },

    "test specifying multiple operands after double dash": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand("opd1");
        this.a.createOperand("opd2");

        this.a.parse(["-p", "--", "foo", "bar"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options.opd1.isSet);
            assert.equals(options.opd1.value, "foo");
            assert(options.opd2.isSet);
            assert.equals(options.opd2.value, "bar");
        }));
    },

    "test multiple operands starting with a dash": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand("opd1");
        this.a.createOperand("opd2");

        this.a.parse(["-p", "--", "-foo", "--bar"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options.opd1.isSet);
            assert.equals(options.opd1.value, "-foo");
            assert(options.opd2.isSet);
            assert.equals(options.opd2.value, "--bar");
        }));
    },

    "test greedy operand with no value": function (done) {
        this.a.createOperand("rest", { greedy: true });

        this.a.parse([], done(function (errors, options) {
            refute(options.rest.isSet);
            assert.equals(options.rest.value, []);
        }));
    },

    "test greedy operand with one value": function (done) {
        this.a.createOperand("rest", { greedy: true });

        this.a.parse(["foo"], done(function (errors, options) {
            assert(options.rest.isSet);
            assert.equals(options.rest.value, ["foo"]);
        }));
    },

    "test greedy operand with multiple values": function (done) {
        this.a.createOperand("rest", { greedy: true });

        this.a.parse(["foo", "bar", "baz"], done(function (errors, options) {
            assert(options.rest.isSet);
            assert.equals(options.rest.value, ["foo", "bar", "baz"]);
        }));
    },

    "test greedy operand with operand values before and after double dash": function (done) {
        this.a.createOperand("rest", { greedy: true });

        this.a.parse(["foo", "bar", "--", "baz"], done(function (errors, options) {
            assert(options.rest.isSet);
            assert.equals(options.rest.value, ["foo", "bar", "baz"]);
        }));
    },

    "test greedy operand preceded by option": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand({ greedy: true });

        this.a.parse(["-p", "foo", "bar"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, ["foo", "bar"]);
        }));
    },

    "test greedy operand followed by option": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand({ greedy: true });

        this.a.parse(["foo", "bar", "-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, ["foo", "bar"]);
        }));
    },

    "test greedy operand with option in between": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOperand({ greedy: true });

        this.a.parse(["foo", "-p", "bar"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, ["foo", "bar"]);
        }));
    },

    "test greedy operand preceded by option with value": function (done) {
        this.a.createOption(["-p"], { hasValue: true });
        this.a.createOperand({ greedy: true });

        this.a.parse(["-p", "1234", "foo", "bar"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "1234");
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, ["foo", "bar"]);
        }));
    },

    "test greedy operand followed by option with value": function (done) {
        this.a.createOption(["-p"], { hasValue: true });
        this.a.createOperand({ greedy: true });

        this.a.parse(["foo", "bar", "-p", "1234"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "1234");
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, ["foo", "bar"]);
        }));
    },

    "test greedy operand with option with value in between": function (done) {
        this.a.createOption(["-p"], { hasValue: true });
        this.a.createOperand({ greedy: true });

        this.a.parse(["foo", "-p", "1234", "bar"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "1234");
            assert(options.OPD.isSet);
            assert.equals(options.OPD.value, ["foo", "bar"]);
        }));
    },

    "test greedy operand preceded by none-greedy operand": function (done) {
        this.a.createOperand("opd1");
        this.a.createOperand("opd2", { greedy: true });

        this.a.parse(["foo", "bar", "baz"], done(function (errors, options) {
            assert(options.opd1.isSet);
            assert.equals(options.opd1.value, "foo");
            assert(options.opd2.isSet);
            assert.equals(options.opd2.value, ["bar", "baz"]);
        }));
    },

    "test greedy operand followed by none-greedy operand": function (done) {
        this.a.createOperand("opd1", { greedy: true });
        this.a.createOperand("opd2");

        this.a.parse(["foo", "bar", "baz"], done(function (errors, options) {
            assert(options.opd1.isSet);
            assert.equals(options.opd1.value, ["foo", "bar", "baz"]);
            refute(options.opd2.isSet);
        }));
    },

    "test double dash option with value before operand": function (done) {
        this.a.createOperand();
        this.a.createOption(["--port"], { hasValue: true });

        this.a.parse(["--port", "4224", "foo"], done(function (errors, options) {
            refute(errors);
            assert.equals(options["--port"].value, "4224");
            assert.equals(options.OPD.value, "foo");
        }));
    },

    "superfluous operand causes error": function (done) {
        this.a.createOption(["-a"]);

        this.a.parse(["-a", "--", "foo"], done(function (errors, options) {
            assert.defined(errors);
            assert.match(errors[0], "operand 'foo'");
        }));
    }
});
