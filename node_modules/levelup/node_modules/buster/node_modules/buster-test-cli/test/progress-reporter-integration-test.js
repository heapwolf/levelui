var util = require("util");

function run() {
    var buster = require("buster");
    var bane = require("bane");
    var remoteRunner = require("../lib/runners/browser/remote-runner");
    var progressReporter = require("../lib/runners/browser/progress-reporter");

    var emitter = bane.createEventEmitter();

    function emit(event, data, client) {
        return emitter.emit(event, {
            topic: event,
            data: data,
            clientId: client
        });
    }

    var runner = remoteRunner.create(emitter, { debug: function () {} });

    var reporter = progressReporter.create({
        outputStream: { write: require("util").print },
        color: true,
        bright: true
    }).listen(runner);

    var started = [], slaves = [
        { id: 1, userAgent: "Firefox 4.0.1" },
        { id: 2, userAgent: "Chrome 11" },
        { id: 3, userAgent: "Safari/534.24 OS X" }
    ];
    runner.setSlaves(slaves);

    function startSlave(client) {
        emit("suite:start", {}, client.id);
        reporter.addSlave(client.id, client.userAgent);
        started.push(client);
    }

    util.puts("If this output looks good, we're fine. Control-C to abort");
    util.puts("\"Fine\": List of browsers with growing list " +
              "of dots and letters");

    setTimeout(function () {
        startSlave(slaves[0]);
        startSlave(slaves[1]);

        var events = [
            "test:success",
            "test:error",
            "test:failure",
            "test:timeout"
        ];

        function doIt() {
            emit(events[Math.floor(Math.random() * events.length)], {},
                 1 + Math.floor(Math.random() * started.length));
        }

        setInterval(doIt, 50);
    }, 500);

    setTimeout(function () {
        startSlave(slaves[2]);
    }, 2000);
}

if (require.main !== module) {
    util.puts("Integration test must be run manually - it is a visual test");
    util.puts("node " + __filename.replace(process.cwd(), ".") + "\n");
} else {
    run();
}
