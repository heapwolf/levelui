if (typeof module === "object" && typeof require === "function") {
    var buster = require("buster-core");
    var when = require("when");
}

buster.testContext = (function () {
    var bctx = buster.eventEmitter.create();

    function empty(context) {
        return context.tests.length == 0 &&
            context.contexts.length == 0;
    }

    function filterContexts(contexts, filter, prefix) {
        return reduce(contexts, [], function (filtered, context) {
            var ctx = bctx.filter(context, filter, prefix);
            if (ctx.tests.length > 0 || ctx.contexts.length > 0) {
                filtered.push(ctx);
            }
            return filtered;
        });
    }

    function filterTests(tests, filter, prefix) {
        return reduce(tests, [], function (filtered, test) {
            if (!filter || filter.test(prefix + test.name)) {
                filtered.push(test);
            }
            return filtered;
        });
    }

    function makeFilter(filter) {
        if (typeof filter == "string") return new RegExp(filter, "i");
        if (Object.prototype.toString.call(filter) != "[object Array]") return filter;

        return {
            test: function (string) {
                return filter.length == 0 || buster.some(filter, function (f) {
                    return new RegExp(f).test(string);
                });
            }
        };
    }

    function parse(context) {
        if (!context.tests && typeof context.parse == "function") {
            return context.parse();
        }
        return context;
    }

    function compile(contexts, filter) {
        return reduce(contexts, [], function (compiled, ctx) {
            if (when.isPromise(ctx)) {
                var deferred = when.defer();
                ctx.then(function (context) {
                    deferred.resolve(bctx.filter(parse(context), filter));
                });
                compiled.push(deferred.promise);
            } else {
                ctx = bctx.filter(parse(ctx), filter);
                if (!empty(ctx)) compiled.push(ctx);
            }
            return compiled;
        });
    }

    function filter(context, filter, name) {
        filter = makeFilter(filter);
        name = (name || "") + context.name + " ";

        return buster.extend({}, context, {
            tests: filterTests(context.tests || [], filter, name),
            contexts: filterContexts(context.contexts || [], filter, name)
        });
    }

    function reduce(arr, acc, fn) {
        if (arr.reduce) { return arr.reduce(fn, acc); }
        for (var i = 0, l = arr.length; i < l; ++i) {
            acc = fn.call(null, acc, arr[i], i, arr);
        }
        return acc;
    }

    bctx.compile = compile;
    bctx.filter = filter;
    return bctx;
}());

if (typeof module == "object") {
    module.exports = buster.testContext;
}
