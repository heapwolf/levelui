var buster = require("buster");
var helper = require("./helper");
var terminal = require("../lib/buster-terminal");

buster.testCase("Matrix", {
    setUp: function () {
        this.terminal = helper.createAsciiTerminal(this);
        this.grid = terminal.createRelativeGrid(this.terminal);
    },

    "creates grid from output stream": function () {
        var m = terminal.createMatrix({ outputStream: this.terminal, columns: 1 });
        m.addRow(["Text"]);
        assert.stdout("Text \n");
    },

    "add row": {
        "fails for wrong number of columns": function () {
            var m = terminal.createMatrix({ columns: 2 });
            assert.exception(function () { m.addRow(["Hey"]); });
            assert.exception(function () { m.addRow(["Hey", "There", "Oops"]); });
        },

        "returns row id": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 2 });
            var id = m.addRow(["", ""]);
            var id2 = m.addRow(["", ""]);
            assert.equals(id, 0);
            assert.equals(id2, 1);
        }
    },

    "one column": {
        setUp: function () {
            this.matrix = terminal.createMatrix({ grid: this.grid, columns: 1 });
        },

        "prints text": function () {
            this.matrix.addRow(["Text"]);
            assert.stdout("Text \n");
        },

        "prints text with padding": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 1, padding: 2 });
            m.addRow(["Text"]);
            assert.stdout("Text  \n");
        },

        "prints text without padding": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 1, padding: 0 });
            m.addRow(["Text"]);
            assert.stdout("Text\n");
        },

        "prints text on two rows": function () {
            this.matrix.addRow(["Text"]);
            this.matrix.addRow(["Book"]);
            assert.stdout("Text \n" +
                          "Book \n");
        },

        "prints multi-line text": function () {
            this.matrix.addRow(["Text\nBook"]);
            assert.stdout("Text \n" +
                          "Book \n");
        },

        "prints all columns at same width": function () {
            this.matrix.addRow(["Text"]);
            this.matrix.addRow(["TV"]);
            assert.stdout("Text \n" +
                          "TV   \n");
        },

        "prints row after multi-line text": function () {
            this.matrix.addRow(["Text\nBook"]);
            this.matrix.addRow(["TV"]);
            assert.stdout("Text \n" +
                          "Book \n" +
                          "TV   \n");
        }
    },

    "two columns": {
        setUp: function () {
            this.matrix = terminal.createMatrix({ grid: this.grid, columns: 2 });
        },

        "prints two columns": function () {
            this.matrix.addRow(["One", "Two"]);
            assert.stdout("One Two \n");
        },

        "prints two columns with colored text": function () {
            this.matrix.addRow(["\x1b[32mOne\x1b[0m", "\x1b[31mTwo\x1b[0m"]);
            assert.stdout("\x1b[32mOne\x1b[0m \x1b[31mTwo\x1b[0m \n");
        },

        "coerces numbers to strings": function () {
            this.matrix.addRow(["Yo", 42]);
            assert.stdout("Yo 42 \n");
        },

        "prints one multi-line column": function () {
            this.matrix.insertRow(0, ["One", "Two\nThree"]);
            assert.stdout("One Two   \n" +
                          "    Three \n");
        },

        "prints two multi-line columns": function () {
            this.matrix.addRow(["One\nTwo", "Three\nFour"]);
            assert.stdout("One Three \n" +
                          "Two Four  \n");
        }
    },

    "multi-line cells": {
        setUp: function () {
            this.matrix = terminal.createMatrix({ grid: this.grid, columns: 3 });
        },

        "prints multi-line content in first column": function () {
            this.matrix.addRow(["One\nTwo", "Three", "Four"]);
            assert.stdout("One Three Four \n" +
                          "Two \n");
        },

        "prints multi-line content in middle column": function () {
            this.matrix.addRow(["One", "Two\nThree", "Four"]);
            assert.stdout("One Two   Four \n" +
                          "    Three \n");
        },

        "prints multi-line content in last column": function () {
            this.matrix.addRow(["One", "Two", "Three\nFour"]);
            assert.stdout("One Two Three \n" +
                          "        Four  \n");
        },

        "prints multi-line content in all columns": function () {
            this.matrix.addRow(["One\nTwo", "Three\nFour", "Five\nSix"]);
            assert.stdout("One Three Five \n" +
                          "Two Four  Six  \n");
        },

        "adds row after multi-line row": function () {
            this.matrix.addRow(["One", "Two\nThree", "Four"]);
            this.matrix.addRow(["Five", "Six", "Seven"]);
            assert.stdout("One  Two   Four  \n" +
                          "     Three       \n" +
                          "Five Six   Seven \n");
        }
    },

    "redrawing": {
        "replaces single column": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 1 });
            m.addRow(["One"]);
            m.redraw();
            assert.stdout("One \n");
        },

        "replaces matrix with itself": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 2 });
            m.addRow(["One", "Two"]);
            m.addRow(["1", "2"]);
            m.redraw();
            assert.stdout("One Two \n" +
                          "1   2   \n");
        }
    },

    "resizing": {
        setUp: function () {
            this.matrix = terminal.createMatrix({ grid: this.grid, columns: 2 });
        },

        "resizes first column": function () {
            this.matrix.addRow(["A", "B"]);
            this.matrix.addRow(["C", "D"]);
            this.matrix.resizeColumn(0, 10);
            assert.stdout("A          B \n" +
                          "C          D \n");
        },

        "resizes second column": function () {
            this.matrix.addRow(["A", "B"]);
            this.matrix.addRow(["C", "D"]);
            this.matrix.resizeColumn(1, 10);
            assert.stdout("A B          \n" +
                          "C D          \n");
        },

        "resizes middle column": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 3 });
            m.addRow(["A", "B", "C"]);
            m.addRow(["D", "E", "F"]);
            m.resizeColumn(1, 10);
            assert.stdout("A B          C \n" +
                          "D E          F \n");
        },

        "expands columns to fit wider content": function () {
            this.matrix.addRow(["One", "Two"]);
            this.matrix.addRow(["Three", "4"]);
            assert.stdout("One   Two \n" +
                          "Three 4   \n");
        },

        "reflows entire matrix": function () {
            this.matrix.addRow(["1", "2"]);
            this.matrix.addRow(["Three", "Four"]);
            assert.stdout("1     2    \n" +
                          "Three Four \n");
        },

        "reflows matrix when resizing all columns": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 3 });
            m.addRow(["1", "2", "3"]);
            m.addRow(["One", "Two", "Three"]);
            assert.stdout("1   2   3     \n" +
                          "One Two Three \n");
        }
    },

    "inserting row": {
        setUp: function () {
            this.matrix = terminal.createMatrix({
                grid: this.grid,
                columns: 2
            });
        },

        "adds row to the bottom": function () {
            this.matrix.addRow(["One", "Two"]);
            this.matrix.insertRow(1, ["Three", "Four"]);
            assert.stdout("One   Two  \n" +
                          "Three Four \n");
        },

        "fails for mis-matched column count": function () {
            var m = terminal.createMatrix({ columns: 2 });
            assert.exception(function () {
                m.insertRow(0, [""]);
            });
            assert.exception(function () {
                m.insertRow(0, ["", "", ""]);
            });
        },

        "fails when row-index out of bounds": function () {
            var m = terminal.createMatrix({ columns: 2 });
            assert.exception(function () {
                m.insertRow(1, ["", ""]);
            });
        },

        "adds row to the top": function () {
            this.matrix.addRow(["One", "Two"]);
            this.matrix.insertRow(0, ["Three", "Four"]);
            assert.stdout("Three Four \n" +
                          "One   Two  \n");
        },

        "adds multi-line row to the top": function () {
            this.matrix.addRow(["One", "Two"]);
            this.matrix.insertRow(0, ["Three", "Four\nFive"]);
            assert.stdout("Three Four \n" +
                          "      Five \n" +
                          "One   Two  \n");
        },

        "adds row in fixed sized column": function () {
            this.matrix.resizeColumn(1, 4);
            this.matrix.freezeColumn(1);

            this.matrix.addRow(["One", "Two"]);
            this.matrix.insertRow(0, ["Three", "Four"]);
            assert.stdout("Three Four \n" +
                          "One   Two  \n");
        },

        "adds multi-line row in fixed sized column": function () {
            this.matrix.resizeColumn(1, 4);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["One", "Two"]);
            this.matrix.insertRow(0, ["Three", "Four\nFive"]);
            assert.stdout("Three Four \n" +
                          "      Five \n" +
                          "One   Two  \n");
        },

        "adds row in the middle": function () {
            this.matrix.addRow(["One", "Two"]);
            this.matrix.addRow(["Five", "Six"]);
            this.matrix.insertRow(1, ["Three", "Four"]);
            assert.stdout("One   Two  \n" +
                          "Three Four \n" +
                          "Five  Six  \n");
        },

        "inserts rows then adds one to the bottom": function () {
            this.matrix.addRow(["One", "Two"]);
            this.matrix.addRow(["Five", "Six"]);
            this.matrix.insertRow(1, ["Three", "Four"]);
            this.matrix.insertRow(2, ["5", "6"]);
            this.matrix.addRow(["-", "."]);
            assert.stdout("One   Two  \n" +
                          "Three Four \n" +
                          "5     6    \n" +
                          "Five  Six  \n" +
                          "-     .    \n");
        },

        "inserts multi-line row at the top": function () {
            this.matrix.addRow(["Five", "Six"]);
            this.matrix.insertRow(0, ["One", "Two\nThree"]);
            assert.stdout("One  Two   \n" +
                          "     Three \n" +
                          "Five Six   \n");
        },

        "does not reassign row id": function () {
            var id = this.matrix.addRow([".", "."]);
            var id2 = this.matrix.insertRow(0, ["!", "?"]);
            assert.equals(id, 0);
            assert.equals(id2, 1);
            assert.equals(this.matrix.rowById(id).columns(), [".", "."]);
        }
    },

    "rowById": {
        setUp: function () {
            this.matrix = terminal.createMatrix({ grid: this.grid, columns: 2 });
        },

        "returns mutable row": function () {
            var id = this.matrix.addRow(["A", "B"]);
            this.matrix.rowById(id).append(1, "!");
            assert.stdout("A B! \n");
        }
    },

    "column wrapping": {
        setUp: function () {
            this.matrix = terminal.createMatrix({
                grid: this.grid,
                columns: 3
            });
        },

        "wraps too long column": function () {
            this.matrix.resizeColumn(1, 5);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["Firefox", "..........", "Ok"]);
            assert.stdout("Firefox ..... Ok \n" +
                          "        ..... \n");
        },

        "wraps too long column multiple times": function () {
            this.matrix.resizeColumn(1, 3);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["Firefox", "..........", "Ok"]);
            assert.stdout("Firefox ... Ok \n" +
                          "        ... \n" +
                          "        ... \n" +
                          "        .   \n");
        },

        "wraps too long colored column multiple times": function () {
            var m = terminal.createMatrix({ grid: this.grid, columns: 2 });
            m.resizeColumn(1, 3);
            m.freezeColumn(1);
            m.addRow(["Firefox", "\x1b[32m.\x1b[0m\x1b[32m.\x1b[0m" +
                      "\x1b[32m.\x1b[0m\x1b[32m.\x1b[0m" +
                      "\x1b[32m.\x1b[0m\x1b[32m.\x1b[0m" +
                      "\x1b[32m.\x1b[0m\x1b[32m.\x1b[0m" +
                      "\x1b[32m.\x1b[0m\x1b[32m.\x1b[0m"]);
            assert.stdout("Firefox \x1b[32m.\x1b[0m\x1b[32m.\x1b[0m\x1b[32m. \n" +
                          "        \x1b[0m\x1b[32m.\x1b[0m\x1b[32m.\x1b[0m\x1b[32m. \n" +
                          "        \x1b[0m\x1b[32m.\x1b[0m\x1b[32m.\x1b[0m\x1b[32m. \n" +
                          "        \x1b[0m\x1b[32m.\x1b[0m   \n");
        }
    },

    "appending content": {
        setUp: function () {
            this.matrix = terminal.createMatrix({ grid: this.grid, columns: 2 });
        },

        "grows column as needed": function () {
            this.matrix.addRow(["Firefox", ""]);
            this.matrix.addRow(["Chrome", ""]);
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(1, 1, "F");
            this.matrix.append(1, 1, ".");
            assert.stdout("Firefox .. \n" +
                          "Chrome  F. \n");
        },

        "wraps column as needed": function () {
            this.matrix.resizeColumn(1, 3);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["Firefox", ""]);
            this.matrix.append(0, 1, "...");
            this.matrix.append(0, 1, "...");
            assert.stdout("Firefox ... \n" +
                          "        ... \n");
        },

        "wraps column and moves subsequent lines as needed": function () {
            this.matrix.resizeColumn(1, 3);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["Firefox", ""]);
            this.matrix.addRow(["Chrome", ""]);
            this.matrix.append(0, 1, "......");
            assert.stdout("Firefox ... \n" +
                          "        ... \n" +
                          "Chrome      \n");
        },

        "wraps and moves continuously": function () {
            this.matrix.resizeColumn(1, 3);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["Firefox", ""]);
            this.matrix.addRow(["Chrome", ""]);
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            assert.stdout("Firefox ... \n" +
                          "        ... \n" +
                          "        ..  \n" +
                          "Chrome      \n");
        },

        "does not redraw matrix when there's more space": function () {
            this.matrix.resizeColumn(1, 10);
            this.matrix.addRow(["Firefox", ""]);
            this.spy(this.matrix, "redraw");
            this.matrix.append(0, 1, ".");
            refute.called(this.matrix.redraw);
            assert.stdout("Firefox .          \n");
        },

        "redraws matrix when a new line is needed": function () {
            this.matrix.resizeColumn(1, 3);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["Firefox", ""]);
            this.spy(this.matrix, "redraw");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            assert.calledOnce(this.matrix.redraw);
            assert.stdout("Firefox ... \n" +
                          "        .   \n");
        },

        "appends content without redrawing on second line": function () {
            this.matrix.resizeColumn(1, 3);
            this.matrix.freezeColumn(1);
            this.matrix.addRow(["Firefox", ""]);
            this.spy(this.matrix, "redraw");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            this.matrix.append(0, 1, ".");
            assert.calledOnce(this.matrix.redraw);
            assert.stdout("Firefox ... \n" +
                          "        ... \n");
        }// ,

        // "inserts rows and appends content": function () {
        //     var m = terminal.createMatrix({ grid: this.grid, columns: 2 });
        //     m.resizeColumn(1, 80);
        //     m.freezeColumn(1);
        //     m.addRow(["Chrome 18.0.1025.151 Linux:", ""]);

        //     assert.stdout("Chrome 18.0.1025.151 Linux:                                                                                  \n");

        //     m.insertRow(0, ["Chrome 18.0.1025.151 Linux", "./bogus.js:1 Boom"]);

        //     assert.stdout("Chrome 18.0.1025.151 Linux  ./bogus.js:1 Boom                                                                \n" +
        //                   "Chrome 18.0.1025.151 Linux:                                                                                  \n");

        //     m.addRow(["Firefox 11.0 Linux:", ""]);

        //     assert.stdout("Chrome 18.0.1025.151 Linux  ./bogus.js:1 Boom \n" +
        //                   "Chrome 18.0.1025.151 Linux:                   \n" +
        //                   "Firefox 11.0 Linux:                           \n");

        //     m.insertRow(0, ["Firefox 11.0 Linux", "./bogus.js:1 Boom"]);

        //     assert.stdout("Firefox 11.0 Linux          ./bogus.js:1 Boom \n" +
        //                   "Chrome 18.0.1025.151 Linux  ./bogus.js:1 Boom \n" +
        //                   "Chrome 18.0.1025.151 Linux:                   \n" +
        //                   "Firefox 11.0 Linux:                           \n");

        //     m.append(3, 1, ".");

        //     assert.stdout("Firefox 11.0 Linux          ./bogus.js:1 Boom \n" +
        //                   "Chrome 18.0.1025.151 Linux  ./bogus.js:1 Boom \n" +
        //                   "Chrome 18.0.1025.151 Linux:                   \n" +
        //                   "Firefox 11.0 Linux:         .                 \n");

        //     m.append(2, 1, ".");

        //     assert.stdout("Firefox 11.0 Linux          ./bogus.js:1 Boom \n" +
        //                   "Chrome 18.0.1025.151 Linux  ./bogus.js:1 Boom \n" +
        //                   "Chrome 18.0.1025.151 Linux: .                 \n" +
        //                   "Firefox 11.0 Linux:         .                 \n");
        // },
    }
});
