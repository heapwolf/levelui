require("../lib/buster-sinon");
var buster = require("buster-test");
buster.assertions = require("buster-assertions");
var assert = buster.assertions.assert;
var refute = buster.assertions.refute;
var expect = buster.assertions.expect;
var sinon = require("sinon");

function assertRequiresFunction(assertion) {
    var args = [32].concat([].slice.call(arguments, 1));

    return function () {
        try {
            assert[assertion].apply(assert, args);
        } catch (e) {
            assert.match(e.message, "32 is not a function");
        }

        try {
            refute[assertion].apply(assert, args);
        } catch (e) {
            assert.match(e.message, "32 is not a function");
        }
    };
}

function assertRequiresSpy(assertion) {
    var args = [function () {}].concat([].slice.call(arguments, 1));

    return function () {
        try {
            assert[assertion].apply(assert, args);
        } catch (e) {
            assert.match(e.message, "is not stubbed");
        }

        try {
            refute[assertion].apply(assert, args);
        } catch (e) {
            assert.match(e.message, "is not stubbed");
        }
    };
}

var testCase = buster.testCase("buster-sinon", {
    "assertions": {
        "formats assert messages": function () {
            var message;
            var spy = sinon.spy();
            spy({ id: 42 });

            try {
                sinon.assert.calledWith(spy, 3);
            } catch (e) {
                message = e.message;
            }

            assert.match(message, "{ id: 42 }");
        },

        "calledWith": {
            "fails when not called with function": assertRequiresFunction("calledWith"),
            "fails when not called with spy": assertRequiresSpy("calledWith"),

            "passes when spy is explicitly passed null": function () {
                var spy = sinon.spy();
                spy(null, "Hey");

                refute.calledWith(spy, null, "Hey!");
            },

            "formats message nicely": function () {
                var spy = sinon.spy();
                spy(null, 1, 2);

                try {
                    assert.calledWith(spy, null, 2, 2);
                } catch (e) {
                    assert.equals(e.message, "[assert.calledWith] Expected spy to be called with arguments null, 2, 2\n    spy(null, 1, 2)");
                }
            }
        },

        "calledWithExactly": {
            "fails when not called with function": assertRequiresFunction("calledWithExactly"),
            "fails when not called with spy": assertRequiresSpy("calledWithExactly"),

            "passes when spy is explicitly passed null": function () {
                var spy = sinon.spy();
                spy(null, "Hey");

                refute.calledWithExactly(spy, null, "Hey!");
            },

            "formats message nicely": function () {
                var spy = sinon.spy();
                spy(null, 1, 2);

                try {
                    assert.calledWithExactly(spy, null, 2, 2);
                } catch (e) {
                    assert.equals(e.message, "[assert.calledWithExactly] Expected spy to be called with exact arguments null, 2, 2\n    spy(null, 1, 2)");
                }
            }
        },

        "calledOnce": {
            "fails when not called with function": assertRequiresFunction("calledOnce"),
            "fails when not called with spy": assertRequiresSpy("calledOnce"),

            "passes when called once": function () {
                var spy = sinon.spy();
                spy(null, "Hey");

                assert.calledOnce(spy);
            },

            "formats message nicely": function () {
                try {
                    assert.calledOnce(sinon.spy());
                } catch (e) {
                    assert.equals(e.message, "[assert.calledOnce] Expected spy to be called once but was called 0 times");
                }
            }
        },

        "called": {
            "fails when not called with function": assertRequiresFunction("called"),
            "fails when not called with spy": assertRequiresSpy("called"),

            "passes when called once": function () {
                var spy = sinon.spy();
                spy(null, "Hey");

                assert.called(spy);
            },

            "formats message": function () {
                try {
                    assert.called(sinon.spy());
                } catch (e) {
                    assert.equals(e.message, "[assert.called] Expected spy to be called at least once but was never called");
                }
            }
        },

        "callOrder": {
            "fails when not called with function": assertRequiresFunction("callOrder"),
            "fails when not called with spy": assertRequiresSpy("callOrder"),

            "passes when called in order": function () {
                var spies = [sinon.spy(), sinon.spy()];
                spies[0]();
                spies[1]();

                assert.callOrder(spies[0], spies[1]);
            },
            
            "passes when called in order using an array": function () {
                var spies = [sinon.spy(), sinon.spy()];
                spies[0]();
                spies[1]();

                assert.callOrder(spies);
            },

            "formats message": function () {
                var spies = [sinon.spy(), sinon.spy()];
                spies[1]();
                spies[0]();

                try {
                    assert.callOrder(spies[0], spies[1]);
                } catch (e) {
                    assert.equals(e.message, "[assert.callOrder] Expected 0, 1 to be called in order but were called as 1, 0");
                }
            }
        },

        "calledOn": {
            "fails when not called with function": assertRequiresFunction("calledOn", {}),
            "fails when not called with spy": assertRequiresSpy("calledOn", {}),

            "passes when called on object": function () {
                var spy = sinon.spy();
                var object = { id: 42 };
                spy.call(object);

                assert.calledOn(spy, object);
            },

            "formats message": function () {
                var spy = sinon.spy();
                var object = { id: 42 };
                spy.call(object);

                try {
                    assert.calledOn(spy, { id: 12 });
                } catch (e) {
                    assert.equals(e.message, "[assert.calledOn] Expected spy to be called with [object Object] as this but was called on { id: 42 }");
                }
            }
        },

        "alwaysCalledOn": {
            "fails when not called with function": assertRequiresFunction("alwaysCalledOn", {}),
            "fails when not called with spy": assertRequiresSpy("alwaysCalledOn", {}),

            "passes when called on object": function () {
                var spy = sinon.spy();
                var object = { id: 42 };
                spy.call(object);

                assert.alwaysCalledOn(spy, object);
            },

            "formats message": function () {
                var spy = sinon.spy();
                var object = { id: 42 };
                spy.call(object);

                try {
                    assert.alwaysCalledOn(spy, { id: 12 });
                } catch (e) {
                    assert.equals(e.message, "[assert.alwaysCalledOn] Expected spy to always be called with [object Object] as this but was called on { id: 42 }");
                }
            }
        },

        "alwaysCalledWith": {
            "fails when not called with function": assertRequiresFunction("alwaysCalledWith"),
            "fails when not called with spy": assertRequiresSpy("alwaysCalledWith"),

            "passes when always called with object": function () {
                var spy = sinon.spy();
                spy(42);
                spy(42);

                assert.alwaysCalledWith(spy, 42);
            },

            "formats message": function () {
                var spy = sinon.spy();
                spy(42);

                try {
                    assert.alwaysCalledWith(spy, 12);
                } catch (e) {
                    assert.equals(e.message, "[assert.alwaysCalledWith] Expected spy to always be called with arguments 12\n    spy(42)");
                }
            }
        },

        "alwaysCalledWithExactly": {
            "fails when not called with function": assertRequiresFunction("alwaysCalledWithExactly"),
            "fails when not called with spy": assertRequiresSpy("alwaysCalledWithExactly"),

            "fails when spy is explicitly passed null": function () {
                var spy = sinon.spy();
                spy(null, "Hey");

                refute.alwaysCalledWithExactly(spy, null, "Hey!");
            },

            "formats message nicely": function () {
                var spy = sinon.spy();
                spy(null, 1, 2);

                try {
                    assert.alwaysCalledWithExactly(spy, null, 2, 2);
                } catch (e) {
                    assert.equals(e.message, "[assert.alwaysCalledWithExactly] Expected spy to always be called with exact arguments null, 2, 2\n    spy(null, 1, 2)");
                }
            }
        },

        "threw": {
            "fails when not called with function": assertRequiresFunction("threw"),
            "fails when not called with spy": assertRequiresSpy("threw"),

            "passes when spy threw": function () {
                var spy = sinon.stub().throws();
                try { spy(); } catch (e) {}
                assert.threw(spy);
            },

            "formats message nicely": function () {
                var spy = sinon.spy();

                try {
                    assert.threw(spy);
                } catch (e) {
                    assert.equals(e.message, "[assert.threw] Expected spy to throw an exception");
                }
            }
        },

        "alwaysThrew": {
            "fails when not called with function": assertRequiresFunction("alwaysThrew"),
            "fails when not called with spy": assertRequiresSpy("alwaysThrew"),

            "passes when spy always threw": function () {
                var spy = sinon.stub().throws();
                try { spy(); } catch (e) {}
                assert.alwaysThrew(spy);
            },

            "formats message nicely": function () {
                var spy = sinon.spy();

                try {
                    assert.alwaysThrew(spy);
                } catch (e) {
                    assert.equals(e.message, "[assert.alwaysThrew] Expected spy to always throw an exception");
                }
            }
        },

        "calledOnceWith": {
            "fails when not called with function": assertRequiresFunction("calledOnceWith"),
            "fails when not called with spy": assertRequiresSpy("calledOnceWith"),


            "passes when called once with object": function () {
                var spy = sinon.spy();
                spy(42);

                assert.calledOnceWith(spy, 42);
            },

            "fails when not called": function () {
                var spy = sinon.spy();
                refute.calledOnceWith(spy, 42);
            },

            "fails when not called with argument": function () {
                var spy = sinon.spy();
                spy();
                refute.calledOnceWith(spy, 42);
            },

            "fails when called twice": function () {
                var spy = sinon.spy();
                spy(42);
                spy(42);
                refute.calledOnceWith(spy, 42);
            },

            "formats message": function () {
                var spy = sinon.spy();
                spy(42);

                try {
                    assert.calledOnceWith(spy, 12);
                } catch (e) {
                    assert.equals(e.message, "[assert.calledOnceWith] Expected spy to be called once with arguments 12\n    spy(42)");
                }
            }
        }
    },

    "sinon assert failures": {
        "delegates to buster.assert.fail": function () {
            sinon.stub(buster.assertions, "fail");

            try {
                assert.calledOnce(sinon.spy());
            } catch (e) {}

            var called = buster.assertions.fail.calledOnce;
            buster.assertions.fail.restore();

            assert(called);
        }
    },

    "sinon assert pass": {
        "emits pass event through buster.assert": function () {
            var pass = sinon.spy();
            buster.assertions.on("pass", pass);

            var spy = sinon.spy();
            spy();
            assert.calledOnce(spy);

            assert(pass.calledOnce);
            assert(pass.calledWith("assert.calledOnce"));
        }
    },

    "sinon mock expectation failures": {
        "delegates to buster.assert.fail": function () {
            sinon.stub(buster.assertions, "fail");

            try {
                sinon.mock().never()();
            } catch (e) {}

            var called = buster.assertions.fail.calledOnce;
            buster.assertions.fail.restore();

            assert(called);
        }
    },

    "sinon mock expectation pass": {
        "emits pass event through buster.assert": function () {
            var pass = sinon.spy();
            buster.assertions.on("pass", pass);

            var expectation = sinon.mock().once();
            expectation();
            expectation.verify();

            assert(pass.calledOnce);
            assert.match(pass.args[0][0], "Expectation met");
        }
    },

    "test runner integration": {
        setUp: function () {
            this.meth = function () {};
            this.obj = { method: this.meth };
            this.runner = buster.testRunner.create();
        },

        "binds sandbox to test": function (done) {
            var obj = this.obj, meth = this.meth;

            var tc = buster.testCase("Sandbox test", {
                "test sandboxing": function () {
                    this.stub(obj, "method");
                    refute.same(obj.method, meth);
                }
            });

            this.runner.on("suite:end", function (results) {
                assert(results.ok);
                assert.same(obj.method, meth);
                done();
            });

            this.runner.runSuite([tc]);
        },

        "fails if implicit mock verification fails": function (done) {
            var obj = this.obj, meth = this.meth;

            var tc = buster.testCase("Sandbox test", {
                "test implicit verification": function () {
                    this.mock(obj).expects("method").once();
                }
            });

            this.runner.on("suite:end", done(function (results) {
                refute(results.ok);
                assert.same(obj.method, meth);
            }));

            this.runner.runSuite([tc]);
        }
    }
});

// Run
buster.testRunner.assertionCount = function () {
    return 1;
};

var runner = buster.testRunner.create();
var reporter = buster.reporters.dots.create({
    color: true, bright: true
}).listen(runner);

runner.runSuite([testCase]);