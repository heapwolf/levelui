/*
 * Proxies the "request" event on a HTTP server.
 *
 * The `listener` callback is always called first. If it returns `true`, we
 * halt. If it doesn't return `true`, continue on calling the original
 * request listeners.
 *
 * This allows for "consuming" a http request, so that no other listeners
 * are made aware of it.
 */
exports.attach = function (httpServer, listener) {
    var requestListeners = httpServer.listeners("request");
    httpServer.removeAllListeners("request");

    httpServer.on("request", function (req, res) {
        if (listener(req, res)) { return; }
        requestListeners.forEach(function (l) { l(req, res); });
    });
};
