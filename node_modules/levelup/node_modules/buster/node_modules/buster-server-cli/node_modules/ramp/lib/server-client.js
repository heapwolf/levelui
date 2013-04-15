var when = require("when");
var http = require("http");
var net = require("net");
var PubSubClient = require("./pubsub-client.js");
var SessionClient = require("./session-client.js");

module.exports = {
    create: function (port, host) {
        var instance = Object.create(this);
        instance.serverHost = host;
        instance.serverPort = port;

        instance._pubsubClient = new PubSubClient({
            host: host,
            port: port
        });
        instance.disconnect = instance._pubsubClient.disconnect;
        instance.on = instance._pubsubClient.on;
        instance.emit = instance._pubsubClient.emit;
        instance._connectDeferred = when.defer();
        instance._hasAttemptedConnect = false;

        return instance;
    },

    connect: function () {
        var self = this;
        var d = this._connectDeferred;

        if (this._hasAttemptedConnect) {
            return d.promise;
        }
        self._hasAttemptedConnect = true;

        var socket = new net.Socket();
        socket.connect(this.serverPort, this.serverHost);

        socket.on("connect", function () {
            socket.destroy();
            this._pubsubClient.connect().then(function () {
                d.resolve();
            }, d.reject);
        }.bind(this));

        socket.on("error", function (e) { d.reject(e); });

        return d.promise;
    },

    _withConnect: function (onConnected) {
        var deferred = when.defer();

        this.connect().then(function () {
            onConnected().then(deferred.resolve, deferred.reject);
        }, deferred.reject);

        return deferred.promise;
    },

    createSession: function (resourceSet, opts) {
        var self = this;
        return this._withConnect(function () {
            var deferred = when.defer();
            opts = opts || {};

            if (opts.cache) {
                delete opts.cache;
                var req = self._request("GET", "/resources");
                req.then(function (res) {
                    if (res.statusCode === 200) {
                        self._createSession(resourceSet, opts, JSON.parse(res.body), deferred);
                    } else {
                        deferred.reject("Unable to get caches from server, unknown reason.");
                    }
                }, deferred.reject);
                req.end();
            } else {
                self._createSession(resourceSet, opts, null, deferred);
            }

            return deferred.promise;
        });
    },

    _createSession: function (resourceSet, opts, cacheManifest, deferred) {
        var self = this;
        resourceSet.serialize(cacheManifest).then(function (sResourceSet) {
            opts.resourceSet = sResourceSet;
            opts.pubsubConnectionId = self._pubsubClient.connectionId;
            var req = self._request("POST", "/sessions");
            req.then(function (res) {
                var body = JSON.parse(res.body);

                if (res.statusCode === 201) {
                    var sessionClient = new SessionClient(
                        body,
                        self._pubsubClient
                    );
                    deferred.resolve(sessionClient);
                } else {
                    deferred.reject(body);
                }
            }, deferred.reject);
            req.end(JSON.stringify(opts));
        }, deferred.reject);
    },

    clearCache: function () {
        return this._request("DELETE", "/resources");
    },

    setHeader: function (resourceSet, height) {
        var self = this;
        return this._withConnect(function () {
            var deferred = when.defer();
            var req = self._request("POST", "/header");
            req.then(deferred.resolve, deferred.reject);

            resourceSet.serialize().then(function (srs) {
                req.end(JSON.stringify({
                    resourceSet: srs,
                    height: height
                }));
            }, deferred.reject);

            return deferred.promise;
        });
    },

    _request: function (method, path) {
        var deferred = when.defer();

        opts = {};
        opts.method = method;
        opts.path = path;
        opts.host = this.serverHost;
        opts.port = this.serverPort;

        var req = http.request(opts, function (res) {
            var body = "";
            res.setEncoding("utf8");
            res.on("data", function (chunk) { body += chunk; });
            res.on("end", function () {
                res.body = body;
                deferred.resolve(res);
            });
        });

        req.setTimeout(2000, function () {
            deferred.reject("Timed out for HTTP request: " + JSON.stringify(opts));
            req.connection.destroy();
        });

        deferred.end = function (data) {
            req.end(data);
        };

        return deferred;
    }
};
