/*jslint maxlen: 100 */
var buster = require("buster");
var args = require("./../lib/posix-argv-parser");
var when = require("when");

buster.testCase("Short options", {
    setUp: function () {
        this.a = args.create();
    },

    "test one option": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse(["-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 1);
        }));
    },

    "test with multiple characters": function () {
        assert.exception(function () {
            this.a.createOption(["-pf"]);
        }.bind(this));

        refute.exception(function () {
            this.a.createOption(["--"]);
        }.bind(this));

        assert.exception(function () {
            this.a.createOption(["-pff"]);
        }.bind(this));

        assert.exception(function () {
            this.a.createOption(["-p-f"]);
        }.bind(this));

        assert.exception(function () {
            this.a.createOption(["-p", "-pfff"]);
        }.bind(this));
    },

    "test one option twice as separate options": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse(["-p", "-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 2);
        }));
    },

    "test one option thrice as separate options": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse(["-p", "-p", "-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 3);
        }));
    },

    "test one option twice as one grouped option": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse(["-pp"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 2);
        }));
    },

    "test one option thrice as one grouped option": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse(["-ppp"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 3);
        }));
    },

    "test one option thrice as bith grouped and separate": function (done) {
        this.a.createOption(["-p"]);
        this.a.parse(["-pp", "-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 3);
        }));
    },

    "test two options as separate args": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["-z"]);

        this.a.parse(["-p", "-z"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 1);
            assert(options["-z"].isSet);
            assert.equals(options["-z"].timesSet, 1);
        }));
    },

    "test two options as one arg": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["-z"]);

        this.a.parse(["-pz"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 1);
            assert(options["-z"].isSet);
            assert.equals(options["-z"].timesSet, 1);
        }));
    },

    "test two options two times grouped with self": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["-z"]);

        this.a.parse(["-pp", "-zz"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 2);
            assert(options["-z"].isSet);
            assert.equals(options["-z"].timesSet, 2);
        }));
    },

    "test two options two times grouped with other": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["-z"]);

        this.a.parse(["-pz", "-zp"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 2);
            assert(options["-z"].isSet);
            assert.equals(options["-z"].timesSet, 2);
        }));
    },

    "test two options where only one occurs": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["-z"]);

        this.a.parse(["-p"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 1);
            refute(options["-z"].isSet);
        }));
    },

    "test two options each occurring thrice": function (done) {
        this.a.createOption(["-p"]);
        this.a.createOption(["-z"]);

        this.a.parse(["-pzz", "-ppz"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].timesSet, 3);
            assert(options["-z"].isSet);
            assert.equals(options["-z"].timesSet, 3);
        }));
    },

    "test option with value": function (done) {
        this.a.createOption(["-p"], { hasValue: true });

        this.a.parse(["-pfoo"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "foo");
        }));
    },

    "test option with value but no value passed": function (done) {
        this.a.createOption(["-p"], { hasValue: true });

        this.a.parse(["-p"], done(function (errors, options) {
            assert(errors);
            assert.match(errors[0], /no value specified/i);
            assert.match(errors[0], "-p");
        }));
    },

    "option with empty value": function (done) {
        this.a.createOption(["-p"], { hasValue: true });

        this.a.parse(["-p", ""], done(function (errors, options) {
            assert.isNull(errors);
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "");
        }));
    },

    "test option with value and default value": function (done) {
        this.a.createOption(["-p"], { defaultValue: "bar" });

        this.a.parse(["-pfoo"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "foo");
        }));
    },

    "test option without value but with default value": function (done) {
        this.a.createOption(["-p"], { defaultValue: "bar" });

        this.a.parse(["-p"], done(function (errors, options) {
            assert(errors);
            assert.match(errors[0], /no value specified/i);
            assert.match(errors[0], "-p");
        }));
    },

    "test option having value and accepting not getting one passed": function (done) {
        this.a.createOption(["-p"], { hasValue: true, requiresValue: false });

        this.a.parse(["-p"], done(function (errors, options) {
            refute(errors);
            assert(options["-p"].isSet);
            refute(options["-p"].value);
        }));
    },

    "test passing value matching other option": function (done) {
        this.a.createOption(["-p"], { hasValue: true });
        this.a.createOption(["-z"]);

        this.a.parse(["-pz"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "z");
            refute(options["-z"].isSet);
        }));
    },

    "test passing value matching other option as well as that other option": function (done) {
        this.a.createOption(["-p"], { hasValue: true });
        this.a.createOption(["-z"]);

        this.a.parse(["-pz", "-z"], done(function (errors, options) {
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "z");
            assert(options["-z"].isSet);
        }));
    },

    "test passing value to option with value with space between option and value": function (done) {
        this.a.createOption(["-p"], { hasValue: true });

        this.a.parse(["-p", "foo"], done(function (errors, options) {
            refute(errors);
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "foo");
        }));
    },

    "passing value to option without value with space between option and value": function (done) {
        this.a.createOption(["-p"]);

        this.a.parse(["-p", "foo"], done(function (errors, options) {
            assert.match(errors[0], /unknown argument/i);
            assert.match(errors[0], "foo");
        }));
    },

    "test passing value to option with value using equals": function (done) {
        this.a.createOption(["-p"], { hasValue: true });

        this.a.parse(["-p=foo"], done(function (errors, options) {
            refute(errors);
            assert(options["-p"].isSet);
            assert.equals(options["-p"].value, "foo");
        }));
    },

    "test passing value to option without value using equals": function (done) {
        this.a.createOption(["-p"]);

        this.a.parse(["-p=foo"], done(function (errors, options) {
            assert.match(errors[0], "does not take a value");
            assert.match(errors[0], "-p");
        }));
    },

    "test equals sign with space": function (done) {
        this.a.createOption(["-p"], { hasValue: true });

        this.a.parse(["-p", "="], done(function (errors, options) {
            assert.equals(options["-p"].value, "=");
        }));
    },

    "test equals sign with spaces and extra value": function (done) {
        this.a.createOption(["-p"], { hasValue: true });

        this.a.parse(["-p", "=", "123"], done(function (errors, options) {
            assert.match(errors[0], /unknown argument/i);
            assert.match(errors[0], "123");
        }));
    },

    "test multiple operands": function (done) {
        this.a.createOperand("opd1");
        this.a.createOperand("opd2");
        this.a.createOperand("opd3");

        this.a.parse(["foo", "bar", "baz"], done(function (errors, options) {
            assert.equals(options.opd1.value, "foo");
            assert.equals(options.opd2.value, "bar");
            assert.equals(options.opd3.value, "baz");
        }));
    },

    "test after operand separator": function (done) {
        this.a.createOption(["-p"]);

        this.a.parse(["--", "-p"], done(function (errors, options) {
            assert.defined(errors);
        }));
    }
});

buster.testCase("Long options", {
    setUp: function () {
        this.a = args.create();
    },

    "test one option": function (done) {
        this.a.createOption(["--port"]);
        this.a.parse(["--port"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].timesSet, 1);
        }));
    },

    "test containing a dash": function (done) {
        this.a.createOption(["--port-it"]);
        this.a.parse(["--port-it"], done(function (errors, options) {
            assert(options["--port-it"].isSet);
            assert.equals(options["--port-it"].timesSet, 1);
        }));
    },

    "test containing a dash and has value": function (done) {
        this.a.createOption(["--port-it"], { hasValue: true });

        this.a.parse(["--port-it", "1234"], done(function (errors, options) {
            assert(options["--port-it"].isSet);
            assert.equals(options["--port-it"].value, "1234");
        }));
    },

    "test one option twice as separate options": function (done) {
        this.a.createOption(["--port"]);
        this.a.parse(["--port", "--port"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].timesSet, 2);
        }));
    },

    "test one option thrice as separate options": function (done) {
        this.a.createOption(["--port"]);
        this.a.parse(["--port", "--port", "--port"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].timesSet, 3);
        }));
    },

    "test two options both being set": function (done) {
        this.a.createOption(["--port"]);
        this.a.createOption(["--zap"]);

        this.a.parse(["--port", "--zap"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].timesSet, 1);
            assert(options["--zap"].isSet);
            assert.equals(options["--zap"].timesSet, 1);
        }));
    },

    "test option with value": function (done) {
        this.a.createOption(["--port"], { hasValue: true });
        this.a.parse(["--port", "foo"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].value, "foo");
        }));
    },

    "test option with value but no value passed": function (done) {
        this.a.createOption(["--port"], { hasValue: true });

        this.a.parse(["--port"], done(function (errors, options) {
            assert(errors);
            assert.match(errors[0], /no value specified/i);
            assert.match(errors[0], "--port");
        }));
    },

    "test option with value and default value": function (done) {
        this.a.createOption(["--port"], { defaultValue: "bar" });

        this.a.parse(["--port", "foo"], done(function (errors, options) {
            assert(options["--port"].isSet);
            assert.equals(options["--port"].value, "foo");
        }));
    },

    "test option without value but with default value": function (done) {
        this.a.createOption(["--port"], { defaultValue: "bar" });

        this.a.parse(["--port"], done(function (errors, options) {
            assert(errors);
            assert.match(errors[0], /no value specified/i);
            assert.match(errors[0], "--port");
        }));
    },

    "test option having value and accepting not getting one passed": function (done) {
        this.a.createOption(["--port"], {
            hasValue: true,
            requiresValue: false
        });

        this.a.parse(["--port"], done(function (errors, options) {
            refute(errors);
            assert(options["--port"].isSet);
            refute(options["--port"].value);
        }));
    },

    "test passing value matching other option": function (done) {
        this.a.createOption(["--port"], { hasValue: true });
        this.a.createOption(["--zap"]);

        this.a.parse(["--port", "--zap"], done(function (errors, options) {
            assert(errors);
            assert.match(errors[0], /no value specified/i);
            assert.match(errors[0], "--port");
        }));
    },

    "test passing value not matching other options": function (done) {
        this.a.createOption(["--port"], { hasValue: true });
        this.a.createOption(["--zap"]);

        this.a.parse(["--port", "--doit"], done(function (errors, options) {
            assert.equals(options["--port"].value, "--doit");
        }));
    },

    "test passing value to option with value using equals": function (done) {
        this.a.createOption(["--port"], { hasValue: true });

        this.a.parse(["--port=foo"], done(function (errors, options) {
            refute(errors);
            assert(options["--port"].isSet);
            assert.equals(options["--port"].value, "foo");
        }));
    },

    "test passing value to option without value using equals": function (done) {
        this.a.createOption(["--port"]);

        this.a.parse(["--port=foo"], done(function (errors, options) {
            assert.match(errors[0], /does not take a value/i);
            assert.match(errors[0], "--port");
        }));
    },

    "test equals sign with spaces": function (done) {
        this.a.createOption(["--port"], { hasValue: true });

        this.a.parse(["--port", "="], done(function (errors, options) {
            assert.equals(options["--port"].value, "=");
        }));
    },

    "test equals sign with spaces and extra value": function (done) {
        this.a.createOption(["--port"], { hasValue: true });

        this.a.parse(["--port", "=", "123"], done(function (errors, options) {
            assert.match(errors[0], /unknown argument/i);
            assert.match(errors[0], "123");
        }));
    }
});
