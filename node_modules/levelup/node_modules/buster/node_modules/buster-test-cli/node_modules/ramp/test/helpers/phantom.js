var SERVER_PORT = parseInt(phantom.args[0], 10);

function traceStr(trace) {
    return trace.map(function (t) {
        return t.file + ": " + t.line;
    }).join(" --- ");
}

var page = new WebPage();
page.onConsoleMessage = function (msg) { console.log("debug " + msg); };
page.onError = function (msg, trace) {
    console.log("error " + msg + " --- " + traceStr(trace));
};

var server = require("webserver").create();
server.listen(SERVER_PORT, function (request, response) {
    if (request.url === "/load") {
        var url = request.headers["X-Phantom-Load-Url"];
        page.open(url, function (status) {
            console.log("page " + status);
        });
    }

    response.statusCode = 200;
    response.write("");
    response.close();
});

console.log("ready 1");
