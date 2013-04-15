var assert = require("buster-assertions").assert;

module.exports = {
    assertIO: function (string) {
        try {
            assert.match(this.io.toString(), string);
        } catch (e) {
            e.message = "\nassert.match failed\n" +
                "===================\nIO:\n" +
                this.io.toString() + "\n" +
                "===================\nPattern:\n" +
                string + "\n-------------------\n";
            throw e;
        }
    },

    io: function () {
        return {
            content: "",
            puts: function (str) { this.print(str + "\n"); },
            print: function (str) { this.content += str; },
            toString: function () { return this.content }
        };
    }
};
