/* Copyright (c) 2012 Rod Vagg <@rvagg> */

var fs = require('fs')
  , path = require('path')
  , temp = require('temp')
  , rimraf = require('rimraf')
  , async = require('async')

  , dirs = []

  , makeEntry = function (dir, key, value, callback) {
      var p = path.join(dir, key)
      if (typeof value == 'string') {
        fs.writeFile(p, value, 'utf-8', callback)
      } else if (typeof value == 'object')
        make(fs, p, value, callback)
      else // huh? perhaps this could be a callable function
        callback()
    }

  , make = function (mod, dir, data, callback) {
      mod.mkdir(dir, function (err, _dir) {
        if (err) return callback(err)

        _dir && dirs.push(_dir) // _dir if we made it with temp.mkdir, otherwise leave it alone

        async.forEach(
            Object.keys(data)
          , function (k, callback) { makeEntry(_dir || dir, k, data[k], callback) }
          , function (err) { callback(err, path.resolve(_dir || dir)) } // return the dir
        )
      })
    }

  , cleanUp = function (callback) {
      async.forEach(
          dirs
        , rimraf
        , function () {
            dirs = []
            callback.apply(null, arguments)
          }
      )
    }

module.exports = {
    makeTemp: function (prefix, data, callback) {
      make(temp, prefix, data, callback)
    }

  , make: function (root, data, callback) {
      make(fs, root, data, callback)
    }

  , cleanUp: cleanUp
}