var buster = require("buster");
var ba = require("../lib/buster-analyzer");

buster.testCase("AnalyzerTest", {
    setUp: function () {
        this.analyzer = ba.createAnalyzer();
        this.listener = this.spy();
    },

    "emits fatal event": function () {
        this.analyzer.on("fatal", this.listener);
        this.analyzer.fatal("Oh", { id: 42 });

        assert.calledOnceWith(this.listener, "Oh", { id: 42 });
    },

    "emits error event": function () {
        this.analyzer.on("error", this.listener);
        this.analyzer.error("Oh", { id: 42 });

        assert.calledOnceWith(this.listener, "Oh", { id: 42 });
    },

    "emits warning event": function () {
        this.analyzer.on("warning", this.listener);
        this.analyzer.warning("Oh", { id: 42 });

        assert.calledOnceWith(this.listener, "Oh", { id: 42 });
    },

    "failOn": {
        "throws when setting non-existent level": function () {
            assert.exception(function () {
                this.analyzer.failOn("bogus");
            }.bind(this));
        },

        "does not throw when setting existent levels": function () {
            refute.exception(function () {
                this.analyzer.failOn("warning");
                this.analyzer.failOn("error");
                this.analyzer.failOn("fatal");
            }.bind(this));
        }
    },

    "status": {
        "is not failed by default": function () {
            refute(this.analyzer.status().failed);
        },

        "is clean by default": function () {
            assert(this.analyzer.status().clean);
        },

        "is not failed after error": function () {
            this.analyzer.error("Uh-oh");
            refute(this.analyzer.status().failed);
        },

        "is not clean after error": function () {
            this.analyzer.error("Uh-oh");
            refute(this.analyzer.status().clean);
        },

        "is not failed after warning": function () {
            this.analyzer.warning("Uh-oh");
            refute(this.analyzer.status().failed);
        },

        "fails when receiving a fatal event": function () {
            this.analyzer.fatal("Oh noes");

            assert(this.analyzer.status().failed);
        },

        "failOn(error)": {
            setUp: function () {
                this.analyzer.failOn("error");
            },

            "fails on error": function () {
                this.analyzer.error("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "fails on fatal": function () {
                this.analyzer.fatal("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "does not fail on warning": function () {
                this.analyzer.warning("Oh noes");

                refute(this.analyzer.status().failed);
            }
        },

        "failOn(warning)": {
            setUp: function () {
                this.analyzer.failOn("warning");
            },

            "fails on error": function () {
                this.analyzer.error("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "fails on fatal": function () {
                this.analyzer.fatal("Oh noes");

                assert(this.analyzer.status().failed);
            },

            "fails on warning": function () {
                this.analyzer.warning("Oh noes");

                assert(this.analyzer.status().failed);
            }
        }
    },

    "status includes stats": function () {
        this.analyzer.fatal("Ding!");
        this.analyzer.fatal("Dong!");
        this.analyzer.error("Ding!");
        this.analyzer.error("Dong!");
        this.analyzer.error("Poing!");
        this.analyzer.warning("Ding!");
        this.analyzer.warning("Dong!");
        this.analyzer.warning("Poing!");
        this.analyzer.warning("Pooong!");

        assert.match(this.analyzer.status(), {
            failed: true,
            fatals: 2,
            errors: 3,
            warnings: 4
        });
    },

    "fail event": {
        "is emitted on first fatal": function () {
            var callback = this.stub();
            this.analyzer.on("fail", callback);

            this.analyzer.fatal("Oh noes", {});

            assert.calledOnce(callback);
            assert.calledWith(callback, this.analyzer.status());
        },

        "is not emitted on second fatal": function () {
            var callback = this.stub();
            this.analyzer.on("fail", callback);

            this.analyzer.fatal("Oh noes", {});
            this.analyzer.fatal("Srsly", {});

            assert.calledOnce(callback);
        },

        "is not emitted on non-fatal event": function () {
            var callback = this.stub();
            this.analyzer.on("fail", callback);

            this.analyzer.warning("Oh noes", {});

            refute.called(callback);
        },

        "is emitted on first fail when failOn warning": function () {
            this.analyzer.failOn("warning");
            var callback = this.stub();
            this.analyzer.on("fail", callback);

            this.analyzer.warning("Oh noes", {});

            assert.calledOnce(callback);
            assert.calledWith(callback, this.analyzer.status());
        },

        "is emitted only once when warning induced": function () {
            this.analyzer.failOn("warning");
            var callback = this.stub();
            this.analyzer.on("fail", callback);

            this.analyzer.warning("Oh noes", {});
            this.analyzer.error("Oh noes", {});
            this.analyzer.fatal("Oh noes", {});

            assert.calledOnce(callback);
        },

        "is emitted on first fail when failOn error": function () {
            this.analyzer.failOn("error");
            var callback = this.stub();
            this.analyzer.on("fail", callback);

            this.analyzer.error("Oh noes", {});

            assert.calledOnce(callback);
            assert.calledWith(callback, this.analyzer.status());
        },

        "is emitted only once when error induced": function () {
            this.analyzer.failOn("error");
            var callback = this.stub();
            this.analyzer.on("fail", callback);

            this.analyzer.error("Oh noes", {});
            this.analyzer.warning("Oh noes", {});
            this.analyzer.fatal("Oh noes", {});

            assert.calledOnce(callback);
        }
    }
});
