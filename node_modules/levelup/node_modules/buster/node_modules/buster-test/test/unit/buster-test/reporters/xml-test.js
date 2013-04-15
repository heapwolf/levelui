var sinon = require("sinon");
var buster = require("buster-core");
var assertions = require("buster-assertions");
var xmlReporter = require("../../../../lib/buster-test/reporters/xml");
var busterUtil = require("buster-util");
var assert = assertions.assert;
var refute = assertions.refute;
var helper = require("./test-helper");

busterUtil.testCase("XMLReporterTest", sinon.testCase({
    setUp: function () {
        this.io = helper.io();
        this.assertIO = helper.assertIO;

        this.reporter = xmlReporter.create({
            io: this.io
        });
    },

    "should print xml prolog and testsuites tag on suite:start": function () {
        this.reporter.suiteStart();

        assert.equals(this.io.toString(),
              "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n<testsuites>\n");
    },

    "should print testsuites closing tag on suite:end": function () {
        this.reporter.suiteEnd();

        assert.match(this.io.toString(), "</testsuites>");
    },

    "should print testsuite element with stats on context:end": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('    <testsuite errors="0" tests="0" ' +
                      'time="0" failures="0" name="Context">');
        this.assertIO('    </testsuite>');
    },

    "should not print testsuite element for nested context:end": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.contextStart({ name: "Inner" });
        this.reporter.contextEnd({ name: "Inner" });

        assert.equals(this.io.toString(), "");
    },

    "should print total time for test suite": function () {
        this.reporter.contextStart({ name: "Context" });
        this.clock.tick(100);
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.1" failures="0" name="Context">');
    },

    "should print total time for each test suite": function () {
        this.reporter.contextStart({ name: "Context" });
        this.clock.tick(100);
        this.reporter.contextEnd({ name: "Context" });
        this.reporter.contextStart({ name: "Context #2" });
        this.clock.tick(200);
        this.reporter.contextEnd({ name: "Context #2" });

        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.1" failures="0" name="Context">');
        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.2" failures="0" name="Context #2">');
    },

    "should print total time for each test": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "should #1" });
        this.clock.tick(10);
        this.reporter.testSuccess({ name: "should #1" });
        this.reporter.testStart({ name: "should #2" });
        this.clock.tick(20);
        this.reporter.testSuccess({ name: "should #2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0.03" failures="0" name="Context">');
        this.assertIO('<testcase time="0.01" classname="Context" name="should #1"/>');
        this.assertIO('<testcase time="0.02" classname="Context" name="should #2"/>');
    },

    "should add nested context names to test names": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.contextStart({ name: "Some behavior" });
        this.reporter.testStart({ name: "should #1" });
        this.reporter.testSuccess({ name: "should #1" });
        this.reporter.testStart({ name: "should #2" });
        this.reporter.testSuccess({ name: "should #2" });
        this.reporter.contextEnd({ name: "Some behavior" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" time="0" failures="0" name="Context">');
        this.assertIO('<testcase time="0" classname="Context" name="Some behavior should #1"/>');
        this.assertIO('<testcase time="0" classname="Context" name="Some behavior should #2"/>');
    },

    "should control number of contexts to keep in classname": function () {
        this.reporter.contextsInPackageName = 2;
        this.reporter.contextStart({ name: "Firefox 4.0 Linux" });
        this.reporter.contextStart({ name: "Form controller" });
        this.reporter.contextStart({ name: "add" });
        this.reporter.testStart({ name: "should clear form" });
        this.reporter.testSuccess({ name: "should clear form" });
        this.reporter.testStart({ name: "should save item on server" });
        this.reporter.testSuccess({ name: "should save item on server" });
        this.reporter.contextEnd({ name: "add" });
        this.reporter.contextEnd({ name: "Form controller" });
        this.reporter.contextEnd({ name: "Firefox 4.0 Linux" });

        this.assertIO(/<testsuite .* name="Firefox 4.0 Linux">/);
        this.assertIO('classname="Firefox 4.0 Linux.Form controller" name="add should clear form"/>');
        this.assertIO('classname="Firefox 4.0 Linux.Form controller" name="add should save item on server"/>');
    },

    "should count total successful tests": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testSuccess({ name: "#2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="0" name="Context">');
    },

    "should count test errors": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testError({ name: "#2", error: {} });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="1" tests="2" ' +
                      'time="0" failures="0" name="Context">');
    },

    "should count test failures": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testFailure({ name: "#2", error: {} });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="1" name="Context">');
    },

    "should count test timeout as failure": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testTimeout({ name: "#2", error: {} });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="1" name="Context">');
    },

    "should reset test count per context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testSuccess({ name: "#2" });
        this.reporter.contextEnd({ name: "Context" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.contextEnd({ name: "Context #2" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="0" name="Context">');
        this.assertIO('<testsuite errors="0" tests="1" ' +
                      'time="0" failures="0" name="Context #2">');
    },

    "should reset errors and failures count per context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1" });
        this.reporter.testFailure({ name: "#2" });
        this.reporter.contextEnd({ name: "Context" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testFailure({ name: "#1" });
        this.reporter.testFailure({ name: "#2" });
        this.reporter.testError({ name: "#3" });
        this.reporter.testError({ name: "#4" });
        this.reporter.contextEnd({ name: "Context #2" });

        this.assertIO('<testsuite errors="1" tests="2" ' +
                      'time="0" failures="1" name="Context">');
        this.assertIO('<testsuite errors="2" tests="4" ' +
                      'time="0" failures="2" name="Context #2">');
    },

    "should not reset test count for nested context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testSuccess({ name: "#2" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.contextEnd({ name: "Context #2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="3" ' +
                      'time="0" failures="0" name="Context">');
        refute.match(this.io.toString(), /<testsuite[^>]+name="Context #2">/);
    },

    "should not reset error and failures count for nested context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testFailure({ name: "#1" });
        this.reporter.testError({ name: "#2" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testError({ name: "#1" });
        this.reporter.testFailure({ name: "#1" });
        this.reporter.contextEnd({ name: "Context #2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="2" tests="4" ' +
                      'time="0" failures="2" name="Context">');
        refute.match(this.io.toString(), /<testsuite[^>]+name="Context #2">/);
    },

    "should include failure element for failed test": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testFailure({ name: "#1", error: {
            name: "AssertionError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="AssertionError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "should include failure element for all failed tests": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testFailure({ name: "#1", error: {
            name: "AssertionError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.reporter.testFailure({ name: "#1", error: {
            name: "AssertionError", message: "#2",
            stack: "stack"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="AssertionError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK\n" +
                      "            </failure>");
        this.assertIO('        <failure type="AssertionError" ' +
                      'message="#2">' + "\n                stack" +
                      "\n            </failure>");
    },

    "should include failure element for all errored tests": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "TypeError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.reporter.testError({ name: "#1", error: {
            name: "TypeError", message: "#2",
            stack: "stack"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="TypeError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK\n" +
                      "            </failure>");
        this.assertIO('            <failure type="TypeError" ' +
                      'message="#2">' + "\n                stack" +
                      "\n            </failure>");
    },

    "should escape quotes in error message": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "Error",
            message: '"Oops" is quoted'
        }});
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<failure type="Error" message="&quot;Oops&quot; is quoted">');
    },

    "should escape brackets and ampersands in error message": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "Error",
            message: '<Oops> & stuff'
        }});
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<failure type="Error" message="&lt;Oops&gt; &amp; stuff">');
    },

    "should escape quotes in test names": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testSuccess({ name: 'it tests the "foo" part'});
        this.reporter.contextEnd({ name: "Context" });
        this.assertIO(/name="it tests the &quot;foo&quot; part".*/);
    },

    "should escape stack trace": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "Error",
            message: '<Oops> & stuff',
            stack: 'Stack: &<>"'
        }});
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('Stack: &amp;&lt;&gt;&quot;');
    },

    "should include failure element for timed out test": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testTimeout({ name: "#1", error: {
            name: "TimeoutError",
            message: "Timed out after 250ms",
            stack: "STACK\nSTACK",
            source: "setUp"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="TimeoutError" ' +
                      'message="setUp timed out after 250ms">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "should include failure element for uncaught exceptions": function () {
        this.reporter.uncaughtException({
            name: "TypeError",
            message: "Thingamagiggy",
            stack: "STACK\nSTACK"
        });
        this.reporter.suiteEnd();

        this.assertIO("<testsuite errors=\"1\" tests=\"1\" failures=\"0\" name=\"Uncaught exceptions\">");
        this.assertIO("<testcase classname=\"Uncaught exception\" name=\"#1\">");
        this.assertIO('<failure type="TypeError" ' +
                      'message="Thingamagiggy">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "should default uncaught exception type": function () {
        this.reporter.uncaughtException({
            message: "Thingamagiggy"
        });
        this.reporter.suiteEnd();

        this.assertIO("<testsuite errors=\"1\" tests=\"1\" failures=\"0\" name=\"Uncaught exceptions\">");
        this.assertIO("<testcase classname=\"Uncaught exception\" name=\"#1\">");
        this.assertIO('<failure type="Error" message="Thingamagiggy"></failure>');
    },

    "should not include element for uncaught exceptions when there are none": function () {
        this.reporter.suiteEnd();
        refute.match(this.io, "Uncaught exceptions");
    }
}, "should"));

busterUtil.testCase("XMLReporterEventMappingTest", sinon.testCase({
    setUp: function () {
        this.stub(xmlReporter, "suiteStart");
        this.stub(xmlReporter, "suiteEnd");
        this.stub(xmlReporter, "contextStart");
        this.stub(xmlReporter, "contextEnd");
        this.stub(xmlReporter, "testSuccess");
        this.stub(xmlReporter, "testError");
        this.stub(xmlReporter, "testFailure");
        this.stub(xmlReporter, "testTimeout");
        this.stub(xmlReporter, "testStart");
        this.stub(xmlReporter, "uncaughtException");

        this.runner = buster.create(buster.eventEmitter);
        this.runner.console = buster.create(buster.eventEmitter);
        this.reporter = xmlReporter.create().listen(this.runner);
    },

    "should map suite:start to suiteStart": function () {
        this.runner.emit("suite:start");

        assert(this.reporter.suiteStart);
    },

    "should map suite:end to suiteEnd": function () {
        this.runner.emit("suite:end");

        assert(this.reporter.suiteEnd);
    },

    "should map context:start to contextStart": function () {
        this.runner.emit("context:start");

        assert(this.reporter.contextStart.calledOnce);
    },

    "should map context:end to contextEnd": function () {
        this.runner.emit("context:end");

        assert(this.reporter.contextEnd.calledOnce);
    },

    "should map test:success to testSuccess": function () {
        this.runner.emit("test:success");

        assert(this.reporter.testSuccess.calledOnce);
    },

    "should map test:error to testError": function () {
        this.runner.emit("test:error");

        assert(this.reporter.testError.calledOnce);
    },

    "should map test:fail to testFailure": function () {
        this.runner.emit("test:failure");

        assert(this.reporter.testFailure.calledOnce);
    },

    "should map test:timeout to testTimeout": function () {
        this.runner.emit("test:timeout");

        assert(this.reporter.testTimeout.calledOnce);
    },

    "should map uncaughtException to uncaughtException": function () {
        this.runner.emit("uncaughtException");

        assert(this.reporter.uncaughtException.calledOnce);
    },

    "should map test:setup to testStart": function () {
        this.runner.emit("test:setup");

        assert(this.reporter.testStart.calledOnce);
    }
}, "should"));
