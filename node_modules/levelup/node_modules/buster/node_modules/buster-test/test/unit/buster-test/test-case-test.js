if (typeof module === "object" && typeof require === "function") {
    var sinon = require("sinon");

    var buster = {
        assertions: require("buster-assertions"),
        testCase: require("../../../lib/buster-test/test-case"),
        testContext: require("../../../lib/buster-test/test-context")
    };

    buster.util = require("buster-util");
}

var assert = buster.assertions.assert;
var refute = buster.assertions.refute;

buster.util.testCase("BusterTestCaseTest", {
    tearDown: function () {
        delete buster.testCase.listeners;
    },

    "should throw without name": function () {
        assert.exception(function () {
            var testCase = buster.testCase();
        });
    },

    "should throw if name is not a string": function () {
        assert.exception(function () {
            var testCase = buster.testCase({});
        });
    },

    "should throw if name is empty": function () {
        assert.exception(function () {
            var testCase = buster.testCase("");
        });
    },

    "should throw without tests": function () {
        assert.exception(function () {
            var testCase = buster.testCase("Some test");
        });
    },

    "should throw if tests is not an object": function () {
        assert.exception(function () {
            var testCase = buster.testCase("Some test", 42);
        });
    },

    "should throw if tests is null": function () {
        assert.exception(function () {
            var testCase = buster.testCase("Some test", null);
        });
    },

    "should return context object": function () {
        var setUp = function () {};
        var test = function () {};

        var testCase = buster.testCase("Some test", {
            setUp: setUp,
            testSomething: test
        });

        assert.isObject(testCase);
        assert.equals(testCase.name, "Some test");
        assert.equals(testCase.tests.length, 1);
        assert.equals(testCase.tests[0].name, "testSomething");
        assert.equals(testCase.tests[0].func, test);
        assert.equals(testCase.setUp, setUp);
    },

    "should call create callback when a test case is created": function () {
        var spy = sinon.spy();
        buster.testContext.on("create", spy);

        var testCase = buster.testCase("Some test", {});

        assert(spy.calledOnce);
        assert.equals(spy.args[0][0], testCase);
    }
});

buster.util.testCase("TestCaseContextTest", {
    "should have name property": function () {
        var context = buster.testCase("Name", {});

        assert.equals(context.name, "Name");
    }
});

buster.util.testCase("TestContextTestsTest", {
    "should get tests": function () {
        var test = function () {};
        var context = buster.testCase("Name", {
            "test 1": test
        });

        assert.equals(context.tests.length, 1);
        assert.equals(context.tests[0].name, "test 1");
        assert.equals(context.tests[0].func, test);
    },

    "should exclude setUp": function () {
        var context = buster.testCase("Name", {
            setUp: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude tearDown": function () {
        var context = buster.testCase("Name", {
            tearDown: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude prepare": function () {
        var context = buster.testCase("Name", {
            prepare: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude conclude": function () {
        var context = buster.testCase("Name", {
            conclude: function () {}
        });

        assert.equals(context.tests.length, 0);
    },

    "should exclude non-function property": function () {
        var context = buster.testCase("Name", {
            id: 42
        });

        assert.equals(context.tests.length, 0);
    },

    "should keep reference to parent context": function () {
        var context = buster.testCase("Name", {
            testIt: function () {}
        });

        assert.equals(context.tests[0].context, context);
    }
});

buster.util.testCase("TestContextContextsTest", {
    "should get contexts as list of context objects": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts;

        assert.equals(contexts.length, 1);
        assert.equals(contexts[0].name, "doingIt");
    },

    "should get contexts with context as parent": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: {}
        });

        var contexts = context.contexts;

        assert.equals(contexts[0].parent, context);
    },

    "should not include null properties": function () {
        var context = buster.testCase("Name", {
            test: function () {},
            doingIt: null
        });

        var contexts = context.contexts;

        assert.equals(contexts.length, 0);
    },

    "should get tests from nested context": function () {
        var context = buster.testCase("Name", {
            someContext: { test: function () {} }
        });

        var tests = context.contexts[0].tests;

        assert.equals(tests.length, 1);
        assert.equals(tests[0].name, "test");
    },

    "should give contexts unique test case objects": function () {
        var context = buster.testCase("Name", {
            someContext: { test: function () {} }
        });

        var contexts = context.contexts;

        refute.same(contexts[0].testCase, context.testCase);
    },

    "context test case object has name function": function () {
        var context = buster.testCase("Name", {});

        assert.isFunction(context.testCase.name);
        assert.equals(context.testCase.name("contextSetUp"), "prepare");
    }
});

buster.util.testCase("TestContextSetUpTearDownTest", {
    "should keep reference to setUp method": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            setUp: setUp,
            test: function () {}
        });

        assert.equals(context.setUp, setUp);
    },

    "should keep reference to tearDown method": function () {
        var tearDown = function () {};

        var context = buster.testCase("Name", {
            tearDown: tearDown,
            test: function () {}
        });

        assert.equals(context.tearDown, tearDown);
    },

    "should keep reference to prepare method": function () {
        var prepare = function () {};

        var context = buster.testCase("Name", {
            prepare: prepare,
            test: function () {}
        });

        assert.equals(context.contextSetUp, prepare);
    },

    "should keep reference to conclude method": function () {
        var conclude = function () {};

        var context = buster.testCase("Name", {
            conclude: conclude,
            test: function () {}
        });

        assert.equals(context.contextTearDown, conclude);
    }
});

buster.util.testCase("TestContextRequiresSupportTest", {
    "should keep reference to requiresSupportForAll": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAll: { featureA: true },
            test: function () {}
        });

        assert.equals(context.requiresSupportForAll, { featureA: true });
    },

    "should not use requiresSupportForAll as context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAll: { featureA: true },
            test: function () {}
        });

        assert.equals(context.contexts.length, 0);
    },

    "should alias requiresSupportFor as requiresSupportForAll": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportFor: { featureA: true },
            test: function () {}
        });

        assert.equals(context.requiresSupportForAll, { featureA: true });
    },

    "should not use requiresSupportFor as context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportFor: { featureA: true },
            test: function () {}
        });

        assert.equals(context.contexts.length, 0);
    },

    "should keep reference to requiresSupportForAny": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAny: { featureA: true },
            test: function () {}
        });

        assert.equals(context.requiresSupportForAny, { featureA: true });
    },

    "should not use requiresSupportForAny as context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            requiresSupportForAny: { featureA: true },
            test: function () {}
        });

        assert.equals(context.contexts.length, 0);
    },

    "should set requiresSupportForAll on nested context": function () {
        var setUp = function () {};

        var context = buster.testCase("Name", {
            someContext: {
                requiresSupportForAny: { featureA: true},
                test: function () {}
            }
        });

        assert.equals(context.contexts[0].requiresSupportForAny, { featureA: true });
        assert.equals(context.contexts[0].contexts.length, 0);
    }
});

buster.util.testCase("TestContextTestDeferredTest", {
    "should set deferred flag when name starts with //": function () {
        var context = buster.testCase("Name", {
            "//test": function () {}
        });

        assert(context.tests[0].deferred);
    },

    "should set deferred flag when test is a string": function () {
        var context = buster.testCase("Name", {
            "test": "Later, peeps"
        });

        assert(context.tests[0].deferred);
    },

    "should use deferred test string as comment": function () {
        var context = buster.testCase("Name", {
            "test": "Later, peeps"
        });

        assert.equals(context.tests[0].comment, "Later, peeps");
    },

    "should set deferred flag when // is the first non-white-space characters in name": function () {
        var context = buster.testCase("Name", {
            "   // test": function () {}
        });

        assert(context.tests[0].deferred);
    },

    "should clean cruft from name": function () {
        var context = buster.testCase("Name", {
            "   // test": function () {}
        });

        assert.equals(context.tests[0].name, "test");
    },

    "should defer entire context": function () {
        var context = buster.testCase("Name", {
            "// up next": {
                "cool feature A": function () {},
                "cool feature B": function () {},
                "cool feature C": function () {}
            }
        });

        var context = context.contexts[0];
        assert.equals(context.name, "up next");
        assert(context.tests[0].deferred);
        assert(context.tests[1].deferred);
        assert(context.tests[2].deferred);
    }
});

buster.util.testCase("AsyncTestContextTest", {
    "should make context promise": function () {
        var testCase = buster.testCase("Some test", function () {});

        assert.equals(typeof testCase.then, "function");
        refute.defined(testCase.name);
        refute.defined(testCase.tests);
        refute.defined(testCase.setUp);
        refute.defined(testCase.tearDown);
    },

    "should call async context with run argument": function () {
        var spy = sinon.spy();
        var testCase = buster.testCase("Some test", spy);

        assert(spy.calledOnce);
        assert.isFunction(spy.args[0][0]);
    },

    "calling run should resolve promise": function (test) {
        var spy = sinon.spy();

        buster.testCase("Some test", spy).then(test.end);

        spy.args[0][0]({});
    },

    "should resolve promise with test context data": function (test) {
        var setUp = function () {};
        var testFn = function () {};

        var testCase = buster.testCase("Some test", function (run) {
            run({
                setUp: setUp,
                testSomething: testFn
            });
        });

        testCase.then(function (ctx) {
            assert.isObject(ctx);
            assert.equals(ctx.name, "Some test");
            assert.equals(ctx.tests.length, 1);
            assert.equals(ctx.tests[0].name, "testSomething");
            assert.equals(ctx.tests[0].func, testFn);
            assert.equals(ctx.setUp, setUp);
            test.end();
        });
    },

    "passes deferred context promise to create event": function () {
        var context;
        buster.testContext.on("create", function (ctx) { context = ctx; });

        var promise = buster.testCase("Some spec", function (run) {
            run({ "Does stuff": function () {} });
        });

        assert.same(context, promise);
    },

    "does not pass resolved context to create event when deferred resolves": function () {
        var listener = sinon.spy();
        buster.testContext.on("create", listener);

        var promise = buster.testCase("Some spec", function (run) {
            run({ "Does stuff": function () {} });
        });

        assert(listener.calledOnce,
               listener.printf("Expected once, but was called %c"));
    }
});

buster.util.testCase("FocusedTestTest", {
    "should not be focused by default": function () {
        var testCase = buster.testCase("Some test", {
            "focus here": function () {}
        });

        refute(testCase.tests[0].focused);
    },

    "should mark test as focused when starting with =>": function () {
        var testCase = buster.testCase("Some test", {
            "=> focus here": function () {}
        });

        assert(testCase.focused);
    },

    "should mark test's containing context as focused": function () {
        var testCase = buster.testCase("Some test", {
            "=> focus here": function () {}
        });

        assert(testCase.tests[0].focused);
    },

    "should mark all test's containing contexts as focused": function () {
        var testCase = buster.testCase("Some test", {
            "nested": {
                "=> focus here": function () {}
            }
        });

        assert(testCase.focused);
        assert(testCase.contexts[0].focused);
        assert(testCase.contexts[0].tests[0].focused);
    },

    "should not mark all test's sibling tests as focused": function () {
        var testCase = buster.testCase("Some test", {
            "nested": {
                "=> focus here": function () {},
                "not here": function () {}
            }
        });

        assert.equals(testCase.contexts[0].tests[1].name, "not here");
        refute(testCase.contexts[0].tests[1].focused);
    },

    "should mark all tests in context as focused": function () {
        var testCase = buster.testCase("Some test", {
            "=> nested": {
                "focus here": function () {},
                "not here": function () {}
            }
        });

        assert(testCase.contexts[0].tests[0].focused);
        assert(testCase.contexts[0].tests[1].focused);
    },

    "should mark all nested tests in context as focused": function () {
        var testCase = buster.testCase("Some test", {
            "=> nested": {
                "focus here": function () {},
                "and here": function () {},
                "more nesting": {
                    "focus here": function () {}
                }
            }
        });

        assert(testCase.contexts[0].contexts[0].tests[0].focused);
    },

    "should mark all tests in test case as focused": function () {
        var testCase = buster.testCase("=> Some test", {
            "nested": {
                "focus here": function () {},
                "not here": function () {}
            }
        });

        assert(testCase.contexts[0].tests[0].focused);
        assert(testCase.contexts[0].tests[1].focused);
    },

    "should not mark nested tests focused when one test is focused": function () {
        var testCase = buster.testCase("Some test", {
            "nested": {
                "=> focus here": function () {},
                "not here": function () {},
                "more nesting": {
                    "not here please": function () {}
                }
            }
        });

        refute(testCase.contexts[0].contexts[0].tests[0].focused);
    },

    "should strip rocket from context name": function () {
        var testCase = buster.testCase("Some test", {
            "=> nested": {
                "focus here": function () {},
                "and here": function () {}
            }
        });

        assert.equals(testCase.contexts[0].name, "nested");
    },

    "should strip rocket from focused test name": function () {
        var testCase = buster.testCase("Some test", {
            "=> focus here": function () {}
        });

        assert.equals(testCase.tests[0].name, "focus here");
    },

    "should strip rocket and surrounding white-space from name": function () {
        var testCase = buster.testCase("Some test", {
            "   =>  focus here": function () {}
        });

        assert.equals(testCase.tests[0].name, "focus here");
    }
});
