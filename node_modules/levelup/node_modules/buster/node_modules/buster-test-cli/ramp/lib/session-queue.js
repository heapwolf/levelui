var bane = require("bane");
var when = require("when");

var NOOP = function () {};
var ERR_NO_SLAVES = "No slaves are captured";

// Similar to slave.foo().then(..) but also handles the "end" event
// as well as the promise. A slave might end before it has fully
// loaded.
function slavePromiseOrEnd(slave, promiser) {
    var deferred = when.defer();
    promiser(slave).then(function () {
        slave.removeListener("end", deferred.resolve);
        deferred.resolve();
    });
    slave.on("end", deferred.resolve);
    return deferred.promise;
}

function slavesPromiseOrEnd(slaves, promiser) {
    return when.all(slaves.map(function (slave) {
        return slavePromiseOrEnd(slave, promiser);
    }));
}

module.exports = bane.createEventEmitter({
    logger: {debug: NOOP, info: NOOP, log: NOOP, warn: NOOP, error: NOOP},
    ERR_NO_SLAVES: ERR_NO_SLAVES,

    create: function () {
        var instance = Object.create(this);
        instance._slaves = [];
        instance._sessions = [];
        instance._slavesForCurrentSession = [];
        return instance;
    },

    slaves: function () {
        return this._slaves.filter(function (slave) {
            return slave.isReady;
        });
    },

    addSlave: function (slave) {
        this.logger.info("Slave about to capture", slave.serialize());

        this._slaves.push(slave);

        slave.prepare().then(function () {
            this.logger.info("Slave captured", slave.serialize());
            this.emit("slave:captured", slave);
        }.bind(this));

        slave.on("end", function () {
            var i = this._slaves.indexOf(slave);
            if (i > -1) { this._slaves.splice(i, 1); }

            if (this._slavesForCurrentSession.indexOf(slave) > -1) {
                this.currentSession.freedSlave(slave, this.slaves());
                this._slavesForCurrentSession.splice(
                    this._slavesForCurrentSession.indexOf(slave),
                    1
                );
            }

            this.logger.info("Slave freed", slave.serialize());
            this.emit("slave:freed", slave);

            if (this._slavesForCurrentSession.length === 0 && this.currentSession) {
                this._removeSession(this.currentSession);
            }
        }.bind(this));
    },

    enqueueSession: function (session) {
        this.logger.info("Queuing session", session.serialize());
        this._sessions.push(session);
        session.once("end", function () {
            this.dequeueSession(session);
        }.bind(this));
        this._processQueue();
    },

    dequeueSession: function (session) {
        this.logger.info("Session about to end", session.serialize());
        slavesPromiseOrEnd(this._slavesForCurrentSession, function (slave) {
            return slave.unloadSession();
        }.bind(this)).then(function () {
            this._removeSession(session);
        }.bind(this));
    },

    _removeSession: function (session) {
        this._sessions.splice(this._sessions.indexOf(session), 1);
        session.ended();

        if (session === this.currentSession) {
            session.unloaded();
            delete this.currentSession;
            this._slavesForCurrentSession = [];
        }

        this.logger.info("Session ended", session.serialize());
        this.teardownSession(session);

        this._processQueue();
    },

    _processQueue: function () {
        if (this.hasOwnProperty("currentSession")) { return; }
        if (this._sessions.length === 0) { return; }

        var sessionToPrepare = this._sessions[0];
        if (this.slaves().length === 0) {
            sessionToPrepare.aborted({message: ERR_NO_SLAVES});
            this._sessions.shift();
            return;
        }

        sessionToPrepare.started();

        this.prepareSession(sessionToPrepare).then(function (currentSession) {
            slavesPromiseOrEnd(this.slaves(), function (slave) {
                return slave.loadSession(currentSession);
            }.bind(this)).then(function () {
                this._slavesForCurrentSession = this.slaves();
                this.currentSession = currentSession;
                this.currentSession.loaded(this._slavesForCurrentSession);
            }.bind(this));
        }.bind(this));
    }
});
