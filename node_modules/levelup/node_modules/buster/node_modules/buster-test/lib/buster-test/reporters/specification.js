var buster = require("buster-core");
var terminal = require("buster-terminal");
buster.stackFilter = require("../stack-filter");
var consoleReporter = require("./console");

module.exports = {
    create: function (opt) {
        opt = opt || {};
        var reporter = buster.create(this);
        reporter.io = opt.io || require("util");
        reporter.term = terminal.create(opt);
        reporter.cwd = opt.cwd;
        reporter.contexts = [];

        return reporter;
    },

    listen: function (runner) {
        runner.bind(this, {
            "context:start": "contextStart", "context:end": "contextEnd",
            "context:unsupported": "contextUnsupported",
            "test:success": "testSuccess", "test:failure": "testFailure",
            "test:error": "testError", "test:timeout": "testTimeout",
            "test:deferred": "testDeferred", "suite:end": "printStats",
            "suite:start": "suiteStart", "uncaughtException": "uncaughtException"
        });

        if (runner.console) {
            runner.console.bind(this, ["log"]);
        }

        return this;
    },

    suiteStart: function () {
        this.startedAt = new Date();
    },

    contextStart: function (context) {
        if (this.contexts.length == 0) {
            this.io.puts(context.name);
        }

        this.contexts.push(context.name);
    },

    contextEnd: function (context) {
        this.contexts.pop();
    },

    contextUnsupported: function (data) {
        consoleReporter.printUnsupported.call(this, [{
            context: this.contexts.concat([data.context.name]).join(" "),
            unsupported: data.unsupported
        }]);
    },

    testSuccess: function (test) {
        this.io.puts(this.term.green("  ✓ " + this.getPrefix() + test.name));
        this.printMessages();
    },

    testFailure: function (test) {
        var name = "", color = "red";

        if (test.error && test.error.name != "AssertionError") {
            name = test.error.name + ": ";
            color = "yellow";
        }

        this.io.puts(this.term[color]("  ✖ " + this.getPrefix() + test.name));
        this.printMessages();

        if (!test.error) {
            return;
        }

        this.io.puts("    " + this.term[color](name + test.error.message));
        var stack = buster.stackFilter(test.error.stack, this.cwd);

        if (stack.length > 0) {
            this.io.puts("      " + stack.join("\n      ") + "\n");
        }
    },

    testDeferred: function (test) {
        this.io.puts(this.term.cyan("  - " + this.getPrefix() + test.name));
    },

    testTimeout: function (test) {
        this.io.print(this.term.red("  … " + this.getPrefix() + test.name));
        var source = test.error && test.error.source;
        if (source) { this.io.print(" (" + test.error.source + ")"); }
        this.io.print("\n");
        this.printMessages();
    },

    log: function (msg) {
        this.messages = this.messages || [];
        this.messages.push(msg);
    },

    printMessages: function () {
        var messages = this.messages || [], level;

        for (var i = 0, l = messages.length; i < l; ++i) {
            level = messages[i].level.toUpperCase();
            this.io.puts("    [" + level + "] " + messages[i].message);
        }

        if (messages.length > 0) {
            this.io.puts("");
        }

        this.messages = [];
    },

    getPrefix: function () {
        var prefix = this.contexts.slice(1).join(" ");
        return prefix + (prefix.length > 0 ? " " : "");
    },

    printStats: consoleReporter.printStats,
    success: consoleReporter.success,
    uncaughtException: consoleReporter.uncaughtException,
    printExceptions: consoleReporter.printExceptions,
    printUncaughtExceptions: consoleReporter.printUncaughtExceptions
};

module.exports.testError = module.exports.testFailure;
