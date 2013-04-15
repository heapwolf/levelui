var streamLogger = require("stream-logger");

function createLogLevelOption(cli, logger) {
    cli.opt(["-l", "--log-level"], {
        description: "Set logging level.",
        values: logger.levels
    });
    cli.on("args:parsed", function (options) {
        if (options["-l"].isSet) { logger.level = options["-l"].value; }
    });
}

function increaseLogLevel(logger) {
    return function (options) {
        if (!options["-v"].isSet) { return; }
        var levels = logger.levels;
        var curr = levels.indexOf(logger.level);
        logger.level = levels[curr + options["-v"].timesSet];
    };
}

function createVerboseOption(cli, logger) {
    cli.opt(["-v", "--verbose"], {
        description: "Increase verbosity level. Include one (log level " +
            "info) or two times -vv, log level debug).",
        maxTimes: 2
    });
    cli.on("args:parsed", increaseLogLevel(logger));
}

module.exports = {
    createFor: function (cli, stdout, stderr) {
        var logger = streamLogger(stdout, stderr);
        logger.level = "log";
        createLogLevelOption(cli, logger);
        createVerboseOption(cli, logger);
        return logger;
    }
};
