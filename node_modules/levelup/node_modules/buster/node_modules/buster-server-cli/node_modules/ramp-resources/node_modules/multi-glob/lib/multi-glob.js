var glob = require("glob");
var async = require("async");
var _ = require("lodash");

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
        callback(err, _.uniq(_.flatten(_.toArray(matches))));
    };
}

module.exports = {
    glob: function (patterns, options, cb) {
        if (typeof options === "function") {
            cb = options;
            options = null;
        }
        async.parallel(resolveGlobs(patterns, options), processSingle(cb));
    }
};
