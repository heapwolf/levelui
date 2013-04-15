var bane = require("bane");
var when = require("when");
var fs = require("fs");
var uuid = require("node-uuid");
var rampResources = require("ramp-resources");

var libraries = [
    require.resolve("buster-core"),
    require.resolve("./prison-util"),
    require.resolve("./prison-session-initializer")
];

var baseSessionRS = rampResources.createResourceSet();
baseSessionRS.addResources(libraries.map(function (path) {
    return {path: path, content: fs.readFileSync(path)};
}).concat([{path: "/_session_internals.js", combine: libraries}]))
    .then(function () {
        baseSessionRS.loadPath.append("/_session_internals.js");
    });

function setResourcesPath(session, sessionData) {
    if (sessionData.staticResourcesPath) {
        session.resourcesPath = "/sessions/static";
    } else {
        session.resourcesPath = session.path + "/resources";
    }

    delete sessionData.staticResourcesPath;
}

module.exports = bane.createEventEmitter({
    create: function (sessionData, pubsubServer) {
        var deferred = when.defer();

        var instance = Object.create(this);
        instance.id = uuid();
        instance.path = "/sessions/" + instance.id;
        instance.messagingPath = instance.path + "/messaging/public";
        instance.privateMessagingPath = instance.path + "/messaging/private";
        instance.state = {
            started: {reached: false},
            loaded: {reached: false},
            ended: {reached: false},
            unloaded: {reached: false}
        };
        setResourcesPath(instance, sessionData);

        instance.clientPubsubId = sessionData.pubsubConnectionId;
        delete sessionData.pubsubConnectionId;

        var serializedResourceSet = sessionData.resourceSet;
        delete sessionData.resourceSet;

        var allProps = Object.keys(sessionData);
        if (allProps.length > 0) {
            deferred.reject({
                message: "Unknown property '" + allProps[0] + "'."
            });
        } else {
            rampResources.deserialize(serializedResourceSet)
                .then(function (resourceSet) {
                    instance.resourceSet = baseSessionRS.concat(resourceSet);
                    instance._pubsubServerAttach(pubsubServer);
                    deferred.resolve(instance);
                }, function (err) {
                    deferred.reject(err);
                });
        }

        return deferred.promise;
    },

    serialize: function () {
        return {
            id: this.id,
            resourcesPath: this.resourcesPath,
            messagingPath: this.messagingPath,
            privateMessagingPath: this.privateMessagingPath,
            state: this.state
        };
    },

    started: function () {
        this.state.started.reached = true;
        this._emitState();
    },

    loaded: function (slaves) {
        var serializedSlaves = slaves.map(function (s) {
            return s.serialize();
        });

        this.state.loaded.reached = true;
        this.state.loaded.data = serializedSlaves;
        this._emitState();
    },

    aborted: function (err) {
        this.abortedError = err.message;
        this._emitState();
    },

    ended: function () {
        this.state.ended.reached = true;
        this._emitState();
    },

    unloaded: function () {
        this.state.unloaded.reached = true;
        this._emitState();
    },

    freedSlave: function (slave, slaves) {
        this._privatePubsubClient.emit("slave:freed", {
            slave: slave.serialize(),
            slaves: slaves.map(function (s) { return s.serialize(); })
        });
    },

    teardown: function () {
        this._ended = true;
        this._privatePubsubClient.disconnect();
        delete this._privatePubsubClient;
        // TODO: Unsubscribe from all events for this client
    },

    _emitState: function () {
        this._privatePubsubClient.emit("state", {
            state: this.state,
            aborted: this.abortedError
        });
    },

    _end: function () {
        this._ended = true;
        this.emit("end");
    },

    _pubsubServerAttach: function (pubsubServer) {
        pubsubServer.onDisconnect(this.clientPubsubId).then(function () {
            this._end();
        }.bind(this));

        this._privatePubsubClient = pubsubServer.createClient(
            this.privateMessagingPath
        );

        this._privatePubsubClient.on("end", function () {
            this._end();
        }.bind(this));

        this._privatePubsubClient.on("initialize", function (e) {
            // By the time we get here, we might have disconnected already.
            if (this._ended) return;

            this._emitState();
        }.bind(this));
    }
});
