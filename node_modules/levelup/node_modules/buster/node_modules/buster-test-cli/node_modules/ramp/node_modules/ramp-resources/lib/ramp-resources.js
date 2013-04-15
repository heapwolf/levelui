var resource = require("./resource");
var resourceSet = require("./resource-set");
var resourceSetCache = require("./resource-set-cache");
var resourceMiddleware = require("./resource-middleware");
var processors = { iife: require("./processors/iife") };

module.exports = {
    createResourceSet: function (rootPath) {
        return resourceSet.create(rootPath);
    },

    createMiddleware: function (mountPoint) {
        return resourceMiddleware.create(mountPoint);
    },

    createCache: function (options) {
        return resourceSetCache.create(options);
    },

    createResource: function (path, options) {
        return resource.create(path, options);
    },

    deserialize: function (serialize) {
        return resourceSet.deserialize(serialize);
    }
};
