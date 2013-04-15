var bResource = require("./resource");
var when = require("when");
var invalid = require("./invalid-error");
var B = require("buster-core");

module.exports = {
    validateSources: function (resourceSet, sources) {
        var i, l;
        for (i = 0, l = sources.length; i < l; ++i) {
            if (!resourceSet.get(sources[i])) {
                return invalid(sources[i] + " is not an available resource");
            }
        }
    },

    combiner: function (resourceSet, sources) {
        return function () {
            var d = when.defer();
            when.all(sources.map(function (s) {
                return resourceSet.get(s).content();
            })).then(function (contents) {
                d.resolver.resolve(contents.join(""));
            }, d.reject);
            return d.promise;
        };
    },

    prepareResource: function (resourceSet, sources, resource) {
        var d = when.defer();
        var err = this.validateSources(resourceSet, sources);
        if (err) {
            err.message = "Cannot build combined resource " +
                bResource.normalizePath(resource.path) + ": " + err.message;
            d.resolver.reject(err);
        } else {
            var combine = this.combiner(resourceSet, sources);
            if (resource.setContent) {
                resource.setContent(combine);
            } else {
                resource.content = combine;
            }
            d.resolver.resolve(resource);
        }
        return d.promise;
    }
};
