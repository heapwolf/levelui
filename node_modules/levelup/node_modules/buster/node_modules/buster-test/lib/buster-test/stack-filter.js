if (typeof module === "object" && typeof require === "function") {
    var buster = require("buster-core");
}

buster.stackFilter = function (stack, cwd) {
    var lines = (stack || "").split("\n");
    var stackLines = [], line, replacer = "./";

    if (typeof cwd == "string") {
        cwd = cwd.replace(/\/?$/, "/");
    }

    if (cwd instanceof RegExp && !/\/\/$/.test(cwd)) {
        replacer = ".";
    }

    for (var i = 0, l = lines.length; i < l; ++i) {
        if (/(\d+)?:\d+\)?$/.test(lines[i])) {
            if (!buster.stackFilter.match(lines[i])) {
                line = lines[i].replace(/^\s+|\s+$/g, "");

                if (cwd) {
                    line = line.replace(cwd, replacer);
                }

                stackLines.push(line);
            }
        }
    }

    return stackLines;
};

var regexpes = {};

buster.stackFilter.match = function (line) {
    var filters = buster.stackFilter.filters;

    for (var i = 0, l = filters.length; i < l; ++i) {
        if (!regexpes[filters[i]]) {
            regexpes[filters[i]] = new RegExp(filters[i]);
        }

        if (regexpes[filters[i]].test(line)) {
            return true;
        }
    }

    return false;
}

buster.stackFilter.filters = ["buster-assertions/lib",
                              "buster-test/lib", 
                              "buster-util/lib",
                              "buster-core/lib",
                              "node.js",
                              "/buster/lib",
                              "/buster/node_modules",
                              "static/runner.js"/* JsTestDriver */];

if (typeof module != "undefined") {
    module.exports = buster.stackFilter;
}
