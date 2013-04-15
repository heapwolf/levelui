var ansi = require("../lib/ansi");
var buster = require("buster-node");

function visualizeWhitespace(string) {
    return ("'" + string.split("\n").join("'\n'") + "'");
}

module.exports.createAsciiTerminal = function (tc) {
    var matrix = [];
    var currPos = [0, 0];
    var saved;

    matrix.toString = function () {
        return matrix.reduce(function (str, row) {
            return str + row.join("") + "\n";
        }, "");
    };

    var outStream = {
        write: function (str) {
            if (!str || !ansi.stripSeq(str)) { return; }
            var x = currPos[0];
            var y = currPos[1];
            var character, i, l, j, k;

            for (i = 0, l = str.length; i < l; ++i) {
                character = str[i];
                matrix[y] = matrix[y] || [];
                if (character === "\n") {
                    x = 0;
                    y += 1;
                } else {
                    for (j = 0, k = x; j < k; ++j) {
                        if (typeof matrix[y][j] === "undefined") {
                            matrix[y][j] = " ";
                        }
                    }
                    matrix[y][x] = character;
                    x += 1;
                }
            }
            currPos = [x, y];
        },
        toString: function () {
            return matrix.toString();
        }
    };

    tc.stub(ansi, "save", function () {
        saved = currPos.slice();
        return "";
    });
    tc.stub(ansi, "restore", function () {
        currPos = saved.slice();
        return "";
    });
    tc.stub(ansi, "up", function (n) {
        currPos[1] = currPos[1] - n;
        return "";
    });
    tc.stub(ansi, "down", function (n) {
        currPos[1] = currPos[1] + n;
        return "";
    });
    tc.stub(ansi, "fwd", function (n) {
        currPos[0] = currPos[0] + n;
        return "";
    });
    tc.stub(ansi, "back", function (n) {
        currPos[0] = currPos[0] - n;
        return "";
    });

    buster.referee.add("stdout", {
        assert: function (expected) {
            this.actual = visualizeWhitespace(matrix.toString());
            this.expected = visualizeWhitespace(expected);
            return this.actual === this.expected;
        },
        assertMessage: "Expected stdout to be:\n${expected}\nBut was:\n${actual}"
    });

    return outStream;
};
