(function (B) {
    if (typeof require == "function" && typeof module == "object") {
        return;
    }

    function setUp() {
        this.runner = B.eventEmitter.create();
        this.runner.runSuite = sinon.spy();
        this.bnt = B.nextTick;
        this.sandbox = sinon.sandbox.create();

        B.nextTick = function (callback) {
            callback();
        };
    }

    function tearDown() {
        B.nextTick = this.bnt;
        this.sandbox.restore();
    }

    B.util.testCase("BrowserWiringLoggerTest", {
        setUp: setUp,
        tearDown: tearDown,

        "emits console log messages through runner": function () {
            var listener = sinon.spy();
            this.runner.on("log", listener);

            B.wire.logger(this.runner);
            B.console.log("Hey man");

            assert(listener.calledOnce);
        }
    });

    B.util.testCase("BrowserWiringContextsTest", {
        setUp: setUp,
        tearDown: tearDown,

        "collects testCase": function () {
            var contexts = B.wire.testContexts();
            B.testCase("Something", {});

            assertEquals(contexts.length, 1);
            assertEquals(contexts[0].name, "Something");
        },

        "collects spec": function () {
            var contexts = B.wire.testContexts();
            B.spec.describe("Something", function () {});

            assertEquals(contexts.length, 1);
            assertEquals(contexts[0].name, "Something");
        }
    });

    B.util.testCase("BrowserWiringDocumentStateTest", {
        setUp: setUp,
        tearDown: tearDown,

        "should remove all script tags to avoid re-downloading scripts": function () {
            B.wire.documentState(this.runner);

            assertEquals(document.getElementsByTagName("script").length, 0);
        },

        "should clear document when test succeeds": function () {
            B.wire.documentState(this.runner);
            document.body.appendChild(document.createElement("h1"));
            this.runner.emit("test:success", {});

            assertEquals(document.getElementsByTagName("h1").length, 0);
        },

        "should clear document when test fails": function () {
            B.wire.documentState(this.runner);
            document.body.appendChild(document.createElement("h1"));
            this.runner.emit("test:failure", {});

            assertEquals(document.getElementsByTagName("h1").length, 0);
        },

        "should clear document when test errors": function () {
            B.wire.documentState(this.runner);
            document.body.appendChild(document.createElement("h1"));
            this.runner.emit("test:error", {});

            assertEquals(document.getElementsByTagName("h1").length, 0);
        },

        "should clear document when test times out": function () {
            B.wire.documentState(this.runner);
            document.body.appendChild(document.createElement("h1"));
            this.runner.emit("test:timeout", {});

            assertEquals(document.getElementsByTagName("h1").length, 0);
        },

        "should use snapshot from suite:start": function () {
            B.wire.documentState(this.runner);
            document.body.appendChild(document.createElement("h1"));
            this.runner.emit("suite:start", {});
            document.body.appendChild(document.createElement("h2"));
            this.runner.emit("test:timeout", {});

            assertEquals(document.getElementsByTagName("h1").length, 1);
            assertEquals(document.getElementsByTagName("h2").length, 0);
        }
    });

    B.util.testCase("BrowserWiringTestRunnerTest", {
        setUp: setUp,
        tearDown: tearDown,

        "should auto-run all tests when ready": function () {
            var wire = B.wire.testRunner(this.runner);
            B.testCase("Thing", { doIt: function () {} });
            B.spec.describe("Other thing", function () {
                B.spec.it("does stuff", function () {});
            });

            wire.ready({});
            wire.run();

            assert(this.runner.runSuite.calledOnce);
            assertEquals(this.runner.runSuite.args[0][0].length, 2);
        },

        "should copy config properties to test runner": function () {
            var wire = B.wire.testRunner(this.runner);

            wire.ready({ timeout: 1200 });
            wire.run();

            assertEquals(this.runner.timeout, 1200);
        },

        "should run parsable context when ready": function () {
            var wire = B.wire.testRunner(this.runner);
            var context = { name: "Parsed", tests: [{ name: "Yay" }], contexts: [] };
            B.addTestContext({ parse: sinon.stub().returns(context) });

            wire.ready({});
            wire.run();

            assertEquals(this.runner.runSuite.args[0][0].length, 1);
            assertEquals(this.runner.runSuite.args[0][0][0].name, "Parsed");
       },

        "should filter context before running": function () {
            var wire = B.wire.testRunner(this.runner);
            B.testCase("Thing", { doIt: function () {} });

            wire.ready({ filters: ["Stuff"] });
            wire.run();

            assertEquals(this.runner.runSuite.args[0][0].length, 0);
       },

        "should capture console if configured to do so": function () {
            this.sandbox.stub(B, "captureConsole");
            var wire = B.wire.testRunner(this.runner);

            wire.ready({ captureConsole: true });
            wire.run();

            assert(B.captureConsole.calledOnce);
       },

        "should not capture console by default": function () {
            this.sandbox.stub(B, "captureConsole");
            var wire = B.wire.testRunner(this.runner);

            wire.ready({});
            wire.run();

            assert(!B.captureConsole.called);
       },

        "should wire document state": function () {
            this.sandbox.stub(B.wire, "documentState");
            var wire = B.wire.testRunner(this.runner);

            wire.ready({});
            wire.run();

            assert(B.wire.documentState.calledOnce);
       },

        "should optionally not wire document state": function () {
            this.sandbox.stub(B.wire, "documentState");
            var wire = B.wire.testRunner(this.runner);

            wire.ready({ resetDocument: false });
            wire.run();

            assert(!B.wire.documentState.called);
       },

        "should start automatically": function () {
            var wire = B.wire.testRunner(this.runner);

            wire.ready({});

            assert(this.runner.runSuite.calledOnce);
       },

        "should not start automatically if autoRun: false": function () {
            var wire = B.wire.testRunner(this.runner);

            wire.ready({ autoRun: false });

            assert(!this.runner.runSuite.calledOnce);
       },

        "should start on run() if autoRun: false": function () {
            var wire = B.wire.testRunner(this.runner);

            wire.ready({ autoRun: false });
            wire.run();

            assert(this.runner.runSuite.calledOnce);
       },

        "should not run if not ready": function () {
            var wire = B.wire.testRunner(this.runner);

            wire.run();

            assert(!this.runner.runSuite.calledOnce);
       },

        "should run when ready": function () {
            var wire = B.wire.testRunner(this.runner);

            wire.run();
            wire.ready();

            assert(this.runner.runSuite.calledOnce);
       },

        "should receive config when running before ready": function () {
            this.sandbox.stub(B, "captureConsole");
            var wire = B.wire.testRunner(this.runner);

            wire.run();
            wire.ready({ captureConsole: true });

            assert(B.captureConsole.calledOnce);
       },

        "should defer creating test runner": function () {
            var runSuite = sinon.spy();
            var wire = B.wire.testRunner(function () {
                return { on: function () {}, runSuite: runSuite };
            });

            wire.run();
            wire.ready({});

            assert(runSuite.calledOnce);
       }
    });

    B.util.testCase("BrowserWireTest", {
        setUp: setUp,
        tearDown: tearDown,

        "should set up ready and run functions": function () {
            B.wire(this.runner);
            B.ready();
            B.run();

            assert(this.runner.runSuite.calledOnce);
        }
    });
}(buster));
