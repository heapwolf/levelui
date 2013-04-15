/* Copyright (c) 2012 Rod Vagg <@rvagg> */

var fs = require('fs')
  , path = require('path')
  , async = require('async')

function du (dir, options, callback) {
  if (typeof options == 'function') {
    callback = options
    options  = {}
  }

  fs.stat(dir = path.resolve(dir), function (err, stat) {
    if (err) return callback(err)

    if (!stat) return callback(null, 0)

    if (!stat.isDirectory())
      return callback(null, !options.filter || options.filter(dir) ? stat.size : 0)

    fs.readdir(dir, function (err, list) {
      if (err) return callback(err)

      async.map(
          list.map(function (f) {
            return path.join(dir, f)
          })
        , function (f, callback) {
            return du(f, options, callback)
          }
        , function (err, sizes) {
            callback(
                err
              , sizes && sizes.reduce(function (p, s) {
                  return p + s
                }, stat.size)
            )
          }
      )
    })
  })
}

module.exports = du