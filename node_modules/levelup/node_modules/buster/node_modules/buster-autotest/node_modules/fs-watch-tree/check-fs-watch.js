var fs = require("fs");
var rmrf = require("rimraf");

function setup(done) {
    fs.mkdir("root", function () {
        fs.mkdir("root/dir1", function () {
            fs.mkdir("root/dir2", function () {
                fs.writeFile("root/dir1/file.txt", "", done);
            });
        });
    });
}

function test(params, done) {
    setup(function () {
        var w1 = fs.watch("root", function (a, b) { console.log("  event on root:", a, b); });
        var w2 = fs.watch("root/dir1", function (a, b) { console.log("  event on dir1:", a, b); });
        var w3 = fs.watch("root/dir2", function (a, b) { console.log("  event on dir2:", a, b); });
        var w4 = fs.watch("root/dir1/file.txt", function (a, b) { console.log("  event on file.txt:", a, b); });

        console.log("");
        console.log(params.header);
        console.log("--------------------------------------");
        params.action(function () {
            setTimeout(function () {
                w1.close();
                w2.close();
                w3.close();
                w4.close();
                rmrf("root", done);
            }, 100);
        });
    });
}

var tests = [
    { header: "Changing file", action: function (done) { fs.writeFile("root/dir1/file.txt", "1", done); } },
    { header: "Creating file", action: function (done) { fs.writeFile("root/dir1/file2.txt", "1", done); } },
    { header: "Deleting file", action: function (done) { fs.unlink("root/dir1/file.txt", done); } },
    { header: "Renaming file", action: function (done) { fs.rename("root/dir1/file.txt", "root/dir1/new.txt", done); } },
    { header: "Moving file",   action: function (done) { fs.rename("root/dir1/file.txt", "root/dir2/file.txt", done); } },
    { header: "Creating dir",  action: function (done) { fs.mkdir("root/dir1/dir11", done); } },
    { header: "Deleting dir",  action: function (done) { rmrf("root/dir2", done); } },
    { header: "Renaming dir",  action: function (done) { fs.rename("root/dir1", "root/awesomedir", done); } },
    { header: "Moving dir",    action: function (done) { fs.rename("root/dir1", "root/dir2/dir1", done); } }
];

function nextTest() {
    if (tests.length > 0) {
        test(tests.shift(), nextTest);
    } else {
        console.log("--------------------------------------");
    }
}

nextTest();
