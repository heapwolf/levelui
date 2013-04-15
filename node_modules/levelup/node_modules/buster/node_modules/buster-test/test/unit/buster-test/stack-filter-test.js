if (typeof module === "object" && typeof require === "function") {
    var sinon = require("sinon");

    var buster = {
        assertions: require("buster-assertions"),
        stackFilter: require("../../../lib/buster-test/stack-filter")
    };

    buster.util = require("buster-util");
}

var assert = buster.assertions.assert;
var refute = buster.assertions.refute;

buster.util.testCase("Stack filter test", {
    setUp: function () {
        this.filters = buster.stackFilter.filters;
        this.stack = '("expected meth to have been called at least once but was never called")@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:467' + "\n" +
            'failAssertion((function (actual, message) {prepareAssertion("assert", arguments, 1);if (!actual) {var val = assert.format(actual);assert.fail(message || "[assert] Expected " + val + " to be truthy");} else {assert.emit("pass", "assert", message || "", actual);}}),"expected meth to have been called at least once but was never called")@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:2948' + "\n" +
            'assertCalled(proxy)@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:2991' + "\n" +
            '((void 0))@http://localhost:1111/sessions/1/resources/my-test.js:7' + "\n" +
            'asyncFunction((function () {var obj = {meth: function () {}};this.spy(obj, "meth");buster.log(typeof TestCase);buster.assert.called(obj.meth);}),[object Object])@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:4409' + "\n" +
            '([object Object],[object Object])@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:4642' + "\n" +
            '()@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:45' + "\n" +
            'runOne((function () {var allArgs = args.concat(Array.prototype.slice.call(arguments));return method.apply(obj, allArgs);}))@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:1404' + "\n" +
            '(-9)@http://localhost:1111/sessions/1/resources/buster/bundle-0.1.0-1303409904724.js:1390';

        this.nodeStack = 'Bla bla bla bla bla' + "\n" +
'at Function.fail (/home/christian/projects/buster/buster-test/node_modules/buster-assert/lib/buster-assert.js:147:25)' + "\n" +
            'at fail (/home/christian/projects/buster/buster-test/node_modules/buster-assert/lib/buster-assert.js:61:16)' + "\n" +
            'at Function.match (/home/christian/projects/buster/buster-test/node_modules/buster-assert/lib/buster-assert.js:587:20)' + "\n" +
            'at Object.<anonymous> (/home/christian/projects/buster/buster-test/test/unit/buster-test/stack-filter-test.js:40:23)' + "\n" +
            'at /home/christian/projects/buster/buster-test/node_modules/buster-util/lib/buster-util/test-case.js:113:29' + "\n" +
            'at Object.<anonymous> (/home/christian/projects/buster/buster-test/test/unit/buster-test/stack-filter-test.js:12:1)' + "\n" +
            'at Module._compile (module.js:404:26)' + "\n" +
            'at Object..js (module.js:410:10)' + "\n" +
            'at Module.load (module.js:336:31)' + "\n" +
            'at Function._load (module.js:297:12)';
    },

    tearDown: function () {
        buster.stackFilter.filters = this.filters;
    },

    "should remove lines matching entries in filters array": function () {
        buster.stackFilter.filters = ["bundle-0.1.0"];
        var stack = buster.stackFilter(this.stack).join("\n");

        refute.match(stack, /bundle/);
    },

    "should remove cwd from paths": function () {
        var stack = buster.stackFilter(this.stack, "http://localhost:1111/sessions/1/resources").join("\n");

        assert.match(stack, /\(-9\)@\.\/buster\/bundle-0.1.0/m);
    },

    "should remove regexp cwd from paths": function () {
        var stack = buster.stackFilter(this.stack, /http:\/\/[^:]+:1111\/sessions\/1\/resources/).join("\n");

        assert.match(stack, /\(-9\)@\.\/buster\/bundle-0.1.0/m);
    },

    "should process node stack": function () {
        buster.stackFilter.filters = ["lib/buster-util", "lib/buster-assert"];
        var cwd = "/home/christian/projects/buster/buster-test";
        var expected = ['at Object.<anonymous> (./test/unit/buster-test/stack-filter-test.js:40:23)',
                        'at Object.<anonymous> (./test/unit/buster-test/stack-filter-test.js:12:1)',
                        'at Module._compile (module.js:404:26)',
                        'at Object..js (module.js:410:10)',
                        'at Module.load (module.js:336:31)',
                        'at Function._load (module.js:297:12)'];

        assert.equals(buster.stackFilter(this.nodeStack, cwd), expected);
    },

    "should process firefox stack": function () {
        buster.stackFilter.filters = ["bundle-0.1.0"];
        var cwd = "http://localhost:1111/sessions/1/resources";
        var expected = ['((void 0))@./my-test.js:7'];

        assert.equals(buster.stackFilter(this.stack, cwd), expected);
    }
});
