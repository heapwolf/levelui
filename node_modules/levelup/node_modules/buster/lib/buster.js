if (typeof module === "object" && typeof require === "function") {
    var buster = module.exports = require("./buster/buster-wiring");
}

(function (glbl) {
    glbl.buster = buster;

    var tc = buster.testContext;
    if (tc.listeners && (tc.listeners.create || []).length > 0) { return; }

    var runner = buster.autoRun({
        cwd: typeof process != "undefined" ? process.cwd() : null
    });

    tc.on("create", runner);
}(typeof global != "undefined" ? global : this));
