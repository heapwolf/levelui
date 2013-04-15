var testCase = require("buster-test").testCase;
var assert = require("referee").assert;
var colorizer = require("../lib/ansi-colorizer");

testCase("ANSI colorizer", {
    "with default settings": {
        setUp: function () {
            this.t = colorizer.configure();
        },

        "does not colorize text": function () {
            assert.equals(this.t.colorize("String", 31), "String");
        },

        "does not color text red": function () {
            assert.equals(this.t.red("String"), "String");
        },

        "does not color text green": function () {
            assert.equals(this.t.green("String"), "String");
        },

        "does not color text yellow": function () {
            assert.equals(this.t.yellow("String"), "String");
        },

        "does not color text purple": function () {
            assert.equals(this.t.purple("String"), "String");
        },

        "does not color text cyan": function () {
            assert.equals(this.t.cyan("String"), "String");
        },

        "does not color text grey": function () {
            assert.equals(this.t.grey("String"), "String");
        },

        "does not bold text": function () {
            assert.equals(this.t.bold("String"), "String");
        }
    },

    "with colors": {
        setUp: function () {
            this.t = colorizer.configure({ color: true });
        },

        "colorizes text": function () {
            assert.equals(this.t.colorize("String", 31),
                          "\x1b[31mString\x1b[0m");
        },

        "colors text red": function () {
            assert.equals(this.t.red("String"), "\x1b[31mString\x1b[0m");
        },

        "colors text green": function () {
            assert.equals(this.t.green("String"), "\x1b[32mString\x1b[0m");
        },

        "colors text yellow": function () {
            assert.equals(this.t.yellow("String"), "\x1b[33mString\x1b[0m");
        },

        "colors text purple": function () {
            assert.equals(this.t.purple("String"), "\x1b[35mString\x1b[0m");
        },

        "colors text cyan": function () {
            assert.equals(this.t.cyan("String"), "\x1b[36mString\x1b[0m");
        },

        "colors text grey": function () {
            assert.equals(this.t.grey("String"), "\x1b[38;5;8mString\x1b[0m");
        },

        "bolds text": function () {
            assert.equals(this.t.bold("String"), "\x1b[1mString\x1b[0m");
        }
    },

    "with bright colors": {
        setUp: function () {
            this.t = colorizer.configure({ color: true, bright: true });
        },

        "colorizes text brightly": function () {
            assert.equals(this.t.colorize("String", 31),
                          "\x1b[1m\x1b[31mString\x1b[0m");
        },

        "colors text bright red": function () {
            assert.equals(this.t.red("String"), "\x1b[1m\x1b[31mString\x1b[0m");
        },

        "colors text bright green": function () {
            assert.equals(this.t.green("String"),
                          "\x1b[1m\x1b[32mString\x1b[0m");
        },

        "colors text bright yellow": function () {
            assert.equals(this.t.yellow("Str"), "\x1b[1m\x1b[33mStr\x1b[0m");
        },

        "colors text bright purple": function () {
            assert.equals(this.t.purple("Str"), "\x1b[1m\x1b[35mStr\x1b[0m");
        },

        "colors text bright cyan": function () {
            assert.equals(this.t.cyan("String"),
                          "\x1b[1m\x1b[36mString\x1b[0m");
        },

        "colors text bright grey": function () {
            assert.equals(this.t.grey("String"),
                          "\x1b[1m\x1b[38;5;8mString\x1b[0m\x1b[0m");
        },

        "bolds text": function () {
            assert.equals(this.t.bold("String"), "\x1b[1mString\x1b[0m");
        }
    },

    ".stripSeq": {
        setUp: function () {
            this.t = colorizer.configure({ color: true, bright: true });
        },

        "strips ansi escape characters": function () {
            assert.equals(this.t.stripSeq(this.t.red(this.t.yellow("Hey"))),
                          "Hey");
        }
    },

    ".charCount": {
        setUp: function () {
            this.t = colorizer.configure({ color: true, bright: true });
        },

        "counts number of readable characters": function () {
            assert.equals(this.t.charCount(this.t.red(this.t.yellow("Hey"))),
                          3);
        }
    }
});
