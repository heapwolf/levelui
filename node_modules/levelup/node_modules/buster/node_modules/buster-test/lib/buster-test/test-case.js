(function (B, when) {
    var testContext = B && B.testContext;

    if (typeof require == "function" && typeof module == "object") {
        B = require("buster-core");
        when = require("when");
        testContext = require("./test-context");
    }

    var xUnitNames = { contextSetUp: "prepare", contextTearDown: "conclude" };

    var testCase = function (name, tests) {
        if (!name || typeof name != "string") {
            throw new Error("Test case name required");
        }

        if (!tests || (typeof tests != "object" && typeof tests != "function")) {
            throw new Error("Tests should be an object or a function");
        }

        var context = testCase.context.create(name, tests);
        var d = when.defer();
        when(context).then(function (ctx) { d.resolver.resolve(ctx.parse()); });
        var promise = context.then ? d.promise : context;
        B.testContext.emit("create", promise);
        return promise;
    };

    if (typeof module != "undefined") {
        module.exports = testCase;
    } else {
        B.testCase = testCase;
    }

    B.extend(testCase, B.eventEmitter);

    function nonTestNames(context) {
        return {
            prepare: true,
            conclude: true,
            setUp: true,
            tearDown: true,
            requiresSupportFor: true,
            requiresSupportForAll: true
        };
    }

    var DEFERRED_PREFIX = /^\s*\/\/\s*/;
    var FOCUSED_PREFIX = /^\s*=>\s*/;

    function createContext(context, name, tests, parent) {
        return B.extend(context, {
            name: name,
            content: tests,
            parent: parent,
            testCase: {
                name: function (thing) { return xUnitNames[thing] || thing; }
            }
        });
    }

    function asyncContext(context, name, callback, parent) {
        var d = when.defer();
        callback(function (tests) {
            d.resolver.resolve(createContext(context, name, tests, parent));
        });
        return d.promise;
    }

    testCase.context = {
        create: function (name, tests, parent) {
            var context = B.create(this);
            if (typeof tests == "function") {
                return asyncContext(context, name, tests, parent);
            }
            return createContext(context, name, tests, parent);
        },

        parse: function (forceFocus) {
            this.getSupportRequirements();
            this.deferred = DEFERRED_PREFIX.test(this.name);
            this.focused = forceFocus || FOCUSED_PREFIX.test(this.name);
            this.name = this.name.replace(DEFERRED_PREFIX, "").replace(FOCUSED_PREFIX, "");
            this.tests = this.getTests(this.focused);
            this.contexts = this.getContexts(this.focused);
            this.focused = this.focused || this.contexts.focused || this.tests.focused;
            delete this.tests.focused;
            delete this.contexts.focused;
            this.contextSetUp = this.getContextSetUp();
            this.contextTearDown = this.getContextTearDown();
            this.setUp = this.getSetUp();
            this.tearDown = this.getTearDown();
            return this;
        },

        getSupportRequirements: function () {
            this.requiresSupportForAll = this.content.requiresSupportForAll || this.content.requiresSupportFor;
            delete this.content.requiresSupportForAll;
            delete this.content.requiresSupportFor;
            this.requiresSupportForAny = this.content.requiresSupportForAny;
            delete this.content.requiresSupportForAny;
        },

        getTests: function (focused) {
            var tests = [], isFunc;

            for (var prop in this.content) {
                isFunc = typeof this.content[prop] == "function";
                if (this.isTest(prop)) {
                    var testFocused = focused || FOCUSED_PREFIX.test(prop);
                    tests.focused = tests.focused || testFocused;
                    tests.push({
                        name: prop.replace(DEFERRED_PREFIX, "").replace(FOCUSED_PREFIX, ""),
                        func: this.content[prop],
                        context: this,
                        deferred: this.deferred || DEFERRED_PREFIX.test(prop) || !isFunc,
                        focused: testFocused,
                        comment: !isFunc ? this.content[prop] : ""
                    });
                }
            }

            return tests;
        },

        getContexts: function (focused) {
            var contexts = [], ctx;
            contexts.focused = focused;

            for (var prop in this.content) {
                if (!this.isContext(prop)) { continue; }
                ctx = testCase.context.create(prop, this.content[prop], this);
                ctx = ctx.parse(focused);
                contexts.focused = contexts.focused || ctx.focused;
                contexts.push(ctx);
            }

            return contexts;
        },

        getContextSetUp: function () {
            return this.content.prepare;
        },

        getContextTearDown: function () {
            return this.content.conclude;
        },

        getSetUp: function () {
            return this.content.setUp;
        },

        getTearDown: function () {
            return this.content.tearDown;
        },

        isTest: function (prop) {
            var type = typeof this.content[prop];
            return this.content.hasOwnProperty(prop) &&
                (type == "function" || type == "string") &&
                !nonTestNames(this)[prop];
        },

        isContext: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "object" &&
                !!this.content[prop];
        }
    };
}(typeof buster !== "undefined" ? buster : {},
  typeof when === "function" ? when : function () {}));
