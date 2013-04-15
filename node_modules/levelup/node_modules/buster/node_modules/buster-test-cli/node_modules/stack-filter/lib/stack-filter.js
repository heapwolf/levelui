((typeof define === "function" && define.amd && function (m) {
    define(m);
}) || (typeof module === "object" && function (m) {
    module.exports = m();
}) || function (m) { this.stackFilter = m(); }
)(function () {
    "use strict";

    function stackFilter(stack, cwd) {
        var lines = (stack || "").split("\n");
        var i, l, line, stackLines = [], replacer = "./";

        if (typeof cwd === "string") {
            cwd = cwd.replace(/\/?$/, "/");
        }

        if (cwd instanceof RegExp && !/\/\/$/.test(cwd)) {
            replacer = ".";
        }

        for (i = 0, l = lines.length; i < l; ++i) {
            if (/(\d+)?:\d+\)?$/.test(lines[i])) {
                if (!stackFilter.match(lines[i])) {
                    line = lines[i].replace(/^\s+|\s+$/g, "");

                    if (cwd) {
                        line = line.replace(cwd, replacer);
                    }

                    stackLines.push(line);
                }
            }
        }

        return stackLines;
    }

    var regexpes = {};
    stackFilter.filters = [];

    stackFilter.match = function (line) {
        var i, l, filters = stackFilter.filters;

        for (i = 0, l = filters.length; i < l; ++i) {
            if (!regexpes[filters[i]]) {
                regexpes[filters[i]] = new RegExp(filters[i]);
            }

            if (regexpes[filters[i]].test(line)) {
                return true;
            }
        }

        return false;
    };

    return stackFilter;
});
