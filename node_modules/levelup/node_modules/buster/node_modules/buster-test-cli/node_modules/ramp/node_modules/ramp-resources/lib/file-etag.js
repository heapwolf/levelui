/*global require, module*/
var fs = require("fs");
var crypto = require("crypto");

module.exports = {
    add: function (fileName, resource, callback) {
        if (resource.etag) { return callback(); }
        this.generate(fileName, function (err, etag) {
            if (err) { return callback(err); }
            resource.etag = etag;
            callback();
        });
    },

    generate: function (fileName, callback) {
        fs.stat(fileName, function (err, stat) {
            if (err) { return callback(err); }
            var hash = crypto.createHash("sha1");
            hash.update(stat.mtime.toString());
            hash.update(fileName);
            callback(null, hash.digest("hex"));
        });
    }
};
