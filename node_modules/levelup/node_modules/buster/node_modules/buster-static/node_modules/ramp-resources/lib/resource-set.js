var B = require("buster-core");
var when = require("when");
var invalid = require("./invalid-error");
var bResource = require("./resource");
var fr = require("./resource-file-resolver");
var combiner = require("./resource-combiner");
var loadPath = require("./load-path");
var mm = require("minimatch");

function rejected(err) {
    var deferred = when.defer();
    deferred.resolver.reject(err);
    return deferred.promise;
}

function rotateIndices(rs, resource) {
    var i, l;
    for (i = 0, l = rs.length; i < l; ++i) {
        if (rs[i] === resource) {
            for (i; i < l; ++i) {
                rs[i] = rs[i + 1];
            }
        }
    }
}

function serialize(cache, resource) {
    var d = when.defer();
    cache = cache || {};
    resource.serialize({
        includeContent: (cache[resource.path] || []).indexOf(resource.etag) < 0
    }).then(function (serialized) {
        if (resource.combine) {
            delete serialized.content;
            serialized.combine = resource.combine;
        }
        d.resolver.resolve(serialized);
    }, d.reject);
    return d.promise;
}

/**
 * Create new resource set, resolved from the provided rootPath,
 * or process.cwd()
 */
exports.create = function (rootPath) {
    rootPath = rootPath || process.cwd();
    var resources = {};
    var promises = [];
    var processors = [];
    var resourceSet;

    function deferredAdder() {
        var deferred = when.defer();
        promises.push(deferred);
        return deferred;
    }

    function whenAllAdded(cb, eb) {
        when.all(promises).then(cb, eb);
    }

    function addResource(resource) {
        if (!bResource.isResource(resource)) {
            resource = bResource.create(resource.path, resource);
        }
        var existingPaths = resourceSet.map(function (r) { return r.path; });
        var index = existingPaths.indexOf(resource.path);
        resources[resource.path] = resource;
        resourceSet[index >= 0 ? index : resourceSet.length++] = resource;
        processors.forEach(B.bind(resource, "addProcessor"));
        return resource;
    }

    function unmatchedPatterns(resourceSet, patterns) {
        var paths = resourceSet.map(function (r) { return r.path; });
        var options = { matchBase: true };
        return patterns.filter(function (pattern) {
            pattern = pattern.replace(/^\/?/, "/");
            return mm.match(paths, pattern, options).length === 0;
        });
    }

    function addMissingResources(rs, paths, matches, missing, callback) {
        var errorLabel = "Failed loading configuration: ";

        rs.addFileResources(missing).then(function () {
            var unmatched = unmatchedPatterns(rs, paths);
            if (unmatched.length > 0) {
                return callback(new Error(
                    errorLabel + "'" + unmatched.join("', '") +
                        "' matched no files or resources"
                ));
            }

            callback(null, matches);
        }, callback);
    }

    function resolvePathsAndAddMissingResources(paths, callback) {
        if (paths.length === 0) { return callback(null, []); }
        paths = Array.isArray(paths) ? paths : [paths];
        var rs = resourceSet;
        var errorLabel = "Failed loading " + paths.join(", ") + ": ";
        fr.resolvePaths(rs, paths, function (err, matches) {
            if (err) {
                err.message = errorLabel + err.message;
                return callback(err);
            }
            var missing = matches.filter(function (p) { return !rs.get(p); });
            addMissingResources(rs, paths, matches, missing, callback);
        }, { strict: false });
    }

    function cacheManifest() {
        return Object.keys(resources).reduce(function (manifest, path) {
            manifest[path] = [resources[path].etag];
            return manifest;
        }, {});
    }

    resourceSet = {
        length: 0,
        rootPath: rootPath,

        /**
         * Add all resources in array resources. Returns a promise.
         */
        addResources: function (resources) {
            return when.all(resources.map(B.bind(this, "addResource")));
        },

        /**
         * Add single resource.
         *
         * Resource may be a resource object, a string, or an object of
         * properties supported by resource.create();
         *
         * When the resource is a string, it is passed on to addGlobResource.
         *
         * When the resource is an object of properties to pass on to
         * resource.create(), a couple of additional properties are supported:
         *
         * - path    Path is passed as first argument to resource.create()
         * - combine Array of resources to combine. Fails if any of the
         *           referenced resources are not part of the resource set.
         * - file    Add file as resource.
         *
         * Returns a promise. Promise will be rejected if adding an invalid
         * resource (see resource#validate).
         */
        addResource: function (resource) {
            if (typeof resource === "string") {
                return this.addGlobResource(resource);
            }
            var err = exports.validate(resource);
            if (err) { return rejected(err); }
            if (resource.file) {
                return this.addFileResource(resource.file, resource);
            }
            if (resource.combine) {
                return this.addCombinedResource(resource.combine, resource);
            }
            return when(addResource(resource));
        },

        /**
         * Add a string as a resource. String will be taken as glob, and
         * all resulting paths are added as files (relative to rootPath).
         *
         * Returns a promise. Promise is rejected if glob pattern matches
         * no files, or if adding any resource fails.
         */
        addGlobResource: function (path) {
            var d = deferredAdder();
            fr.resolvePaths(this, [path], function (e, paths) {
                if (e || paths.length === 0) {
                    var err = e || { message: path + " matched no files" };
                    return d.resolver.reject(err);
                }
                this.addFileResources(paths).then(d.resolve, d.reject);
            }, { strict: true });
            return d.promise;
        },

        /**
         * Adds an array of paths as file resources.
         *
         * Returns a promise.
         */
        addFileResources: function (paths, rs) {
            return when.all((paths || []).map(function (path) {
                return this.addFileResource(path, rs);
            }.bind(this)));
        },

        /**
         * Adds a resource from a file on disk. Resource argument is
         * optional and can contain path and headers etc.
         *
         * Returns a promise.
         */
        addFileResource: function (path, rs) {
            var d = deferredAdder();
            fr.prepareResource(this.rootPath, path, rs || {}).then(
                function (res) {
                    res.path = res.path || path;
                    d.resolver.resolve(addResource(res));
                }.bind(this),
                d.reject
            );
            return d.promise;
        },

        /**
         * Adds a resource that combines other resources' contents for
         * its contents
         */
        addCombinedResource: function (sources, options) {
            var rs = this, d = when.defer();
            var attemptCombinedResource = function () {
                combiner.prepareResource(rs, sources, options).then(
                    function (res) {
                        var resource = addResource(res);
                        resource.combine = sources;
                        d.resolver.resolve(resource);
                    },
                    d.reject
                );
            };
            whenAllAdded(attemptCombinedResource, attemptCombinedResource);
            promises.push(d);
            return d.promise;
        },

        /**
         * Add processors to all existing and all future resources
         */
        addProcessor: function (processor) {
            processors.push(processor);
            Object.keys(resources).forEach(function (path) {
                resources[path].addProcessor(processor);
            });
        },

        /**
         * Process all resources. Only prods resources that actually have
         * processors. The method can optionally accept a cache manifest.
         * Resources whose etag matches one in the cache manifest will not be
         * processed.
         *
         * Returns a cache manifest with etag of processed resources. 
         */
        process: function (manifest) {
            manifest = manifest || [];
            var d = when.defer();
            when.all(Object.keys(resources).filter(function (path) {
                return (manifest[path] || []).indexOf(resources[path].etag) < 0;
            }).map(function (path) {
                return resources[path].process();
            })).then(function () {
                d.resolver.resolve(cacheManifest());
            }, d.reject);
            return d.promise;
        },

        /**
         * Get the resource at path. Path is normalized, so:
         * rs.get("foo.js") ==== rs.get("/foo.js")
         */
        get: function (path) {
            return resources[bResource.normalizePath(path)];
        },

        /**
         * Remove resource at path. Returns true when successfully removed,
         * false if resource does not exist. Also removes from load.
         */
        remove: function (path) {
            path = bResource.normalizePath(path);
            rotateIndices(this, resources[path]);
            this.length -= 1;
            delete resources[path];
            this.loadPath.remove(path);
        },

        /**
         * Serializes the resource set as a fully resolved data structure.
         * Suitable for transmission over the wire. Returns a promise.
         */
        serialize: function (cached) {
            var d = when.defer();
            whenAllAdded(function () {
                var s = B.partial(serialize, cached);
                when.all(this.map(s)).then(function (resources) {
                    d.resolver.resolve({
                        resources: resources,
                        loadPath: this.loadPath.paths()
                    });
                }.bind(this), d.reject);
            }.bind(this), d.reject);
            return d.promise;
        },

        /**
         * Merge resource set with others, returning a new resource set.
         */
        concat: function () {
            var sets = [this].concat([].slice.call(arguments));
            return sets.reduce(function (resourceSet, rs) {
                resourceSet.addResources(rs);
                resourceSet.loadPath.append(rs.loadPath.paths());
                return resourceSet;
            }, exports.create(this.rootPath));
        },

        matchPaths: function (paths) {
            var allPaths = this.map(function (r) { return r.path; });
            return B.flatten(paths.map(function (path) {
                return this.get(path) ? path : mm.match(allPaths, path, {
                    matchBase: true
                });
            }.bind(this)));
        },

        /**
         * High-level interface to adding paths to the load path. Also adds
         * corresponding resources, if not present.
         */
        appendLoad: function (paths) {
            var d = deferredAdder();
            var rs = this;
            resolvePathsAndAddMissingResources(paths, function (err, matches) {
                if (err) { return d.resolver.reject(err); }
                rs.loadPath.append(matches);
                d.resolver.resolve(rs.loadPath);
            });
            return d.promise;
        },

        /**
         * High-level interface to adding paths to the load path. Also adds
         * corresponding resources, if not present.
         */
        prependLoad: function (paths) {
            var d = deferredAdder();
            var rs = this;
            resolvePathsAndAddMissingResources(paths, function (err, matches) {
                if (err) { return d.resolver.reject(err); }
                rs.loadPath.prepend(matches);
                d.resolver.resolve(rs.loadPath);
            });
            return d.promise;
        },

        /**
         * Recursively call whenAllAdded until new promises stops popping up
         */
        then: function (cb, eb) {
            var rs = this, next;
            next = function (promiseCount) {
                if (promiseCount < promises.length) {
                    var callback = B.partial(next, promises.length);
                    whenAllAdded(callback, callback);
                } else {
                    whenAllAdded(B.partial(cb, rs), eb);
                }
            };
            next(0);
        }
    };

    // Mix in enumerators from Array.prototype
    ["forEach", "map", "reduce", "filter"].forEach(function (method) {
        resourceSet[method] = Array.prototype[method];
    });

    resourceSet.loadPath = loadPath.create(resourceSet);
    return resourceSet;
};

function setCount(resource, properties) {
    return properties.reduce(function (count, property) {
        return count + (resource[property] ? 1 : 0);
    }, 0);
}

/**
 * Validates properties on a resource.
 */
exports.validate = function (resource) {
    if (!resource) {
        return invalid("Resource must be a string, a resource " +
                       "object or an object of resource properties");
    }
    if (bResource.isResource(resource)) { return; }
    var count = setCount(resource, ["backend", "file", "combine", "content"]);
    if (count > 1) {
        return invalid("Resource can only have one of content, " +
                       "file, backend, combine");
    }
    if (!resource.path) {
        return invalid("Resource must have path " + JSON.stringify(resource));
    }
    if (!resource.combine && !resource.file) {
        return bResource.validate(resource);
    }
};

/**
 * De-serializes data structures created by serialize(). Returns a
 * promise.
 */
exports.deserialize = function (data) {
    var d = when.defer();
    var rs = exports.create();
    data = data || {};
    var resources = data.resources || [];
    when.all(resources.map(B.bind(rs, "addResource"))).then(function () {
        rs.loadPath.append(data.loadPath || []);
        d.resolver.resolve(rs);
    }, d.reject);
    return d.promise;
};
