var buster = require("buster");
var syntax = require("../lib/syntax");

buster.testCase("Syntax", {
    "passes syntactically valid code": function () {
        assert(syntax.create().check("var a = 42;").ok);
    },

    "passes syntactically valid code with file name": function () {
        assert(syntax.create().check("var a = 42;", "booya.js").ok);
    },

    "fails syntactically invalid code": function () {
        var result = syntax.create().check("va a = 42;");
        refute(result.ok);
        assert.equals(result.errors, [{
            type: syntax.SYNTAX_ERROR,
            file: null,
            line: 1,
            col: 4,
            content: "va a = 42;",
            message: "Unexpected token: name (a)"
        }]);
    },

    "formats syntax error nicely": function () {
        var result = syntax.create().check("va a = 42;");

        assert.equals(result.errors, [{
            type: syntax.SYNTAX_ERROR,
            file: null,
            line: 1,
            col: 4,
            content: "va a = 42;",
            message: "Unexpected token: name (a)"
        }]);
    },

    "formats syntax error with file name": function () {
        var result = syntax.create().check("va a = 42;", "omg.js");

        assert.match(result.errors, [{
            file: "omg.js",
            line: 1,
            col: 4
        }]);
    },

    "recognizes browser globals": function () {
        assert(syntax.create().check("document.createElement('div');").ok);
    },

    "recognizes globals introduced by previously loaded script": function () {
        var checker = syntax.create();
        checker.check("jQuery = function () {};");
        assert(checker.check("var a = jQuery('div');").ok);
    },

    "does not recognize undefined globals": function () {
        var checker = syntax.create();
        checker.check("jQuery = function () {};");
        var result = checker.check("var a = $('div');");
        refute(result.ok);
        assert.equals(result.errors[0].type, syntax.REFERENCE_ERROR);
    },

    "ignores reference errors": function () {
        var checker = syntax.create({ ignoreReferenceErrors: true });
        var result = checker.check("var a = $('div');");
        assert(result.ok);
    },

    "does not fail on file ending in comment": function () {
        var checker = syntax.create();
        var result = checker.check("jQuery = function () {};\n// Ok");
        assert(result.ok);

        checker = syntax.create({ ignoreReferenceErrors: true });
        result = checker.check("jQuery = function () {};\n// Ok");
        assert(result.ok);
    }
});
