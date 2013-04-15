/* Copyright (c) 2012 Rod Vagg <@rvagg> */

var fs    = require('fs')
  , path  = require('path')
  , async = require('async')

  , readDir = function (dir, obj, callback) {
      if (typeof obj == 'function') {
        callback = obj
        obj = {}
      }

      fs.readdir(dir, function (err, list) {
        if (err)
          return callback(err)
        async.forEach(
            list
          , function (f, callback) {
              var p = path.join(dir, f)
              fs.stat(p, function (err, stat) {
                if (err)
                  return callback(err)
                if (stat.isDirectory()) {
                  obj[f] = {}
                  return readDir(p, obj[f], callback)
                } else if (stat.isFile()) {
                  fs.readFile(p, function (err, data) {
                    if (err)
                      return callback(err)
                    obj[f] = data.toString()
                    callback()
                  })
                }
              })
            }
          , function (err) {
              callback(err, obj)
            }
        )
      })
    }

module.exports = readDir