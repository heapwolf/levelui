(function (B) {
    B.captureServer.prisonUtil.addEventListener(window, "load", function () {
        var prison = B.captureServer.prison.create();
        prison.listen();
        B.captureServer.sharedPrison = prison;
    });
}(buster));