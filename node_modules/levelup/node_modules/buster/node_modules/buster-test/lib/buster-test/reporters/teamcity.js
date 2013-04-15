var buster = require("buster-core");
var util = require("util");

function escape(text) {
    return text.toString()
        .replace(/\|/g, '||')
        .replace(/:/g, '->')// workaround: teamcity handles colon strangely
        .replace(/'/g, '|\'')
        .replace(/\n/g, '|n')
        .replace(/\r/g, '|r')
        .replace(/\u0085/g, '|x')
        .replace(/\u2028/g, '|l')
        .replace(/\u2029/g, '|p')
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]');
}

function log(text) {
    util.puts(text);
}

function packageName(contexts, min) {
    return contexts.slice(0, min).map(function (c) {
        return c.name;
    }).join(".");
}

function testName(test, contexts, min) {
    return contexts.slice(min).map(
        function (context) {
            return context.name;
        }).concat([test]).join(" ");
}

var teamcityReporter = {
    contextsInPackageName:1,

    create:function () {
        return buster.create(this);
    },

    listen:function (runner) {
        runner.bind(this, {
            "context:start":"contextStart", "context:end":"contextEnd",
            "test:success":"testSuccess", "test:failure":"testFailure",
            "test:error":"testError", "test:timeout":"testTimeout",
            "test:start":"testStart"
        });

        return this;
    },

    contextStart:function (context) {
        this.contexts = this.contexts || [];

        var testCase = {
            name:context.name,
            startedAt:new Date().getTime(),
            tests:0
        };

        if (this.contexts.length == 0) {
            this.suite = testCase;
        }

        this.contexts.push(testCase);
        this.startedAt = this.startedAt || new Date().getTime();
    },

    contextEnd:function () {
        var context = this.contexts.pop();

        if (this.contexts.length > 0) {
            return;
        }

        log("##teamcity[testSuiteStarted name='" + escape(context.name) + "']");
        this.renderTests(this.suite.tests);
        log("##teamcity[testSuiteFinished name='" + escape(context.name) + "']");
    },

    testStart:function (test) {
        this.currentTest = this.addTest(test);
    },

    testSuccess:function (test) {
        this.completeTest(this.currentTest || this.addTest(test));
    },

    testError:function (testData) {
        var test = this.completeTest(this.currentTest || this.addTest(testData));
        test.errors.push(testData.error);
    },

    testFailure:function (testData) {
        var test = this.completeTest(this.currentTest || this.addTest(testData));
        test.failures.push(testData.error);
    },

    testTimeout:function (testData) {
        var test = this.completeTest(this.currentTest || this.addTest(testData));
        test.failures.push(testData.error);
    },

    renderTests:function (tests) {
        for (var i = 0, l = tests.length; i < l; ++i) {
            var test = tests[i];
            log("##teamcity[testStarted name='" + escape(test.name) + "' captureStandardOutput='true']");
            if (test.errors.length + test.failures.length > 0) {
                var fullMsg = '';
                var details = '';
                [test.errors, test.failures].forEach(function (list) {
                    list.forEach(function (e) {
                        var partMsg = 'Error: ' + e.name;
                        if (e.message) {
                            partMsg += ' - ' + e.message;
                        }
                        partMsg += '\n';
                        fullMsg += partMsg;
                        details += partMsg + (e.stack ? (e.stack + '\n') : '');
                    });
                });
                log("##teamcity[testFailed name='" + escape(test.name) + "' message='" + escape(fullMsg) + "' details='" + escape(details) + "']");
            }
            log("##teamcity[testFinished name='" + escape(test.name) + "' duration='" + test.elapsed + "']");
        }
    },

    addTest:function (test) {
        this.suite.tests = this.suite.tests || [];

        var to = {
            name:testName(test.name, this.contexts, this.contextsInPackageName),
            context:packageName(this.contexts, this.contextsInPackageName),
            failures:[],
            errors:[]
        };

        this.suite.tests.push(to);
        return to;
    },

    completeTest:function (test) {
        var now = new Date().getTime();
        test.elapsed = now - this.startedAt;
        this.startedAt = now;
        return test;
    }
};

module.exports = teamcityReporter;