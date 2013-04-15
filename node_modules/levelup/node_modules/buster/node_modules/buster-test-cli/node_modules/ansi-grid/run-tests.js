var buster = require("buster-node");

buster.testRunner.onCreate(function (runner) {
    runner.on("suite:end", function (results) {
        process.nextTick(function () {
            process.exit(results.ok ? 0 : 1);
        });
    });
});

require("./test/ansi-test");
require("./test/matrix-test");
require("./test/relative-grid-test");
