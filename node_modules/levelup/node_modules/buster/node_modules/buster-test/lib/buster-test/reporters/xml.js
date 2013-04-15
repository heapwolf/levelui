if (typeof module === "object" && typeof require === "function") {
    var buster = require("buster-core");
}

(function () {
    function escape(str) {
        return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function elapsedInSec(elapsed) {
        var sec = elapsed == 0 ? 0 : elapsed / 1000;
        return isNaN(sec) ? 0 : sec;
    }

    function packageName(contexts, min) {
        return contexts.slice(0, min).map(function (c) { return c.name; }).join(".");
    }

    function testName(test, contexts, min) {
        return contexts.slice(min).map(function (context) {
            return context.name;
        }).concat([test]).join(" ");
    }

    function renderUncaught(error, i) {
        this.io.puts("        <testcase classname=\"Uncaught exception\" " +
                      "name=\"#" + (i + 1) + "\">");
        this.renderErrors([error]);
        this.io.puts("        </testcase>");
    }

    var xmlReporter = {
        contextsInPackageName: 1,

        create: function (opt) {
            opt = opt || {};
            return buster.extend(buster.create(this), {
                io: opt.io || require("util"),
                uncaught: []
            });
        },

        listen: function (runner) {
            runner.bind(this, {
                "suite:start": "suiteStart", "suite:end": "suiteEnd",
                "context:start": "contextStart", "context:end": "contextEnd",
                "test:success": "testSuccess", "test:failure": "testFailure",
                "test:error": "testError", "test:timeout": "testTimeout",
                "test:setup": "testStart", "uncaughtException": "uncaughtException"
            });

            return this;
        },

        suiteStart: function () {
            this.io.puts("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
            this.io.puts("<testsuites>");
            this.startedAt = new Date().getTime();
        },

        suiteEnd: function () {
            this.renderUncaughtExceptions();
            this.io.puts("</testsuites>");
        },

        contextStart: function (context) {
            this.contexts = this.contexts || [];

            var testCase = {
                name: context.name,
                startedAt: new Date().getTime(),
                tests: 0,
                errors: 0,
                failures: 0
            };

            if (this.contexts.length == 0) {
                this.suite = testCase;
            }

            this.contexts.push(testCase);
            this.startedAt = this.startedAt || new Date().getTime();
        },

        contextEnd: function () {
            var context = this.contexts.pop();

            if (this.contexts.length > 0) {
                return;
            }

            this.suiteTag(context.name, {
                tests: this.suite.tests && this.suite.tests.length || 0,
                errors: this.suite.errors,
                time: elapsedInSec(new Date().getTime() - context.startedAt),
                failures: this.suite.failures
            });

            this.renderTests(this.suite.tests);
            this.io.puts("    </testsuite>");
        },

        testStart: function (test) {
            this.currentTest = this.addTest(test);
        },

        testSuccess: function (test) {
            this.completeTest(this.currentTest || this.addTest(test));
        },

        testError: function (testData) {
            var test = this.completeTest(this.currentTest || this.addTest(testData));
            this.suite.errors += 1;
            test.errors.push(testData.error);
        },

        testFailure: function (testData) {
            var test = this.completeTest(this.currentTest || this.addTest(testData));
            this.suite.failures += 1;
            test.failures.push(testData.error);
        },

        uncaughtException: function (error) {
            this.uncaught.push(error);
        },

        renderUncaughtExceptions: function () {
            if (this.uncaught.length === 0) { return; }
            this.suiteTag("Uncaught exceptions", {
                tests: this.uncaught.length,
                errors: this.uncaught.length
            });
            this.uncaught.forEach(buster.bind(this, renderUncaught));
            this.io.puts("    </testsuite>");
        },

        renderTests: function (tests) {
            for (var i = 0, l = tests.length; i < l; ++i) {
                this.io.print("        <testcase time=\"" +
                              elapsedInSec(tests[i].elapsed) +
                              "\" classname=\"" + tests[i].context +
                              "\" name=\"" + escape(tests[i].name) + "\"");

                if (tests[i].errors.length + tests[i].failures.length > 0) {
                    this.io.print(">\n");
                    this.renderErrors(tests[i].errors);
                    this.renderErrors(tests[i].failures);
                    this.io.puts("        </testcase>");
                } else {
                    this.io.puts("/>");
                }
            }
        },

        renderErrors: function (errors) {
            var stack, ind = "            ", failInd = "\n    " + ind;

            for (var i = 0, l = errors.length; i < l; ++i) {
                if (!errors[i]) { continue; }
                stack = escape(errors[i].stack);
                var type = errors[i].name || "Error";
                this.io.print(ind + '<failure type="' + type + '" ');
                var message = errors[i].message;
                if (errors[i].source) {
                    message = errors[i].source + " " +
                        message.slice(0, 1).toLowerCase() + message.slice(1);
                }
                this.io.print('message="' + escape(message) + '">');
                if (errors[i].stack) {
                    this.io.print(failInd + stack.split("\n").join(failInd) + "\n" + ind);
                }
                this.io.puts("</failure>");
            }
        },

        addTest: function (test) {
            this.suite.tests = this.suite.tests || [];

            var to = {
                name: testName(test.name, this.contexts, this.contextsInPackageName),
                context: packageName(this.contexts, this.contextsInPackageName),
                failures: [],
                errors: []
            };

            this.suite.tests.push(to);
            return to;
        },

        completeTest: function (test) {
            var now = new Date().getTime();
            test.elapsed = now - this.startedAt;
            this.startedAt = now;
            return test;
        },

        suiteTag: function (name, options) {
            this.io.print("    <testsuite errors=\"" + options.errors +
                          "\" tests=\"" + options.tests);
            if (options.hasOwnProperty("time")) {
                this.io.print("\" time=\"" + options.time);
            }
            this.io.print("\" failures=\"" + (options.failures || 0) +
                          "\" name=\"" + name + "\">\n");
        }
    };

    xmlReporter.testTimeout = xmlReporter.testFailure;

    if (typeof module != "undefined") {
        module.exports = xmlReporter;
    } else {
        buster.reporters = buster.reporters || {};
        buster.reporters.xml = xmlReporter;
    }
}());
