var B = require("buster-core");
var args = require("posix-argv-parser");
var v = args.validators;

function getDescription(options) {
    var description = options.description;
    if (options.values) {
        description += " One of " + options.values.join(", ") + ".";
    }
    if (options.defaultValue) {
        description += " Default is " + options.defaultValue + ".";
    }
    return description;
}

function getValidators(options) {
    var validator, msg, validators = options.validators || [];
    if (options.values) {
        validators.push(v.inEnum(options.values));
        delete options.values;
    }
    if (options.maxTimes) {
        validators.push(v.maxTimesSet(options.maxTimes));
        delete options.maxTimes;
    }
    return validators;
}

module.exports = B.extend(B.create(args), B.create(B.eventEmitter), {
    validators: args.validators,

    opt: function (flags, options) {
        options.description = getDescription(options);
        options.hasValue = !!options.values || !!options.hasValue;
        options.validators = getValidators(options);
        return this.createOption(flags, options);
    },

    opd: function (signature, options) {
        return this.createOperand(signature, options);
    }
});
