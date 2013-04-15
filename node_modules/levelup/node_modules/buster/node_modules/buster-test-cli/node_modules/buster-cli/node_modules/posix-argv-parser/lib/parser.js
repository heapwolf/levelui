var when = require("when");
var option = require("./option");
var opd = require("./operand");
var OPTIONS_END_DELIMITER = "--";

function expandShorthands(args, options) {
    return options.reduce(function (substituted, option) {
        return option.expand ? option.expand(substituted) : substituted;
    }, args);
}

function getOption(options, arg) {
    return options.filter(function (opt) { return opt.recognizes(arg); })[0];
}

function isShortOptionWithExtra(arg) {
    return option.isShortOption(arg) && arg.length > 2;
}

function shortOptionExtra(options, arg) {
    var opt = getOption(options, arg);
    if (!opt) { throw new Error("Unknown option '" + arg + "'"); }
    var flag = arg.slice(0, 2);
    var extra = arg.slice(2);
    if (opt.hasValue) {return [flag, extra]; }
    if (!extra) { return [flag]; }
    return [flag].concat(shortOptionExtra(options, "-" + extra));
}

function tokenize(args, options) {
    var operandMode = false;
    return expandShorthands(args, options).reduce(function (tokenized, arg) {
        if (arg === OPTIONS_END_DELIMITER) { operandMode = true; }
        if (operandMode || !option.isOption(arg) || arg.indexOf("=") >= 0) {
            return tokenized.concat(arg);
        }
        if (isShortOptionWithExtra(arg)) {
            return tokenized.concat(shortOptionExtra(options, arg));
        }
        tokenized.push(arg);
        return tokenized;
    }, []);
}

function F() {}

function parse(options, args, done) {
    var promises = [];
    var results = {};

    function resultFor(o) {
        if (!o.keys) { return {}; }
        var keys = o.keys() || [];
        if (results[keys[0]]) { return results[keys[0]]; }
        var data = {
            isSet: false,
            value: o.defaultValue,
            timesSet: 0,
            transform: o.transform,
            signature: o.signature
        };
        keys.forEach(function (k) { results[k] = data; });
        return data;
    }

    var validate = function (o, data) {
        if (!o.validate) { return; }
        F.prototype = typeof data === "object" ? data : resultFor(o);
        return o.validate(new F());
    };

    function transformValue(result) {
        if (result.transform) {
            result.value = result.transform(result.value);
        }
        delete result.transform;
    }

    function unhandled(options) {
        return options.filter(function (option) {
            return !resultFor(option).isSet;
        });
    }

    function complete() {
        promises = promises.concat(unhandled(options).map(validate));
        when.all(promises).then(function () {
            var prop;
            for (prop in results) {
                try {
                    transformValue(results[prop]);
                } catch (e) {
                    e.message = results[prop].signature + ": " + e.message;
                    return done(e);
                }
            }
            done(null, results);
        }, done);
    }

    function valueFromEqualsSign(arg) {
        var equalsPos = arg.indexOf("=");
        if (equalsPos < 0) { return; }
        return arg.slice(equalsPos + 1);
    }

    function recognized(arg) {
        return option.isOption(arg) &&
            options.some(function (opt) { return opt.recognizes(arg); });
    }

    function value(opt, arg) {
        if (opd.isOperand(opt)) { return arg; }
        var val = valueFromEqualsSign(arg);
        if (val) { return val; }
        if (!opt.hasValue) { return; }
        if (recognized(args[0])) { return; }
        return args.shift();
    }

    function handleNext(arg) {
        return options.some(function (option) {
            var data = resultFor(option);
            if (option.recognizes(arg, data)) {
                var val = value(option, arg);
                option.handle(data, val);
                return promises.push(validate(option, data));
            }
        });
    }

    var operands = options.filter(function (o) { return opd.isOperand(o); });

    function feedOperands(value) {
        return operands.some(function (o) {
            var data = resultFor(o);
            if (!o.isSatiesfied(data)) {
                o.handle(data, value);
                return promises.push(validate(o, data));
            }
        });
    }

    args = tokenize(args, options);
    var nextArg, operandMode = false;

    while (args.length > 0) {
        nextArg = args.shift();
        if (nextArg === OPTIONS_END_DELIMITER) {
            operandMode = true;
        } else {
            if (operandMode && !feedOperands(nextArg)) {
                throw new Error("Unknown operand '" + nextArg + "'.");
            }
            if (!operandMode && !handleNext(nextArg)) {
                throw new Error("Unknown argument '" + nextArg + "'.");
            }
        }
    }

    return complete();
}

module.exports = {
    parse: parse,
    expandShorthands: expandShorthands
};
