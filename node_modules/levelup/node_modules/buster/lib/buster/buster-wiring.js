(function (glbl, buster) {
    if (typeof require == "function" && typeof module == "object") {
        buster = require("buster-core");

        module.exports = buster.extend(buster, require("buster-test"), {
            assertions: require("buster-assertions"),
            format: require("buster-format"),
            eventedLogger: require("buster-evented-logger"),
            frameworkExtension: require("./framework-extension"),
            wiringExtension: require("./wiring-extension")
        });

        buster.defineVersionGetter(module.exports, __dirname);
        require("buster-sinon");
    }

    if (buster.format) {
        var logFormatter = buster.create(buster.format);
        logFormatter.quoteStrings = false;
        var asciiFormat = buster.bind(logFormatter, "ascii");
    }

    if (buster.eventedLogger) {
        if (asciiFormat) {
            buster.console = buster.eventedLogger.create({
                formatter: asciiFormat,
                logFunctions: true
            });
        }
        buster.log = buster.bind(buster.console, "log");

        buster.captureConsole = function () {
            glbl.console = buster.console;

            if (glbl.console !== buster.console) {
                glbl.console.log = buster.bind(buster.console, "log");
            }
        };
    }

    if (buster.assertions) {
        if (asciiFormat) {
            buster.assertions.format = asciiFormat;
        }
        buster.assert = buster.assertions.assert;
        buster.refute = buster.assertions.refute;

        // TMP, will add mechanism for avoiding this
        glbl.assert = buster.assert;
        glbl.refute = buster.refute;
        glbl.expect = buster.assertions.expect;

        // Assertion counting
        var assertions = 0;
        var count = function () { assertions += 1; };
        buster.assertions.on("pass", count);
        buster.assertions.on("failure", count);
    }

    if (buster.testRunner) {
        buster.testRunner.onCreate(function (runner) {
            buster.assertions.bind(runner, { "failure": "assertionFailure" });
            runner.console = buster.console;

            runner.on("test:async", function () {
                buster.assertions.throwOnFailure = false;
            });

            runner.on("test:setUp", function () {
                buster.assertions.throwOnFailure = true;
            });

            runner.on("test:start", function () {
                assertions = 0;
            });

            runner.on("context:start", function (context) {
                if (context.testCase) {
                    context.testCase.log = buster.bind(buster.console, "log");
                }
            });
        });

        buster.testRunner.assertionCount = function () {
            return assertions;
        };
    }
}(typeof global != "undefined" ? global : this, typeof buster == "object" ? buster : null));