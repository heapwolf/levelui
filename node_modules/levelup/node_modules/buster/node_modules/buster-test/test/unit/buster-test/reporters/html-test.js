(function (buster, sinon) {
    var assert, refute, htmlReporter, busterUtil;

    if (typeof module === "object" && typeof require === "function") {
        sinon = require("sinon");
        buster = require("buster-core");
        var helper = require("./test-helper");
        var assertions = require("buster-assertions");
        var jsdom = require("jsdom").jsdom;
        assert = assertions.assert;
        refute = assertions.refute;
        htmlReporter = require("../../../../lib/buster-test/reporters/html");
        busterUtil = require("buster-util");
    } else {
        assert = buster.assertions.assert;
        refute = buster.assertions.refute;
        htmlReporter = buster.reporters.html;
        busterUtil = buster.util;
    }

    function createDocument() {
        if (typeof document != "undefined") { return document; }
        var dom = jsdom("<!DOCTYPE html><html><head></head><body></body></html>");
        return dom.createWindow().document;
    }

    function reporterSetUp(options) {
        options = options || {};
        this.runner = buster.create(buster.eventEmitter);
        this.doc = createDocument();
        this.root = options.root || this.doc.createElement("div");

        this.reporter = htmlReporter.create(buster.extend({
            document: this.doc,
            root: this.root,
            io: options.io || { puts: function () {} }
        }, options)).listen(this.runner);

        this.list = function () {
            return this.root.getElementsByTagName("ul")[0];
        };
    }

    function generateError(message, type) {
        var error = new Error(message);
        error.name = type || "AssertionError";
        try { throw error; } catch (e) { return e; }
    }

    function assertMessage(list, level, message) {
        var messages = list.firstChild.getElementsByTagName("ul")[0];

        assert.className(messages, "messages");

        assert.match(messages.firstChild, {
            innerHTML: "Is message",
            className: "log"
        });
    }

    busterUtil.testCase("HTMLReporterCreateTest", {
        setUp: function () {
            this.doc = createDocument();
        },

        tearDown: function () {
            var h1s = this.doc.getElementsByTagName("h1");

            for (var i = 0, l = h1s.length; i < l; ++i) {
                if (h1s[i]) {
                    h1s[i].parentNode.removeChild(h1s[i]);
                }
            }
        },

        "should add 'buster-test' class to root element": function () {
            var element = this.doc.createElement("div");

            htmlReporter.create({ document: this.doc, root: element });

            assert.className(element, "buster-test");
        },

        "should add 'buster-test' class to html element if root is body": function () {
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            assert.className(this.doc.documentElement, "buster-test");
        },

        "should make page mobile friendly if logging on body": function () {
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var metas = this.doc.getElementsByTagName("meta"), meta;

            for (var i = 0, l = metas.length; i < l; ++i) {
                if (metas[i].name == "viewport") {
                    meta = metas[i];
                }
            }

            refute.isNull(meta);
            assert.equals(meta.content, "width=device-width, initial-scale=1.0");
        },

        "should serve page with right charset if logging on body": function () {
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var metas = this.doc.getElementsByTagName("meta"), meta;

            for (var i = 0, l = metas.length; i < l; ++i) {
                if (metas[i]["http-equiv"]) {
                    meta = metas[i];
                }
            }

            refute.isNull(meta);
            assert.equals(meta["http-equiv"], "Content-Type");
            assert.equals(meta.content, "text/html; charset=utf-8");
        },

        "should inject CSS file from same directory if buster-test.js is not found":
        function () {
            if (typeof document == "undefined") return;
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var links = this.doc.getElementsByTagName("link");
            var link = links[links.length - 1];

            assert.match(link, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: "buster-test.css"
            });
        },

        "should inject CSS file if logging on body": function () {
            if (typeof document == "undefined") return;
            this.doc.body.innerHTML += "<script src=\"/some/path/buster-test.js\"></script>";
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var links = this.doc.getElementsByTagName("link");
            var link = links[links.length - 1];

            assert.match(link, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: "/some/path/buster-test.css"
            });
        },

        "should inject CSS file in style tag if on node": function () {
            if (typeof document != "undefined") return;
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var styles = this.doc.getElementsByTagName("style");
            var style = styles[styles.length - 1];

            assert.match(style.innerHTML, ".buster-logo {");
        },

        "should inject h1 if logging on body": function () {
            this.doc.title = "";
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var h1 = this.doc.getElementsByTagName("h1")[0];

            assert.match(h1, { innerHTML: "Buster.JS Test case" });
        },

        "should not inject h1 if one already exists": function () {
            var h1 = this.doc.createElement("h1");
            h1.innerHTML = "Hey";
            this.doc.body.appendChild(h1);
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var h1s = this.doc.getElementsByTagName("h1");

            assert.equals(h1s.length, 1);
            assert.match(h1s[0], { innerHTML: "Hey" });
        },

        "should use this.doc.title in h1": function () {
            this.doc.title = "Use it";
            htmlReporter.create({ document: this.doc, root: this.doc.body });

            var h1 = this.doc.getElementsByTagName("h1")[0];

            assert.match(h1, { innerHTML: "Use it" });
        }
    });

    busterUtil.testCase("HTMLReporterTestsRunningTest", {
        setUp: reporterSetUp,

        "should add context name as h2 when entering top-level context": function () {
            this.reporter.contextStart({ name: "Some context" });

            assert.match(this.root.firstChild, {
                tagName: "h2", innerHTML: "Some context"
            });
        },

        "should not add context name as h2 when entering nested context": function () {
            this.reporter.contextStart({ name: "Some context" });
            this.reporter.contextStart({ name: "Some other context" });

            assert.equals(this.root.getElementsByTagName("h2").length, 1);
        },

        "should print passing test name as list item with success class": function () {
            this.reporter.testSuccess({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "success",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print passing test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testSuccess({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /in some state should do it/
            });
        },

        "should not 'remember' completed contexts": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.contextEnd({ name: "in some state" });
            this.reporter.contextStart({ name: "in some other state" });
            this.reporter.testSuccess({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /in some other state should do it/
            });
        },

        "should print failed test name as list item with error class": function () {
            this.reporter.testFailure({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "failure",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print test failure with stack trace": function () {
            this.reporter.testFailure({
                name: "should do something",
                error: generateError("Expected a to be equal to b")
            });

            var error = this.list().firstChild.getElementsByTagName("p")[0];
            var stack = this.list().firstChild.getElementsByTagName("ul")[0];

            assert.match(error, {
                innerHTML: "Expected a to be equal to b",
                className: "error-message"
            });

            assert.equals(stack.className, "stack");
            assert.match(stack.firstChild, { innerHTML: /html-test.js/ });
        },

        "should print failed test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testFailure({ name: "should do it" });

            assert.match(this.list().firstChild,{
                innerHTML: /in some state should do it/
            });
        },

        "should print errored test name as list item with error class": function () {
            this.reporter.testError({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "error",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print test error with stack trace": function () {
            this.reporter.testError({
                name: "should do something",
                error: generateError("Expected a to be equal to b", "Error")
            });

            var error = this.list().firstChild.getElementsByTagName("p")[0];
            var stack = this.list().firstChild.getElementsByTagName("ul")[0];

            assert.match(error, {
                innerHTML: "Error: Expected a to be equal to b",
                className: "error-message"
            });

            assert.equals(stack.className, "stack");
            assert.match(stack.firstChild, { innerHTML: /html-test.js/ });
        },

        "should print errored test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testError({ name: "should do it" });

            assert.match(this.list().firstChild,{
                innerHTML: /in some state should do it/
            });
        },

        "should print deferred test as list item with deferred class": function () {
            this.reporter.testDeferred({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "deferred",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print deferred test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testDeferred({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /in some state should do it/
            });
        },

        "should print timed out test as list item with timeout class": function () {
            this.reporter.testTimeout({ name: "should do something" });

            assert.match(this.list().firstChild, {
                tagName: "li",
                className: "timeout",
                innerHTML: /<[hH]3>should do something<\/[hH]3>/
            });
        },

        "should print test timeout with source": function () {
            var err = generateError("Timed out after 250ms", "TimeoutError");
            err.source = "setUp";
            this.reporter.testTimeout({
                name: "should do something",
                error: err
            });

            assert.equals(this.list().firstChild.firstChild.innerHTML,
                          "should do something (setUp timed out)");
        },

        "should print timed out test name with full contextual name": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.testTimeout({ name: "should do it" });

            assert.match(this.list().firstChild, {
                innerHTML: /<[hH]3>in some state should do it<\/[hH]3>/
            });
        },

        "should print log message for passing test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testSuccess({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should print log message for failing test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testFailure({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should print log message for errored test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testError({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should print log message for timed out test": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testTimeout({ name: "should do it" });

            assertMessage(this.list(), "log", "Is message");
        },

        "should not re-print previous log messages": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.contextStart({ name: "in some state" });
            this.reporter.log({ level: "log", message: "Is message" });
            this.reporter.testTimeout({ name: "should do it" });
            this.reporter.log({ level: "warn", message: "Is other message" });
            this.reporter.testTimeout({ name: "should go again" });

            var messages = this.list().getElementsByTagName("ul")[1];
            assert.equals(messages.childNodes.length, 1);
        },

        "should render two contexts": function () {
            this.reporter.contextStart({ name: "Some stuff" });
            this.reporter.testSuccess({ name: "should do it" });
            this.reporter.contextEnd({ name: "Some stuff" });
            this.reporter.contextStart({ name: "Other stuff" });
            this.reporter.testSuccess({ name: "should do more" });
            this.reporter.contextEnd({ name: "Other stuff" });

            var headings = this.root.getElementsByTagName("h2");

            assert.equals(headings.length, 2);
            assert.tagName(headings[0].nextSibling, "ul");
            assert.tagName(headings[1].nextSibling, "ul");
        }
    });

    if (typeof document == "undefined") {
        busterUtil.testCase("HTMLReporterConsoleTest", {
            setUp: function () {
                this.io = helper.io();
                this.assertIO = helper.assertIO;
                this.doc = createDocument();

                reporterSetUp.call(this, {
                    document: this.doc,
                    root: this.doc.body,
                    io: this.io
                });
            },

            "should render entire document to output stream": function () {
                this.reporter.contextStart({ name: "Some stuff" });
                this.reporter.testSuccess({ name: "should do it" });
                this.reporter.contextEnd({ name: "Some stuff" });
                this.reporter.contextStart({ name: "Other stuff" });
                this.reporter.testSuccess({ name: "should do more" });
                this.reporter.contextEnd({ name: "Other stuff" });
                this.reporter.addStats({});

                this.assertIO("should do it");
                this.assertIO("<!DOCTYPE html>");
                this.assertIO(".buster-logo");
            }
        });
    }

    busterUtil.testCase("HTMLReporterStatsTest", {
        setUp: function () {
            this.doc = createDocument();
            reporterSetUp.call(this, {
                document: this.doc,
                root: this.doc.body
            });
            this.reporter.contextStart({ name: "Some context" });
            this.reporter.testSuccess({ name: "should do it" });
            this.reporter.contextStart({ name: "Some context" });

            this.stats = function () {
                return this.root.getElementsByTagName("div")[0];
            };
        },

        "should add stats element": function () {
            this.reporter.addStats({});

            assert.className(this.stats(), "stats");
        },

        "should add stats heading": function () {
            this.reporter.addStats({});

            assert.match(this.stats().firstChild, {
                tagName: "h2",
                innerHTML: "Test failures!"
            });
        },

        "should add stats in list": function () {
            this.reporter.addStats({
                contexts: 2,
                tests: 4,
                assertions: 6,
                errors: 1,
                failures: 1,
                timeouts: 1,
                deferred: 2
            });

            var stats = this.stats().firstChild.nextSibling;
            assert.tagName(stats, "ul");

            assert.match(stats.childNodes[0].innerHTML, "2 test cases");
            assert.match(stats.childNodes[1].innerHTML, "4 tests");
            assert.match(stats.childNodes[2].innerHTML, "6 assertions");
            assert.match(stats.childNodes[3].innerHTML, "1 failure");
            assert.match(stats.childNodes[4].innerHTML, "1 error");
            assert.match(stats.childNodes[5].innerHTML, "1 timeout");
            assert.match(stats.childNodes[6].innerHTML, "2 deferred");
        },

        "should add stats directly after h1": function() {
            this.reporter.addStats({});
            var h1 = this.root.getElementsByTagName('h1')[0];
            assert.equals(this.stats(), h1.nextSibling);
        },

        "should have the success class when all successful": function() {
            sinon.stub(this.reporter, 'success').returns(true);
            this.reporter.addStats({});
            assert.className(this.stats(), 'success');
        },

        "should have the failure class when not all successful": function() {
            sinon.stub(this.reporter, 'success').returns(false);
            this.reporter.addStats({});
            assert.className(this.stats(), 'failure');
        },
    });

    busterUtil.testCase("HTMLReporterEventMappingTest", sinon.testCase({
        setUp: function () {
            this.stub(htmlReporter, "contextStart");
            this.stub(htmlReporter, "contextEnd");
            this.stub(htmlReporter, "testSuccess");
            this.stub(htmlReporter, "testFailure");
            this.stub(htmlReporter, "testError");
            this.stub(htmlReporter, "testTimeout");
            this.stub(htmlReporter, "testDeferred");
            this.stub(htmlReporter, "log");
            this.stub(htmlReporter, "addStats");

            this.doc = createDocument();
            this.runner = buster.create(buster.eventEmitter);
            this.runner.console = buster.create(buster.eventEmitter);
            this.reporter = htmlReporter.create({
                root: this.doc.createElement("div")
            }).listen(this.runner);
        },

        "should map suite:end to addStats": function () {
            this.runner.emit("suite:end", {});

            assert(this.reporter.addStats.calledOnce);
        },

        "should map context:start to contextStart": function () {
            this.runner.emit("context:start");

            assert(this.reporter.contextStart.calledOnce);
        },

        "should map context:end to contextEnd": function () {
            this.runner.emit("context:end");

            assert(this.reporter.contextEnd.calledOnce);
        },

        "should map test:success to testSuccess": function () {
            this.runner.emit("test:success");

            assert(this.reporter.testSuccess.calledOnce);
        },

        "should map test:error to testError": function () {
            this.runner.emit("test:error");

            assert(this.reporter.testError.calledOnce);
        },

        "should map test:fail to testFailure": function () {
            this.runner.emit("test:failure");

            assert(this.reporter.testFailure.calledOnce);
        },

        "should map test:timeout to testTimeout": function () {
            this.runner.emit("test:timeout");

            assert(this.reporter.testTimeout.calledOnce);
        },

        "should map logger log to log": function () {
            this.runner.console.emit("log");

            assert(this.reporter.log.calledOnce);
        },

        "should map test:deferred to testDeferred": function () {
            this.runner.emit("test:deferred");

            assert(this.reporter.testDeferred.calledOnce);
        }
}, "should"));
}(typeof buster !== "undefined" ? buster : null,
  typeof sinon !== "undefined" ? sinon : null));
