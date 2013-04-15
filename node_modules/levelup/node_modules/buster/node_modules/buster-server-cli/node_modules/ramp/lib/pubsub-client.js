(typeof require === "function" && typeof module === "object" ? 
 function (m) {
     module.exports = m(require("faye"), require("when"), require("node-uuid"));
 } :
 function (m) {
     if (!this.buster) { this.buster = {}; }
     if (!this.buster.captureServer) { this.buster.captureServer = {}; }
     this.buster.captureServer.PubSubClient = m(Faye, when, uuid);
 })(function (Faye, when, uuid) {
    var NOOP = function NOOP() {};
    var PUBLIC_METHODS = ["connect", "disconnect", "on", "emit"];
    var EVENT_NAME_RE = /^[a-z0-9\-\_\!\~\(\)\$\@\:]+$/i;

    function PubSubClient(opts) {
        if (opts._fayeClient) {
            this._fayeClient = opts._fayeClient;
        } else {
            this._serverHost = opts.host || "127.0.0.1";
            this._serverPort = opts.port;
            this._fayeClient = this._createFayeClient();
            this._hasOwnFayeClient = true;
        }
        this._contextPath = opts.contextPath || "";
        this.id = uuid();
        this.connectionId = this.id;
        this._onConnect = opts.onConnect || NOOP;
        this._subscriptions = [];

        function delegateMethod(self, meth) {
            var impl = self[meth];
            self[meth] = function () {
                return impl.apply(self, arguments);
            };
        }

        // TODO: find a way to test this. Currently untested.
        var i, ii;
        for (i = 0, ii = PUBLIC_METHODS.length; i < ii; i++) {
            delegateMethod(this, PUBLIC_METHODS[i]);
        }
    }

    PubSubClient.prototype = {
        connect: function () {
            var self = this;
            var deferred = when.defer();

            var initPath = "/initialize/" + this.id;
            this._fayeClient.subscribe(initPath, function () {
                self._fayeClient.unsubscribe(initPath);
                self._onConnect();
                deferred.resolve();
            }).callback(function () {
                self._fayeClient.publish(initPath, {id: self.connectionId});
            });

            // TODO: Handle timeout
            return deferred.promise;
        },

        disconnect: function () {
            if (this._hasOwnFayeClient) {
                this._fayeClient.disconnect();
            }
        },

        on: function (eventName, handler) {
            var path, _handler;

            if (arguments.length === 1) {
                handler = eventName;
                path = this._contextPath + "/user/**";
                _handler = function (e) { handler(e.eventName, e.data); };
            } else {
                path = this._contextPath + this._getEventName(eventName);
                _handler = function (e) { handler(e.data); };
            }

            var subscription = this._fayeClient.subscribe(path, _handler);
            this._subscriptions.push(subscription);
        },

        emit: function (eventName, data) {
            var path = this._contextPath + this._getEventName(eventName);
            this._fayeClient.publish(path, {
                data: data,
                eventName: eventName
            });
        },

        inherit: function (contextPath) {
            if (contextPath.length === 0) {
                throw new Error("Must set a context path");
            }

            var pubsubClient = new PubSubClient({
                _fayeClient: this._fayeClient,
                contextPath: contextPath
            });
            pubsubClient.connectionId = this.connectionId;
            return pubsubClient;
        },

        teardown: function () {
            this._subscriptions.forEach(function (s) { s.cancel(); });
        },

        _getEventName: function (eventName) {
            if (!EVENT_NAME_RE.test(eventName)) {
                throw new TypeError("Event name must match " + EVENT_NAME_RE);
            }

            return "/user/" + eventName
                .replace(/-/g, "--")
                .replace(/:/g, "-");
        },

        _createFayeClient: function () {
            var url = "http://" + this._serverHost + ":" +
                this._serverPort + "/messaging";

            return new Faye.Client(url, {
                retry: 0.5,
                timeout: 1
            });
        }
    };

    return PubSubClient;
});
