var bane = require("bane");
var platform = require("platform");
var _ = require("lodash");

function getClientStore(runner, msg) {
    if (!runner.clientData) {
        runner.clientData = {};
    }

    if (!runner.clientData[msg.clientId]) {
        runner.clientData[msg.clientId] = {
            id: msg.clientId,
            client: runner.getClient(msg.clientId),
            contexts: [],
            queue: [],
            results: [],
            timer: 0,

            toString: function () {
                return this.client.toString();
            }
        };
    }

    monitorClientTimeout(runner, runner.clientData[msg.clientId]);
    return runner.clientData[msg.clientId];
}

function monitorClientTimeout(runner, client) {
    clearTimeout(client.timer);

    client.timer = setTimeout(function () {
        runner.clientTimeout(client);
    }, runner.timeout || 15000);
}

function clearTimers(clients) {
    for (var id in clients) {
        clearTimeout(clients[id].timer);
    }
}

function queueEvent(runner, msg) {
    var clientStore = getClientStore(runner, msg);
    clientStore.queue.push({
        topic: msg.topic,
        data: msg.data
    });

    return clientStore;
}

function emptyQueueIfTopLevelContext(runner, clientStore, callback) {
    if (clientStore.contexts.length > 0) {
        return;
    }

    var event;
    while ((event = clientStore.queue.shift())) {
        runner.emit(event.topic, event.data);
    }

    if (typeof callback == "function") {
        callback();
    }
}

function eventQueuer(msg) {
    if (!this.getClient(msg.clientId)) { return; }
    queueEvent(this, msg);
}

function clientToString() {
    var osVersion = this.os.version ? " " + this.os.version : "";
    var dupNum = this.duplicateNumber ? " (" + this.duplicateNumber + ")" : "";
    return this.name + " " + this.version + ", " +
        this.os.family + osVersion + dupNum;
}

function property(name) {
    return function (object) {
        return object[name];
    };
}

function delegateEvents(emitter, runner) {
    emitter.on(function (event, data) {
        if (typeof runner[event] === "function") {
            data.topic = event;
            return runner[event](data);
        }
        runner.emitCustom(event, data);
    });
}

module.exports = bane.createEventEmitter({
    create: function (emitter, logger, config) {
        var runner = Object.create(this);
        runner.config = config || {};
        runner.emitter = emitter;
        runner.logger = logger;
        runner.console = runner;
        delegateEvents(emitter, runner);
        return runner;
    },

    setSlaves: function (slaves) {
        this.slaveIds = (slaves || []).map(property("id"));
        this.clientCount = this.slaveIds.length;

        slaves.forEach(function (slave) {
            var ua = platform.parse(slave.userAgent);
            var client = this.createClient(slave.id, ua);
            this.emit("client:connect", client);
        }.bind(this));

        this.emitter.emit("tests:run", this.config || {});
    },

    "suite:start": function (msg) {
        if (!this.getClient(msg.clientId)) { return; }

        if (!this.started) {
            this.emit("suite:start");
            this.started = true;
        }
        this.emit("progress:suite:start", { client: this.getClient(msg.clientId) });
    },

    "suite:end": function (msg) {
        if (!this.getClient(msg.clientId)) return;

        var clientStore = getClientStore(this, msg);
        this.emit("progress:suite:end", { client: this.getClient(msg.clientId) });
        this.results = this.results || [];
        this.results.push(msg.data);
        this.clientCount -= 1;
        if (this.clientCount > 0) return;

        clearTimers(this.clientData);
        this.logger.debug("Emit suite:end");
        this.emit("suite:end", this.getSummarizedResults());
    },

    "context:unsupported": function (msg) {
        if (!this.getClient(msg.clientId)) return;
        queueEvent(this, msg);
        emptyQueueIfTopLevelContext(this, getClientStore(this, msg));
    },

    "context:start": function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = getClientStore(this, msg);

        if (clientStore.contexts.length == 0) {
            queueEvent(this, {
                clientId: msg.clientId,
                topic: "context:start",
                data: { name: clientStore.toString() }
            });
        }

        queueEvent(this, msg);
        clientStore.contexts.push(msg.data.name);
    },

    "context:end": function (msg) {
        if (!this.getClient(msg.clientId)) return;

        var clientStore = getClientStore(this, msg), event;
        clientStore.contexts.pop();
        queueEvent(this, msg);

        emptyQueueIfTopLevelContext(this, clientStore, function () {
            this.emit("context:end", { name: clientStore.toString() });
        }.bind(this));
    },

    "log": eventQueuer,
    "test:async": eventQueuer,
    "test:setUp": eventQueuer,
    "test:start": eventQueuer,
    "test:tearDown": eventQueuer,
    "test:deferred": eventQueuer,

    "test:success": function (msg) {
        if (!this.getClient(msg.clientId)) { return; }
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:success", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts
        });
    },

    "test:error": function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:error", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts,
            error: msg.data.error
        });
    },

    "test:failure": function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:failure", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts,
            error: msg.data.error
        });
    },

    "test:timeout": function (msg) {
        if (!this.getClient(msg.clientId)) return;
        var clientStore = queueEvent(this, msg);

        this.emit("progress:test:timeout", {
            client: clientStore.client,
            name: msg.data.name,
            contexts: clientStore.contexts
        });
    },

    clientTimeout: function (c) {
        this.emit("client:timeout", this.getClient(c.id));
        this.clientCount -= 1;
        delete this.clients[c.id];
    },

    createClient: function (id, ua) {
        this.clients = this.clients || {};
        var client = _.extend({}, ua, {
            id: id,
            browser: ua.name,
            toString: clientToString
        });
        var dupNum, cli;

        for (var cid in this.clients) {
            cli = this.clients[cid];

            if (cli.browser == client.browser && cli.version == client.version &&
                cli.platform == client.platform) {
                dupNum = Math.max(dupNum || 0, cli.duplicateNumber || 0, 1) + 1;
            }
        }

        client.duplicateNumber = dupNum;
        this.clients[id] = client;
        getClientStore(this, { clientId: id }); // Starts the timeout counter

        return this.clients[id];
    },

    getClient: function (id) {
        this.clients = this.clients || {};
        return this.clients[id];
    },

    getSummarizedResults: function () {
        var results = { clients: this.results.length }, prop, val;

        for (var i = 0, l = this.results.length; i < l; ++i) {
            for (prop in this.results[i]) {
                val = this.results[i][prop];

                if (!results.hasOwnProperty(prop)) {
                    results[prop] = val;
                } else if (typeof val == "number") {
                    results[prop] += val;
                } else {
                    results[prop] = results[prop] && val;
                }
            }
        }

        return results;
    },

    emitCustom: function (event, msg) {
        this.emit(event, {
            topic: event,
            client: this.getClient(msg.clientId),
            data: msg.data
        });
    }
});
