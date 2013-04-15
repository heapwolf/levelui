var buster = require("buster-node");
var assert = buster.assert;
var helper = require("./helper");
var ag = require("../lib/ansi-grid");

buster.testCase("Relative grid", {
    setUp: function () {
        this.terminal = helper.createAsciiTerminal(this);
        this.grid = ag.createRelativeGrid(this.terminal);
    },

    "prints text": function () {
        this.grid.write("Hey\n");
        assert.stdout("Hey\n");
    },

    "overwrites text": function () {
        this.grid.write("Hey\n");
        this.grid.go(0, 0);
        this.grid.write("Yo!\n");
        assert.stdout("Yo!\n");
    },

    "calculates correct position and length for colorized text": function () {
        this.grid.write("\x1b[1mHey\x1b[0m\n");
        this.grid.go(0, 0);
        this.grid.write("Yo mister green\n");
        assert.stdout("Yo mister green\n");
    },

    "inserts blank lines when walking past max y": function () {
        this.grid.write("Hey\n");
        this.grid.go(0, 5);
        assert.stdout("Hey\n\n\n\n\n");
    },

    "goes to non-existing coordinate": function () {
        this.grid.write("Hey\n");
        this.grid.go(5, 5);
        this.grid.write("Yo\n");
        this.grid.write("Hmm\n");
        assert.stdout("Hey\n\n\n\n\n     Yo\nHmm\n");
    }
});
