module.exports = {
    resource: require("./resource"),
    resourceSet: require("./resource-set"),
    resourceSetCache: require("./resource-set-cache"),
    resourceMiddleware: require("./resource-middleware"),
    processors: {
        iife: require("./processors/iife")
    }
};
