((typeof define === "function" && define.amd && function (m) { define(m); }) ||
 (typeof module === "object" && function (m) { module.exports = m(); }) ||
 function (m) { this.bane = m(); }
)(function () {
    "use strict";
    var slice = Array.prototype.slice;

    function handleError(event, error, errbacks) {
        var i, l = errbacks.length;
        if (l > 0) {
            for (i = 0; i < l; ++i) { errbacks[i](event, error); }
            return;
        }
        setTimeout(function () {
            error.message = event + " listener threw error: " + error.message;
            throw error;
        }, 0);
    }

    function assertFunction(fn) {
        if (typeof fn !== "function") {
            throw new TypeError("Listener is not function");
        }
        return fn;
    }

    /**
     * @signature var emitter = bane.createEmitter([object]);
     * 
     * Create a new event emitter. If an object is passed, it will be modified
     * by adding the event emitter methods (see below).
     */
    function createEventEmitter(object) {
        object = object || {};
        var listeners = {};
        var supervisors = [];
        var errbacks = [];

        function notifyListener(event, listener, args) {
            try {
                listener.listener.apply(listener.thisp || object, args);
            } catch (e) {
                handleError(event, e, errbacks);
            }
        }

        object.on = function (event, listener, thisp) {
            if (typeof event === "function") {
                return supervisors.push({ listener: event, thisp: listener });
            }
            (listeners[event] = listeners[event] || []).push({
                listener: assertFunction(listener),
                thisp: thisp
            });
        };

        object.off = function (event, listener) {
            var fns = listeners[event] || [], i, l;
            for (i = 0, l = fns.length; i < l; ++i) {
                if (fns[i].listener === listener) {
                    fns.splice(i, 1);
                    return;
                }
            }
        };

        object.once = function (event, listener, thisp) {
            var wrapper = function () {
                object.off(event, wrapper);
                listener.apply(this, arguments);
            };

            object.on(event, wrapper, thisp);
        };

        object.bind = function (object, events) {
            var prop, i, l;
            if (!events) {
                for (prop in object) {
                    if (object.hasOwnProperty(prop) &&
                            typeof object[prop] === "function") {
                        this.on(prop, object[prop], object);
                    }
                }
            } else {
                for (i = 0, l = events.length; i < l; ++i) {
                    if (typeof object[events[i]] === "function") {
                        this.on(events[i], object[events[i]], object);
                    } else {
                        throw new Error("No such method " + events[i]);
                    }
                }
            }
            return object;
        };

        object.emit = function (event) {
            var toNotify = (listeners[event] || []).slice();
            var args = slice.call(arguments, 1), i, l;

            for (i = 0, l = toNotify.length; i < l; i++) {
                notifyListener(event, toNotify[i], args);
            }

            toNotify = supervisors || [];
            args = slice.call(arguments);
            for (i = 0, l = toNotify.length; i < l; ++i) {
                notifyListener(event, toNotify[i], args);
            }
        };

        object.errback = function (listener) {
            errbacks.push(assertFunction(listener));
        };

        return object;
    }

    return { createEventEmitter: createEventEmitter };
});
