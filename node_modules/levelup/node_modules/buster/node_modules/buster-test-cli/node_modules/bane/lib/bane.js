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

    function supervisors(object) {
        if (!object.supervisors) { object.supervisors = []; }
        return object.supervisors;
    }

    function listeners(object, event) {
        if (!object.listeners) { object.listeners = {}; }
        if (event && !object.listeners[event]) { object.listeners[event] = []; }
        return event ? object.listeners[event] : object.listeners;
    }

    /**
     * @signature var emitter = bane.createEmitter([object]);
     * 
     * Create a new event emitter. If an object is passed, it will be modified
     * by adding the event emitter methods (see below).
     */
    function createEventEmitter(object) {
        object = object || {};

        function notifyListener(event, listener, args) {
            try {
                listener.listener.apply(listener.thisp || object, args);
            } catch (e) {
                handleError(event, e, object.errbacks || []);
            }
        }

        object.on = function (event, listener, thisp) {
            if (typeof event === "function") {
                return supervisors(this).push({
                    listener: event,
                    thisp: listener
                });
            }
            listeners(this, event).push({
                listener: assertFunction(listener),
                thisp: thisp
            });
        };

        object.off = function (event, listener) {
            var fns = listeners(this, event), i, l;
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
            var method;

            if (!events) {
                for (method in object) {
                    if (typeof object[method] == "function") {
                        this.on(method, object[method], object);
                    }
                }
            } else if (typeof events == "string" ||
                       Object.prototype.toString.call(events) == "[object Array]") {
                events = typeof events == "string" ? [events] : events;

                for (var i = 0, l = events.length; i < l; ++i) {
                    this.on(events[i], object[events[i]], object);
                }
            } else {
                for (var prop in events) {
                    if (events.hasOwnProperty(prop)) {
                        method = events[prop];

                        if (typeof method == "function") {
                            object[buster.functionName(method) || prop] = method;
                        } else {
                            method = object[events[prop]];
                        }

                        this.on(prop, method, object);
                    }
                }
            }

            return object;
        };

        object.emit = function (event) {
            var toNotify = listeners(this, event).slice();
            var args = slice.call(arguments, 1), i, l;

            for (i = 0, l = toNotify.length; i < l; i++) {
                notifyListener(event, toNotify[i], args);
            }

            toNotify = supervisors(this);
            args = slice.call(arguments);
            for (i = 0, l = toNotify.length; i < l; ++i) {
                notifyListener(event, toNotify[i], args);
            }
        };

        object.errback = function (listener) {
            if (!this.errbacks) { this.errbacks = []; }
            this.errbacks.push(assertFunction(listener));
        };

        return object;
    }

    return { createEventEmitter: createEventEmitter };
});
