var buster = require("buster-node");

buster.testRunner.onCreate(function (runner) {
    runner.on("suite:end", function (results) {
        process.nextTick(function () {
            process.exit(results.ok ? 0 : 1);
        });
    });
});

require("./test/cache-test");
require("./test/events-test");
require("./test/joinable-and-unjoinable-test");
require("./test/main-test");
require("./test/session-lifecycle-test");
require("./test/slave-header-test");
require("./test/test-helper-test");
