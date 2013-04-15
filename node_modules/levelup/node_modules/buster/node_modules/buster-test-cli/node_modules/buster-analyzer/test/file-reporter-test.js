var buster = require("buster");
var bane = require("bane");
var ba = require("../lib/buster-analyzer");

function outputStream() {
    var output = [];
    return {
        write: function (text) { output.push(text); },
        toString: function () { return output.join(""); }
    };
}

buster.testCase("Analyzer reporter", {
    setUp: function () {
        this.analyzer = bane.createEventEmitter();
        var out = this.out = outputStream();
        buster.assertions.add("output", {
            assert: function (string) {
                this.out = out.toString();
                return buster.assertions.match(this.out, string);
            },
            assertMessage: "Expected IO ${out} to include ${0}",
            refuteMessage: "Expected IO ${out} not to include ${0}"
        });
    },

    "fatal threshold": {
        setUp: function () {
            this.reporter = ba.createFileReporter("fatal", {
                outputStream: this.out
            });
            this.reporter.listen(this.analyzer);
        },

        "prints fatal message": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.output("[Fatal] Oh noes");
        },

        "does not print error message": function () {
            this.analyzer.emit("error", "Oh noes", {});
            refute.match(this.out.toString(), "Oh noes");
        },

        "does not print warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            refute.match(this.out.toString(), "Oh noes");
        }
    },

    "error threshold": {
        setUp: function () {
            this.reporter = ba.createFileReporter("error", {
                outputStream: this.out
            });
            this.reporter.listen(this.analyzer);
        },

        "prints fatal message": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.output("Oh noes");
        },

        "prints error message": function () {
            this.analyzer.emit("error", "Oh noes", {});
            assert.output("[Error] Oh noes");
        },

        "does not print warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            refute.match(this.out.toString(), "Oh noes");
        }
    },

    "warning threshold": {
        setUp: function () {
            this.reporter = ba.createFileReporter("warning", {
                outputStream: this.out
            });
            this.reporter.listen(this.analyzer);
        },

        "prints fatal message": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.output("Oh noes");
        },

        "prints error message": function () {
            this.analyzer.emit("error", "Oh noes", {});
            assert.output("Oh noes");
        },

        "prints warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            assert.output("[Warning] Oh noes");
        }
    },

    "all threshold": {
        setUp: function () {
            this.reporter = ba.createFileReporter("all", {
                outputStream: this.out,
                colorizer: {
                    red: function (str) {
                        return "\x1b[31m" + str + "\x1b[0m";
                    },

                    yellow: function (str) {
                        return "\x1b[33m" + str + "\x1b[0m";
                    },

                    grey: function (str) {
                        return "\x1b[38;5;8m" + str + "\x1b[0m";
                    }
                }
            });
            this.reporter.listen(this.analyzer);
        },

        "prints warning message": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            assert.output("Oh noes");
        },

        "prints fatal message in red": function () {
            this.analyzer.emit("fatal", "Oh noes", {});
            assert.output("\x1b[31m[Fatal] Oh noes\x1b[0m");
        },

        "prints error message in yellow": function () {
            this.analyzer.emit("error", "Oh noes", {});
            assert.output("\x1b[33m[Error] Oh noes\x1b[0m");
        },

        "prints warning message in grey": function () {
            this.analyzer.emit("warning", "Oh noes", {});
            assert.output("\x1b[38;5;8m[Warning] Oh noes\x1b[0m");
        }
    },

    "message formatting": {
        setUp: function () {
            this.reporter = ba.createFileReporter("warning", {
                outputStream: this.out
            });
            this.reporter.listen(this.analyzer);
        },

        "prints file name, line and column": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "stuff.js",
                line: 2,
                col: 13
            }]});

            assert.output("stuff.js:2:13");
        },

        "prints file name and line": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "stuff.js",
                line: 2
            }]});

            assert.output("stuff.js:2");
            refute.output("undefined");
        },

        "prints anonymous for missing file name": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                line: 2,
                col: 13
            }]});

            assert.output("<anonymous>:2:13");
        },

        "prints description": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                line: 2,
                col: 13,
                description: "Uh-oh"
            }]});

            assert.output("<anonymous>:2:13 Uh-oh");
        },

        "skips line and column if not present": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js"
            }]});

            refute.output(/\d:\d/);
        },

        "prints script content after line label": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                content: "Hey"
            }]});

            assert.output("hey.js\nHey\n");
        },

        "prints script message after line label": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                message: "Hey"
            }]});

            assert.output("hey.js\nHey\n");
        },

        "does not print content if not present": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js"
            }]});

            refute.output("undefined");
        },

        "replaces tab characters with spaces": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                content: "\tHey \tthere"
            }]});

            assert.output("\n    Hey     there\n");
        },

        "prints caret at col on next line after content": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 10,
                col: 5,
                content: "Hey there"
            }]});

            assert.output("\nHey there\n");
            assert.output("\n    ^\n");
        },

        "prints caret on column 1": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 7,
                col: 1,
                content: "var a;"
            }]});

            assert.output("\nvar a;\n");
            assert.output("\n^\n");
        },

        "prints caret adjusted for tabs": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 132,
                col: 2,
                content: "\tHey \tthere"
            }]});

            assert.output("\n    Hey     there\n");
            assert.output("\n    ^\n");
        },

        "prints caret adjusted for multiple tabs": function () {
            this.analyzer.emit("error", "Bad", { errors: [{
                file: "hey.js",
                line: 2,
                col: 7,
                content: "\tHey \tthere"
            }]});

            assert.output("\n    Hey     there\n");
            assert.output("\n            ^\n");
        },

        "prints object's toString if there's no 'errors'": function () {
            this.analyzer.emit("error", "Oops", {
                toString: function () {
                    return "Yay";
                }
            });

            assert.output("Oops\n    Yay\n");
        }
    }
});
