((typeof define === "function" && define.amd && function (m) {
    define(["../lib/stack-filter", "buster"], m);
}) || (typeof module === "object" && function (m) {
    m(require("../lib/stack-filter"), require("buster"));
}) || function (m) { m(this.stackFilter, this.buster); }
)(function (stackFilter, buster) {
    "use strict";

    var assert = buster.assertions.assert;
    var refute = buster.assertions.refute;

    buster.testCase("Stack filter test", {
        setUp: function () {
            this.filters = stackFilter.filters;
            this.stack = '("expected meth to have been called at least once' +
                ' but was never called")@http://localhost:1111/sessions/1/res' +
                'ources/buster/bundle-0.1.0-1303409904724.js:467' + "\n" +
                'failAssertion((function (actual, message) {prepareAssertio' +
                'n("assert", arguments, 1);if (!actual) {var val = assert.f' +
                'ormat(actual);assert.fail(message || "[assert] Expected " ' +
                '+ val + " to be truthy");} else {assert.emit("pass", "asse' +
                'rt", message || "", actual);}}),"expected meth to have bee' +
                'n called at least once but was never called")@http://local' +
                'host:1111/sessions/1/resources/buster/bundle-0.1.0-1303409' +
                '904724.js:2948' + "\n" + 'assertCalled(proxy)@http://local' +
                'host:1111/sessions/1/resources/buster/bundle-0.1.0-1303409' +
                '904724.js:2991' + "\n" + '((void 0))@http://localhost:1111' +
                '/sessions/1/resources/my-test.js:7' + "\n" + 'asyncFunctio' +
                'n((function () {var obj = {meth: function () {}};this.spy(' +
                'obj, "meth");buster.log(typeof TestCase);buster.assert.cal' +
                'led(obj.meth);}),[object Object])@http://localhost:1111/se' +
                'ssions/1/resources/buster/bundle-0.1.0-1303409904724.js:44' +
                '09' + "\n" + '([object Object],[object Object])@http://loc' +
                'alhost:1111/sessions/1/resources/buster/bundle-0.1.0-13034' +
                '09904724.js:4642' + "\n" + '()@http://localhost:1111/sessi' +
                'ons/1/resources/buster/bundle-0.1.0-1303409904724.js:45' +
                "\n" + 'runOne((function () {var allArgs = args.concat(Arra' +
                'y.prototype.slice.call(arguments));return method.apply(obj' +
                ', allArgs);}))@http://localhost:1111/sessions/1/resources/' +
                'buster/bundle-0.1.0-1303409904724.js:1404' + "\n" + '(-9)@' +
                'http://localhost:1111/sessions/1/resources/buster/bundle-0' +
                '.1.0-1303409904724.js:1390';

            this.nodeStack = 'Bla bla bla bla bla' + "\n" + 'at Function.fa' +
                'il (/home/christian/projects/buster/buster-test/node_modul' +
                'es/buster-assert/lib/buster-assert.js:147:25)' + "\n" +
                'at fail (/home/christian/projects/buster/buster-test/node_' +
                'modules/buster-assert/lib/buster-assert.js:61:16)' + "\n" +
                'at Function.match (/home/christian/projects/buster/buster-' +
                'test/node_modules/buster-assert/lib/buster-assert.js:587:20)' +
                "\n" + 'at Object.<anonymous> (/home/christian/projects/bus' +
                'ter/buster-test/test/unit/buster-test/stack-filter-test.js' +
                ':40:23)' + "\n" + 'at /home/christian/projects/buster/bust' +
                'er-test/node_modules/buster-util/lib/buster-util/test-case' +
                '.js:113:29' + "\n" + 'at Object.<anonymous> (/home/christi' +
                'an/projects/buster/buster-test/test/unit/buster-test/stack' +
                '-filter-test.js:12:1)' + "\n" + 'at Module._compile (modul' +
                'e.js:404:26)' + "\n" + 'at Object..js (module.js:410:10)' +
                "\n" + 'at Module.load (module.js:336:31)' + "\n" + 'at Fun' +
                'ction._load (module.js:297:12)';
        },

        tearDown: function () {
            stackFilter.filters = this.filters;
        },

        "removes lines matching entries in filters array": function () {
            stackFilter.filters = ["bundle-0.1.0"];
            var stack = stackFilter(this.stack).join("\n");

            refute.match(stack, /bundle/);
        },

        "removes cwd from paths": function () {
            var url = "http://localhost:1111/sessions/1/resources";
            var stack = stackFilter(this.stack, url).join("\n");

            assert.match(stack, /\(-9\)@\.\/buster\/bundle-0.1.0/m);
        },

        "removes regexp cwd from paths": function () {
            var pattern = /http:\/\/[^:]+:1111\/sessions\/1\/resources/;
            var stack = stackFilter(this.stack, pattern).join("\n");

            assert.match(stack, /\(-9\)@\.\/buster\/bundle-0.1.0/m);
        },

        "processes node stack": function () {
            stackFilter.filters = ["lib/buster-util", "lib/buster-assert"];
            var cwd = "/home/christian/projects/buster/buster-test";
            var expected = [
                'at Object.<anonymous> ' +
                    '(./test/unit/buster-test/stack-filter-test.js:40:23)',
                'at Object.<anonymous> ' +
                    '(./test/unit/buster-test/stack-filter-test.js:12:1)',
                'at Module._compile (module.js:404:26)',
                'at Object..js (module.js:410:10)',
                'at Module.load (module.js:336:31)',
                'at Function._load (module.js:297:12)'
            ];

            assert.equals(stackFilter(this.nodeStack, cwd), expected);
        },

        "processes firefox stack": function () {
            stackFilter.filters = ["bundle-0.1.0"];
            var cwd = "http://localhost:1111/sessions/1/resources";
            var expected = ['((void 0))@./my-test.js:7'];

            assert.equals(stackFilter(this.stack, cwd), expected);
        }
    });
});
