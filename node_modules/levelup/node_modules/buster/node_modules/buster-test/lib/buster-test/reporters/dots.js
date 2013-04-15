var buster = require("buster-core");
var consoleReporter = require("./console");
var terminal = require("buster-terminal");

function messages(reporter, context, test) {
    if (!context || !test) {
        reporter.globalMessageLog = reporter.globalMessageLog || [];
        return reporter.globalMessageLog;
    }

    reporter.messageLog = reporter.messageLog || {};
    reporter.messageLog[context] = reporter.messageLog[context] || {};
    reporter.messageLog[context][test] = reporter.messageLog[context][test] || [];

    return reporter.messageLog[context][test];
}

module.exports = buster.extend(buster.create(consoleReporter), {
    create: function (opt) {
        opt = opt || {};
        var reporter = buster.create(this);
        reporter.io = opt.io || require("util");
        reporter.logPassedMessages = !!opt.logPassedMessages;
        reporter.term = terminal.create(opt);
        reporter.cwd = opt.cwd;
        reporter.displayProgress = typeof opt.displayProgress == "boolean" ? opt.displayProgress : true;
        reporter.reset();

        return reporter;
    },

    listen: function (runner) {
        runner.bind(this, {
            "suite:start": "reset", "suite:end": "printDetails",
            "context:start": "startContext", "context:end": "endContext",
            "context:unsupported": "unsupportedContext",
            "test:success": "testSuccess", "test:error": "testError",
            "test:failure": "testFailure", "test:async": "testAsync",
            "test:timeout": "testTimeout", "test:setUp": "testSetUp",
            "test:deferred": "testDeferred", "runner:focus": "focusMode",
            "uncaughtException": "uncaughtException"
        });

        if (runner.console) {
            runner.console.bind(this, "log");
        }

        return this;
    },

    focusMode: function () {
        if (!this.displayProgress) { return; }
        this.io.puts([
            this.term.grey("=> "),
            "注",
            this.term.grey(" (concentrate, focus, direct)")
        ].join(""));
        this.io.puts("");
    },

    testSetUp: function (test) {
        this.currentTest = test.name;
    },

    testSuccess: function (test) {
        this.replaceAsyncMarker();
        this.printProgress(this.term.green("."));
    },

    testError: function (test) {
        this.replaceAsyncMarker();
        test.contextName = (this.contextNames || []).join(" ");
        this.errors.push(test);
        this.printProgress(this.term.yellow("E"));
    },

    testFailure: function (test) {
        this.replaceAsyncMarker();
        test.contextName = (this.contextNames || []).join(" ");
        this.failures.push(test);
        this.printProgress(this.term.red("F"));
    },

    testTimeout: function (test) {
        this.replaceAsyncMarker();
        test.contextName = (this.contextNames || []).join(" ");
        this.timeouts.push(test);
        this.printProgress(this.term.red("T"));
    },

    testAsync: function (test) {
        this.async = true;
        this.printProgress(this.term.purple("A"));
    },

    testDeferred: function (test) {
        this.deferred = this.deferred || [];

        this.deferred.push({
            name: test.name,
            comment: test.comment,
            context: this.contextNames.join(" ")
        });
    },

    startContext: function (context) {
        this.contextNames = this.contextNames || [];

        if (this.contextNames.length == 0) {
            this.printProgress(context.name + ": ");
        }

        this.contextNames.push(context.name);
    },

    endContext: function (context) {
        this.contextNames.pop();

        if (this.contextNames.length == 0) {
            this.printProgress("\n");
        }
    },

    unsupportedContext: function (data) {
        this.unsupported = this.unsupported || [];

        this.unsupported.push({
            context: (this.contextNames || []).concat([data.context.name]).join(" "),
            unsupported: data.unsupported
        });
    },

    printDetails: function (stats) {
        this.printDeferred();
        this.printUnsupported();
        this.printTimeouts();
        this.printFailures();
        this.printErrors();
        this.printMessages();
        this.printStats(stats);
    },

    printMessages: function () {
        this.printGlobalMessages();
        if (!this.logPassedMessages) { return; }
        var log = this.messageLog || {};

        for (var ctx in log) {
            for (var test in log[ctx]) {
                if (log[ctx][test].length) {
                    this.io.puts(this.term.green("Passed: " + ctx + " " + test));
                }

                this.printLog(ctx, test);
            }
        }
    },

    printGlobalMessages: function () {
        var messages = this.globalMessageLog || [];
        if (messages.length == 0) return;

        this.io.puts(this.term.green("Global message log:"));
        this.io.puts("    " + messages.join("\n    "));
        this.io.puts("");
    },

    printDeferred: function () {
        var funcs = this.deferred || {};
        if (funcs.length > 0) this.io.puts("");

        for (var i = 0, l = funcs.length; i < l; ++i) {
            this.io.puts(this.term.cyan("Deferred: " + funcs[i].context +
                                        " " + funcs[i].name));

            if (funcs[i].comment) {
                this.io.puts(this.term.grey(funcs[i].comment));
            }
        }

        if (funcs.length > 0) this.io.puts("");
    },

    printUnsupported: function () {
        consoleReporter.printUnsupported.call(this, this.unsupported || {});
    },

    printLog: function (context, test) {
        var msgs = messages(this, context, test);

        if (msgs.length > 0) {
            this.io.puts("    " + msgs.join("\n    "));
            this.io.puts("");
        }

        delete this.messageLog[context][test];
    },

    replaceAsyncMarker: function () {
        if (this.async) {
            this.printProgress("\033[1D");
        }

        delete this.async;
    },

    log: function (msg) {
        var context = (this.contextNames || []).join(" ");
        var test = this.currentTest;

        messages(this, context, test).push(
            "[" + msg.level.toUpperCase() + "] " + msg.message);
    },

    printProgress: function (str) {
        if (!this.displayProgress) {
            return;
        }

        this.io.print(str);
    }
});
