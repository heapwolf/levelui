var buster = require("buster");
var args = require("../lib/posix-argv-parser");
var t = args.types;

buster.testCase("types", {
    setUp: function () {
        this.a = args.create();
    },

    "integer": {
        "validates value as integer": function (done) {
            this.a.createOption(["-p"], t.integer());

            this.a.parse(["-p", "abc"], done(function (errors) {
                assert.match(errors[0], "-p");
                assert.match(errors[0], "integer");
            }));
        },

        "validates with additional validators": function (done) {
            this.a.createOption(["-p"], t.integer({
                validators: [function () { throw new Error("OMG"); }]
            }));

            this.a.parse(["-p", "abc"], done(function (errors) {
                assert.match(errors[0], "OMG");
            }));
        },

        "validates integer when additional validators": function (done) {
            this.a.createOption(["-p"], t.integer({
                validators: [function () {}]
            }));

            this.a.parse(["-p", "abc"], done(function (errors) {
                assert.match(errors[0], "abc");
            }));
        },

        "produces number value": function (done) {
            this.a.createOption(["-p"], t.integer());

            this.a.parse(["-p", "1111"], done(function (errors, options) {
                assert.same(options["-p"].value, 1111);
            }));
        },

        "produces number with radix 10 by default": function (done) {
            this.a.createOption(["-p"], t.integer());

            this.a.parse(["-p", "08"], done(function (errors, options) {
                assert.same(options["-p"].value, 8);
            }));
        },

        "produces number with custom radix": function (done) {
            this.a.createOption(["-p"], t.integer({ radix: 8 }));

            this.a.parse(["-p", "08"], done(function (errors, options) {
                assert.same(options["-p"].value, 0);
            }));
        }
    },

    "number": {
        "validates value as number": function (done) {
            this.a.createOption(["-p"], t.number());

            this.a.parse(["-p", "2,3"], done(function (errors) {
                assert.match(errors[0], "-p");
                assert.match(errors[0], "number");
            }));
        },

        "validates with additional validators": function (done) {
            this.a.createOption(["-p"], t.number({
                validators: [function () { throw new Error("OMG"); }]
            }));

            this.a.parse(["-p", "abc"], done(function (errors) {
                assert.match(errors[0], "OMG");
            }));
        },

        "validates integer when additional validators": function (done) {
            this.a.createOption(["-p"], t.number({
                validators: [function () {}]
            }));

            this.a.parse(["-p", "abc"], done(function (errors) {
                assert.match(errors[0], "abc");
            }));
        },

        "produces number value": function (done) {
            this.a.createOption(["-p"], t.number());

            this.a.parse(["-p", "1111.3"], done(function (errors, options) {
                assert.same(options["-p"].value, 1111.3);
            }));
        }
    },

    "enum": {
        "throws without values": function () {
            assert.exception(function () {
                t.enum();
            });
        },

        "validates values in enum": function (done) {
            this.a.createOption(["-p"], t.enum(["1", "2", "3", "4"]));
            this.a.createOption(["-t"], t.enum(["1", "2", "3", "4"]));

            this.a.parse(["-p", "1", "-t", "5"], done(function (err) {
                assert.match(err[0], "-t");
            }));
        }
    }
});
