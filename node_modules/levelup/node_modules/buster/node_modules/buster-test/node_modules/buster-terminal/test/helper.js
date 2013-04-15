var terminal = require("../lib/buster-terminal");

function visualizeWhitespace(string) {
    return ("'" + string.split("\n").join("'\n'") + "'");
}

exports.createAsciiTerminal = function (tc) {
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
            if (!str || !terminal.stripSeq(str)) { return; }
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

    tc.stub(terminal, "save", function () {
        saved = currPos.slice();
        return "";
    });
    tc.stub(terminal, "restore", function () {
        currPos = saved.slice();
        return "";
    });
    tc.stub(terminal, "up", function (n) {
        currPos[1] = currPos[1] - n;
        return "";
    });
    tc.stub(terminal, "down", function (n) {
        currPos[1] = currPos[1] + n;
        return "";
    });
    tc.stub(terminal, "fwd", function (n) {
        currPos[0] = currPos[0] + n;
        return "";
    });
    tc.stub(terminal, "back", function (n) {
        currPos[0] = currPos[0] - n;
        return "";
    });

    buster.assertions.add("stdout", {
        assert: function (expected) {
            this.actual = visualizeWhitespace(matrix.toString());
            this.expected = visualizeWhitespace(expected);
            return this.actual === this.expected;
        },
        assertMessage: "Expected stdout to be:\n${expected}\nBut was:\n${actual}"
    });

    return outStream;
};
