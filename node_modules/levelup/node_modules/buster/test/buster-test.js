var buster = require("../lib/buster");
var assert = buster.assert;

buster.testCase("Buster integration test", {
    "should count sinon assertions": function (done) {
        var testCase = buster.testCase("Sinon assertion count", {
            "should count two assertions": function () {
                var spy = this.spy();
                spy();
                spy(42);

                assert.calledTwice(spy);
                assert.calledWith(spy, 42);
            }
        });

        var runner = buster.testRunner.create();

        runner.on("suite:end", function (results) {
            assert.equals(results.assertions, 2);
            done();
        });

        runner.runSuite([testCase]);
    },

    "should add console to runner": function () {
        var runner = buster.testRunner.create();

        assert.same(runner.console, buster.console);
    },

    "should expose console.log as this.log in tests": function (done) {
        this.spy(buster.console, "log");
        var runner = buster.testRunner.create();

        runner.on("suite:end", function (results) {
            assert.calledOnce(buster.console.log);
            assert.calledWith(buster.console.log, "Hey man");
            done();
        });

        runner.runSuite([buster.testCase("Sinon assertion count", {
            "should count two assertions": function () {
                this.log("Hey man");
            }
        })]);
    },

    "should fail when no exception": function () {
        this.stub(buster.assertions, "emit");

        try {
            buster.assertions.throwOnFailure = true;
            assert.exception(function () {});
            throw new Error("Didn't throw");
        } catch (e) {
            buster.assertions.emit.restore();
            refute.match(e.message, "Didn't throw");
            refute.match(e.message, "toString");
        } finally {
            if (buster.assertions.emit.restore) {
                buster.assertions.emit.restore();
            }
        }
    }
});
