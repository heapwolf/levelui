var resourceSet = require("./resource-set");
var bind = require("buster-core").bind;
var partial = require("buster-core").partial;
var when = require("when");
var HOUR = 60 * 60 * 1000;

function etagged(resource) {
    return !!resource.etag;
}

function hasContent(r) {
    return !!r.content;
}

function lacksContent(r) {
    return !r.content;
}

function resolveContent(resource) {
    var d = when.defer();
    try {
        resource.content().then(function (content) {
            d.resolver.resolve({ resource: resource, content: content });
        }, function (err) {
            d.resolver.resolve();
        });
    } catch (e) {
        d.resolver.resolve();
    }
    return d.promise;
}

/**
 * Manage resource sets and cross-set caches. The cache will keep a reference
 * to any resource that has an etag property. When inflating resource sets,
 * the cache will find resources whose content is empty, look up their etag
 * in the cache, and use the cached content if available.
 *
 * The cache can store multiple versions of a resource at the same path. It
 * does so by keeping etag/content pairs cached.
 *
 * @ttl Time to live for cached resources
 */
exports.create = function (options) {
    var ttl = options && options.ttl;
    var maxSize = options && options.maxSize;
    var resources = [], currentFreeze, cacheRepo;

    function size() {
        return resources.reduce(function (sum, r) {
            return sum + r.size;
        }, 0);
    }

    function purge(resource) {
        resources = resources.filter(function (r) {
            r = r.resource;
            return r.path !== resource.path || r.etag !== resource.etag;
        });
    }

    function limitCacheSize() {
        if (!maxSize || Date.now() < currentFreeze) { return; }
        while (size() > maxSize) {
            purge(resources[0].resource);
        }
    }

    function gc() {
        var n = Date.now();
        resources.filter(function (r) {
            return r.killAt <= n;
        }).forEach(function (c) { purge(c.resource); });
        if (n >= currentFreeze) { currentFreeze = null; }
        limitCacheSize();
    }

    function exists(r) {
        return function (cached) {
            return cached.resource.path === r.resource.path &&
                cached.resource.etag === r.resource.etag;
        };
    }

    function cache(r) {
        if (!r.content || !r.resource.cacheable || resources.some(exists(r))) {
            return;
        }

        var cached = {
            resource: r.resource,
            size: r.content.length + JSON.stringify(r.resource.headers()).length
        };
        if (cacheRepo.ttl >= 0) {
            cached.killAt = Date.now() + cacheRepo.ttl;
            setTimeout(gc, cacheRepo.ttl);
        }
        resources.push(cached);
        limitCacheSize();
    }

    function lookup(r) {
        var resource = r.resource;
        return resources.map(function (r) {
            return r.resource;
        }).filter(function (res) {
            return res.path === resource.path && res.etag === resource.etag;
        })[0] || resource;
    }

    cacheRepo = {
        ttl: ttl || HOUR,

        inflate: function (resourceSet) {
            var d = when.defer();
            var replace = bind(resourceSet, "addResource");
            when.all(
                resourceSet.filter(etagged).map(resolveContent),
                function (resources) {
                    resources = resources.filter(function (o) { return !!o; });
                    resources.filter(hasContent).forEach(cache);
                    resources.filter(lacksContent).map(lookup).forEach(replace);
                    d.resolver.resolve(resourceSet);
                }
            );
            return d.promise;
        },

        freeze: function (ttl) {
            currentFreeze = Date.now() + ttl;
            resources.forEach(function (r) {
                r.killAt = Math.max(r.killAt, currentFreeze);
            });
            setTimeout(gc, ttl);
        },

        resourceVersions: function () {
            var result = {};
            resources.forEach(function (cached) {
                var res = cached.resource;
                if (!result[res.path]) { result[res.path] = []; }
                result[res.path].push(res.etag);
            });
            return result;
        },

        size: size,

        maxSize: function (size) {
            maxSize = size;
        },

        purgeAll: function () {
            if (currentFreeze) {
                return setTimeout(bind(this, "purgeAll"),
                                  currentFreeze - Date.now());
            }
            resources = [];
        }
    };

    return cacheRepo;
};
