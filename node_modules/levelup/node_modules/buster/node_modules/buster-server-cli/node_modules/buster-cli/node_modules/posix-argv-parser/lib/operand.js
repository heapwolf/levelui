var argument = require("./argument");
var option = require("./option");
var fs = require("fs");

function Operand(validators) {
    var prop, arg = argument.create(validators);
    for (prop in arg) {
        this[prop] = arg[prop];
    }
}

Operand.prototype = module.exports = {
    create: function (name, props) {
        if (typeof name === "object") {
            props = name;
            name = null;
        }
        props = props || {};
        var opd = new Operand(props.validators);
        opd.signature = name || "OPD";
        opd.greedyValues = [];
        opd.greedy = !!props.greedy;
        opd.defaultValue = props.greedy ? [] : undefined;
        opd.description = props.description;
        return opd;
    },

    isSatiesfied: function (data) {
        return data.isSet && !this.greedy;
    },

    recognizes: function (arg, data) {
        return !option.isOption(arg) && !this.isSatiesfied(data);
    },

    handle: function (data, value) {
        data.isSet = true;
        data.timesSet++;
        if (this.greedy) {
            data.value.push(value);
        } else {
            data.value = value;
        }
    },

    isOperand: function (option) {
        return module.exports.isPrototypeOf(option);
    },

    keys: function () {
        return [this.signature];
    }
};
