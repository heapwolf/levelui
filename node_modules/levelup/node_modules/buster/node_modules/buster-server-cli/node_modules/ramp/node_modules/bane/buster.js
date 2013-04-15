exports.Browsers = {
    sources: ["lib/bane.js"],
    tests: ["test/bane-test.js"]
};

exports.Node = {
    extends: "Browsers",
    environment: "node"
};
