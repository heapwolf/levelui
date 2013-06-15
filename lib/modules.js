var fs = require('fs')
var path = require('path')
var browserify = require('browserify')

//
// find all the modules that have `levelweb-`
// in their names.
//
function eachModule(callback) {

  var modulesPath = path.join(__dirname, '..', 'node_modules')
  var modules = fs.readdirSync(modulesPath)

  modules.forEach(function(dir) {

    dir = path.join(modulesPath, dir)

    try {

      var packagePath = path.join(dir, 'package.json')
      var json = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

      if (json.name.indexOf('levelweb-') === 0) {
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
