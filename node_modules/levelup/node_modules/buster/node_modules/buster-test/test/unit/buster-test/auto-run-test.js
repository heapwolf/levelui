(function () {
    var buster = this.buster || {};
    var sinon = this.sinon || {};
    var assert;

    if (typeof module === "object" && typeof require === "function") {
        buster = {
            assertions: require("buster-assertions"),
            autoRun: require("../../../lib/buster-test/auto-run"),
            testCase: require("../../../lib/buster-test/test-case"),
            testRunner: require("../../../lib/buster-test/test-runner"),
            reporters: require("../../../lib/buster-test/reporters")
        };

        assert = buster.assertions.assert;
        assert.format = require("buster-format").ascii;
        var sinon = require("sinon");
        buster.util = require("buster-util");
    } else {
        assert = buster.assertions.assert;
    }

    function testAutoRunOptions(options) {
        return function () {
            var env = options.env || {};

            if (typeof process == "undefined" && options.env) {
                return;
            }

            for (var prop in env) {
                process.env[prop] = env[prop];
            }

            this.sandbox.stub(buster.autoRun, "run");
            var runner = buster.autoRun(options.autoRunOptions);
            runner(buster.testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert.match(buster.autoRun.run.args[0][1], options.options);
        };
    }

    buster.util.testCase("AutoRunTest", {
        setUp: function () {
            this.tc = { testIt: function () {} };
            this.sandbox = sinon.sandbox.create();
            this.clock = this.sandbox.useFakeTimers();
            this.sandbox.stub(buster.testRunner, "on");
            var self = this;

            this.sandbox.stub(buster.testRunner, "runSuite", function () {
                self.onRun && self.onRun();
            });
        },

        tearDown: function () {
            this.sandbox.restore();
        },

        "should run test case automatically": function () {
            this.onRun = sinon.spy();
            var runner = buster.autoRun();

            runner(buster.testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(this.onRun.calledOnce);
        },

        "should call callback when runner emits suite:end": function () {
            var callback = function () {};
            var runner = buster.autoRun(callback);

            runner(buster.testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(buster.testRunner.on.calledWith("suite:end", callback));
        },

        "should call end callback when runner emits suite:end": function () {
            var callback = function () {};
            var runner = buster.autoRun({}, { end: callback });

            runner(buster.testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(buster.testRunner.on.calledWith("suite:end", callback));
        },

        "should call start callback with runner": function () {
            var callback = sinon.spy();
            var runner = buster.autoRun({}, { start: callback });

            runner(buster.testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(callback.calledOnce);
            assert(typeof callback.args[0][0].runSuite === "function");
        },

        "should not autorun if a runner was already created": function () {
            var spy = this.onRun = sinon.spy();
            var runner = buster.autoRun();
            var testRunner = buster.testRunner.create();

            runner(buster.testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(!spy.called);
        },

        "should not autorun if a runner was created asynchronously": function () {
            var spy = this.onRun = sinon.spy();

            var runner = buster.autoRun();
            runner(buster.testCase("Auto running test case", {
                testIt: function () {}
            }));

            var testRunner = buster.testRunner.create();
            this.clock.tick(1);
            assert(!spy.called);
        },

        "should default reporter from env.BUSTER_REPORTER": testAutoRunOptions({
            env: { BUSTER_REPORTER: "specification" },
            options: { reporter: "specification" }
        }),

        "should use reporter from options": testAutoRunOptions({
            autoRunOptions: { reporter: "xml" },
            options: { reporter: "xml" }
        }),

        "should call run with filters from BUSTER_FILTERS": testAutoRunOptions({
            env: { BUSTER_FILTERS: "should" },
            options: { filters: ["should"] }
        }),

        "should call run with provided filters": testAutoRunOptions({
            autoRunOptions: { filters: ["should"] },
            options: { filters: ["should"] }
        }),

        "should call run with color setting from BUSTER_COLOR": testAutoRunOptions({
            env: { BUSTER_COLOR: "true" },
            options: { color: true }
        }),

        "should call run with provided color": testAutoRunOptions({
            autoRunOptions: { color: true },
            options: { color: true }
        }),

        "should call run with bright from BUSTER_BRIGHT": testAutoRunOptions({
            env: { BUSTER_BRIGHT: "false" },
            options: { bright: false }
        }),

        "should call run with provided bright setting": testAutoRunOptions({
            autoRunOptions: { bright: true },
            options: { bright: true }
        }),

        "should call run with timeout from BUSTER_TIMEOUT": testAutoRunOptions({
            env: { BUSTER_TIMEOUT: "45" },
            options: { timeout: 45 }
        }),

        "should call run with failOnNoAssertions from BUSTER_FAIL_ON_NO_ASSERTIONS":
        testAutoRunOptions({
            env: { BUSTER_FAIL_ON_NO_ASSERTIONS: "false" },
            options: { failOnNoAssertions: false }
        })
    });

    buster.util.testCase("autoRun.run test", {
        setUp: function () {
            this.sandbox = sinon.sandbox.create();
            this.sandbox.spy(buster.testRunner, "create");
            this.sandbox.stub(buster.testRunner, "runSuite");
            this.context = { tests: [{}] };
        },

        tearDown: function () {
            this.sandbox.restore();
        },

        "should abort if no test contexts": function () {
            buster.autoRun.run([]);

            assert(!buster.testRunner.create.called);
        },

        "should create runner with provided runner": function () {
            buster.autoRun.run([this.context], {
                reporter: "xml",
                filters: ["should"],
                color: true,
                bright: true,
                timeout: 10,
                failOnNoAssertions: false
            });

            assert.match(buster.testRunner.create.args[0][0], {
                reporter: "xml",
                filters: ["should"],
                color: true,
                bright: true,
                timeout: 10,
                failOnNoAssertions: false
            });
        },

        "should use specified reporter": function () {
            var reporter = typeof document == "undefined" ? buster.reporters.xml : buster.reporters.html;
            this.sandbox.spy(reporter, "create");
            buster.autoRun.run([this.context], { reporter: "xml", });

            assert(reporter.create.calledOnce);
        },

        "should use custom reporter": function () {
            if (typeof document != "undefined") return;
            var reporter = { create: sinon.stub().returns({ listen: sinon.spy() }) };

            assert.exception(function () {
                buster.autoRun.run([this.context], { reporter: "mod", });
            });
        },

        "should initialize reporter with options": function () {
            var reporter = typeof document == "undefined" ? buster.reporters.dots : buster.reporters.html;

            this.sandbox.spy(reporter, "create");
            buster.autoRun.run([this.context], {
                color: false,
                bright: false,
            });

            assert.match(reporter.create.args[0][0], {
                color: false,
                bright: false,
            });
        },

        "should parse contexts": function () {
            var tests = [{ tests: [{ id: 1 }] }, { tests: [{ id: 2 }] }];
            var contexts = [{ parse: sinon.stub().returns(tests[0]) },
                            { parse: sinon.stub().returns(tests[1]) }];
            buster.autoRun.run(contexts);

            var actual = buster.testRunner.runSuite.args[0][0];
            assert.match(tests[0], actual[0]);
            assert.match(tests[1], actual[1]);
        },

        "should filter contexts": function () {
            var context = buster.testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {}
            });

            buster.autoRun.run([context], {
                filters: ["#1"]
            });

            assert.equals(buster.testRunner.runSuite.args[0][0][0].tests.length, 1);
        },

        "should skip contexts where all tests are filtered out": function () {
            var context = buster.testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {}
            });

            buster.autoRun.run([context], {
                filters: ["non-existent"]
            });

            assert.equals(buster.testRunner.runSuite.args[0][0].length, 0);
        },

        "should not skip contexts if tests are filtered but not sub-contexts":
        function () {
            var context = buster.testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {},
                "something": { "testIt": function () {} }
            });

            buster.autoRun.run([context], {
                filters: ["something"]
            });

            assert.equals(buster.testRunner.runSuite.args[0][0].length, 1);
        }
    });
}());
