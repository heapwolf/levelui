(function (B, sinon) {
    var assert, refute, bspec, testCase;

    if (typeof require == "function" && typeof module == "object") {
        sinon = require("sinon");
        testCase = require("buster-util").testCase;
        assert = require("buster-assertions").assert;
        refute = require("buster-assertions").refute;
        bspec = require("../../../lib/buster-test/spec");
    } else {
        testCase = buster.util.testCase;
        assert = buster.assertions.assert;
        refute = buster.assertions.refute;
        bspec = buster.spec;
    }

    testCase("SpecTest", {
        "throws without name": function () {
            assert.exception(function () {
                var spec = bspec.describe();
            });
        },

        "throws if name is not a string": function () {
            assert.exception(function () {
                var spec = bspec.describe({});
            });
        },

        "throws if name is empty": function () {
            assert.exception(function () {
                var spec = bspec.describe("");
            });
        },

        "throws without spec": function () {
            assert.exception(function () {
                var spec = bspec.describe("Some test");
            });
        },

        "throws if specs is not a function": function () {
            assert.exception(function () {
                var spec = bspec.describe("Some test", {});
            });
        },

        "returns context object": function () {
            var spec = bspec.describe("Some test", function () {});

            assert.isObject(spec);
            assert.equals("Some test", spec.name);
            assert.equals(0, spec.tests.length);
            assert(!spec.setUp);
        },

        "calls create callback when a spec is created": function () {
            var listener = sinon.spy();
            buster.testContext.on("create", listener);

            var spec = bspec.describe("Some test", function () {});

            assert(listener.calledOnce);
            assert.equals(listener.args[0][0], spec);
        }
    });

    testCase("SpecCallbackTest", {
        "adds test function by calling it": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.it("does it", test);
            });

            assert.equals(1, spec.tests.length);
            assert.equals("does it", spec.tests[0].name);
            assert.equals(test, spec.tests[0].func);
        },

        "adds test function by calling this.it": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                this.it("does it", test);
            });

            assert.equals(1, spec.tests.length);
            assert.equals("does it", spec.tests[0].name);
            assert.equals(test, spec.tests[0].func);
        },

        "converts test without callback to deferred test": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.it("does it");
            });

            assert.equals("does it", spec.tests[0].name);
            assert(spec.tests[0].deferred);
        },

        "converts test without callback but with comment to deferred": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.it("does it", "Cause it's important");
            });

            assert.equals("does it", spec.tests[0].name);
            assert(spec.tests[0].deferred);
            assert.equals(spec.tests[0].comment, "Cause it's important");
        },

        "makes deferred test with itEventually": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.itEventually("does it", function () {});
            });

            assert.equals("does it", spec.tests[0].name);
            assert(spec.tests[0].deferred);
        },

        "makes commented deferred test with itEventually": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.itEventually("does it", "Because it should", function () {});
            });

            assert(spec.tests[0].deferred);
            assert.equals("Because it should", spec.tests[0].comment);
            assert.isFunction(spec.tests[0].func);
        },

        "makes commented deferred test with itEventually with no function": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.itEventually("does it", "Because it should");
            });

            assert(spec.tests[0].deferred);
            assert.equals("Because it should", spec.tests[0].comment);
        },

        "converts this.itEventually test to deferred test": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                this.itEventually("does it", test);
            });

            assert(spec.tests[0].deferred);
        },

        "makes deferred test with commented out example name": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.it("// does it", function () {});
            });

            assert.equals("does it", spec.tests[0].name);
            assert(spec.tests[0].deferred);
        },

        "makes commented deferred test with commented out name": function () {
            var test = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.it("// does it", "Because it should", function () {});
            });

            assert(spec.tests[0].deferred);
            assert.equals("Because it should", spec.tests[0].comment);
            assert.isFunction(spec.tests[0].func);
        },

        "adds setUp function by calling bspec.before": function () {
            var setUp = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.before(setUp);
            });

            assert.equals(setUp, spec.setUp);
        },

        "adds setUp function by calling bspec.beforeEach": function () {
            var setUp = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.beforeEach(setUp);
            });

            assert.equals(setUp, spec.setUp);
        },

        "adds setUp function by calling this.before": function () {
            var setUp = function () {};

            var spec = bspec.describe("Stuff", function () {
                this.before(setUp);
            });

            assert.equals(setUp, spec.setUp);
        },

        "adds setUp function by calling this.beforeEach": function () {
            var setUp = function () {};

            var spec = bspec.describe("Stuff", function () {
                this.beforeEach(setUp);
            });

            assert.equals(setUp, spec.setUp);
        },

        "adds tearDown function by calling bspec.after": function () {
            var tearDown = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.after(tearDown);
            });

            assert.equals(tearDown, spec.tearDown);
        },

        "adds tearDown function by calling bspec.afterEach": function () {
            var tearDown = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.afterEach(tearDown);
            });

            assert.equals(tearDown, spec.tearDown);
        },

        "adds tearDown function by calling this.afterEach": function () {
            var tearDown = function () {};

            var spec = bspec.describe("Stuff", function () {
                this.afterEach(tearDown);
            });

            assert.equals(tearDown, spec.tearDown);
        },

        "adds tearDown function by calling this.after": function () {
            var tearDown = function () {};

            var spec = bspec.describe("Stuff", function () {
                this.after(tearDown);
            });

            assert.equals(tearDown, spec.tearDown);
        },

        "adds contextSetUp function by calling bspec.beforeAll": function () {
            var setUp = function () {};

            var spec = bspec.describe("Stuff", function () {
                bspec.beforeAll(setUp);
            });

            assert.equals(setUp, spec.contextSetUp);
        },

        "adds contextSetUp function by calling this.beforeAll": function () {
            var setUp = function () {};

            var spec = bspec.describe("Stuff", function () {
                this.beforeAll(setUp);
            });

            assert.equals(setUp, spec.contextSetUp);
        }
    });

    testCase("SpecContextTestsTest", {
        "extracts only test functions": function () {
            var funcs = [function () {}, function () {}, function () {}];

            var spec = bspec.describe("Spec", function () {
                bspec.before(function () {});
                bspec.beforeEach(function () {});
                bspec.after(function () {});
                bspec.afterEach(function () {});

                bspec.it("test1", funcs[0]);
                bspec.it("test2", funcs[1]);
                bspec.it("test3", funcs[2]);
            });

            var tests = spec.tests;

            assert.equals(3, tests.length);
            assert.equals("test1", tests[0].name);
            assert.equals(funcs[0], tests[0].func);
            assert.equals("test2", tests[1].name);
            assert.equals(funcs[1], tests[1].func);
        },

        "keeps reference to parent context": function () {
            var spec = bspec.describe("Spec", function () {
                bspec.it("test1", function () {});
            });

            var tests = spec.tests;

            assert.equals(spec, tests[0].context);
        }
    });

    testCase("SpecContextContextsTest", {
        "gets contexts as list of context objects": function () {
            var spec = bspec.describe("Spec", function () {
                bspec.describe("Some context", function () {});
            });

            assert.equals(1, spec.contexts.length);
            assert.equals("Some context", spec.contexts[0].name);
        },

        "gets contexts with current context as parent": function () {
            var spec = bspec.describe("Name", function () {
                bspec.describe("doingIt", function () {});
            });

            var contexts = spec.contexts;

            assert.equals(spec, contexts[0].parent);
        },

        "fails for non-function contexts": function () {
            var spec = bspec.describe("Name", function () {
                assert.exception(function () {
                    bspec.describe("doingIt", {});
                });
            });

            spec.parse();
        },

        "gets tests from nested context": function () {
            var spec = bspec.describe("Name", function () {
                bspec.describe("someContext", function () {
                    bspec.it("does it", function () {});
                });
            });

            var tests = spec.contexts[0].tests;
            assert.equals(1, tests.length);
            assert.equals("does it", tests[0].name);
        },

        "gives contexts different testCase instances": function () {
            var spec = bspec.describe("Name", function () {
                bspec.describe("someContext", function () {});
            });

            refute.same(spec.testCase, spec.contexts[0].testCase);
        },

        "context testCase has name function": function () {
            var spec = bspec.describe("Name", function () {});

            assert.isFunction(spec.testCase.name);
            assert.equals(spec.testCase.name("contextSetUp"), "beforeAll");
        }
    });

    testCase("SpecExposeTest", {
        setUp: function () {
            this.env = {};
            bspec.expose(this.env);
        },

        "calls exposed describe, it, itEventually, before, beforeEach, beforeAll, after, afterEach and afterAll": function () {
            var env = this.env;
            var test = function () {};
            var before = function () {};
            var beforeEach = function () {};
            var beforeAll = function () {};
            var after = function () {};
            var afterEach = function () {};
            var afterAll = function () {};
            var eventually = function () {};

            var spec = env.describe("Stuff", function () {
                env.beforeAll(beforeAll);
                env.before(before);
                env.afterAll(afterAll);
                env.after(after);
                env.it("does it", test);
                env.itEventually("sometime", eventually);
            });

            // Cannot test these in the same context as before() and after()
            var beforeAfterEachSpec = env.describe("More Stuff", function() {
                env.beforeEach(beforeEach);
                env.afterEach(afterEach);
            });

            assert.equals(2, spec.tests.length);
            assert.equals("does it", spec.tests[0].name);
            assert.equals(test, spec.tests[0].func);
            assert.equals("sometime", spec.tests[1].name);
            assert.equals(beforeAll, spec.contextSetUp);
            assert.equals(before, spec.setUp);
            assert.equals(afterAll, spec.contextTearDown);
            assert.equals(after, spec.tearDown);
            assert.equals(beforeEach, beforeAfterEachSpec.setUp);
            assert.equals(afterEach, beforeAfterEachSpec.tearDown);
        },

        "parses nested spec properly": function () {
            var env = this.env;

            var spec = env.describe("Sample spec", function () {
                env.it("pass simple assertion", function () {});
                env.it("fail when test throws", function () {});
                env.it("fail test", function () {});
                env.describe("nested", function () {
                    env.it("do it", function () {});
                });
            });

            assert.equals(spec.tests.length, 3);
            assert.equals(spec.contexts.length, 1);
            assert.equals(spec.contexts[0].tests.length, 1);
        }
    });

    testCase("SpecRequiresSupportForTest", {
        "sets requiresSupportForAll property": function () {
            var spec = bspec.ifSupported({
                "feature A": true
            }).describe("some cross-platform feature", function () {});

            assert.equals(spec.requiresSupportForAll, { "feature A": true });
        },

        "sets requiresSupportForAll property explicitly": function () {
            var spec = bspec.ifAllSupported({
                "feature A": true
            }).describe("some cross-platform feature", function () {});

            assert.equals(spec.requiresSupportForAll, { "feature A": true });
        },

        "sets requiresSupportForAny property": function () {
            var spec = bspec.ifAnySupported({
                "feature A": true
            }).describe("some cross-platform feature", function () {});

            assert.equals(spec.requiresSupportForAny, { "feature A": true });
        },

        "sets requiresSupportForAny property on nested context": function () {
            var spec = bspec.describe("some cross-platform feature", function () {
                bspec.ifAnySupported({
                    "feature A": true
                }).describe("Something", function () {});
            });

            assert.equals(spec.contexts[0].requiresSupportForAny, {
                "feature A": true
            });
        }
    });

    testCase("AsyncSpecTest", {
        "makes context promise when describe callback expects argument": function () {
            var spec = bspec.describe("Some spec", function (run) {});

            assert.equals(typeof spec.then, "function");
            refute.defined(spec.name);
            refute.defined(spec.tests);
            refute.defined(spec.setUp);
            refute.defined(spec.tearDown);
        },

        "calls async context with run argument": function () {
            var run;
            bspec.describe("Some spec", function (r) { run = r; });

            assert.defined(run);
            assert.isFunction(run);
        },

        "calling run resolves promise": function (test) {
            var run;
            bspec.describe("Some spec", function (r) { run = r; }).then(test.end);
            run(function () {});
        },

        "resolves promise with test context data": function (test) {
            var before = function () {};
            var example = function () {};

            bspec.describe("Some spec", function (run) {
                run(function () {
                    bspec.before(before);
                    bspec.it("Does stuff", example);
                });
            }).then(function (ctx) {
                assert.isObject(ctx);
                assert.equals(ctx.name, "Some spec");
                assert.equals(ctx.tests.length, 1);
                assert.equals(ctx.tests[0].name, "Does stuff");
                assert.equals(ctx.tests[0].func, example);
                assert.equals(ctx.setUp, before);
                test.end();
            });
        },

        "passes deferred context promise to create event": function () {
            var context;
            buster.testContext.on("create", function (ctx) { context = ctx; });

            var promise = bspec.describe("Some spec", function (run) {
                run(function () { bspec.it("Does stuff", function () {}); });
            });

            assert.same(context, promise);
        },

        "does not pass resolved context to create event when deferred resolves": function () {
            var listener = sinon.spy();
            buster.testContext.on("create", listener);

            var promise = bspec.describe("Some spec", function (run) {
                run(function () { bspec.it("Does stuff", function () {}); });
            });

            assert(listener.calledOnce,
                   listener.printf("Expected once, but was called %c"));
        },

        "handles multiple async specs": function (test) {
            var runSpec1, runSpec2;

            var spec1 = bspec.describe("Some spec", function (run) {
                runSpec1 = function () {
                    run(function () {
                        bspec.it("Does stuff", function () {});
                        bspec.describe("Inner examples", function () {
                            bspec.it("Is sure", function () {});
                        });
                    });
                };
            });

            var spec2 = bspec.describe("Some other spec", function (run) {
                runSpec2 = function () {
                    run(function () {
                        bspec.describe("Inner once again", function () {
                            bspec.it("Should not mix the two", function () {});
                            bspec.it("Should behave well", function () {});
                        });
                    });
                };
            });

            runSpec2();
            runSpec1();

            spec1.then(function (ctx) {
                assert.isObject(ctx);
                assert.equals(ctx.name, "Some spec");
                assert.equals(ctx.tests.length, 1);
                assert.equals(ctx.tests[0].name, "Does stuff");
                assert.equals(ctx.contexts.length, 1);
                assert.equals(ctx.contexts[0].name, "Inner examples");
                assert.equals(ctx.contexts[0].tests.length, 1);
                assert.equals(ctx.contexts[0].tests[0].name, "Is sure");
                test.end();
            });
        },

        "does not allow nested async specs": function (test) {
            var innerRun;
            bspec.describe("Some spec", function (run) {
                run(function (r2) {
                    innerRun = r2;
                });
            }).then(function (ctx) {
                refute.defined(innerRun);
                test.end();
            });
        }
    });

    testCase("FocusedSpecTest", {
        "is not focused by default": function () {
            var spec = bspec.describe("Something", function () {
                bspec.it("focus here", function () {});
            });

            refute(spec.tests[0].focused);
        },

        "marks example as focused when name starts with =>": function () {
            var spec = bspec.describe("Something", function () {
                bspec.it("=> focus here", function () {});
            });

            assert(spec.tests[0].focused);
        },

        "marks focused example's containing context as focused": function () {
            var spec = bspec.describe("Something", function () {
                bspec.it("=> focus here", function () {});
            });

            assert(spec.focused);
        },

        "marks all example's parent contexts as focused": function () {
            var spec = bspec.describe("Something", function () {
                bspec.describe("nested", function () {
                    bspec.it("=> focus here", function () {});
                });
            });

            assert(spec.contexts[0].tests[0].focused);
            assert(spec.contexts[0].focused);
            assert(spec.focused);
        },

        "does not mark all test's sibling tests as focused": function () {
            var spec = bspec.describe("Something", function () {
                bspec.describe("nested", function () {
                    bspec.it("=> focus here", function () {});
                    bspec.it("not here", function () {});
                });
            });

            assert.equals(spec.contexts[0].tests[1].name, "not here");
            refute(spec.contexts[0].tests[1].focused);
        },

        "marks all examples in context as focused": function () {
            var spec = bspec.describe("Something", function () {
                bspec.describe("=> nested", function () {
                    bspec.it("focus here", function () {});
                    bspec.it("not here", function () {});
                });
            });

            assert(spec.contexts[0].tests[0].focused);
            assert(spec.contexts[0].tests[1].focused);
        },

        "marks all nested examples in context as focused": function () {
            var spec = bspec.describe("Something", function () {
                bspec.describe("=> nested", function () {
                    bspec.it("focus here", function () {});
                    bspec.it("not here", function () {});
                    bspec.describe("more nesting", function () {
                        bspec.it("focus here", function () {});
                    });
                });
            });

            assert(spec.contexts[0].contexts[0].tests[0].focused);
        },

        "marks all examples in spec as focused": function () {
            var spec = bspec.describe("=>Something", function () {
                bspec.describe("nested", function () {
                    bspec.it("focus here", function () {});
                    bspec.it("not here", function () {});
                });
            });

            assert(spec.contexts[0].tests[0].focused);
            assert(spec.contexts[0].tests[1].focused);
        },

        "does not mark nested examples focused when one is focused": function () {
            var spec = bspec.describe("Something", function () {
                bspec.describe("nested", function () {
                    bspec.it("=> focus here", function () {});
                    bspec.it("not here", function () {});
                    bspec.describe("more nesting", function () {
                        bspec.it("not here please", function () {});
                    });
                });
            });

            refute(spec.contexts[0].contexts[0].tests[0].focused);
        },

        "strips rocket from context name": function () {
            var spec = bspec.describe("Something", function () {
                bspec.describe("=> nested", function () {
                    bspec.it("focus here", function () {});
                    bspec.it("not here", function () {});
                });
            });

            assert.equals(spec.contexts[0].name, "nested");
        },

        "strips rocket from focused example name": function () {
            var spec = bspec.describe("Something", function () {
                bspec.it("=> focus here", function () {});
            });

            assert.equals(spec.tests[0].name, "focus here");
        },

        "strips rocket and surrounding white-space from name": function () {
            var spec = bspec.describe("Something", function () {
                bspec.it("   =>  focus here", function () {});
            });

            assert.equals(spec.tests[0].name, "focus here");
        }
    });
}(this.buster, this.sinon));
