var fs = require('fs')
var path = require('path')
var browserify = require('browserify')

var modulesPath = path.join(__dirname, '..', 'node_modules')
var packagePath = path.join(__dirname, '..', 'package.json')
var packageName = require(packagePath).name

//
// find all the modules that are prefixed with this package name.
//
function eachModule(callback) {

  var modules = fs.readdirSync(modulesPath)

  modules.forEach(function(dir) {

    dir = path.join(modulesPath, dir)

    try {

      var json = JSON.parse(
        fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
      )

      if (json.name.indexOf(packageName + '-') === 0) {
        callback(dir, json)
      }
    }
    catch(ex) {
      // ignore.
    }
  })

}

//
// get the user modules and attach any exports
// to the database object so they can be used 
// by the multilevel client.
//
exports.requireUserModules = function() {

  var userModules = {}

  eachModule(function(dir, json) {
    var mainPath = path.join(dir, json.main)
    userModules[mainPath] = require(mainPath)
  })

  return userModules
}

//
// get all the levelweb modules and browserify 
// their public javascripts.
//
exports.makeBundle = function(res) {

  var b = browserify()
  var manifest = []

  b.add(path.join(__dirname, '..', 'public', 'js', 'index.js'))

  eachModule(function(dir, json) {
    b.require(path.join(dir, json.browser), { expose: json.name })
    manifest.push(json.name)
  })

  res.write(';window.__usermodules=' + JSON.stringify(manifest) + ';')

  b.transform('brfs')
  return b
}
