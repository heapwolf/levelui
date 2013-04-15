/*jslint maxlen: 88*/
var buster = buster || {};

(function (B, when) {
    var isNode = typeof require === "function" && typeof module === "object";
    var onUncaught = function () {};

    if (isNode) {
        B = require("buster-core");
        when = require("when");
    }

    var partial = B.partial, bind = B.bind;
    var each = B.each, map = B.map, series = B.series;

    // Events

    var errorEvents = {
        "TimeoutError": "test:timeout",
        "AssertionError": "test:failure",
        "DeferredTestError": "test:deferred"
    };

    function emit(runner, event, test, err, thisp) {
        var data = { name: test.name };
        if (err) { data.error = err; }
        if (typeof test.func === "string") { data.comment = test.func; }
        if (thisp) { data.testCase = thisp; }
        if (event === "test:success") { data.assertions = runner.assertionCount(); }
        runner.emit(event, data);
    }

    function emitTestAsync(runner, test) {
        if (test && !test.async && !test.deferred) {
            test.async = true;
            emit(runner, "test:async", test);
        }
    }

    function testResult(runner, test, err) {
        if (!test) { return runner.emit("uncaughtException", err); }
        if (test.complete) { return; }
        test.complete = true;
        var event = "test:success";

        if (err) {
            event = errorEvents[err.name] || "test:error";
            if (err.name == "TimeoutError") { emitTestAsync(runner, test); }
        }

        emit(runner, event, test, err);

        if (event === "test:error") { runner.results.errors += 1; }
        if (event === "test:failure") { runner.results.failures += 1; }
        if (event === "test:timeout") { runner.results.timeouts += 1; }
        if (event === "test:deferred") {
            runner.results.deferred += 1;
        } else {
            runner.results.assertions += runner.assertionCount();
            runner.results.tests += 1;
        }
    }

    function emitIfAsync(runner, test, isAsync) {
        if (isAsync) { emitTestAsync(runner, test); }
    }

    function emitUnsupported(runner, context, requirements) {
        runner.emit("context:unsupported", {
            context: context,
            unsupported: requirements
        });
    }

    // Data helper functions
    function byRandom() {
        return Math.round(Math.random() * 2) - 1;
    }

    function tests(context) {
        return context.tests.sort(byRandom);
    }

    function setUps(context) {
        var setUpFns = [];
        while (context) {
            if (context.setUp) {
                setUpFns.unshift(context.setUp);
            }
            context = context.parent;
        }
        return setUpFns;
    }

    function tearDowns(context) {
        var tearDownFns = [];
        while (context) {
            if (context.tearDown) {
                tearDownFns.push(context.tearDown);
            }
            context = context.parent;
        }
        return tearDownFns;
    }

    function satiesfiesRequirement(requirement) {
        if (typeof requirement === "function") {
            return !!requirement();
        }
        return !!requirement;
    }

    function unsatiesfiedRequirements(context) {
        var name, requirements = context.requiresSupportForAll || {};
        for (name in requirements) {
            if (!satiesfiesRequirement(requirements[name])) {
                return [name];
            }
        }
        var unsatiesfied = [];
        requirements = context.requiresSupportForAny || {};
        for (name in requirements) {
            if (satiesfiesRequirement(requirements[name])) {
                return [];
            } else {
                unsatiesfied.push(name);
            }
        }
        return unsatiesfied;
    }

    function isAssertionError(err) {
        return err && err.name === "AssertionError";
    }

    function prepareResults(results) {
        return B.extend(results, {
            ok: results.failures + results.errors + results.timeouts === 0
        });
    }

    function propWithDefault(obj, prop, defaultValue) {
        return obj && obj.hasOwnProperty(prop) ? obj[prop] : defaultValue;
    }

    // Async flow

    function promiseSeries(objects, fn) {
        var deferred = when.defer();
        B.series(map(objects, function (obj) {
            return function () {
                return fn(obj);
            };
        }), function (err) {
            if (err) {
                return deferred.resolver.reject(err);
            }
            deferred.resolver.resolve();
        });
        return deferred.promise;
    }

    function asyncDone(resolver) {
        function resolve(method, err) {
            try {
                resolver[method](err);
            } catch (e) {
                throw new Error("done() was already called");
            }
        }

        return function (fn) {
            if (typeof fn != "function") { return resolve("resolve"); }
            return function () {
                try {
                    var retVal = fn.apply(this, arguments);
                    resolve("resolve");
                    return retVal;
                } catch (up) {
                    resolve("reject", up);
                }
            };
        };
    }

    function asyncFunction(fn, thisp) {
        if (fn.length > 0) {
            var deferred = when.defer();
            fn.call(thisp, asyncDone(deferred.resolver));
            return deferred.promise;
        }
        return fn.call(thisp);
    }

    function timeoutError(ms) {
        return {
            name: "TimeoutError",
            message: "Timed out after " + ms + "ms"
        };
    }

    function timebox(promise, timeout, callbacks) {
        var timedout, complete, timer;
        function handler(method) {
            return function () {
                complete = true;
                clearTimeout(timer);
                if (!timedout) { callbacks[method].apply(this, arguments); }
            };
        }
        when(promise).then(handler("resolve"), handler("reject"));
        var ms = typeof timeout === "function" ? timeout() : timeout;
        timer = setTimeout(function () {
            timedout = true;
            if (!complete) { callbacks.timeout(timeoutError(ms)); }
        }, ms);
    }

    function callAndWait(func, thisp, timeout, next) {
        var reject = function (err) { next(err || {}); };
        var promise = asyncFunction(func, thisp);
        timebox(promise, timeout, {
            resolve: partial(next, null),
            reject: reject,
            timeout: reject
        });
        return promise;
    }

    function callSerially(functions, thisp, timeout, source) {
        var d = when.defer();
        var fns = functions.slice();
        var isAsync = false;
        function next(err) {
            if (err) {
                err.source = source;
                return d.resolver.reject(err);
            }
            if (fns.length === 0) { return d.resolver.resolve(isAsync); }
            try {
                var promise = callAndWait(fns.shift(), thisp, timeout, next);
                isAsync = isAsync || when.isPromise(promise);
            } catch (e) {
                return d.resolver.reject(e);
            }
        }
        next();
        return d.promise;
    }

    function asyncWhen(value) {
        if (when.isPromise(value)) {
            return value;
        } else {
            var d = when.defer();
            B.nextTick(partial(d.resolver.resolve, value));
            return d.promise;
        }
    }

    function chainPromises(fn, resolution) {
        var r = typeof resolution === "function" ?
            [resolution, resolution] : resolution;
        return function () {
            fn().then(partial(resolution, null), r[0], r[1]);
        };
    }

    function rejected(deferred) {
        if (!deferred) {
            deferred = when.defer();
        }
        deferred.resolver.reject();
        return deferred.promise;
    }

    function listenForUncaughtExceptions() {
        var listener, listening = false;
        onUncaught = function (l) {
            listener = l;

            if (!listening) {
                listening = true;
                process.on("uncaughtException", function (e) {
                    if (listener) { listener(e); }
                });
            }
        };
    }

    // Private runner functions

    function callTestFn(runner, test, thisp, next) {
        emit(runner, "test:start", test, null, thisp);
        if (test.deferred) { return next({ name: "DeferredTestError" }); }

        try {
            var promise = asyncFunction(test.func, thisp);
            if (when.isPromise(promise)) { emitTestAsync(runner, test); }
            timebox(promise, thisp.timeout || runner.timeout, {
                resolve: next,
                reject: next,
                timeout: function (err) {
                    err.source = "test function";
                    next(err);
                }
            });
        } catch (e) {
            next(e);
        }
    }

    function checkAssertions(runner, expected) {
        if (runner.failOnNoAssertions && runner.assertionCount() === 0) {
            return { name: "AssertionError", message: "No assertions!" };
        }
        var actual = runner.assertionCount();
        if (typeof expected === "number" && actual !== expected) {
            return {
                name: "AssertionError",
                message: "Expected " + expected + " assertions, ran " + actual
            };
        }
    }

    function triggerOnCreate(listeners, runner) {
        each(listeners, function (listener) {
            listener(runner);
        });
    }

    function initializeResults() {
        return {
            contexts: 0,
            tests: 0,
            errors: 0,
            failures: 0,
            assertions: 0,
            timeouts: 0,
            deferred: 0
        };
    }

    function focused(items) {
        return B.filter(items, function (item) { return item.focused; });
    }

    function dynamicTimeout(testCase, runner) {
        return function () {
            return testCase.timeout || runner.timeout;
        };
    }

    var testRunner = B.extend(B.eventEmitter.create(), {
        timeout: 250,
        onCreateListeners: [],

        create: function (opt) {
            var runner = B.create(this);
            triggerOnCreate(this.onCreateListeners, runner);
            runner.results = initializeResults();
            var instance = B.extend(runner, {
                failOnNoAssertions: propWithDefault(opt, "failOnNoAssertions", false)
            });
            if (opt && typeof opt.timeout === "number") {
                instance.timeout = opt.timeout;
            }
            return instance;
        },

        onCreate: function (listener) {
            this.onCreateListeners.push(listener);
        },

        runSuite: function (contexts) {
            this.focusMode = B.some(contexts, function (c) { return c.focused; });
            this.results = initializeResults();
            onUncaught(bind(this, function (err) {
                testResult(this, this.currentTest, err);
            }));
            var d = when.defer();
            this.emit("suite:start");
            if (this.focusMode) { this.emit("runner:focus"); }
            this.results.contexts = contexts.length;
            this.runContexts(contexts).then(bind(this, function () {
                var res = prepareResults(this.results);
                this.emit("suite:end", res);
                d.resolver.resolve(res);
            }), d.resolver.reject);
            return d.promise;
        },

        runContexts: function (contexts) {
            if (this.focusMode) { contexts = focused(contexts); }
            return promiseSeries((contexts || []).sort(byRandom),
                                 bind(this, "runContext"));
        },

        runContext: function (context) {
            if (!context) { return rejected(); }
            var reqs = unsatiesfiedRequirements(context);
            if (reqs.length > 0) {
                return when(emitUnsupported(this, context, reqs));
            }
            var d = when.defer(), s = this, thisp, ctx;
            var emitAndResolve = function () {
                s.emit("context:end", context);
                d.resolver.resolve();
            };
            var end = function (err) {
                s.runContextUpDown(ctx, "contextTearDown", thisp).then(
                    emitAndResolve,
                    emitAndResolve
                );
            };
            this.emit("context:start", context);
            asyncWhen(context).then(function (c) {
                ctx = c;
                thisp = B.create(c.testCase);
                var runTests = chainPromises(
                    bind(s, "runTests", tests(c), setUps(c), tearDowns(c), thisp),
                    end
                );
                s.runContextUpDown(ctx, "contextSetUp", thisp).then(function () {
                    s.runContexts(c.contexts).then(runTests);
                }, end);
            });
            return d;
        },

        runContextUpDown: function (context, prop, thisp) {
            var fn = context[prop];
            if (!fn) { return when(); }
            var d = when.defer();
            var s = this;
            var reject = function (err) {
                err = err || new Error();
                err.message = context.name + " " + thisp.name(prop)+ "(n) "+
                     (/Timeout/.test(err.name) ?
                     "timed out" : "failed") + ": " + err.message;
                s.emit("uncaughtException", err);
                d.reject(err);
            };
            try {
                var timeout = dynamicTimeout(thisp, this);
                timebox(asyncFunction(fn, thisp), timeout, {
                    resolve: d.resolve,
                    reject: reject,
                    timeout: reject
                });
            } catch (e) {
                reject(e);
            }
            return d.promise;
        },

        callSetUps: function (test, setUps, thisp) {
            if (test.deferred) { return when(); }
            emit(this, "test:setUp", test, null, thisp);
            var timeout = dynamicTimeout(thisp, this);
            var emitAsync = partial(emitIfAsync, this, test);
            return callSerially(setUps, thisp, timeout, "setUp").then(emitAsync);
        },

        callTearDowns: function (test, tearDowns, thisp) {
            if (test.deferred) { return when(); }
            emit(this, "test:tearDown", test, null, thisp);
            var timeout = dynamicTimeout(thisp, this);
            var emitAsync = partial(emitIfAsync, this, test);
            return callSerially(tearDowns, thisp, timeout, "tearDown").then(emitAsync);
        },

        runTests: function (tests, setUps, tearDowns, thisp) {
            if (this.focusMode) { tests = focused(tests); }
            return promiseSeries(tests, bind(this, function (test) {
                return this.runTest(test, setUps, tearDowns, B.create(thisp));
            }));
        },

        runTest: function (test, setUps, tearDowns, thisp) {
            this.running = true;
            var d = when.defer();
            test = B.create(test);
            this.currentTest = test;
            var callSetUps = bind(this, "callSetUps", test, setUps, thisp);
            var callTearDowns = bind(this, "callTearDowns", test, tearDowns, thisp);
            var callTest = partial(callTestFn, this, test, thisp);
            var tearDownEmitAndResolve = bind(this, function (err) {
                var resolution = bind(this, function (err2) {
                    var e = err || err2 || this.queued;
                    this.running = false;
                    this.queued = null;
                    e = e || checkAssertions(this, thisp.expectedAssertions);
                    testResult(this, test, e);
                    delete this.currentTest;
                    d.resolver.resolve();
                });
                callTearDowns().then(partial(resolution, null), resolution);
            });
            var callTestAndTearDowns = partial(callTest, tearDownEmitAndResolve);
            callSetUps().then(callTestAndTearDowns, tearDownEmitAndResolve);
            return d.promise;
        },

        assertionCount: function () {
            return 0;
        },

        error: function (error, test) {
            if (this.running) {
                if (!this.queued) {
                    this.queued = error;
                }
                return;
            }
            testResult(this, test || this.currentTest, error);
        },

        // To be removed
        assertionFailure: function (error) {
            this.error(error);
        }
    });

    // Export module

    if (isNode) {
        listenForUncaughtExceptions();
        module.exports = testRunner;
    } else {
        B.testRunner = testRunner;
    }
}(buster, typeof when === "function" ? when : function () {}));
