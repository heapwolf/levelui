var ramp = require("./../lib/ramp");
var rampResources = require("ramp-resources");

var port = parseInt(process.argv[2], 10);
var rs = rampResources.createResourceSet();
var serverClient = ramp.createServerClient(port);
serverClient.createSession(rs);
