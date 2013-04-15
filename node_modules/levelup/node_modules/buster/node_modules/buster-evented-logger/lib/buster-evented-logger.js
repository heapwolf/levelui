var buster = buster || {};

if (typeof module === "object" && typeof require === "function") {
    buster = require("buster-core");
}

(function () {
    function indexOf(array, item) {
        if (array.indexOf) {
            return array.indexOf(item);
        }

        for (var i = 0, l = array.length; i < l; ++i) {
            if (array[i] == item) {
                return i;
            }
        }

        return -1;
    }

    function formatMessage(message) {
        if (!this.logFunctions && typeof message == "function") {
            return this.format(message());
        }
        return this.format(message);
    }

    function createLogger(name, level) {
        return function () {
            if (level > indexOf(this.levels, this.level)) {
                return;
            }

            var message = [];

            for (var i = 0, l = arguments.length; i < l; ++i) {
                message.push(formatMessage.call(this, arguments[i]));
            }

            this.emit("log", {
                message: message.join(" "),
                level: this.levels[level]
            });
        };
    }

    buster.eventedLogger = buster.extend(buster.create(buster.eventEmitter), {
        create: function (opt) {
            opt = opt || {};
            var logger = buster.create(this);
            logger.levels = opt.levels || ["error", "warn", "log", "debug"];
            logger.level = opt.level || logger.levels[logger.levels.length - 1];

            for (var i = 0, l = logger.levels.length; i < l; ++i) {
                logger[logger.levels[i]] = createLogger(logger.levels[i], i);
            }

            if (opt.formatter) { logger.format = opt.formatter; }
            logger.logFunctions = !!opt.logFunctions;
            return logger;
        },

        format: function (obj) {
            if (typeof obj != "object") {
                return "" + obj;
            }

            try {
                return JSON.stringify(obj);
            } catch (e) {
                return "" + obj;
            }
        }
    });
}());

if (typeof module != "undefined") {
    module.exports = buster.eventedLogger;
}
