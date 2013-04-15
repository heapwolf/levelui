if (typeof module === "object" && typeof require === "function") {
    module.exports = {
        testCase: require("./buster-test/test-case"),
        spec: require("./buster-test/spec"),
        testRunner: require("./buster-test/test-runner"),
        testContext: require("./buster-test/test-context"),
        reporters: require("./buster-test/reporters"),
        autoRun: require("./buster-test/auto-run"),
        stackFilter: require("./buster-test/stack-filter")
    };
}
