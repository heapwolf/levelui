var buster = require("buster-core");

module.exports = {
    create: function (opt) {
        var reporter = buster.create(this);
        opt = opt || {};
        reporter.io = opt.io || require("util");
        reporter.testCount = 0;
        reporter.contexts = [];

        return reporter;
    },

    listen: function (runner) {
        runner.bind(this, {
            "suite:end": "suiteEnd", "context:start": "contextStart",
            "context:end": "contextEnd", "test:success": "testSuccess",
            "test:start": "testStart", "test:deferred": "testDeferred",
            "test:failure": "testEnd", "test:error": "testEnd",
            "test:timeout": "testEnd", "context:unsupported": "contextUnsupported"
        });

        return this;
    },

    suiteEnd: function () {
        this.io.puts("1.." + this.testCount);
    },

    contextStart: function (context) {
        this.contexts.push(context.name);
    },

    contextEnd: function () {
        this.contexts.pop();
    },

    contextUnsupported: function (data) {
        var name = data.context.name;
        var features = data.unsupported;
        var plural = features.length > 1 ? "s" : "";
        this.testCount += 1;
        this.io.puts("not ok " + this.testCount + " " + name + " # SKIP " +
                     "Unsupported requirement" + plural + ": " + features.join(", "));
    },

    testStart: function (test) {
        this.testCount += 1;
        test.name = this.contexts.concat([test.name]).join(" ");
        this.test = test;
    },

    testSuccess: function (test) {
        this.test.passed = true;
        this.testEnd(test);
    },

    testDeferred: function (test) {
        this.test.deferred = true;
        this.test.comment = test.comment;
        this.testEnd(test);
    },

    testEnd: function (test) {
        this.io.puts(label(this.test) + this.testCount + " " +
                     this.test.name + directive(this.test));
    }
};

function directive(test) {
    return test.deferred ? " # TODO " + (test.comment || "Deferred") : "";
}

function label(test) {
    return test.passed ? "ok " : "not ok ";
}