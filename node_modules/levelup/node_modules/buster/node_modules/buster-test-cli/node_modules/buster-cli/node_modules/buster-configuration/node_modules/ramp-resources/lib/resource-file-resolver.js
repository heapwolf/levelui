var B = require("buster-core");
var when = require("when");
var fs = require("fs");
var glob = require("buster-glob").glob;
var Path = require("path");
var fileEtag = require("./file-etag");

function addUnique(arr1, arr2) {
    arr1 = arr1 || [];
    (arr2 || []).forEach(function (item) {
        if (arr1.indexOf(item) < 0) { arr1.push(item); }
    });
    return arr1;
}

function relativePath(rootPath, path) {
    return Path.relative(rootPath, path);
}

function absolutePath(rootPath, path) {
    return Path.resolve(rootPath, path);
}

function outsideRoot(rootPath, path) {
    return path.indexOf(rootPath) < 0;
}

function outsideRootError(rootPath, paths) {
    var offendingPaths = paths.filter(B.partial(outsideRoot, rootPath));
    if (offendingPaths.length === 0) { return; }
    var plural = offendingPaths.length > 1 ? "Some paths are " : "A path is ";
    var offending = offendingPaths.map(B.partial(Path.relative, rootPath));

    return new Error(plural + "outside the project root. Set rootPath to " +
                     "the desired root to refer to paths outside of " +
                     this.rootPath + ".\n  " + offending.join("\n  "));
}

function resolvePaths(rs, paths, callback, options) {
    options = options || {};
    glob(paths, {
        cwd: rs.rootPath,
        strict: options.strict
    }, function (err, files) {
        var ms = files.map(B.partial(absolutePath, rs.rootPath));
        err = err || outsideRootError(rs.rootPath, ms);
        if (err) { return callback.call(rs, err); }
        ms = ms.map(B.partial(relativePath, rs.rootPath));
        ms = addUnique(ms, rs.matchPaths(paths));
        callback.call(rs, err, ms);
    });
}

function fileReader(fileName) {
    return function () {
        var d = when.defer();
        fs.readFile(fileName, this.encoding, function (err, data) {
            if (err) { return d.resolver.reject(err); }
            d.resolver.resolve(data);
        });
        return d.promise;
    };
}

function prepareResource(rootPath, path, resource) {
    var d = when.defer();
    var fileName = absolutePath(rootPath, path);
    resource.content = fileReader(fileName);
    fileEtag.add(fileName, resource, function (err) {
        if (err) { return d.resolver.reject(err); }
        d.resolver.resolve(resource);
    });
    return d.promise;
}

module.exports = {
    resolvePaths: resolvePaths,
    relativePath: relativePath,
    absolutePath: absolutePath,
    prepareResource: prepareResource
};

function existingResources(resourceSet, paths) {
    return paths.filter(function (path) {
        return resourceSet.get(path);
    });
}
