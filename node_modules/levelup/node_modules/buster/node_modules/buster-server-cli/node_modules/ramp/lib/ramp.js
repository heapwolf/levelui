var bCapServServer = require("./server");
var bCapServServerClient = require("./server-client");

module.exports = {
    createServer: function () {
        return bCapServServer.create();
    },

    createServerClient: function (port, host) {
        return bCapServServerClient.create(port, host);
    },

    testHelper: require("./test-helper")
};
