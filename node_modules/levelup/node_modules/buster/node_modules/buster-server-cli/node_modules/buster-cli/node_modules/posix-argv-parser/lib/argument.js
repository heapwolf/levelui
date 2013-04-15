var when = require("when");

function validate(data, validator) {
    try {
        var val = validator(data);
        return when.isPromise(val) ? val : when(val);
    } catch (e) {
        return when.reject(e.message || e);
    }
}

function Argument(validators) {
    this.validators = validators || [];
}

Argument.prototype = module.exports = {
    create: function (validators) {
        return new Argument(validators);
    },

    validate: function (data) {
        var validations = this.validators.map(validate.bind(this, data));
        return when.all(validations);
    }
};
