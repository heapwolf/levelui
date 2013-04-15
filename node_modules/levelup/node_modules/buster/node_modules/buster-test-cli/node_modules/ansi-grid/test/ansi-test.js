var buster = require("buster-node");
var assert = buster.assert;
var ansi = require("../lib/ansi");

buster.testCase("Ansi helpers", {
    "moving": {
        "moves one line up": function () {
            assert.equals(ansi.up(1), "\x1b[1A");
        },

        "nots move up anywhere": function () {
            assert.equals(ansi.up(0), "");
            assert.equals(ansi.up(), "");
        },

        "moves one line down": function () {
            assert.equals(ansi.down(1), "\x1b[1B");
        },

        "nots move down anywhere": function () {
            assert.equals(ansi.down(0), "");
            assert.equals(ansi.down(), "");
        },

        "moves two columns forward": function () {
            assert.equals(ansi.fwd(2), "\x1b[2C");
        },

        "nots move forward anywhere": function () {
            assert.equals(ansi.fwd(0), "");
            assert.equals(ansi.fwd(), "");
        },

        "saves position": function () {
            assert.equals(ansi.save(), "\x1b7");
        },

        "restores position": function () {
            assert.equals(ansi.restore(), "\x1b8");
        },

        "strips ansi escape characters": function () {
            assert.equals(ansi.stripSeq("\x1b[1mHey"),
                          "Hey");
        }
    },

    "max width": {
        "gets width of array of strings": function () {
            assert.equals(ansi.maxWidth(["a", "b", "hey", "there"]), 5);
        },

        "gets width of array of strings and numbers": function () {
            assert.equals(ansi.maxWidth(["a", 666782, 2, "there"]), 6);
        },

        "counts width of undefined as 0": function () {
            assert.equals(ansi.maxWidth([null, undefined, false, ""]), 5);
        }
    },

    "fitting": {
        "does not touch string that fits": function () {
            assert.equals(ansi.fit("Hey", 3), "Hey");
        },

        "splits string over two lines": function () {
            assert.equals(ansi.fit("Hey  There", 5), "Hey  \nThere");
        },

        "splits string across multiple lines": function () {
            assert.equals(ansi.fit("123456789", 1), "1\n2\n3\n4\n5\n6\n7\n8\n9");
        },

        "does not split ANSI escape sequences": function () {
            assert.equals(ansi.fit("\x1b[31mHey", 3), "\x1b[31mHey");
        },

        "does not split multi-line ANSI escape sequences": function () {
            assert.equals(ansi.fit("\x1b[31mHey\x1b[0m", 2),
                          "\x1b[31mHe\ny\x1b[0m");
        },

        "does not modify already fitted multi-line string": function () {
            assert.equals(ansi.fit("Hey\nMan", 3), "Hey\nMan");
        },

        "fits too long lines in multi-line string": function () {
            assert.equals(ansi.fit("Hey!\nMan", 3), "Hey\n!\nMan");
        },

        "splits line into multiple lines": function () {
            assert.equals(ansi.fit("abcdefghi", 3), "abc\ndef\nghi");
        },

        "splits all lines into multiple lines": function () {
            assert.equals(ansi.fit("...\n.....", 3), "...\n...\n..");
        }
    }
});
