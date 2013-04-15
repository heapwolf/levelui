var buster = require("buster");
var assert = buster.assert;
var refute = buster.refute;
var bane = require("bane");
var remoteRunner = require("../../../lib/runners/browser/remote-runner");
var progressReporter = require("../../../lib/runners/browser/progress-reporter");
var cliHelper = require("buster-cli/lib/test-helper");

buster.testCase("Progress reporter", {
    setUp: function () {
        this.clock = this.useFakeTimers();
        this.messageClient = bane.createEventEmitter();

        this.emit = function (event, data, client) {
            return this.messageClient.emit(event, {
                topic: event,
                data: data,
                clientId: client
            });
        };

        this.clients = [{
            browser: "Chrome",
            version: "9.0.597.107",
            platform: "Linux",
            toString: function () {
                return "Chrome 9.0.597.107 Linux";
            }
        }, {
            browser: "Firefox",
            version: "4.0",
            platform: "Linux",
            toString: function () {
                return "Firefox 4.0 Linux";
            }
        }];

        this.runner = remoteRunner.create(this.messageClient);
        this.runner.createClient(1, this.clients[0]);
        this.runner.createClient(2, this.clients[1]);
        this.stdout = cliHelper.writableStream("stdout");

        this.reporter = progressReporter.create({
            outputStream: this.stdout
        }).listen(this.runner);
    },

    "does not print anything without clients": function () {
        this.emit("test:success", {});
        assert.equals(this.stdout.toString(), "");
    },

    "prints client when adding": function () {
        this.reporter.addSlave(1, this.clients[0]);
        this.reporter.addSlave(2, this.clients[1]);

        assert.stdout("Chrome 9.0.597.107 Linux:");
        assert.stdout("Firefox 4.0 Linux:");
    },

    "print dot for test success": function () {
        this.reporter.addSlave(1, this.clients[0]);
        this.reporter.addSlave(2, this.clients[1]);
        this.emit("test:success", {}, 1);

        assert.stdout(".");
    },

    "prints E for test error": function () {
        this.reporter.addSlave(1, this.clients[0]);
        this.reporter.addSlave(2, this.clients[1]);
        this.emit("test:error", {}, 1);

        assert.stdout("E");
    },

    "prints F for test failure": function () {
        this.reporter.addSlave(1, this.clients[0]);
        this.reporter.addSlave(2, this.clients[1]);
        this.emit("test:failure", {}, 1);

        assert.stdout("F");
    },

    "prints T for test timeout": function () {
        this.reporter.addSlave(1, this.clients[0]);
        this.reporter.addSlave(2, this.clients[1]);
        this.emit("test:timeout", {}, 1);

        assert.stdout("T");
    },

    "saves uncaught exceptions until browser connects": function () {
        this.emit("uncaughtException", { message: "Oops" }, 1);
        refute.stdout("Oops");

        this.reporter.addSlave(1, this.clients[0]);
        assert.stdout("Oops");
    },

    "immediately prints uncaught exception for known client": function () {
        this.reporter.addSlave(1, this.clients[0]);
        this.emit("uncaughtException", { message: "Oops" }, 1);

        assert.stdout("Oops");
    }
});
