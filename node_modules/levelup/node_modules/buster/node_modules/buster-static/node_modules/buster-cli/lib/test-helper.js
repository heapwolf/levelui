var streamLogger = require("stream-logger");
var buster = require("buster");
var rmrf = require("rimraf");
var path = require("path");
var fs = require("fs");
var FIXTURES_ROOT = path.resolve(__dirname, "..", ".fixtures");
var join = Array.prototype.join;

module.exports = {
    FIXTURES_ROOT: FIXTURES_ROOT,

    writableStream: function (name) {
        var stream = {
            content: "",
            write: function () { this.content += join.call(arguments, " "); },
            toString: function () { return this.content; }
        };

        buster.assertions.add(name, {
            assert: function (expected) {
                return buster.assertions.match(stream.toString(), expected);
            },
            assertMessage: "${2}Expected " + name + "\n${0}\nto match\n${1}",
            refuteMessage: "${2}Expected " + name + "\n${0}\nnot to match\n${1}",
            values: function (expected, message) {
                return [stream.toString(), expected, message || ""];
            }
        });

        return stream;
    },

    mockLogger: function mockLogger(context) {
        context.stdout = "";
        context.stderr = "";
        var cli = context.cli;
        var level = cli.logger && cli.logger.level;

        cli.logger = streamLogger({
            write: function () {
                context.stdout += join.call(arguments, " ");
            }
        }, {
            write: function () {
                context.stderr += join.call(arguments, " ");
            }
        });

        if (level) { cli.logger.level = level; }
    },

    mkdir: function (dir) {
        dir = dir.replace(FIXTURES_ROOT, "").replace(/^\//, "");
        var dirs = [FIXTURES_ROOT].concat(dir.split("/")), tmp = "", i, l;
        for (i = 0, l = dirs.length; i < l; ++i) {
            if (dirs[i]) {
                tmp += dirs[i] + "/";
                try {
                    fs.mkdirSync(tmp, "755");
                } catch (e) {}
            }
        }
    },

    writeFile: function (file, contents) {
        file = path.join(FIXTURES_ROOT, file);
        this.mkdir(path.dirname(file));
        fs.writeFileSync(file, contents);
        return file;
    },

    cdFixtures: function () {
        this.mkdir("");
        process.chdir(FIXTURES_ROOT);
    },

    clearFixtures: function (done) {
        var mod;
        for (mod in require.cache) {
            if (/fixtures/.test(mod)) {
                delete require.cache[mod];
            }
        }
        rmrf(FIXTURES_ROOT, function (err) {
            if (err) { require("buster").log(err.toString()); }
            done();
        });
    },

    run: function (tc, args, callback) {
        var aso = buster.assert.stdout, rso = buster.refute.stdout;

        buster.refute.stdout = buster.assert.stdout = function (text) {
            this.match(tc.stdout, text);
        };

        buster.refute.stderr = buster.assert.stderr = function (text) {
            this.match(tc.stderr, text);
        };

        tc.cli.run(args, function () {
            callback.apply(tc, arguments);
            buster.assert.stdout = aso;
            buster.refute.stdout = rso;
        });
    }
};
