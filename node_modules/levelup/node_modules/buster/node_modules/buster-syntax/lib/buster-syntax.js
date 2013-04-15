var syntax = require("./syntax");

function processor(resource, content) {
    var type = resource.mimeType();
    this.checked = this.checked || {};
    if (!/javascript/.test(type) || this.checked[resource.path]) {
        return;
    }
    this.checked[resource.path] = true;
    var result = this.checker.check(content, resource.path);
    if (!result.ok) {
        resource.cacheable = false;
        var path = resource.path;
        if (result.errors[0].type === syntax.SYNTAX_ERROR) {
            this.analyzer.fatal("Syntax error", result);
        } else {
            this.analyzer.error("ReferenceError", result);
        }
    }
}

module.exports = {
    name: "buster-syntax",

    create: function (options) {
        var instance = Object.create(this);
        instance.checked = {};
        instance.checker = syntax.create({
            ignoreReferenceErrors: options && options.ignoreReferenceErrors
        });
        return instance;
    },

    analyze: function (analyzer) {
        this.analyzer = analyzer;
    },

    configure: function (config) {
        ["libs", "sources", "testHelpers", "tests"].forEach(function (group) {
            config.on("load:" + group, function (resourceSet) {
                resourceSet.addProcessor(processor.bind(this));
            }.bind(this));
        }.bind(this));
    }
};
