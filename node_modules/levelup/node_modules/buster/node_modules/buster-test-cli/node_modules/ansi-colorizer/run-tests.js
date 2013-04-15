var referee = require("referee");
var bt = require("buster-test");

var assertions = 0;
var count = function () { assertions += 1; };
referee.on("pass", count);
referee.on("failure", count);

bt.testRunner.assertionCount = function () {
    return assertions;
};

bt.testRunner.onCreate(function (runner) {
    runner.on("suite:end", function (results) {
        if (!results.ok) {
            setTimeout(function () {
                process.exit(1);
            }, 50);
        }
    });
});

bt.testContext.on("create", bt.autoRun());

require("./test/ansi-colorizer-test.js");
