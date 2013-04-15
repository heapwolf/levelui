if (!this.buster) { this.buster = {}; }

(function (buster) {
    buster.captureServer = buster.captureServer || {};
    buster.captureServer.prisonUtil = {
        addEventListener: function (element, event, handler) {
            if (element.addEventListener) {
                element.addEventListener(event, handler, false);
            } else if (element.attachEvent) {
                element.attachEvent("on" + event, handler);
            }
        },

        removeEventListener: function (element, event, handler) {
            if (element.removeEventListener) {
                element.removeEventListener(event, handler, false);
            } else if (element.detachEvent) {
                element.detachEvent("on" + event, handler);
            }
        },

        frame: function (el) {
            return {
                window: function () {
                    return el.contentWindow;
                },

                setSrc: function (src, onload) {
                    var wrappedHandler = function () {
                        buster.captureServer.prisonUtil
                            .removeEventListener(el, "load", wrappedHandler);
                        setTimeout(onload, 1);
                    };
                    buster.captureServer.prisonUtil
                        .addEventListener(el, "load", wrappedHandler);
                    el.src = src;
                }
            };
        }
    };
}(this.buster));
