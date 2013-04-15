if (typeof module === "object" && typeof require === "function") {
    var buster = require("buster");
    var bane = require("../lib/bane");
}

buster.testCase("bane", {
    ".create": {
        "returns event emitter": function () {
            var emitter = bane.createEventEmitter();

            assert.isObject(emitter);
            assert.isFunction(emitter.on);
            assert.isFunction(emitter.emit);
        },

        "returns and extends existing object": function () {
            var object = {};
            var emitter = bane.createEventEmitter(object);

            assert.same(object, emitter);
            assert.isFunction(emitter.on);
            assert.isFunction(emitter.emit);
        }
    },

    ".on": {
        "throws for uncallable listener": function () {
            var emitter = bane.createEventEmitter();

            assert.exception(function () {
                emitter.on("event", {});
            });
        },

        "supervisor is notified of all events": function () {
            var supervisor = this.spy();
            var emitter = bane.createEventEmitter();

            emitter.on(supervisor);
            emitter.emit("something", 42);
            emitter.emit("stuff", { id: 13 });

            assert.calledTwice(supervisor);
            assert.calledWith(supervisor, "something", 42);
        }
    },

    ".errback": {
        "fails when passing non-function": function () {
            var emitter = bane.createEventEmitter();
            assert.exception(function () {
                emitter.errback({});
            });
        }
    },

    ".emit": {
        "calls all listeners": function () {
            var emitter = bane.createEventEmitter();
            var listeners = [this.spy(), this.spy()];
            emitter.on("event", listeners[0]);
            emitter.on("event", listeners[1]);

            emitter.emit("event");

            assert.called(listeners[0]);
            assert.called(listeners[1]);
        },

        "calls all listeners with correct this object": function () {
            var emitter = bane.createEventEmitter();
            var listeners = [this.spy(), this.spy()];
            var obj = {};
            emitter.on("event", listeners[0], obj);
            emitter.on("event", listeners[1]);

            emitter.emit("event");

            assert.calledOn(listeners[0], obj);
            assert.calledOn(listeners[1], emitter);
        },

        "passes through arguments": function () {
            var emitter = bane.createEventEmitter();
            var listener = this.spy();

            emitter.on("event", listener);
            emitter.emit("event", "String", 1, 32);

            assert.calledWith(listener, "String", 1, 32);
        },

        "emits all even when some fail": function () {
            var emitter = bane.createEventEmitter();
            var listeners = [
                this.stub().throws("I'm thrown on purpose"),
                this.spy()
            ];

            emitter.on("event", listeners[0]);
            emitter.on("event", listeners[1]);

            emitter.emit("event");

            assert.called(listeners[1]);
        },

        "passes error to errback": function () {
            var emitter = bane.createEventEmitter();
            var errback = this.spy();
            emitter.errback(errback);

            emitter.on("event", this.stub().throws());
            emitter.emit("event");

            assert.calledOnce(errback);
        },

        "calls listeners in the order they were added": function () {
            var emitter = bane.createEventEmitter();
            var listeners = [this.spy(), this.spy()];

            emitter.on("event", listeners[0]);
            emitter.on("event", listeners[1]);

            emitter.emit("event");

            assert.callOrder(listeners[0], listeners[1]);
        },

        "does not fail if no listeners": function () {
            var emitter = bane.createEventEmitter();

            refute.exception(function () {
                emitter.emit("event");
            });
        },

        "only notifies relevant listeners": function () {
            var emitter = bane.createEventEmitter();
            var listeners = [this.spy(), this.spy()];

            emitter.on("event", listeners[0]);
            emitter.on("other", listeners[1]);

            emitter.emit("other");

            assert.called(listeners[1]);
            refute.called(listeners[0]);
        },

        // AKA "creates extensible emitters"
        "does not emit events to other emitter's listeners": function () {
            function Thing() {}
            Thing.prototype = bane.createEventEmitter();
            var emitter1 = new Thing();
            var emitter2 = new Thing();
            var listener = this.spy();
            emitter1.on("ouch", listener);

            emitter2.emit("ouch");

            refute.called(listener);
        }
    },

    ".bind": {
        "returns object bound to": function () {
            var listener = { doIt: function () {} };
            var result = bane.createEventEmitter().bind(listener, ["doIt"]);

            assert.same(result, listener);
        },

        "binds to method named after event": function () {
            var emitter = bane.createEventEmitter();
            var listener = { doIt: this.spy() };

            emitter.bind(listener);
            emitter.emit("doIt", 42);

            assert.calledOnceWith(listener.doIt, 42);
            assert.calledOn(listener.doIt, listener);
        },

        "binds all methods as listeners to corresponding events": function () {
            var emitter = bane.createEventEmitter();
            var listener = {
                complete: this.spy(),
                failure: this.spy(),
                success: this.spy()
            };

            emitter.bind(listener);
            emitter.emit("complete");
            emitter.emit("failure");
            emitter.emit("success");

            assert.calledOnce(listener.complete);
            assert.calledOnce(listener.failure);
            assert.calledOnce(listener.success);
        },

        "binds inherited methods": function () {
            var emitter = bane.createEventEmitter();
            function F() {}
            F.prototype = { something: this.spy() };
            var listener = new F();
            listener.failure = function () {};

            emitter.bind(listener);
            emitter.emit("something");

            assert.calledOnce(F.prototype.something);
        },

        "binds array of methods/events": function () {
            var emitter = bane.createEventEmitter();
            var listener = {
                one: this.spy(),
                two: this.spy(),
                three: this.spy()
            };

            emitter.bind(listener, ["one", "three"]);
            emitter.emit("one");
            emitter.emit("two");
            emitter.emit("three");

            assert.called(listener.one);
            assert.calledOn(listener.one, listener);
            refute.called(listener.two);
            assert.called(listener.three);
        },

        "fails array when binding non-existent method": function () {
            var emitter = bane.createEventEmitter();
            var listener = {};

            assert.exception(function () {
                emitter.bind(listener, ["one"]);
            });
        }
    },

    ".off": {
        "removes listener": function () {
            var listener = this.spy();
            var emitter = bane.createEventEmitter();

            emitter.on("event", listener);
            emitter.off("event", listener);
            emitter.emit("event");

            refute.called(listener);
        },

        "should not remove listener for other event": function () {
            var listener = this.spy();
            var emitter = bane.createEventEmitter();

            emitter.on("event", listener);
            emitter.off("event2", listener);
            emitter.emit("event");
            emitter.emit("event2");

            assert.calledOnce(listener);
        },

        "should not remove other listeners": function () {
            var listeners = [this.spy(), this.spy(), this.spy()];
            var emitter = bane.createEventEmitter();

            emitter.on("event", listeners[0]);
            emitter.on("event", listeners[1]);
            emitter.on("event", listeners[2]);
            emitter.off("event", listeners[1]);
            emitter.emit("event");

            assert.calledOnce(listeners[0]);
            refute.calledOnce(listeners[1]);
            assert.calledOnce(listeners[2]);
        },

        "should remove listener in other listener for same event": function () {
            var emitter = bane.createEventEmitter();
            var listener = this.spy();

            emitter.on("foo", function () {
                emitter.off("foo", listener);
            });
            emitter.on("foo", listener);
            emitter.emit("foo");
            emitter.emit("foo");

            assert.calledOnce(listener);
        }
    },

    ".once": {
        "is only called once": function () {
            var listener = this.spy();
            var emitter = bane.createEventEmitter();

            emitter.once("event", listener);
            emitter.emit("event");
            emitter.emit("event");

            assert.calledOnce(listener);
        },

        "is called with emitted arguments": function () {
            var listener = this.spy();
            var emitter = bane.createEventEmitter();

            emitter.once("event", listener);
            emitter.emit("event", "foo", 1);

            assert.calledWithExactly(listener, "foo", 1);
        },

        "is called with context": function () {
            var emitter = bane.createEventEmitter();
            var listener = function () { this.foo = "bar"; };
            var obj = {};

            emitter.on("event", listener, obj);
            emitter.emit("event");

            assert.equals("bar", obj.foo);
        }
    }
});
