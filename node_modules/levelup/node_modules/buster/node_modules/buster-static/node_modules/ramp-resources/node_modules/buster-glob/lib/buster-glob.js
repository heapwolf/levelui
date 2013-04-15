var B = require("buster-core");
var glob = require("glob");

function uniq(arr) {
    return arr.reduce(function (unique, item) {
        if (unique.indexOf(item) < 0) { unique.push(item); }
        return unique;
    }, []);
}

function array(arr) {
    return Array.isArray(arr) ? arr : [arr];
}

function resolveGlobs(patterns, options) {
    options = options || {};
    return array(patterns).reduce(function (fns, pattern) {
        fns.push(function (done) {
            glob(pattern, options, function (err, matches) {
                if (!err && options.strict && matches.length === 0) {
                    done(new Error("'" + pattern + "' matched no files"));
                } else {
                    done(err, matches);
                }
            });
        });
        return fns;
    }, []);
}

function processSingle(callback) {
    return function (err, matches) {
        callback(err, uniq(B.flatten(matches)));
    };
}

module.exports = {
    glob: function (patterns, options, cb) {
        if (typeof options === "function") {
            cb = options;
            options = null;
        }
        B.parallel(resolveGlobs(patterns, options), processSingle(cb));
    }
};
