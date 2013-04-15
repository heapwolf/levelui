var http = require("http");
var ramp = require("./../../lib/ramp");
var EventEmitter = require("events").EventEmitter;
var CP = require("child_process");
var faye = require("faye");
var when = require("when");
var phantomPort = 12000;

var PhantomFactory = function (port) {
    this.port = port;
    this.phantoms = [];
};

module.exports = PhantomFactory;

PhantomFactory.prototype = {
    openCapture: function (ready) {
        var captureUrl = "http://0.0.0.0:" + this.port + "/capture";

        var phantom = Phantom(function () {
            phantom.open(captureUrl, function () {
                ready(phantom);
            });
        });

        this.phantoms.push(phantom);
    },

    capture: function (ready) {
        var connectDeferred = when.defer();
        var phantomDeferred = when.defer();

        when.all([connectDeferred, phantomDeferred]).then(function (e) {
            ready(e[0], e[1]);
        });

        var c = ramp.createServerClient(this.port);

        c.connect().then(function () {
            c.on("slave:captured", function (e) {
                c.disconnect();
                connectDeferred.resolve(e);
            });
        });

        this.openCapture(function (phantom) {
            phantomDeferred.resolve(phantom);
        });
    },

    killAll: function () {
        return this.phantoms.map(function (p) { return p.kill(); });
    }
};


var Phantom = function (onready) {
    var isOpening = false;
    var eventEmitter = new EventEmitter();
    var phantomScriptPath = __dirname + "/phantom.js";
    var phantomControlPort = ++phantomPort; // TODO: reuse old ports
    var blankPageUrl = "http://127.0.0.1:" + phantomControlPort + "/blank";

    var phantom = CP.spawn("phantomjs", [
        phantomScriptPath,
        phantomControlPort
    ]);
    phantom.stdout.on("data", function (data) {
        var msgs = data.toString("utf8").split("\n");
        msgs.forEach(function (msg) {
            if (msg.length === 0) { return; }
            var command = msg.match(/^[^ ]+/)[0];
            var data = msg.slice(command.length + 1).trim();
            eventEmitter.emit(command, data);
        });
    });

    eventEmitter.on("debug", function (data) {
        console.log("Phantom console.log:", data);
    });

    eventEmitter.on("ready", function (data) {
        onready();
    });

    eventEmitter.on("error", function (data) {
        console.log("Phantom JS error:", data.split(" --- ").join("\n"));
    });

    return {
        open: function (url, onload) {
            if (this.isKilled) {
                onload();
                return;
            }

            if (isOpening) {
                throw new Error(
                    "Attempted to open URL before prev page was loaded"
                );
            }
            isOpening = true;

            http.request({
                host: "0.0.0.0",
                port: phantomControlPort,
                method: "GET",
                path: "/load",
                headers: {"X-Phantom-Load-Url": url}
            }, function (res, body) {}).end();

            eventEmitter.once("page", function (status) {
                isOpening = false;
                if (status === "success") {
                    onload();
                } else {
                    throw new Error("Unknown page load status for " + url +  ": " + status);
                }
            });
        },

        kill: function () {
            var deferred = when.defer();
            if (this.isKilled) { return; }
            this.isKilled = true;

            // Loading a blank page ensures beforeunload callback gets called
            this.open(blankPageUrl, function () {
                phantom.on("exit", deferred.resolve);
                phantom.kill();
            });

            return deferred.promise;
        }
    };
};
