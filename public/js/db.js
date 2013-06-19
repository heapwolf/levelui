
var multilevel = require('multilevel')

var db = multilevel.client(window.__levelmanifest)

exports.get = function() {
  return db
}

exports.set = function(_db) {
  db = _db
}
