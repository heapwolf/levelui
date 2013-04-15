var buster = require("buster-core");
var uuid = require("node-uuid");
var when = require("when");
var ejs = require("ejs");
var fs = require("fs");
var rampResources = require("ramp-resources");
var bCapServPubsubClient = require("./pubsub-client");
var prisonTemplate = __dirname + "/templates/slave_prison.html";
var PRISON_TEMPLATE = fs.readFileSync(prisonTemplate, "utf8");

var httpServReqListenerProxy = require("./http-server-request-listener-proxy");

var libraries = [
    require.resolve("./../vendor/json/json2"),
    require.resolve("buster-core"),
    require.resolve("buster-core/lib/buster-event-emitter"),
    require.resolve("faye/browser/faye-browser-min"),
    require.resolve("when"),
    require.resolve("node-uuid"),
    require.resolve("./pubsub-client"),
    require.resolve("./session-client"),
    require.resolve("./prison-util"),
    require.resolve("./prison"),
    require.resolve("./prison-init")
];

var basePrisonResourceSet = rampResources.createResourceSet();
basePrisonResourceSet.addResources(libraries.map(function (path) {
    return {path: path, content: fs.readFileSync(path)};
}).concat([{path: "/prison.js", combine: libraries}]))
    .then(function () {
        basePrisonResourceSet.loadPath.append("/prison.js");
    });

module.exports = buster.extend(buster.eventEmitter.create(), {
    create: function (resourceMiddleware, pubsubServer) {
        var instance = Object.create(this);
        instance._id = uuid();
        instance.isReady = false;
        instance.prisonPath = "/slaves/" + instance._id + "/browser";
        instance.headerPath = "/slaves/" + instance._id + "/header";
        instance._resourceMiddleware = resourceMiddleware;
        instance._pubsubServer = pubsubServer;

        instance._attachResourceSet();
        instance._attachPubsubServer();

        instance._imprisonmentTimeoutId = setTimeout(function () {
            instance._imprisonmentTimedOut();
        }, 5000);

        return instance;
    },

    setHeader: function (height, resourceSet) {
        this.hasHeader = true;
        this.headerHeight = height;
        this._resourceMiddleware.mount(this.headerPath, resourceSet);
    },

    teardown: function () {
        this._resourceMiddleware.unmount(this.prisonPath);
        this._resourceMiddleware.unmount(this.headerPath);
        this._pubsubClient.teardown();
    },

    prepare: function () {
        var deferred = when.defer();

        if (this.isReady) {
            deferred.resolve();
        } else {
            this._imprisonmentDeferred = deferred;
        }

        return deferred.promise;
    },

    serialize: function () {
        return {
            prisonPath: this.prisonPath,
            id: this._id,
            userAgent: this.userAgent
        };
    },

    loadSession: function (session) {
        this._loadSessionDeferred = when.defer();
        var event = "slave:" + this._id + ":session:load";
        this._pubsubClient.emit(event, session.serialize());
        return this._loadSessionDeferred;
    },

    unloadSession: function () {
        this._unloadSessionDeferred = when.defer();
        this._pubsubClient.emit("slave:" + this._id + ":session:unload");
        return this._unloadSessionDeferred;
    },

    _onSessionLoaded: function () {
        this._loadSessionDeferred.resolve();
    },

    _onSessionUnloaded: function () {
        this._unloadSessionDeferred.resolve();
    },

    _onImprisoned: function (e) {
        var self = this;
        this.userAgent = e.userAgent;
        clearTimeout(this._imprisonmentTimeoutId);
        this._pubsubServer.onDisconnect(e.pubsubClientId).then(function () {
            self.end();
        });
        this.isReady = true;
        this._imprisonmentDeferred.resolve();
    },

    _imprisonmentTimedOut: function () {
        this.end();
    },

    end: function () {
        this.emit("end");
    },

    _attachResourceSet: function () {
        var self = this;

        var prisonResourceSet = basePrisonResourceSet.concat();
        prisonResourceSet.addResource({
            path: "/",
            content: function () {
                var locals = {};
                locals.hasHeader = self.hasHeader;
                if (locals.hasHeader) {
                    locals.headerHeight = self.headerHeight;
                    locals.headerPath = self.headerPath + "/";
                }

                return ejs.render(PRISON_TEMPLATE, {locals: locals});
            }
        });

        this._resourceMiddleware.mount(this.prisonPath, prisonResourceSet);
    },

    _attachPubsubServer: function () {
        this._pubsubClient = this._pubsubServer.createClient();
        this._pubsubClient.on(
            "slave:" + this._id + ":session:loaded",
            this._onSessionLoaded.bind(this)
        );
        this._pubsubClient.on(
            "slave:" + this._id + ":session:unloaded",
            this._onSessionUnloaded.bind(this)
        );

        this._pubsubClient.on(
            "slave:" + this._id + ":imprisoned",
            this._onImprisoned.bind(this)
        );
    }
});
