var buster = require("buster");
var assert = buster.assert;
var terminal = require("../lib/buster-terminal");

buster.testCase("Buster terminal", {
    "with default settings": {
        setUp: function () {
            this.t = terminal.create();
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
            this.t = terminal.create({ color: true });
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
            this.t = terminal.create({ color: true, bright: true });
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

    "moving": {
        setUp: function () {
            this.t = terminal.create({ color: true, bright: true });
        },

        "moves one line up": function () {
            assert.equals(this.t.up(1), "\x1b[1A");
        },

        "nots move up anywhere": function () {
            assert.equals(this.t.up(0), "");
            assert.equals(this.t.up(), "");
        },

        "moves one line down": function () {
            assert.equals(this.t.down(1), "\x1b[1B");
        },

        "nots move down anywhere": function () {
            assert.equals(this.t.down(0), "");
            assert.equals(this.t.down(), "");
        },

        "moves two columns forward": function () {
            assert.equals(this.t.fwd(2), "\x1b[2C");
        },

        "nots move forward anywhere": function () {
            assert.equals(this.t.fwd(0), "");
            assert.equals(this.t.fwd(), "");
        },

        "saves position": function () {
            assert.equals(this.t.save(), "\x1b7");
        },

        "restores position": function () {
            assert.equals(this.t.restore(), "\x1b8");
        },

        "moves in transaction": function () {
            var str = this.t.move(function () {
                return this.up(2) + this.fwd(4) + this.down(1);
            });

            assert.equals(str, "\x1b7\x1b[2A\x1b[4C\x1b[1B\x1b8");
        },

        "strips ansi escape characters": function () {
            assert.equals(this.t.stripSeq(this.t.red(this.t.yellow("Hey"))),
                          "Hey");
        }
    },

    "max width": {
        "gets width of array of strings": function () {
            assert.equals(terminal.maxWidth(["a", "b", "hey", "there"]), 5);
        },

        "gets width of array of strings and numbers": function () {
            assert.equals(terminal.maxWidth(["a", 666782, 2, "there"]), 6);
        },

        "counts width of undefined as 0": function () {
            assert.equals(terminal.maxWidth([null, undefined, false, ""]), 5);
        }
    },

    "alignment": {
        "left aligns text": function () {
            assert.equals(terminal.alignLeft("Hey there", 13), "Hey there    ");
        },

        "right aligns text": function () {
            assert.equals(terminal.alignRight("Hey there", 13), "    Hey there");
        },

        "does not pad too long text": function () {
            assert.equals(terminal.alignRight("Hey there", 4), "Hey there");
        }
    },

    "fitting": {
        "does not touch string that fits": function () {
            assert.equals(terminal.fit("Hey", 3), "Hey");
        },

        "splits string over two lines": function () {
            assert.equals(terminal.fit("Hey  There", 5), "Hey  \nThere");
        },

        "splits string across multiple lines": function () {
            assert.equals(terminal.fit("123456789", 1), "1\n2\n3\n4\n5\n6\n7\n8\n9");
        },

        "does not split ANSI escape sequences": function () {
            assert.equals(terminal.fit("\x1b[31mHey", 3), "\x1b[31mHey");
        },

        "does not split multi-line ANSI escape sequences": function () {
            assert.equals(terminal.fit("\x1b[31mHey\x1b[0m", 2),
                          "\x1b[31mHe\ny\x1b[0m");
        },

        "does not modify already fitted multi-line string": function () {
            assert.equals(terminal.fit("Hey\nMan", 3), "Hey\nMan");
        },

        "fits too long lines in multi-line string": function () {
            assert.equals(terminal.fit("Hey!\nMan", 3), "Hey\n!\nMan");
        },

        "splits line into multiple lines": function () {
            assert.equals(terminal.fit("abcdefghi", 3), "abc\ndef\nghi");
        },

        "splits all lines into multiple lines": function () {
            assert.equals(terminal.fit("...\n.....", 3), "...\n...\n..");
        }
    },

    "reflowing": {
        "returns text if within max length": function () {
            assert.equals(terminal.reflow("Hey", 5), "Hey");
        },

        "breaks at first space when text is too long": function () {
            assert.equals(terminal.reflow("Hey man", 3), "Hey\nman");
        },

        "breaks at closest space when text is too long": function () {
            assert.equals(terminal.reflow("Hey there", 4), "Hey\nthere");
        },

        "does not break in the middle of words": function () {
            assert.equals(terminal.reflow("Christian", 6),
                          "Christian");
        },

        "breaks in multiple lines": function () {
            assert.equals(terminal.reflow("My name is Christian", 6),
                          "My\nname\nis\nChristian");
        },

        "does not break on every space": function () {
            assert.equals(terminal.reflow("My name is Christian", 7),
                          "My name\nis\nChristian");
        },

        "keeps existing line breaks": function () {
            assert.equals(terminal.reflow("My\nname is Christian", 7),
                          "My\nname is\nChristian");
        }
    }
});
