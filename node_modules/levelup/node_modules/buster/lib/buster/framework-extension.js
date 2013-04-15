// WHOA! This will change before 1.0

function resolveModules(resourceSet, modules) {
    return modules.map(function (module) {
        var moduleName = module[0];
        var moduleFile = module[1];
        var resourcePath = "/buster/" + moduleFile;
        var absolutePath = require.resolve(moduleName + "/lib/" + moduleFile);
        resourceSet.addFileResource(absolutePath, { path: resourcePath });
        return resourcePath;
    });
}

var when = require("when");

var NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Expires": "0"
};

function loadTestFramework(configuration) {
    configuration.on("load:framework", function (rs) {
        rs.addResource({
            path: "/when.js",
            file: require.resolve("when")
        });
        var files = resolveModules(rs, [
            ["buster-core", "buster-core.js"],
            ["buster-core", "buster-event-emitter.js"],
            ["buster-evented-logger", "buster-evented-logger.js"],
            ["buster-assertions", "buster-assertions.js"],
            ["buster-assertions", "buster-assertions/expect.js"],
            ["buster-format", "buster-format.js"],
            ["sinon", "sinon.js"],
            ["sinon", "sinon/spy.js"],
            ["sinon", "sinon/stub.js"],
            ["sinon", "sinon/mock.js"],
            ["sinon", "sinon/collection.js"],
            ["sinon", "sinon/sandbox.js"],
            ["sinon", "sinon/test.js"],
            ["sinon", "sinon/test_case.js"],
            ["sinon", "sinon/assert.js"],
            ["sinon", "sinon/match.js"],
            ["sinon", "sinon/util/event.js"],
            ["sinon", "sinon/util/fake_xml_http_request.js"],
            ["sinon", "sinon/util/fake_timers.js"],
            ["sinon", "sinon/util/fake_server.js"],
            ["sinon", "sinon/util/fake_server_with_clock.js"],
            ["buster-test", "buster-test/browser-env.js"],
            ["buster-test", "buster-test/test-context.js"],
            ["buster-test", "buster-test/spec.js"],
            ["buster-test", "buster-test/test-case.js"],
            ["buster-test", "buster-test/test-runner.js"],
            ["buster-test", "buster-test/reporters/json-proxy.js"],
            ["buster-sinon", "buster-sinon.js"],

            // Slightly silly, will be fixed
            ["../..", "buster/buster-wiring.js"],
            ["../..", "buster/browser-wiring.js"]/*,
            ["../..", "buster/capture-server-wiring.js"]*/
        ]);

        var ieFiles = resolveModules(rs, [
            ["sinon", "sinon/util/timers_ie.js"],
            ["sinon", "sinon/util/xhr_ie.js"]
        ]);

        var compatResourceName = "/buster/compat-0.6.js";
        var bundleResourceName = "/buster/bundle-0.6.js";

        when.all([
            rs.addResource({
                path: compatResourceName,
                combine: ieFiles,
                headers: NO_CACHE_HEADERS
            }),
            rs.addResource({
                path: bundleResourceName,
                combine: ["/when.js"].concat(files),
                headers: NO_CACHE_HEADERS
            })
        ], function () {
            rs.loadPath.prepend(compatResourceName);
            rs.loadPath.prepend(bundleResourceName);
        }.bind(this));
    }.bind(this));
}

module.exports = {
    configure: function (configuration) { loadTestFramework(configuration); }
};
