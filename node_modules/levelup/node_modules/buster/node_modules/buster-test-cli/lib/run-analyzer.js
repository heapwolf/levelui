var ba = require("buster-analyzer");
var EX_SOFTWARE = 70;

function analyzerError(stats) {
    var err = new Error("Pre-condition failed");
    err.type = "AnalyzerError";
    err.code = EX_SOFTWARE;
    err.stats = stats;
    return err;
}

function once(callback) {
    var called = false;
    return function () {
        if (called || !callback) { return; }
        called = true;
        return callback.apply(this, arguments);
    };
}

exports.create = function (logger, options) {
    var analyzer = ba.createAnalyzer();
    if (options.failOn) { analyzer.failOn(options.failOn); }

    var reporter = ba.createFileReporter(options.warnings || "all", {
        outputStream: logger.streamForLevel("warn"),
        color: options.color,
        bright: options.bright
    }).listen(analyzer);

    analyzer.run = function (runner, config, cb) {
        var callback = once(cb);
        config.runExtensionHook("analyze", analyzer);
        var run = runner.run(config, options, callback);
        run.cacheable = options.cacheResources;

        analyzer.on("fail", function (stats) {
            var err = analyzerError(stats);
            run.abort(err);
            callback(err);
        });
    };

    return analyzer;
};
