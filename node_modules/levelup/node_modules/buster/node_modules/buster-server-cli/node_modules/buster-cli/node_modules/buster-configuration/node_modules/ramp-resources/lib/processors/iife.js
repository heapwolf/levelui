var toString = Object.prototype.toString;

module.exports = function (xports) {
    if (!!xports && toString.call(xports) !== "[object Array]") {
        throw new Error("IIFE exports should be an array of names");
    }
    return function (resource, content) {
        var glbl = "", args = "", exportStmt = "";
        if (xports && xports.length > 0) {
            glbl = "typeof global != \"undefined\" ? global : this";
            args = "global";
            exportStmt = xports.map(function (variable) {
                return "global." + variable + "=" + variable + ";";
            }).join("");
            exportStmt = !/;\s*$/.test(content) ? ";" + exportStmt : exportStmt;
        }

        return "(function (" + args + ") {" + content + exportStmt + "}.call(this" +
            (glbl ? ", " + glbl : "") + "));";
    };
};
