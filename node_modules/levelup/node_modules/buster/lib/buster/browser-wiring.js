(function (B) {
    B.env = B.env || {};

    // Globally uncaught errors will be emitted as messages through
    // the test runner
    function uncaughtErrors(runner) {
        window.onerror = function (message, url, line) {
            if (arguments.length === 3) {
                var cp = B.env.contextPath || window.location;
                var index = (url || "").indexOf(cp);
                if (index >= 0) {
                    url = "." + url.slice(index + cp.length);
                }

                if (line === 1 && message === "Error loading script") {
                    message = "Unable to load script " + url;
                } else {
                    message = url + ":" + line + " " + message;
                }
            }

            runner.emit("uncaughtException", {
                name: "UncaughtError",
                message: message
            });

            return true;
        };
    }

    // Emit messages from the evented logger buster.console through
    // the test runner
    function logger(runner) {
        B.console.on("log", function (msg) {
            runner.emit("log", msg);
        });
    }

    // Collect test cases and specs created with buster.testCase
    // and buster.spec.describe
    function testContexts() {
        var contexts = [];
        B.addTestContext = function (context) { contexts.push(context); };
        B.testContext.on("create", B.addTestContext);
        return contexts;
    }

    // Clear scripts and use the browserEnv object from buster-test to
    // reset the document between tests runs
    function documentState(runner) {
        var scripts = document.getElementsByTagName("script"), script;
        while ((script = scripts[0])) {
            script.parentNode.removeChild(script);
        }
        var env = B.browserEnv.create(document.body);
        env.listen(runner);
    }

    function shouldAutoRun(config) {
        var autoRunPropertyIsSet = config.hasOwnProperty("autoRun");
        return config.autoRun || !autoRunPropertyIsSet;
    }

    function shouldResetDoc(config) {
        var resetDocumentPropertyIsSet = config.hasOwnProperty("resetDocument");
        return config.resetDocument || !resetDocumentPropertyIsSet;
    }

    // Wire up the test runner. It will start running tests when
    // the environment is ready and when we've been told to run.
    // Note that run() and ready() may occur in any order, and
    // we cannot do anything until both have happened.
    //
    // When running tests with buster-server, we'll be ready() when
    // the server sends the "tests:run" message. This message is sent
    // by the server when it receives the "loaded all scripts" message
    // from the browser. We'll usually run as soon as we're ready.
    // However, if the autoRun option is false, we will not run
    // until buster.run() is explicitly called.
    //
    // For static browser runs, the environment is ready() when
    // ready() is called, which happens after all files have been
    // loaded in the browser. Tests will run immediately for autoRun:
    // true, and on run() otherwise.
    //
    function testRunner(runner) {
        var ctxts = B.wire.testContexts();
        var ready, started, alreadyRunning, config;

        function attemptRun() {
            if (!ready || !started || alreadyRunning) { return; }
            alreadyRunning = true;
            if (typeof runner === "function") { runner = runner(); }
            if (shouldResetDoc(config)) { B.wire.documentState(runner); }
            if (config.captureConsole) { B.captureConsole(); }
            B.extend(runner, config);
            runner.runSuite(B.testContext.compile(ctxts, config.filters));
        }

        return {
            ready: function (options) {
                config = options || {};
                ready = true;
                started = started || shouldAutoRun(config);
                attemptRun();
            },

            run: function () {
                started = true;
                attemptRun();
            }
        };
    }

    B.wire = function (testRunner) {
        var wiring = B.wire.testRunner(testRunner);
        B.ready = wiring.ready;
        B.run = wiring.run;
    };

    B.wire.uncaughtErrors = uncaughtErrors;
    B.wire.logger = logger;
    B.wire.testContexts = testContexts;
    B.wire.documentState = documentState;
    B.wire.testRunner = testRunner;
}(buster));

// TMP Performance fix
(function () {
    var i = 0;

    buster.nextTick = function (cb) {
        i += 1;

        if (i === 10) {
            setTimeout(function () {
                cb();
            }, 0);

            i = 0;
        } else {
            cb();
        }
    };
}());
