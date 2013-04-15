(function (buster, sinon) {
    var assert = buster.assertions.assert;
    var refute = buster.assertions.refute;

    buster.util.testCase("BrowserEnvTest", {
        setUp: function () {
            this.emitter = buster.eventEmitter.create();
            this.div = document.createElement("div");
            this.env = buster.browserEnv.create(this.div);
            this.env.listen(this.emitter);
        },

        "test should reset element content on test:success": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:success");
            assert.equals(this.div.innerHTML, "");
        },

        "test should reset element content on test:failure": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:failure");
            assert.equals(this.div.innerHTML, "");
        },

        "test should reset element content on test:error": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:error");
            assert.equals(this.div.innerHTML, "");
        },

        "test should reset element content on test:timeout": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("test:timeout");
            assert.equals(this.div.innerHTML, "");
        },

        "test should restore original element innerHTML": function () {
            this.div.innerHTML = "Hey";
            this.emitter.emit("suite:start");
            this.div.innerHTML = "Hey!!!";
            this.emitter.emit("test:timeout");
            assert.equals(this.div.innerHTML, "Hey");
        }
    });
}(typeof buster !== "undefined" ? buster : null,
  typeof sinon !== "undefined" ? sinon : null));
