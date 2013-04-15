var path = require("path");

module.exports = {
    configure: function (configuration) {
        configuration.on("load:framework", function (rs) {
            rs.addFileResource(path.join(__dirname, "capture-server-wiring.js"), {
                path: "/buster/capture-server-wiring.js"
            }).then(function () {
                rs.loadPath.append("/buster/capture-server-wiring.js");
            });
        });
    }
};
