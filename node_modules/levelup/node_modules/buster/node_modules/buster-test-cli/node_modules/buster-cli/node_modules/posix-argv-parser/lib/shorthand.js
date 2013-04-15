function Shorthand(option, expansion) {
    this.option = option;
    this.expansion = expansion;
}

Shorthand.prototype = module.exports = {
    create: function (option, expansion) {
        if (!(expansion instanceof Array)) {
            throw new Error("Shorthand expansion must be an array.");
        }
        return new Shorthand(option, expansion);
    },

    recognizes: function (option) {
        return this.option === option;
    },

    expand: function (args) {
        return args.reduce(function (expanded, arg) {
            var expansion = this.recognizes(arg) ? this.expansion : arg;
            return expanded.concat(expansion);
        }.bind(this), []);
    }
};
