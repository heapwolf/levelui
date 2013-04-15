if (typeof module === "object" && typeof require === "function") {
    var bane = require("bane");
    var when = require("when");
    var buster = {};
}

(function () {
    var STATES = [["started", "onStart"],
                  ["loaded", "onLoad"],
                  ["ended", "onEnd"],
                  ["unloaded", "onUnload"]];

    function SessionClient(session, serverPubsub, opts) {
        this.sessionId = session.id;
        this.resourcesPath = session.resourcesPath;
        this.thisId = this.sessionId;
        this._opts = opts || {};
        this._pubsubClient = serverPubsub.inherit(session.messagingPath);
        this._privatePubsubClient = serverPubsub.inherit(
            session.privateMessagingPath
        );
        this._setUpPrivatePubsubClient();
        this._privateEventEmitter = bane.createEventEmitter();
        this.on = this._pubsubClient.on;
        this._onAbortDeferred = when.defer();
        this._stateDeferreds = {};

        function delegate(self, state) {
            var stateName = state[0];
            var handlerName = state[1];

            var deferred = when.defer();
            self._stateDeferreds[stateName] = deferred;
            self[handlerName] = function () {
                deferred.promise.then.apply(deferred.promise, arguments);
            };
        }

        var i, ii;
        for (i = 0, ii = STATES.length; i < ii; i++) {
            delegate(this, STATES[i]);
        }
    }

    buster.captureServer = buster.captureServer || {};
    buster.captureServer.SessionClient = SessionClient;
    SessionClient.prototype = {
        emit: function (event, data) {
            this._pubsubClient.emit(event, {
                data: data,
                clientId: this.clientId
            });
        },

        end: function () {
            var deferred = when.defer();
            this._privatePubsubClient.emit("end");
            this.onEnd(deferred.resolve, deferred.reject);
            return deferred.promise;
        },

        onSlaveFreed: function (func) {
            this._privateEventEmitter.on("slave:freed", func);
        },

        onAbort: function (func) {
            this._onAbortDeferred.then(func);
        },

        _setUpPrivatePubsubClient: function () {
            var self = this;

            this._privatePubsubClient.on("state", function (e) {
                self._setAborted(e.aborted);
                self._setState(e.state);
            });

            this._privatePubsubClient.on("slave:freed", function (e) {
                self._privateEventEmitter.emit("slave:freed", {
                    slave: e.slave,
                    slaves: e.slaves
                });
            });

            this._privatePubsubClient.emit("initialize");
        },

        _setAborted: function (err) {
            if (!err) { return; }
            if (this._hasAborted) { return; }

            this._hasAborted = true;
            this._onAbortDeferred.resolve({error: err});
        },

        _setState: function (states) {
            var state;
            for (state in states) {
                if (states[state].reached) {
                    this._resolveToState(state, states);
                }
            }
        },

        _resolveToState: function (toState, allStates) {
            var i, ii;
            for (i = 0, ii = STATES.length; i < ii; i++) {
                var state = STATES[i];
                var stateName = state[0];
                var handlerName = state[1];

                var deferred = this._stateDeferreds[stateName];
                try {
                    deferred.resolve(allStates[stateName].data);
                } catch (e) {}
                if (stateName === toState) { break; }
            }
        }
    };

    if (typeof module === "object" && typeof require === "function") {
        module.exports = SessionClient;
    }
}());
