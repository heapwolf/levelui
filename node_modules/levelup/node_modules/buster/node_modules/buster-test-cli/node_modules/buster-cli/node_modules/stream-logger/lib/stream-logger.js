var eventedLogger = require("buster-evented-logger");

function createShortLevelAliases(logger) {
    logger.d = logger.debug;
    logger.i = logger.info;
    logger.l = logger.log;
    logger.w = logger.warn;
    logger.e = logger.error;
}

function defaultLogger(logger, outStream) {
    if (logger && typeof logger.write === "function") {
        return logger;
    }

    return outStream;
}

function createReporter(out, err) {
    var stdout = defaultLogger(out, process.stdout);
    var stderr = defaultLogger(err, process.stderr);

    return {
        log: stdout,
        info: stdout,
        debug: stdout,
        warn: stderr,
        error: stderr
    };
}

function subscribeReporter(logger, reporter, suffix) {
    logger.on("log", function (msg) {
        var prefix = logger.verbose ? "[" + msg.level.toUpperCase() + "] " : "";
        reporter[msg.level].write(prefix + msg.message + suffix);
    });
}

module.exports = function (stdout, stderr) {
    var levels = ["error", "warn", "log", "info", "debug"];
    var reporter = createReporter(stdout, stderr);
    var logger = eventedLogger.create({ levels: levels });
    logger.inline = eventedLogger.create({ levels: levels });

    Object.defineProperty(logger.inline, "level", {
        get: function () {
            return logger.level;
        }
    });

    subscribeReporter(logger, reporter, "\n");
    subscribeReporter(logger.inline, reporter, "");
    createShortLevelAliases(logger);
    createShortLevelAliases(logger.inline);

    logger.streamForLevel = function (level) {
        return {
            write: function (str) {
                return logger.inline[level](str);
            }
        };
    };

    return logger;
};
