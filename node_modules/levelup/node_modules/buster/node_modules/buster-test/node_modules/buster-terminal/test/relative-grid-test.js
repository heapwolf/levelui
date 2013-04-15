var buster = require("buster");
var helper = require("./helper");
var terminal = require("../lib/buster-terminal");

buster.testCase("Relative grid", {
    setUp: function () {
        this.terminal = helper.createAsciiTerminal(this);
        this.grid = terminal.createRelativeGrid(this.terminal);
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
        var t = terminal.create({ color: true });
        this.grid.write(t.green("Hey") + "\n");
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
