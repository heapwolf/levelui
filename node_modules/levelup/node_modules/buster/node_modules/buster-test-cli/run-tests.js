var buster = require("buster");

buster.testRunner.onCreate(function (runner) {
    runner.on("suite:end", function (results) {
        process.nextTick(function () {
            process.exit(results.ok ? 0 : 1);
        });
    });
});

require("./test/progress-reporter-integration-test");
require("./test/run-analyzer-test");
require("./test/test-cli-test");
require("./test/runners/node-test");
require("./test/runners/browser-test");
require("./test/runners/browser/progress-reporter-test");
require("./test/runners/browser/remote-runner-test");
