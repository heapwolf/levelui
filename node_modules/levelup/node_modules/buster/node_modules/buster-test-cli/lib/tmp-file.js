var crypto = require("crypto");
var path = require("path");

module.exports = function (fileName) {
    var hashed = crypto.createHash("sha1");
    hashed.update(fileName);
    var tmpfileName = hashed.digest("hex");
    var dir = process.env.BUSTER_TMP || process.env.TEMP || "/tmp";

    return path.join(dir, tmpfileName);
};
