var buster = require("buster-core");
var terminal = require("buster-terminal");
buster.stackFilter = require("../stack-filter");

function pluralize(num, phrase) {
    num = typeof num == "undefined" ? 0 : num;
    return num + " " + (num == 1 ? phrase : phrase + "s");
}

module.exports = {
    create: function (runner, opt) {
        var reporter = buster.create(this);
        opt = opt || {};
        reporter.io = opt.io || require("util");
        reporter.term = terminal.create(opt);
        reporter.cwd = opt.cwd;
        reporter.reset();

        return reporter;
    },

    testError: function (test) {
        test.contextName = (this.contextNames || []).join(" ");
    },

    testFailure: function (test) {
        test.contextName = (this.contextNames || []).join(" ");
    },

    uncaughtException: function (error) {
        this.uncaught = this.uncaught || [];
        this.uncaught.push({ error: error });
    },

    startContext: function (context) {
        this.contextNames = this.contextNames || [];
        this.contextNames.push(context.name);
    },

    endContext: function (context) {
        this.contextNames.pop();
    },

    success: function (stats) {
        return stats.failures === 0 && stats.errors === 0 &&
            stats.timeouts === 0 && stats.tests > 0 && stats.assertions > 0;
    },

    printUncaughtExceptions: function () {
        this.printExceptions(this.uncaught, this.term.red("Uncaught exception!"));
    },

    printFailures: function () {
        this.printExceptions(this.failures, this.term.red("Failure"));
    },

    printErrors: function () {
        this.printExceptions(this.errors, this.term.yellow("Error"));
    },

    printTimeouts: function () {
        this.printExceptions(this.timeouts, this.term.red("Timeout"));
    },

    printExceptions: function (exceptions, label) {
        var fail, stack;
        exceptions = exceptions || [];

        for (var i = 0, l = exceptions.length; i < l; ++i) {
            fail = exceptions[i];
            this.io.print(label);

            if (fail.contextName) {
                this.io.print(": " + fail.contextName);
            }

            if (fail.name) {
                this.io.print(" " + fail.name);
            }

            this.io.print("\n");

            if (typeof this.printLog == "function" && fail.contextName && fail.name) {
                this.printLog(fail.contextName, fail.name);
            }

            if (fail.error) {
                stack = buster.stackFilter(fail.error.stack, this.cwd);
                if (fail.error.source) {
                    this.io.puts("    -> " + fail.error.source);
                }

                this.io.print("    ");

                if (fail.error.name && fail.error.name != "AssertionError") {
                    this.io.print(this.term.red(fail.error.name + ": "));
                }

                this.io.puts(this.term.red(fail.error.message));

                if (stack.length > 0) {
                    this.io.puts("    " + stack.join("\n    "));
                }
            }

            this.io.puts("");
        }
    },

    printUnsupported: function (unsupported) {
        var str = "";

        for (var i = 0, l = unsupported.length; i < l; ++i) {
            str += "Skipping " + unsupported[i].context + ", unsupported requirement";

            if (unsupported[i].unsupported.length > 1) {
                str += "s:\n    " + unsupported[i].unsupported.join("\n    ") + "\n";
            } else {
                str += ": " + unsupported[i].unsupported[0] + "\n";
            }
        }

        this.io.print(this.term.yellow(str) + (!!str ? "\n" : ""));
    },

    printStats: function (stats) {
        this.printUncaughtExceptions();
        stats = stats || {};

        var statStr = [pluralize(stats.contexts, "test case"),
                       pluralize(stats.tests, "test"),
                       pluralize(stats.assertions, "assertion"),
                       pluralize(stats.failures, "failure"),
                       pluralize(stats.errors, "error"),
                       pluralize(stats.timeouts, "timeout")];

        if (stats.deferred > 0) {
            statStr.push(stats.deferred + " deferred");
        }

        if (stats.tests == 0) {
            this.io.puts(this.term.red("No tests"));
        } else {
            var color = this.success(stats) ? "green" : "red";
            this.io.puts(this.term[color](statStr.join(", ")));
            if (stats.assertions == 0) {
                this.io.puts(this.term.red("WARNING: No assertions"));
            }
        }

        if (this.startedAt) {
            var diff = (new Date() - this.startedAt) / 1000;
            this.io.puts("Finished in " + diff + "s");
        }
    },

    reset: function () {
        this.failures = [];
        this.errors = [];
        this.timeouts = [];
        this.startedAt = new Date().getTime();
    }
};
