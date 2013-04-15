var option = require("./option");
var operand = require("./operand");
var shorthand = require("./shorthand");
var parser = require("./parser");

function detectDuplicateOption(suspect, option) {
    if (!operand.isOperand(option) && suspect.intersects(option)) {
        throw new Error("Duplicate option (" + suspect.signature + ")");
    }
}

function detectDuplicateShorthand(shorthand, option) {
    if (option.recognizes && option.recognizes(shorthand)) {
        throw new Error("Can not add shorthand '" + shorthand +
                        "', option already exists.");
    }
}

function optList(collection) {
    if (!collection.options) { collection.options = []; }
    return collection.options;
}

function ArgvParser() {
    this.options = [];
}

ArgvParser.prototype = module.exports = {
    validators: require("./validators"),
    types: require("./types"),

    create: function () {
        return new ArgvParser();
    },

    add: function (opt) {
        optList(this).push(opt);
        return opt;
    },

    createOption: function (options, properties) {
        var opt = option.create(options, properties);
        optList(this).forEach(detectDuplicateOption.bind(null, opt));
        return this.add(opt);
    },

    createOperand: function (name, properties) {
        return this.add(operand.create(name, properties));
    },

    addShorthand: function (opt, args) {
        if (!option.isOption(opt)) {
            throw new Error("Invalid option '" + opt + "'");
        }
        optList(this).forEach(detectDuplicateShorthand.bind(null, opt));
        return this.add(shorthand.create(opt, args));
    },

    parse: function (argv, onFinished) {
        try {
            parser.parse(optList(this), argv, function (err, options) {
                if (err) {
                    err = [err];
                }
                onFinished(err, options);
            }.bind(this));
        } catch (e) {
            onFinished([e.message]);
        }
    }
};

var flag;
for (flag in operand.flags) {
    module.exports[flag] = operand.flags[flag];
}
