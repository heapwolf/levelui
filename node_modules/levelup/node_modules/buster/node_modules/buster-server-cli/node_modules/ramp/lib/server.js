var rampResources = require("ramp-resources");
var bCapServPubsubServer = require("./pubsub-server");
var bCapServSessionQueue = require("./session-queue");
var bCapServPubsubClient = require("./pubsub-client.js");
var bCapServSlave = require("./slave.js");
var bCapServSession = require("./session");
var httpServReqListenerProxy = require("./http-server-request-listener-proxy");
var URL = require("url");
var when = require("when");
var NOOP = function () {};
var SLAVE_RE = /^\/slaves\/([a-z0-9\-]+)\/browser/;

function concatReqBody(req) {
    var deferred = when.defer();

    var body = "";
    req.setEncoding("utf8");
    req.on("data", function (chunk) { body += chunk; });
    req.on("end", function () { deferred.resolve(body); });

    return deferred.promise;
}

function failWithError(res, message) {
    res.writeHead(400);
    res.end(JSON.stringify({message: message}));
}

module.exports = {
    capturePath: "/capture",

    create: function () {
        var server = Object.create(this);
        server._pubsubServer = bCapServPubsubServer.create("/messaging");
        server._sessionQueue = bCapServSessionQueue.create();
        server._resourceMiddleware = rampResources.createMiddleware();
        server._resourceCache = rampResources.createCache();

        server._pubsubClient = server._pubsubServer.createClient();

        server._sessionQueue.on("slave:captured", function (slave) {
            server._onSlaveCaptured(slave);
        });

        server._sessionQueue.on("slave:freed", function (slave) {
            server._onSlaveFreed(slave);
        });

        server._sessionQueue.prepareSession = function (session) {
            return server._onPrepareSession(session);
        };

        server._sessionQueue.teardownSession = function (session) {
            server._onTeardownSession(session);
        };

        server.logger = {
            debug: NOOP,
            info: NOOP,
            log: NOOP,
            warn: NOOP,
            error: NOOP
        };

        return server;
    },

    get logger() {
        return this._logger;
    },

    set logger(value) {
        this._logger = value;
        this._sessionQueue.logger = value;
        this._pubsubServer.logger = value;
    },

    attach: function (httpServer) {
        this._pubsubServer.attach(httpServer);
        httpServReqListenerProxy.attach(httpServer, this._respond.bind(this));
        this._httpServer = httpServer;
    },

    setHeader: function (resourceSet, height) {
        this.hasHeader = true;
        this.headerHeight = height;
        this.headerResourceSet = resourceSet;
    },

    _slaves: function () {
        return this._sessionQueue.slaves();
    },

    slaves: function () {
        return this._slaves().map(function (s) {
            return s.serialize();
        });
    },

    _respond: function (req, res) {
        var url = URL.parse(req.url);

        if (req.method === "POST" && url.path === "/sessions") {
            this.logger.debug("POST /sessions - creating session");
            concatReqBody(req).then(function (body) {
                this._createSessionFromRequest(body, res);
            }.bind(this));
            return true;
        }

        if (req.method == "POST" && url.path == "/header") {
            concatReqBody(req).then(function (body) {
                this._setHeaderFromRequest(JSON.parse(body), res);
            }.bind(this));
            return true;
        }

        if (req.method == "GET" && url.path == this.capturePath) {
            this.logger.debug("GET " + this.capturePath + " - capturing slave");
            this._captureSlave(res);
            return true;
        }

        if (url.path === "/resources") {
            if (req.method === "GET") {
                this.logger.debug("GET /resources - listing cache");
                this._listCachedResources(res);
                return true;
            }

            if (req.method === "DELETE") {
                this.logger.debug("DELETE /resources - purging cache");
                this._purgeCachedResources(res);
                return true;
            }
        }

        if (req.method === "GET" && (SLAVE_RE).test(url.path)) {
            var uuid = url.path.match(SLAVE_RE)[1];
            // We need to get _all_ known slaves, not just the ones that are
            // 'ready' in .slaves().
            var slave = this._sessionQueue._slaves.filter(function (s) {
                return s._id === uuid;
            })[0];

            if (!slave) {
                res.writeHead(302, {"Location": this.capturePath});
                res.end();
                return true;
            }
        }

        if (this._resourceMiddleware.respond(req, res)) { return true; }
    },

    _createSessionFromRequest: function (body, res) {
        var data;
        try {
            data = JSON.parse(body);
        } catch (e) {
            return failWithError(res, "JSON parse error");
        }

        this.logger.debug("Session got data from HTTP, body length:",
                          body.length);

        bCapServSession.create(data, this._pubsubServer).then(function (sess) {
            this.logger.info("Enqueuing session");

            this._sessionQueue.enqueueSession(sess);
            res.writeHead(201);
            res.write(JSON.stringify(sess.serialize()));
            res.end();
        }.bind(this), function (err) {
            this.logger.info("Session creation failed", err);

            failWithError(res, err.message);
        }.bind(this));
    },

    _captureSlave: function (res) {
        var slave = bCapServSlave.create(this._resourceMiddleware,
                                         this._pubsubServer);

        this._sessionQueue.addSlave(slave);

        if (this.hasHeader) {
            slave.setHeader(this.headerHeight, this.headerResourceSet);
        }

        res.writeHead(302, {"Location": slave.prisonPath});
        res.end(JSON.stringify(slave.serialize()));
    },

    _listCachedResources: function (res) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(this._resourceCache.resourceVersions()));
        res.end();
    },

    _purgeCachedResources: function (res) {
        this._resourceCache.purgeAll();
        res.writeHead(200);
        res.end();
    },

    _onSlaveCaptured: function (slave) {
        this._pubsubClient.emit("slave:captured", {
            slave: slave.serialize(),
            slaves: this._slaves().map(function (s) { return s.serialize() })
        });
    },

    _onSlaveFreed: function (slave) {
        this._pubsubClient.emit("slave:freed", {
            slave: slave.serialize(),
            slaves: this._slaves().map(function (s) { return s.serialize() })
        });
        slave.teardown();
    },

    _onPrepareSession: function (session) {
        var deferred = when.defer();
        var self = this;

        this._resourceCache.inflate(session.resourceSet).then(function (rs) {
            this._resourceMiddleware.mount(session.resourcesPath, rs);
            deferred.resolve(session);
            process.nextTick(function () {
                self._pubsubClient.emit("session:started", session.serialize());
            });
        }.bind(this));

        return deferred.promise;
    },

    _onTeardownSession: function (session) {
        var self = this;
        this._resourceMiddleware.unmount(session.resourcesPath);
        session.teardown();
        process.nextTick(function () {
            self._pubsubClient.emit("session:ended", session.serialize());
        });
    },

    _setHeaderFromRequest: function (data, res) {
        rampResources.deserialize(data.resourceSet).then(function (rs) {
            this.setHeader(rs, data.height);
            res.writeHead(200);
            res.end();
        }.bind(this), function () {
            res.writeHead(403);
            res.end();
        });
    }
};
