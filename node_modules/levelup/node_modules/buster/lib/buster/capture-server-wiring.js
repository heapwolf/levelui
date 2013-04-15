(function (B) {
    function wireTestRunner(emitter) {

        var wiring = B.wire.testRunner(function () {
            var runner = B.testRunner.create();
            var reporter = B.reporters.jsonProxy.create(emitter);
            reporter.listen(runner);
            return runner;
        });
        B.run = wiring.run;

        emitter.on("tests:run", function (msg) {
            wiring.ready(msg && msg.data);
        });
    }

    B.configureTestClient = function (emitter) {
        B.wire.uncaughtErrors(emitter);
        B.wire.logger(emitter);
        wireTestRunner(emitter);
    };

    if (B.on && B.emit) {
        B.configureTestClient(B);
    }
}(buster));
