(function (B, when) {
    var testContext = B && B.testContext;

    if (typeof require == "function" && typeof module == "object") {
        B = require("buster-core");
        when = require("when");
        testContext = require("./test-context");
    }

    var current = [];
    var bspec = {};
    var bddNames = { contextSetUp: "beforeAll", contextTearDown: "afterAll" };

    function supportRequirement(property) {
        return function (requirements) {
            return {
                describe: function () {
                    var context = bspec.describe.apply(bspec, arguments);
                    context[property] = requirements;
                    return context;
                }
            };
        };
    }

    bspec.ifAllSupported = supportRequirement("requiresSupportForAll");
    bspec.ifAnySupported = supportRequirement("requiresSupportForAny");
    bspec.ifSupported = bspec.ifAllSupported;

    function addContext(parent, name, spec) {
        var context = bspec.describe.context.create(name, spec, parent).parse();
        parent.contexts.push(context);
        return context;
    }

    function createContext(name, spec) {
        return bspec.describe.context.create(name, spec).parse();
    }

    function asyncContext(name, callback) {
        var d = when.defer();
        callback(function (spec) {
            d.resolver.resolve(createContext(name, spec));
        });
        d.promise.name = "deferred " + name;
        testContext.emit("create", d.promise);
        return d.promise;
    }

    var FOCUS_ROCKET = /^\s*=>\s*/;

    function markFocused(block, parent) {
        var focused = block.focused || (parent && parent.forceFocus);
        block.focused = focused || FOCUS_ROCKET.test(block.name);
        block.name = block.name.replace(FOCUS_ROCKET, "");
        while (parent) {
            parent.focused = parent.focused || block.focused;
            parent = parent.parent;
        }
    }

    bspec.describe = function (name, spec) {
        if (current.length > 0) {
            return addContext(current[current.length - 1], name, spec);
        }
        if (spec && spec.length > 0) {
            return asyncContext(name, spec);
        }
        var context = createContext(name, spec);
        testContext.emit("create", context);
        return context;
    };

    B.extend(bspec.describe, B.eventEmitter);

    function markDeferred(spec, func) {
        spec.deferred = typeof func != "function";

        if (!spec.deferred && /^\/\//.test(spec.name)) {
            spec.deferred = true;
            spec.name = spec.name.replace(/^\/\/\s*/, "");
        }

        spec.comment = spec.deferred ? func : "";
    }

    bspec.it = function (name, func) {
        var context = current[current.length - 1];

        var spec = {
            name: name,
            func: arguments.length == 3 ? arguments[2] : func,
            context: context
        };

        markDeferred(spec, func);
        markFocused(spec, context);
        context.tests.push(spec);
        return spec;
    };

    bspec.itEventually = function (name, comment, func) {
        if (typeof comment == "function") {
            func = comment;
            comment = "";
        }

        return bspec.it(name, comment, func);
    };

    bspec.before = bspec.beforeEach = function (func) {
        var context = current[current.length - 1];
        context.setUp = func;
    };

    bspec.after = bspec.afterEach = function (func) {
        var context = current[current.length - 1];
        context.tearDown = func;
    };

    bspec.beforeAll = function (func) {
        var context = current[current.length - 1];
        context.contextSetUp = func;
    };

    bspec.afterAll = function (func) {
        var context = current[current.length - 1];
        context.contextTearDown = func;
    };

    bspec.describe.context = {
        create: function (name, spec, parent) {
            if (!name || typeof name != "string") {
                throw new Error("Spec name required");
            }

            if (!spec || typeof spec != "function") {
                throw new Error("spec should be a function");
            }

            var context = B.create(this);
            context.name = name;
            context.parent = parent;
            context.spec = spec;
            markFocused(context, parent);
            context.forceFocus = context.focused;

            return context;
        },

        parse: function () {
            if (!this.spec) {
                return this;
            }

            this.testCase = {
                before: bspec.before,
                beforeEach: bspec.beforeEach,
                beforeAll: bspec.beforeAll,
                after: bspec.after,
                afterEach: bspec.afterEach,
                afterAll: bspec.afterAll,
                it: bspec.it,
                itEventually: bspec.itEventually,
                describe: bspec.describe,
                name: function (thing) { return bddNames[thing] || thing; }
            };

            this.tests = [];
            current.push(this);
            this.contexts = [];
            this.spec.call(this.testCase);
            current.pop();
            delete this.spec;

            return this;
        }
    };

    var g = typeof global != "undefined" && global || this;

    bspec.expose = function (env) {
        env = env || g;
        env.describe = bspec.describe;
        env.it = bspec.it;
        env.itEventually = bspec.itEventually;
        env.beforeAll = bspec.beforeAll;
        env.before = bspec.before;
        env.beforeEach = bspec.beforeEach;
        env.afterAll = bspec.afterAll;
        env.after = bspec.after;
        env.afterEach = bspec.afterEach;
    };

    if (typeof module == "object") {
        module.exports = bspec;
    } else {
        B.spec = bspec;
    }
}(typeof buster !== "undefined" ? buster : {},
  typeof when === "function" ? when : function () {}));
