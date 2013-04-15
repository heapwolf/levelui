/*jslint maxlen: 100*/
(function (B, sinon, when) {
    var testCase, testRunner, bu, assertions, format;

    if (typeof require === "function" && typeof module === "object") {
        sinon = require("sinon");
        B = require("buster-core");
        when = require("when");
        testCase = require("../../../lib/buster-test/test-case");
        testRunner = require("../../../lib/buster-test/test-runner");
        bu = require("buster-util");
        assertions = require("buster-assertions");
        format = require("buster-format");
    } else {
        testCase = buster.testCase;
        testRunner = buster.testRunner;
        bu = buster.util;
        assertions = buster.assertions;
        format = buster.format;
    }

    var assert = assertions.assert;
    var refute = assertions.refute;
    assertions.format = format.ascii;

    function assertionError(message) {
        var error = new Error(message);
        error.name = "AssertionError";
        return error;
    }

    function spyOnPromise(promise) {
        var promiseResolution = sinon.spy();
        promise.then(promiseResolution);
        return promiseResolution;
    }

    function numericSort(a, b) {
        return a === b ? 0 : (a < b ? -1 : 1);
    }

    function tick(times, fn) {
        function next() {
            if (times === 0) {
                fn();
            } else {
                times -= 1;
                buster.nextTick(next);
            }
        }

        next();
    }

    bu.testCase("TestRunnerCreateTest", {
        "emits newly created object to callback": function () {
            var listener = sinon.spy();
            testRunner.onCreate(listener);
            var runner = testRunner.create();

            assert(listener.calledOnce);
            assert(listener.calledWith(runner));
        },

        "allows many listeners to onCreate callback": function () {
            var listeners = [sinon.spy(), sinon.spy()];
            testRunner.onCreate(listeners[0]);
            testRunner.onCreate(listeners[1]);
            var runner = testRunner.create();

            assert(listeners[0].calledOnce);
            assert(listeners[1].calledOnce);
        }
    });

    bu.testCase("TestRunnerRunContextTest", {
        setUp: function () {
            this.runner = testRunner.create();
            this.mathRandom = Math.random;
            Math.random = function () { return 1; };
        },

        tearDown: function () {
            Math.random = this.mathRandom;
        },

        "returns promise": function () {
            var promise = this.runner.runContext();

            assert.isObject(promise);
            assert(promise.then);
        },

        "rejects without context": function (test) {
            var rejection = sinon.spy();
            this.runner.runContext().then(function () {}, function () {
                test.end();
            });
        },

        "runs single test function": function (test) {
            var testFn = sinon.spy();
            var context = testCase("Test", { test: testFn });

            this.runner.runContext(context).then(test.end(function () {
                assert(testFn.calledOnce);
                assert(context.testCase.isPrototypeOf(testFn.thisValues[0]));
            }));
        },

        "runs test asynchronously": function (test) {
            var testFn = sinon.spy();
            var context = testCase("Test", { test: testFn });
            var runnerResult = this.runner.runContext(context);

            assert(!testFn.called);

            runnerResult.then(test.end(function () {
                assert(testFn.calledOnce);
            }));
        },

        "does not reject if test throws": function (test) {
            var context = testCase("Test", { test: sinon.stub().throws() });

            this.runner.runContext(context).then(test.end, test.end(function () {
                assert(false, "Promise rejected");
            }));
        },

        "calls setUp on same test case object as test": function (test) {
            var setUp = sinon.spy();
            var testFn = sinon.spy();
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(test.end(function () {
                assert(setUp.calledOnce);
                assert.same(testFn.thisValues[0], setUp.thisValues[0]);
            }));
        },

        "calls setUp before test": function (test) {
            var testFn = sinon.spy();
            var setUp = sinon.spy();
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(test.end(function () {
                assert(setUp.calledBefore(testFn));
            }));
        },

        "does not call test until setUp resolves": function (test) {
            var doneCb;
            var testFn = sinon.spy();

            var setUp = function (done) { doneCb = done; };
            var context = testCase("Test", { setUp: setUp, test: testFn });

            var testRun = this.runner.runContext(context).then(test.end(function () {
                assert(testFn.calledOnce);
            }));

            refute(testFn.calledOnce);
            buster.nextTick(function () {
                doneCb();
            });
        },

        "does not call test until setUp promise resolves": function (test) {
            var deferred = when.defer(), resolved = false, testFn = sinon.spy();

            var setUp = sinon.spy(function () {
                assert(!testFn.called);
                return deferred.promise;
            });

            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(test.end(function () {
                assert(resolved);
                assert(testFn.calledOnce);
            }));

            buster.nextTick(function () {
                resolved = true;
                deferred.resolver.resolve();
            });
        },

        "does not reject if setUp fails": function (test) {
            var setUp = sinon.stub().throws();
            var context = testCase("Test", { setUp: setUp, test: sinon.spy() });

            this.runner.runContext(context).then(function () {
                test.end();
            }, function () {
                assert.fail();
            });
        },

        "does not call test if setUp throws": function (test) {
            var testFn = sinon.spy();
            var setUp = sinon.stub().throws();
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(test.end(function () {
                assert(!testFn.called);
            }));
        },

        "does not call test if setUp rejects": function (test) {
            var deferred = when.defer();
            var testFn = sinon.spy();
            var setUp = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { setUp: setUp, test: testFn });

            this.runner.runContext(context).then(test.end(function () {
                assert(!testFn.called);
            }));

            deferred.resolver.reject();
        },

        "calls tearDown on same test case object as test": function (test) {
            var fn = sinon.spy();
            var tearDown = sinon.spy();
            var context = testCase("Test", { tearDown: tearDown, test: fn });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDown.calledOnce);
                assert.same(fn.thisValues[0], tearDown.thisValues[0]);
            }));
        },

        "calls tearDown after test": function (test) {
            var fn = sinon.spy();
            var tearDown = sinon.spy();
            var context = testCase("Test", { tearDown: tearDown, test: fn });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDown.calledAfter(fn));
            }));
        },

        "not resolve until tearDown resolves": function (test) {
            var deferred = when.defer();
            var tearDown = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { tearDown: tearDown, test: sinon.spy() });
            var complete = sinon.spy(B.partial(B.nextTick, test.end));

            this.runner.runContext(context).then(complete);

            buster.nextTick(function () {
                assert(!complete.called);
                deferred.resolver.resolve();
            });
        },

        "does not throw if tearDown throws": function (test) {
            var fn = sinon.spy();
            var tearDown = sinon.stub().throws();
            var context = testCase("Test", { tearDown: tearDown, test: fn });

            this.runner.runContext(context).then(test.end, assert.fail);
        },

        "calls tearDown if setUp throws": function (test) {
            var tearDown = sinon.spy();
            var context = testCase("Test", {
                setUp: sinon.stub().throws(),
                tearDown: tearDown,
                test: sinon.spy()
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDown.calledOnce);
            }));
        },

        "calls tearDown if test throws": function (test) {
            var tearDown = sinon.spy();

            var context = testCase("Test", {
                setUp: sinon.spy(),
                tearDown: tearDown,
                test: sinon.stub().throws()
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDown.calledOnce);
            }));
        },

        "runs all tests": function (test) {
            var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
                assert(tests[2].calledOnce);
            }));
        },

        "runs all tests in series": function (test) {
            var events = [];

            var context = testCase("Test", {
                setUp: function () { events.push("setUp"); },
                tearDown: function () { events.push("tearDown"); },
                test1: function () { events.push("test1"); },
                test2: function (done) {
                    setTimeout(done(function () { events.push("test2"); }), 10);
                },
                test3: function (done) {
                    setTimeout(done(function () { events.push("test3"); }), 10);
                }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert.equals(events, ["setUp", "test3", "tearDown",
                                       "setUp", "test2", "tearDown",
                                       "setUp", "test1", "tearDown"]);
            }));
        },

        "runs all contexts in series": function (test) {
            var events = [];

            var context = testCase("Test", {
                setUp: function () { events.push("su"); },
                tearDown: function () { events.push("td"); },
                context1: {
                    setUp: function () { events.push("su 1"); },
                    tearDown: function () { events.push("td 1"); },
                    test1: function () { events.push("test1"); }
                },
                context2: {
                    setUp: function () { events.push("su 2"); },
                    tearDown: function () { events.push("td 2"); },
                    test2: function (done) {
                        setTimeout(done(function () { events.push("test2"); }), 10);
                    }
                },
                context3: {
                    setUp: function () { events.push("su 3"); },
                    tearDown: function () { events.push("td 3"); },
                    test3: function (done) {
                        setTimeout(done(function () { events.push("test3"); }), 10);
                    }
                }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert.equals(events, ["su", "su 3", "test3", "td 3", "td",
                                       "su", "su 2", "test2", "td 2", "td",
                                       "su", "su 1", "test1", "td 1", "td"]);
            }));
        },

        "runs tests in random order": function (test) {
            // A tad bit too clever. Non-determinism is hard to test.
            var calls = 0;
            var numbers = [0.9, 0, 0.5];
            Math.random = function () { return numbers[calls++ % 3]; };

            var order = [];
            var tests = [function () { order.unshift(1); },
                         function () { order.unshift(2); },
                         function () { order.unshift(3); },
                         function () { order.unshift(4); },
                         function () { order.unshift(5); }];

            var context = testCase("Test", {
                test1: tests[0],
                test2: tests[1],
                test3: tests[2],
                test4: tests[3],
                test5: tests[4]
            });

            this.runner.runContext(context).then(test.end(function () {
                refute.equals(order, [1, 2, 3, 4, 5]);
            }));
        },

        "runs all tests even if one fails": function (test) {
            var tests = [sinon.spy(), sinon.stub().throws(), sinon.spy()];

            var context = testCase("Test", {
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
                assert(tests[2].calledOnce);
            }));
        },

        "runs setUp once for each test": function (test) {
            var setUp = sinon.spy();
            var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                setUp: setUp,
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(test.end(function () {
                var calls = [tests[0].callIds[0], tests[1].callIds[0], tests[2].callIds[0]];
                calls = calls.sort(numericSort);

                assert(setUp.callIds[0] < calls[0]);
                assert(setUp.callIds[1] > calls[0]);
                assert(setUp.callIds[1] < calls[1]);
                assert(setUp.callIds[2] > calls[1]);
                assert(setUp.callIds[2] < calls[2]);
            }));
        },

        "runs tearDown once for each test": function (test) {
            var tearDown = sinon.spy();
            var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                tearDown: tearDown,
                test1: tests[0],
                test2: tests[1],
                test3: tests[2]
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDown.calledThrice);

                var calls = [tests[0].callIds[0], tests[1].callIds[0],
                             tests[2].callIds[0]];
                calls = calls.sort(numericSort);

                assert(tearDown.callIds[0] > calls[0]);
                assert(tearDown.callIds[0] < calls[1]);
                assert(tearDown.callIds[1] > calls[1]);
                assert(tearDown.callIds[1] < calls[2]);
                assert(tearDown.callIds[2] > calls[2]);
            }));
        },

        "runs tests in sub context": function (test) {
            var fn = sinon.spy();
            var context = testCase("Test", { "context": { test1: fn } });

            this.runner.runContext(context).then(test.end(function () {
                assert(fn.calledOnce);
            }));
        },

        "does not fail without sub contexts": function (test) {
            var fn = sinon.spy();
            var context = { tests: [{ name: "sumptn", func: fn }] };

            refute.exception(B.bind(this, function () {
                this.runner.runContext(context).then(test.end(function () {
                    assert(fn.calledOnce);
                }));
            }));
        },

        "runs tests in all sub contexts": function (test) {
            var tests = [sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                "context": { test1: tests[0] },
                "context2": { test1: tests[1] }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
            }));
        },

        "runs sub context setUp for test in sub context": function (test) {
            var setUp = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                "context": { setUp: setUp, test1: fn }
            });

            context.contexts[0].testCase.id = 42;

            this.runner.runContext(context).then(test.end(function () {
                assert(setUp.calledOnce);
                assert.same(fn.thisValues[0], setUp.thisValues[0]);
            }));
        },

        "runs parent setUp prior to local setUp": function (test) {
            var setUps = [sinon.spy(), sinon.spy()];
            var fn = sinon.spy();

            var context = testCase("Test", {
                setUp: setUps[0],
                "context": { setUp: setUps[1], test1: fn }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(setUps[0].calledOnce);
                assert(setUps[1].calledOnce);
                assert(setUps[0].calledBefore(setUps[1]));
            }));
        },

        "waits for setUp promises to resolve": function (test) {
            var deferreds = [when.defer(), when.defer()];
            var outerSetUp = sinon.stub().returns(deferreds[0].promise);
            var innerSetUp = sinon.stub().returns(deferreds[1].promise);
            var fn = sinon.spy();
            var context = testCase("Test", {
                setUp: outerSetUp,
                "context": { setUp: innerSetUp, test1: fn }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(fn.called);
            }));

            // One buster.nextTick per context
            tick(2, function () {
                assert(outerSetUp.calledOnce);
                assert(!innerSetUp.called);
                deferreds[0].resolver.resolve();
                assert(innerSetUp.calledOnce);
                assert(!fn.called);
                deferreds[1].resolver.resolve();
            });
        },

        "runs parent setUp on local test case object": function (test) {
            var setUp = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                setUp: setUp,
                "context": { test1: fn }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert.same(fn.thisValues[0], setUp.thisValues[0]);
            }));
        },

        "stops running setUps if one fails": function (test) {
            var setUps = [sinon.stub().throws(), sinon.spy()];

            var context = testCase("Test", {
                setUp: setUps[0],
                "context": { setUp: setUps[1], test1: sinon.spy() }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(!setUps[1].called);
            }));
        },

        "runs sub context tearDown for test in sub context": function (test) {
            var tearDown = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                "context": { tearDown: tearDown, test1: fn }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDown.calledOnce);
                assert.same(fn.thisValues[0], tearDown.thisValues[0]);
            }));
        },

        "runs parent tearDown after local tearDown": function (test) {
            var tearDowns = [sinon.spy(), sinon.spy()];

            var context = testCase("Test", {
                tearDown: tearDowns[0],
                "context": { tearDown: tearDowns[1], test1: sinon.spy() }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDowns[0].calledOnce);
                assert(tearDowns[0].calledOnce);
                assert(tearDowns[1].calledOnce);
                assert(tearDowns[0].calledAfter(tearDowns[1]));
            }));
        },

        "runs parent tearDown on local test case object": function (test) {
            var tearDown = sinon.spy();
            var fn = sinon.spy();

            var context = testCase("Test", {
                tearDown: tearDown,
                "context": { test1: fn }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDown.calledOnce);
                assert.same(tearDown.thisValues[0], fn.thisValues[0]);
            }));
        },

        "runs tearDowns inner -> outer": function (test) {
            var tearDowns = [sinon.spy(), sinon.spy()];
            var fn = sinon.spy();

            var context = testCase("Test", {
                tearDown: tearDowns[0],
                "context": { tearDown: tearDowns[1], test1: fn }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDowns[1].calledBefore(tearDowns[0]));
            }));
        },

        "stops running tearDowns if one fails": function (test) {
            var tearDowns = [sinon.spy(), sinon.stub().throws()];

            var context = testCase("Test", {
                tearDown: tearDowns[0],
                "context": { tearDown: tearDowns[1], test1: sinon.spy() }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(tearDowns[1].called);
                assert(!tearDowns[0].called);
            }));
        },

        "waits for tearDown promises to resolve": function (test) {
            var deferreds = [when.defer(), when.defer()];
            var innerTearDown = sinon.stub().returns(deferreds[0].promise);
            var outerTearDown = sinon.stub().returns(deferreds[1].promise);
            var fn = sinon.spy();
            var context = testCase("Test", {
                tearDown: outerTearDown,
                "context": { tearDown: innerTearDown, test1: fn }
            });

            this.runner.runContext(context).then(test.end);

            // One buster.nextTick per context
            tick(2, function () {
                assert(fn.called);
                assert(innerTearDown.calledOnce);
                assert(!outerTearDown.called);
                deferreds[0].resolver.resolve();
                assert(outerTearDown.calledOnce);
                deferreds[1].resolver.resolve();
            });
        },

        "skips deferred test": function (test) {
            var fn = sinon.spy();

            var context = testCase("Test", {
                "//should do this": fn
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(!fn.called);
            }));
        },

        "waits for async context": function (test) {
            var runIt, completed = sinon.spy();
            var context = testCase("Test", function (run) {
                runIt = run;
            });

            this.runner.runContext(context).then(completed);

            buster.nextTick(function () {
                assert.isFunction(runIt);
                refute(completed.called);
                runIt({});
                assert(completed.calledOnce);
                test.end();
            });
        }
    });

    bu.testCase("TestRunnerRunSuiteTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "runs all contexts": function (test) {
            var tests = [sinon.spy(), sinon.spy()];

            var contexts = [testCase("Test", { test1: tests[0] }),
                            testCase("Test other", { test2: tests[1] })];

            this.runner.runSuite(contexts).then(test.end(function () {
                assert(tests[0].calledOnce);
                assert(tests[1].calledOnce);
            }));
        }
    });

    bu.testCase("TestRunnerAsyncTest", {
        setUp: function () {
            this.runner = testRunner.create();
            this.deferred = when.defer();
            this.fn = sinon.stub().returns(this.deferred.promise);
            this.context = testCase("Test", { test: this.fn });
        },

        "resolves run when test has resolved": function (test) {
            var completed = sinon.spy();
            this.runner.runSuite([this.context]).then(completed);

            buster.nextTick(B.bind(this, test.end(function () {
                refute(completed.called);
                this.deferred.resolver.resolve();
                assert(completed.calledOnce);
            })));
        },

        "emits test:async event": function (test) {
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:async", listeners[0]);
            this.runner.on("test:success", listeners[1]);

            this.runner.runSuite([this.context]).then(test.end(function () {
                assert(listeners[0].calledOnce);
                assert.equals(listeners[0].args[0], [{ name: "test" }]);
                assert(listeners[0].calledBefore(listeners[1]));
            }));

            this.deferred.resolver.resolve();
        },

        "times out after 250ms": function (test) {
            var runnerResolution = sinon.spy();
            var promiseResolution = spyOnPromise(this.deferred.promise);
            this.runner.runSuite([this.context]).then(runnerResolution);

            setTimeout(test.end(function () {
                assert(runnerResolution.called);
                assert(!promiseResolution.called);
            }), 350); // Timers in browsers are inaccurate beasts
        },

        "times out after custom timeout": function (test) {
            var runnerResolution = sinon.spy();
            this.runner.timeout = 100;
            this.runner.runSuite([this.context]).then(runnerResolution);

            setTimeout(test.end(function () {
                assert(runnerResolution.called);
            }), 150);
        },

        "sets timeout as property on test case": function (test) {
            var runnerResolution = sinon.spy();
            this.runner.runSuite([testCase("Test", {
                test: function (test) {
                    this.timeout = 50;
                }
            })]).then(runnerResolution);

            setTimeout(test.end(function () {
                assert(runnerResolution.called);
            }), 100);
        },

        "emits timeout event": function (test) {
            var listener = sinon.spy();
            this.runner.timeout = 20;
            this.runner.on("test:timeout", listener);

            this.runner.runSuite([this.context]).then(test.end(function () {
                assert(listener.called);
                assert.match(listener.args[0], [{
                    name: "test",
                    error: { source: "test function" }
                }]);
            }));
        },

        "does not emit success when test times out": function (test) {
            var listener = sinon.spy();
            this.runner.timeout = 20;
            this.runner.on("test:success", listener);

            this.runner.runSuite([this.context]).then(test.end(function () {
                assert(!listener.called);
            }));
        },

        "does not emit test:success event until test has completed": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:success", listener);

            this.runner.runSuite([this.context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));

            setTimeout(B.bind(this, function () {
                assert(!listener.called);
                this.deferred.resolver.resolve();
            }), 10);
        },

        "errors if test rejects it's returned promise": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            this.runner.runSuite([this.context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oh no");
            }));

            this.deferred.resolver.reject(new Error("Oh no"));
        },

        "fails if test rejects with an AssertionError": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            this.runner.runSuite([this.context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oh no");
            }));

            this.deferred.resolver.reject({
                name: "AssertionError",
                message: "Oh no"
            });
        },

        "only emits one test:async event": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                tearDown: function (done) { done(); },
                test: function (done) { done(); }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));
        },

        "prefers test error over tearDown failure": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);
            this.runner.on("test:failure", listener);

            var a;
            var context = testCase("Test", {
                tearDown: function () { assert(false); },
                test: function () { a.b.c = 42; }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.name, "TypeError");
            }), assert.fail);
        },

        "prefers test error over tearDown failure with non-throwing assertion": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);
            this.runner.on("test:failure", listener);

            var a, runner = this.runner;
            var error = assertionError("Oops");
            var context = testCase("Test", {
                tearDown: function () { runner.error(error); },
                test: function () { a.b.c = 42; }
            });

            this.runner.runSuite([context]).then(test.end(function (results) {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.name, "TypeError");
            }), assert.fail);
        }
    });

    bu.testCase("TestRunnerImplicitAsyncTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "resolves run when test calls passed argument": function (test) {
            var callback, listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                test: function (done) {
                    callback = done;
                    buster.nextTick(function () {
                        callback.called = true;
                        callback();
                    });
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.called);
                assert.isFunction(callback);
                assert(callback.called);
            }));
        },

        "emits test:success when test calls passed argument": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:success", listener);

            var context = testCase("Test", {
                test: function (done) { buster.nextTick(done); }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));

            buster.nextTick(function () {
                assert(!listener.called);
            });
        },

        "done returns actual done if called with a function": function (test) {
            var innerDone;

            var context = testCase("Test", {
                test: function (done) {
                    buster.nextTick(done(function () {
                        innerDone = true;
                    }));
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(innerDone);
            }));

            buster.nextTick(function () {
                assert(!innerDone);
            });
        },

        "done completes test when called with non-function": function (test) {
            var context = testCase("Test", {
                test: function (done) {
                    buster.nextTick(done({ ok: function () {} }));
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(true);
            }));
        },

        "done transparently proxies to its callback": function (test) {
            var innerDone = sinon.stub().returns(42);
            var thisp = { id: 42 };
            var returnValue;
            var fn = function (cb) {
                returnValue = cb.apply(thisp, [1, 2, 3]);
            };

            var context = testCase("Test", {
                test: function (done) { fn(done(innerDone)); }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(innerDone.calledOnce);
                assert.equals(returnValue, 42);
                assert(innerDone.calledOn(thisp));
                assert(innerDone.calledWithExactly(1, 2, 3));
            }));
        },

        "emits test:failure when AssertionError is thrown in callback": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                test: function (done) {
                    buster.nextTick(done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    }));
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "emits test:error when Error is thrown in done callback": function (t) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            var context = testCase("Test", {
                test: function (done) {
                    buster.nextTick(done(function () {
                        throw new Error("Oops");
                    }));
                }
            });

            this.runner.runSuite([context]).then(t.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "includes timeouts in suite:end results": function (test) {
            var listener = sinon.spy();
            this.runner.on("suite:end", listener);

            var context = testCase("My case", {
                test1: function (done) {}
            });

            sinon.stub(this.runner, "assertionCount").returns(2);

            this.runner.runSuite([context]).then(test.end(function () {
                assert.equals(listener.args[0][0].timeouts, 1);
            }));
        },

        "should disarm callback when test times out": function (test) {
            var callback;
            var context = testCase("My case", {
                test1: function (done) { callback = done; }
            });

            sinon.stub(this.runner, "assertionCount").returns(2);

            this.runner.runSuite([context]).then(test.end(function () {
                refute.exception(function () {
                    callback();
                });
            }));
        }
    });

    bu.testCase("TestRunnerImplicitAsyncTearDownTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "resolves run when setUp calls passed argument": function (test) {
            var callback;
            var context = testCase("Test", {
                setUp: function (done) {
                    callback = done;
                    buster.nextTick(function () {
                        callback.called = true;
                        callback();
                    });
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert.defined(callback);
                assert(callback.called);
            }));
        },

        "emits test:start when setUp calls passed argument": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:start", listener);

            var context = testCase("Test", {
                setUp: function (done) {
                    buster.nextTick(done);
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));

            buster.nextTick(function () {
                assert(!listener.called);
            });
        },

        "emits test:failure when setUp done callback throws AssertionError": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                setUp: function (done) {
                    buster.nextTick(done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "emits test:error when setUp done callback throws Error": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            var context = testCase("Test", {
                setUp: function (done) {
                    buster.nextTick(done(function () {
                        throw new Error("Oops");
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "times out async setUp": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                setUp: function (done) {},
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "setUp");
            }));
        },

        "times out async setUp after custom timeout": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                setUp: function (done) { this.timeout = 100; },
                test: sinon.spy()
            });

            this.runner.runSuite([context]);
            setTimeout(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "setUp");
            }), 150);
        },

        "emits setUp, async, timeout for async setup": function (test) {
            var listeners = {
                timeout: sinon.spy(),
                async: sinon.spy(),
                setUp: sinon.spy()
            };

            this.runner.on("test:setUp", listeners.setUp);
            this.runner.on("test:async", listeners.async);
            this.runner.on("test:timeout", listeners.timeout);

            var context = testCase("Test", {
                setUp: function (done) {},
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listeners.setUp.calledOnce);
                assert(listeners.async.calledOnce);
                assert(listeners.timeout.calledOnce);
                assert(listeners.setUp.calledBefore(listeners.async));
                assert(listeners.async.calledBefore(listeners.timeout));
            }));
        },

        "emits test:async when setUp is async": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { buster.nextTick(done); },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));
        },

        "calling done synchronously does not make test asynchronous": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(!listener.calledOnce);
            }));
        },

        "does not emit test:async twice": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                test: function (done) { done(); }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit test:async more than once in nested async context": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                context1: {
                    setUp: function (done) { done(); },
                    test: function (done) { done(); }
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));
        }
    });

    bu.testCase("TestRunnerImplicitAsyncTearDownTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "resolves run when tearDown calls passed argument": function (test) {
            var callback;

            var context = testCase("Test", {
                tearDown: function (done) {
                    callback = done;
                    buster.nextTick(function () {
                        callback.called = true;
                        callback();
                    });
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(!!callback);
                assert(callback.called);
            }));
        },

        "emits test:success when tearDown calls passed argument": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:success", listener);

            var context = testCase("Test", {
                tearDown: function (done) {
                    buster.nextTick(function () {
                        done();
                    });
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));

            buster.nextTick(function () {
                assert(!listener.called);
            });
        },

        "emits test:failure when tearDown done callback throws AssertionError": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                tearDown: function (done) {
                    buster.nextTick(done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "emits test:error when tearDown done callback throws Error": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:error", listener);

            var context = testCase("Test", {
                tearDown: function (done) {
                    buster.nextTick(done(function () {
                        throw new Error("Oops");
                    }));
                },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.message, "Oops");
            }));
        },

        "times out async tearDown": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                tearDown: function (done) {},
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "tearDown");
            }));
        },

        "times out async tearDown after custom timeout": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:timeout", listener);

            var context = testCase("Test", {
                tearDown: function (done) { this.timeout = 100; },
                test: sinon.spy()
            });

            this.runner.runSuite([context]);

            setTimeout(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].error.source, "tearDown");
            }), 150);
        },

        "should emit test:async when tearDown is async": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                tearDown: function (done) { buster.nextTick(done); },
                test: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit test:async more than once": function (test) {
            var listener = sinon.spy();
            this.runner.on("test:async", listener);

            var context = testCase("Test", {
                setUp: function (done) { done(); },
                tearDown: function (done) { done(); },
                test: function (done) { done(); }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit test:async after test failure": function (test) {
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:async", listeners[0]);
            this.runner.on("test:failure", listeners[1]);
            var runner = this.runner;

            var context = testCase("Test", {
                setUp: function () {},
                tearDown: function (done) { done(); },
                test: function (done) {
                    var e = new Error();
                    e.name = "AssertionError";
                    throw e;
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listeners[1].calledOnce);
                assert(!listeners[0].called);
            }));
        },

        "does not emit test:async for deferred test": function (test) {
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:async", listeners[0]);
            this.runner.on("test:deferred", listeners[1]);
            var runner = this.runner;
            var context = testCase("Test", {
                tearDown: function (done) { buster.nextTick(done); },
                "//test": function () {}
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(!listeners[0].called);
                assert(listeners[1].calledOnce);
            }));
        },

        "does not run setUp for deferred test": function (test) {
            var setUp = sinon.spy();
            var runner = this.runner;
            var context = testCase("Test", {
                setUp: setUp,
                "//test": function () {}
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(!setUp.called);
            }));
        },

        "does not run tearDown for deferred test": function (test) {
            var tearDown = sinon.spy();
            var runner = this.runner;
            var context = testCase("Test", {
                tearDown: tearDown,
                "//test": function () {}
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(!tearDown.called);
            }));
        }
    });

    bu.testCase("RunnerRunAwayExceptionsTest", {
        setUp: function () {
            // Don't report uncaught exceptions in the util test runner too
            bu.testCase.silent = true;
        },

        tearDown: function () {
            bu.testCase.silent = false;
        },

        "catches uncaught asynchronous errors": function (test) {
            var runner = testRunner.create();
            runner.timeout = 20;
            var listener = sinon.spy();
            runner.on("uncaughtException", listener);

            var context = testCase("Test", {
                "does not fail, ever": function (done) {
                    setTimeout(function () {
                        throw new Error("Oops!");
                    }, 30);
                }
            });

            runner.runSuite([context]).then(function () {
                setTimeout(test.end(function () {
                    assert(listener.calledOnce);
                }), 50);
            });
        },

        "does not handle asynchronous failure as uncaught exception": function (test) {
            if (typeof document !== "undefined") {
                console.log("'does not handle asynchronous failure as uncaught " +
                            "exception':\nAborting test, as browsers may not have " +
                            "enough information for uncaught errors to treat them as " +
                            "assertion failures");
                return test.end();
            }

            var runner = testRunner.create();
            var listeners = [sinon.spy(), sinon.spy()];
            runner.on("uncaughtException", listeners[0]);
            runner.on("test:failure", listeners[1]);

            var context = testCase("Test", {
                "should fail with regular AssertionError": function (done) {
                    setTimeout(function () {
                        throw assertionError("[assert] Failed assertion asynchronously");
                    }, 10);
                }
            });

            runner.runSuite([context]).then(test.end(function () {
                refute(listeners[0].called);
                assert(listeners[1].calledOnce);
            }));
        }
    });

    bu.testCase("TestRunnerEventedAssertionsTest", {
        setUp: function () {
            var runner = this.runner = testRunner.create();

            this.assert = function (val) {
                if (!val) {
                    try {
                        throw assertionError("Assertion failed");
                    } catch (e) {
                        runner.assertionFailure(e);
                    }
                }
            };
        },

        "emits failure event": function (test) {
            var _assert = this.assert;
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                "test it": function () { _assert(false); }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                var args = listener.args;
                assert.equals(args[0][0].name, "test it");
                assert.equals(args[0][0].error.message, "Assertion failed");
            }));
        },

        "only emits failure event once per test": function (test) {
            var assert = this.assert;
            var listener = sinon.spy();
            this.runner.on("test:failure", listener);

            var context = testCase("Test", {
                "test it": function () {
                    assert(false);
                    assert(false);
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
            }));
        },

        "does not emit error event after failures": function (test) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:error", listeners[1]);

            var context = testCase("Test", {
                "test it": function () {
                    assert(false);
                    throw new Error("WTF!");
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listeners[0].calledOnce);
                assert(!listeners[1].called);
            }));
        },

        "does not emit timeout event after failures": function (test) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:timeout", listeners[1]);

            var context = testCase("Test", {
                "test it": function (done) {
                    assert(false);
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listeners[0].calledOnce);
                assert(!listeners[1].called);
            }));
        },

        "does not emit failure after timeout": function (test) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.timeout = 20;
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:timeout", listeners[1]);

            var context = testCase("Test", {
                "test it": function (done) {
                    setTimeout(function () {
                        assert(false);
                    }, 40);
                }
            });

            this.runner.runSuite([context]).then(function () {
                setTimeout(test.end(function () {
                    assert(!listeners[0].called);
                    assert(listeners[1].calledOnce);
                }), 20);
            });
        },

        "does not emit success after failure": function (test) {
            var assert = this.assert;
            var listeners = [sinon.spy(), sinon.spy()];
            this.runner.timeout = 20;
            this.runner.on("test:failure", listeners[0]);
            this.runner.on("test:success", listeners[1]);

            var context = testCase("Test", {
                "test it": function () { assert(false); }
            });

            this.runner.runSuite([context]).then(function () {
                setTimeout(test.end(function () {
                    assert(listeners[0].calledOnce);
                    assert(!listeners[1].called);
                }), 20);
            });
        }
    });

    bu.testCase("TestRunnerAssertionCountTest", {
        setUp: function () {
            this.context = testCase("Test + Assertions", { test1: function () {} });
            this.runner = testRunner.create({ failOnNoAssertions: true });
            this.listener = sinon.spy();
            this.runner.on("test:failure", this.listener);
        },

        "fails test if 0 assertions": function (test) {
            sinon.stub(this.runner, "assertionCount").returns(0);

            this.runner.runSuite([this.context]).then(B.bind(this, test.end(function () {
                assert(this.listener.calledOnce);
            })));
        },

        "does not fail with 0 assertions if timing out": function (test) {
            sinon.stub(this.runner, "assertionCount").returns(0);
            var timeoutListener = sinon.spy();
            this.runner.on("test:timeout", timeoutListener);

            var context = testCase("Test + Assertions", {
                test1: function (done) {}
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(timeoutListener.calledOnce);
                refute(this.listener.called);
            })));
        },

        "does not fail test if 1 assertion": function (test) {
            sinon.stub(this.runner, "assertionCount").returns(1);

            this.runner.runSuite([this.context]).then(test.end(B.bind(this, function () {
                assert(!this.listener.called);
            })));
        },

        "configures to not fail test if 0 assertions": function (test) {
            sinon.stub(this.runner, "assertionCount").returns(0);
            this.runner.failOnNoAssertions = false;

            this.runner.runSuite([this.context]).then(test.end(B.bind(this, function () {
                assert(!this.listener.called);
            })));
        },

        "fails for unexpected number of assertions": function (test) {
            sinon.stub(this.runner, "assertionCount").returns(3);

            var context = testCase("Test Assertions", {
                test1: function () {
                    this.expectedAssertions = 2;
                }
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listener.calledOnce);
                assert.equals(this.listener.args[0][0].error.message,
                              "Expected 2 assertions, ran 3");
            })));
        },

        "only checks expected assertions for tests that explicitly define it": function (test) {
            sinon.stub(this.runner, "assertionCount").returns(3);

            var context = testCase("Test Assertions", {
                test1: function () {
                    this.expectedAssertions = 2;
                },
                test2: function () {}
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listener.calledOnce);
                assert.equals(this.listener.args[0][0].name, "test1");
            })));
        },

        "clears expected assertions when test fails for other reasons": function (test) {
            sinon.stub(this.runner, "assertionCount").returns(3);
            this.runner.on("test:error", this.listener);

            var context = testCase("Test Assertions", {
                test1: function () {
                    this.expectedAssertions = 2;
                    throw new Error();
                },
                test2: function () {}
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listener.calledOnce);
                assert.equals(this.listener.args[0][0].name, "test1");
            })));
        },

        "counts assertions when asserting in callback to done": function (test) {
            var stub = sinon.stub(this.runner, "assertionCount").returns(0);
            var context = testCase("Test Assertions", {
                test1: function (done) {
                    buster.nextTick(done(function () {
                        stub.returns(3);
                    }));
                }
            });
            this.runner.runSuite([context]).then(function (result) {
                assert.equals(result.assertions, 3);
                test.end();
            });
        }
    });

    bu.testCase("TestRunnerSupportRequirementsTest", {
        setUp: function () {
            this.runner = testRunner.create({
                handleUncaughtExceptions: false
            });

            this.test = sinon.spy();
        },

        "executes test normally when support is present": function (test) {
            var context = testCase("Test", {
                requiresSupportFor: { A: true },
                "should run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.test.calledOnce);
            })));
        },

        "does not execute test when support is absent": function (test) {
            var context = testCase("Test", {
                requiresSupportFor: { A: false },
                "does not run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.test.called);
            })));
        },

        "does not execute test when support function returns falsy": function (test) {
            var context = testCase("Test", {
                requiresSupportFor: { A: function () { return; } },
                "does not run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.test.called);
            })));
        },

        "should execute test when support function returns truthy": function (test) {
            var context = testCase("Test", {
                requiresSupportFor: { A: function () { return "Ok"; } },
                "should run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.test.calledOnce);
            })));
        },

        "does not run test when not all support requirements are met": function (test) {
            var context = testCase("Test", {
                requiresSupportFor: {
                    A: function () { return "Ok"; },
                    B: function () { return false; }
                },
                "does not run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.test.called);
            })));
        },

        "does not run test when no support requirements are met": function (test) {
            var context = testCase("Test", {
                requiresSupportForAny: {
                    A: function () { return; },
                    B: function () { return false; }
                },
                "does not run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.test.called);
            })));
        },

        "runs test when at least one support requirement is met": function (test) {
            var context = testCase("Test", {
                requiresSupportForAny: {
                    A: function () { return true; },
                    B: function () { return false; }
                },
                "should run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.test.calledOnce);
            })));
        },

        "does not emit context:start event for unsupported context": function (test) {
            var listener = sinon.spy();
            this.runner.on("context:start", listener);

            var context = testCase("Test", {
                requiresSupportFor: { B: function () { return false; } },
                "should run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!listener.called);
            })));
        },

        "does not run nested contexts in unsupported context": function (test) {
            var listener = sinon.spy();
            this.runner.on("context:start", listener);
            var context = testCase("Test", {
                requiresSupportFor: { B: function () { return false; } },
                something: {
                    "should run this": this.test
                }
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!listener.called);
                assert(!this.test.called);
            })));
        }
    });

    function runnerEventsSetUp() {
        this.runner = testRunner.create();
        this.runner.failOnNoAssertions = false;
        this.assertionError = new Error("Oh, crap");
        this.assertionError.name = "AssertionError";

        this.listeners = {
            "suite:start": sinon.spy(),
            "context:start": sinon.spy(),
            "context:unsupported": sinon.spy(),
            "test:setUp": sinon.spy(),
            "test:start": sinon.spy(),
            "test:tearDown": sinon.spy(),
            "test:failure": sinon.spy(),
            "test:error": sinon.spy(),
            "test:success": sinon.spy(),
            "context:end": sinon.spy(),
            "suite:end": sinon.spy(),
            "test:deferred": sinon.spy(),
            "uncaughtException": sinon.spy()
        };

        this.runner.on("suite:start", this.listeners["suite:start"]);
        this.runner.on("context:start", this.listeners["context:start"]);
        this.runner.on("test:setUp", this.listeners["test:setUp"]);
        this.runner.on("test:start", this.listeners["test:start"]);
        this.runner.on("test:tearDown", this.listeners["test:tearDown"]);
        this.runner.on("test:success", this.listeners["test:success"]);
        this.runner.on("test:failure", this.listeners["test:failure"]);
        this.runner.on("test:error", this.listeners["test:error"]);
        this.runner.on("test:deferred", this.listeners["test:deferred"]);
        this.runner.on("context:end", this.listeners["context:end"]);
        this.runner.on("context:unsupported", this.listeners["context:unsupported"]);
        this.runner.on("suite:end", this.listeners["suite:end"]);
        this.runner.on("uncaughtException", this.listeners.uncaughtException);

        this.myCase = testCase("My case", {});
        this.otherCase = testCase("Other", {});
        this.simpleCase = testCase("One test", {
            setUp: sinon.spy(),
            tearDown: sinon.spy(),
            testIt: sinon.spy()
        });
    }

    bu.testCase("TestRunnerEventsTest", {
        setUp: runnerEventsSetUp,

        "emits event when starting suite": function (test) {
            this.runner.runSuite([this.myCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["suite:start"].calledOnce);
            })));
        },

        "emit event when starting suite only once": function (test) {
            var suite = [this.myCase, this.otherCase];
            this.runner.runSuite(suite).then(test.end(B.bind(this, function () {
                assert(this.listeners["suite:start"].calledOnce);
            })));
        },

        "emits end suite event after context end": function (test) {
            this.runner.runSuite([this.myCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["suite:end"].calledOnce);
                assert(this.listeners["suite:end"].calledAfter(
                    this.listeners["context:end"]
                ));
            })));
        },

        "emits event when starting context": function (test) {
            this.runner.runSuite([this.myCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["context:start"].calledOnce);
            })));
        },

        "emits end context event after start context": function (test) {
            this.runner.runSuite([this.myCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["context:end"].calledOnce);
                assert(this.listeners["context:end"].calledAfter(
                    this.listeners["context:start"]
                ));
            })));
        },

        "emits event when starting test": function (test) {
            this.runner.runSuite([this.simpleCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:start"].calledOnce);
            })));
        },

        "emits setUp event before test:start": function (test) {
            this.runner.runSuite([this.simpleCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:setUp"].calledOnce);
                assert(this.listeners["test:setUp"].calledBefore(
                    this.listeners["test:start"]
                ));
            })));
        },

        "emits tearDown event after test:start": function (test) {
            this.runner.runSuite([this.simpleCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:tearDown"].calledOnce);
                assert(this.listeners["test:tearDown"].calledAfter(
                    this.listeners["test:start"]
                ));
            })));
        },

        "emits test:success when test passes": function (test) {
            this.runner.runSuite([this.simpleCase]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:success"].calledOnce);
            })));
        },

        "does not emit test:success when setUp throws": function (test) {
            var context = testCase("My case", {
                setUp: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runner.runSuite([context]).then(function () {
                assert(!this.listeners["test:success"].called);
                test.end();
            }.bind(this));
        },

        "does not emit test:success when test throws": function (test) {
            var context = testCase("My case", {
                setUp: sinon.spy(),
                testIt: sinon.stub().throws()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.listeners["test:success"].called);
            })));
        },

        "does not emit test:success if tearDown throws": function (test) {
            var context = testCase("My case", {
                tearDown: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.listeners["test:success"].called);
            })));
        },

        "should emit test:fail when test throws assertion error": function (test) {
            var fn = sinon.stub().throws(this.assertionError);
            var context = testCase("My case", { testIt: fn });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:failure"].calledOnce);
            })));
        },

        "emits test:fail if setUp throws assertion error": function (test) {
            var context = testCase("My case", {
                setUp: sinon.stub().throws(this.assertionError),
                testIt: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:failure"].calledOnce);
            })));
        },

        "does not emit test:fail if test passes": function (test) {
            var context = testCase("My case", {
                setUp: sinon.spy(),
                testIt: sinon.stub()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.listeners["test:failure"].called);
            })));
        },

        "emits test:fail if tearDown throws assertion error": function (test) {
            var context = testCase("My case", {
                tearDown: sinon.stub().throws(this.assertionError),
                testIt: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:failure"].calledOnce);
            })));
        },

        "emits test:error when test throws": function (test) {
            var fn = sinon.stub().throws(new Error("Oops"));
            var context = testCase("My case", { testIt: fn });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:error"].calledOnce);
            })));
        },

        "emits test:error if setUp throws": function (test) {
            var context = testCase("My case", {
                setUp: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:error"].calledOnce);
                assert(!this.listeners["test:failure"].called);
            })));
        },

        "does not emit test:error if test passes": function (test) {
            var context = testCase("My case", {
                setUp: sinon.spy(),
                testIt: sinon.stub()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(!this.listeners["test:error"].called);
            })));
        },

        "emits test:error if tearDown throws assertion error": function (test) {
            var context = testCase("My case", {
                tearDown: sinon.stub().throws(),
                testIt: sinon.spy()
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listeners["test:error"].calledOnce);
                assert(!this.listeners["test:failure"].called);
            })));
        },

        "emits test:deferred event": function (test) {
            var context = testCase("Test", {
                "// should do this": function () {}
            });

            var listener = this.listeners["test:deferred"];

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].name, "should do this");
            }));
        },

        "emits test:deferred event with comment": function (test) {
            var context = testCase("Test", {
                "should do this": "Later, seriously"
            });

            var listener = this.listeners["test:deferred"];

            this.runner.runSuite([context]).then(test.end(function () {
                assert(listener.calledOnce);
                assert.equals(listener.args[0][0].comment, "Later, seriously");
            }));
        },

        "emits context:unsupported event": function (test) {
            var context = testCase("Test", {
                requiresSupportForAny: { A: false },
                "does not run this": this.test
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                assert(this.listeners["context:unsupported"].calledOnce);
            })));
        }
    });

    bu.testCase("TestRunnerEventDataTest", {
        setUp: function () {
            runnerEventsSetUp.call(this);
            // Don't report uncaught exceptions in the util test runner too
            bu.testCase.silent = true;
        },

        tearDown: function () {
            bu.testCase.silent = false;
        },

        "context:start event data": function (test) {
            var context = testCase("My case", {});

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["context:start"].args[0];
                assert.equals(args, [context]);
            })));
        },

        "context:end event data": function (test) {
            var context = testCase("My case", {});

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["context:end"].args[0];
                assert.equals(args, [context]);
            })));
        },

        "context:unsupported event data": function (test) {
            var context = testCase("My case", {
                requiresSupportFor: { "Feature A": false }
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["context:unsupported"].args[0];
                assert.equals(args, [{
                    context: context,
                    unsupported: ["Feature A"]
                }]);
            })));
        },

        "test:setUp event data": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: function () {}
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["test:setUp"].args;
                assert.equals(args[0][0].name, "test1");
                assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            })));
        },

        "test:tearDown event data": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: function () {}
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["test:tearDown"].args;
                assert.equals("test1", args[0][0].name);
                assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            })));
        },

        "test:start event data": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: function () {}
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["test:start"].args;
                assert.equals(args[0][0].name, "test1");
                assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            })));
        },

        "test:error event data": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: sinon.stub().throws("TypeError")
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["test:error"].args[0];
                assert.equals(args[0].name, "test1");
                assert.equals(args[0].error.name, "TypeError");
                assert.equals(args[0].error.message, "");
                assert.match(args[0].error.stack, /\.js/);
            })));
        },

        "test:fail event data": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: sinon.stub().throws("AssertionError")
            });

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["test:failure"].args[0];
                assert.equals(args[0].name, "test1");
                assert.equals(args[0].error.name, "AssertionError");
                assert.equals(args[0].error.message, "");
                assert.match(args[0].error.stack, /\.js/);
            })));
        },

        "test:success event data": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: sinon.spy()
            });

            sinon.stub(this.runner, "assertionCount").returns(2);

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["test:success"].args[0];
                assert.equals(args, [{ name: "test1", assertions: 2 }]);
            })));
        },

        "suite:end event data": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: function (test) {},
                test2: sinon.stub().throws(),
                "test3": sinon.spy(),
                test4: sinon.stub().throws("AssertionError"),
                inner: {
                    test5: sinon.spy()
                }
            });

            var context2 = testCase("My other case", {
                setUp: function () {},
                test1: function (test) {},
                test2: sinon.stub().throws(),
                "test3": sinon.spy(),
                test4: sinon.stub().throws("AssertionError"),
                inner: {
                    test5: sinon.spy()
                }
            });

            sinon.stub(this.runner, "assertionCount").returns(2);
            var suite = [context, context2];

            this.runner.runSuite(suite).then(test.end(B.bind(this, function () {
                var args = this.listeners["suite:end"].args[0];
                assert.equals(args[0].contexts, 2);
                assert.equals(args[0].tests, 10);
                assert.equals(args[0].errors, 2);
                assert.equals(args[0].failures, 2);
                assert.equals(args[0].assertions, 20);
                assert.equals(args[0].timeouts, 2);
                assert.equals(args[0].deferred, 0);
                assert(!args[0].ok);
            })));
        },

        "suite:end event data passing test case": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                test1: sinon.spy(),
                test2: sinon.spy(),
                test3: sinon.spy(),
                test4: sinon.spy(),
                inner: {
                    test5: sinon.spy()
                }
            });

            sinon.stub(this.runner, "assertionCount").returns(2);

            this.runner.runSuite([context, context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["suite:end"].args[0];
                assert.equals(args[0].contexts, 2);
                assert.equals(args[0].tests, 10);
                assert.equals(args[0].errors, 0);
                assert.equals(args[0].failures, 0);
                assert.equals(args[0].assertions, 20);
                assert.equals(args[0].timeouts, 0);
                assert.equals(args[0].deferred, 0);
                assert(args[0].ok);
            })));
        },

        "suite:end event data deferred tests": function (test) {
            var context = testCase("My case", {
                setUp: function () {},
                "//test1": sinon.spy(),
                test2: sinon.spy(),
                test3: sinon.spy(),
                "//test4": sinon.spy(),
                inner: {
                    test5: sinon.spy()
                }
            });

            sinon.stub(this.runner, "assertionCount").returns(2);

            this.runner.runSuite([context]).then(test.end(B.bind(this, function () {
                var args = this.listeners["suite:end"].args[0];
                assert.equals(args[0].contexts, 1);
                assert.equals(args[0].tests, 3);
                assert.equals(args[0].errors, 0);
                assert.equals(args[0].failures, 0);
                assert.equals(args[0].assertions, 6);
                assert.equals(args[0].timeouts, 0);
                assert.equals(args[0].deferred, 2);
                assert(args[0].ok);
            })));
        },

        "uncaughtException event data": function (test) {
            if (typeof document !== "undefined") {
                console.log("'uncaughtException event data':\n Aborting test, as " +
                            "browsers may not have enough information to extract " +
                            "useful event data");
                return test.end();
            }

            var context = testCase("My case", {
                "test1": function (done) {
                    setTimeout(function () {
                        throw new Error("Damnit");
                    }, 15);
                }
            });

            this.runner.handleUncaughtExceptions = true;
            this.runner.timeout = 5;
            var listener = this.listeners.uncaughtException;

            setTimeout(test.end(function () {
                assert(listener.calledOnce);
                assert.match(listener.args[0][0].message, /Damnit/);
            }), 25);

            this.runner.runSuite([context]);
        }
    });

    bu.testCase("TestRunnerContextSetUpTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "contextSetUp this is prototype of test function this": function (test) {
            var prepare = sinon.spy();
            var testFn = sinon.spy();
            var context = testCase("Test", { prepare: prepare, test: testFn });

            this.runner.runContext(context).then(test.end(function () {
                assert(prepare.calledOnce);
                assert.hasPrototype(testFn.thisValues[0], prepare.thisValues[0]);
            }));
        },

        "contextSetUp is only called once": function (test) {
            var prepare = sinon.spy();
            var context = testCase("Test", {
                prepare: prepare,
                test1: function () {},
                test2: function () {},
                test3: function () {},
                ctx2: {
                    test4: function () {},
                    test5: function () {}
                }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(prepare.calledOnce);
            }));
        },

        "calls prepare before setUp": function (test) {
            var prepare = sinon.spy();
            var setUp = sinon.spy();
            var context = testCase("Test", {
                prepare: prepare,
                setUp: setUp,
                test: function () {}
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(prepare.calledBefore(setUp));
            }));
        },

        "does not call setUp until prepare resolves": function (test) {
            var doneCb;
            var setUp = sinon.spy();
            var prepare = function (done) { doneCb = done; };
            var context = testCase("Test", {
                prepare: prepare,
                setUp: setUp,
                test: function () {}
            });

            var testRun = this.runner.runContext(context).then(test.end(function () {
                assert(setUp.calledOnce);
            }));

            refute(setUp.calledOnce);
            buster.nextTick(function () {
                doneCb();
            });
        },

        "does not reject if contextSetUp fails": function (test) {
            var prepare = sinon.stub().throws();
            var context = testCase("Test", {
                prepare: prepare,
                test: sinon.spy()
            });

            this.runner.runContext(context).then(function () {
                test.end();
            }, function () {
                assert.fail();
            });
        },

        "does not call setUp if prepare throws": function (test) {
            var setUp = sinon.spy();
            var prepare = sinon.stub().throws();
            var context = testCase("Test", {
                setUp: setUp,
                prepare: prepare,
                test: function () {}
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(!setUp.called);
            }));
        },

        "does not call setUp if prepare rejects": function (test) {
            var deferred = when.defer();
            var setUp = sinon.spy();
            var prepare = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", {
                prepare: prepare,
                setUp: setUp,
                test: function () {}
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(!setUp.called);
            }));

            deferred.resolver.reject();
        },

        "emits uncaughtException if prepare rejects": function (test) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var prepare = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { prepare: prepare });

            this.runner.runContext(context).then(test.end(function () {
                assert(listener.called);
            }));

            deferred.resolver.reject();
        },

        "emits uncaughtException if prepare throws": function (test) {
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var prepare = sinon.stub().throws();
            var context = testCase("Test", { prepare: prepare });

            this.runner.runContext(context).then(test.end(function () {
                assert(listener.called);
            }));
        },

        "emits uncaughtException if prepare times out": function (test) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var prepare = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { prepare: prepare });

            this.runner.runContext(context).then(test.end(function () {
                assert(listener.called);
            }));
        },

        "times out prepare after custom timeout": function (test) {
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var context = testCase("Test", {
                prepare: function (done) { this.timeout = 100; }
            });

            this.runner.runContext(context);

            setTimeout(test.end(function () {
                assert(listener.called);
            }), 150);
        }
    });

    bu.testCase("TestRunnerContextTearDownTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "contextTearDown this is prototype of test function this": function (test) {
            var conclude = sinon.spy();
            var tfn = sinon.spy();
            var context = testCase("Test", { conclude: conclude, test: tfn });

            this.runner.runContext(context).then(test.end(function () {
                assert(conclude.calledOnce);
                assert.hasPrototype(tfn.thisValues[0], conclude.thisValues[0]);
            }));
        },

        "contextTearDown is only called once": function (test) {
            var conclude = sinon.spy();
            var context = testCase("Test", {
                conclude: conclude,
                test1: function () {},
                test2: function () {},
                test3: function () {},
                ctx2: {
                    test4: function () {},
                    test5: function () {}
                }
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(conclude.calledOnce);
            }));
        },

        "calls conclude after tearDown": function (test) {
            var conclude = sinon.spy();
            var tearDown = sinon.spy();
            var context = testCase("Test", {
                conclude: conclude,
                tearDown: tearDown,
                test: function () {}
            });

            this.runner.runContext(context).then(test.end(function () {
                assert(conclude.calledAfter(tearDown));
            }));
        },

        "does not finish until conclude resolves": function (test) {
            var listener = sinon.spy();
            this.runner.on("context:end", listener);
            var doneCb;
            var conclude = function (done) { doneCb = done; };
            var context = testCase("Test", {
                conclude: conclude,
                test: function () {}
            });
            
            var testRun = this.runner.runContext(context).then(test.end(function () {
                assert(listener.calledOnce);
            }));

            refute(listener.calledOnce);
            buster.nextTick(function () {
                doneCb();
            });
        },

        "does not reject if contextTearDown fails": function (test) {
            var conclude = sinon.stub().throws();
            var context = testCase("Test", {
                conclude: conclude,
                test: sinon.spy()
            });

            this.runner.runContext(context).then(function () {
                test.end();
            }, function () {
                assert.fail();
            });
        },

        "emits uncaughtException if conclude rejects": function (test) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var conclude = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { conclude: conclude });

            this.runner.runContext(context).then(test.end(function () {
                assert(listener.called);
            }));

            deferred.resolver.reject();
        },

        "emits uncaughtException if conclude throws": function (test) {
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var conclude = sinon.stub().throws();
            var context = testCase("Test", { conclude: conclude });

            this.runner.runContext(context).then(test.end(function () {
                assert(listener.called);
            }));
        },

        "emits uncaughtException if conclude times out": function (test) {
            var deferred = when.defer();
            var listener = sinon.spy();
            this.runner.on("uncaughtException", listener);
            var conclude = sinon.stub().returns(deferred.promise);
            var context = testCase("Test", { conclude: conclude });

            this.runner.runContext(context).then(test.end(function () {
                assert(listener.called);
            }));
        }
    });

    bu.testCase("TestRunnerFocusTest", {
        setUp: function () {
            this.runner = testRunner.create();
        },

        "runs focused test": function (test) {
            var tfn = sinon.spy();
            var context = testCase("Test", { "=> do it": tfn });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(tfn.calledOnce);
            }));
        },

        "only runs focused test": function (test) {
            var focused = sinon.spy();
            var unfocused = sinon.spy();
            var context = testCase("Test", {
                "=> do it": focused,
                "don't do it": unfocused
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(focused.calledOnce);
                refute(unfocused.called);
            }));
        },

        "runs nested focused test": function (test) {
            var focused = sinon.spy();
            var unfocused = sinon.spy();
            var context = testCase("Test", {
                "don't do it": unfocused,
                "nested": {
                    "=> do it": focused
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(focused.calledOnce);
                refute(unfocused.called);
            }));
        },

        "runs all focused tests": function (test) {
            var focused = sinon.spy();
            var context = testCase("Test", {
                "=> nested": {
                    "don't do it": focused,
                    "do it": focused
                }
            });

            this.runner.runSuite([context]).then(test.end(function () {
                assert(focused.calledTwice);
            }));
        },

        "emits runner:focus event": function (test) {
            var context = testCase("Test", {
                "=>don't do it": function () {}
            });

            this.runner.on("runner:focus", test.end(function () {}));
            this.runner.runSuite([context]);
        }
    });
}(this.buster, this.sinon, this.when));