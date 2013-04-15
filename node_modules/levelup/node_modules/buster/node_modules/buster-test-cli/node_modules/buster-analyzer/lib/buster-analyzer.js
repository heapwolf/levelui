var Analyzer = require("./analyzer");
var FileReporter = require("./file-reporter");

module.exports = {
    createAnalyzer: function () {
        return new Analyzer();
    },

    createFileReporter: function (threshold, options) {
        return new FileReporter(threshold, options);
    }
};
