var bane = require("bane");
var levels = ["warning", "error", "fatal"];

function emitIfFailed(analyzer, stats) {
    if (analyzer.emittedFail || !stats.failed) { return; }
    analyzer.emit("fail", stats);
    analyzer.emittedFail = true;
}

function countAndEmit(analyzer, type, message, data) {
    analyzer[type + "s"] += 1;
    analyzer.emit(type, message, data);
    emitIfFailed(analyzer, analyzer.status());
}

function Analyzer() {
    this.fatals = 0;
    this.errors = 0;
    this.warnings = 0;
    this.failLevel = 2;
    this.emittedFail = false;
}

Analyzer.prototype = bane.createEventEmitter({
    fatal: function (message, data) {
        countAndEmit(this, "fatal", message, data);
    },

    error: function (message, data) {
        countAndEmit(this, "error", message, data);
    },

    warning: function (message, data) {
        countAndEmit(this, "warning", message, data);
    },

    failOn: function (level) {
        var failLevel = levels.indexOf(level);
        if (failLevel < 0) { throw new Error("Unknown level " + level); }
        this.failLevel = failLevel;
    },

    status: function () {
        var self = this;
        var failCount = levels.filter(function (l, i) {
            return i >= self.failLevel;
        }).map(function (level) {
            return self[level + "s"];
        }).reduce(function (s, l) {
            return s + l;
        }, 0);

        return {
            clean: this.warnings + this.errors + this.fatals === 0,
            warnings: this.warnings,
            errors: this.errors,
            fatals: this.fatals,
            failed: failCount > 0
        };
    }
});

module.exports = Analyzer;