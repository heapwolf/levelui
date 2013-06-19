var fs = require('fs')
var path = require('path')
var browserify = require('browserify')
var uniq = require('uniq')

var modulesPath = path.join(__dirname, '..', '..')
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
exports.load = function() {

  var modules = {}
  var groups = {}

  eachModule(function(dir, json) {
    var mainPath = path.join(dir, json.main)
    var userModule = modules[mainPath] = require(mainPath)

    groups[json.name] = []

    for (var exportedItem in userModule) {
      groups[json.name].concat(userModule[exportedItem].groups)
    }
    groups[json.name] = uniq(groups[json.name])
  })

  return {
    modules: modules,
    groups: groups
  }
}

//
// get all the user modules and browserify their public 
// javascripts if the user has at least one permission
// in the module.
//
exports.browserify = function(opts) {

  var b = browserify()
  var manifest = []

  b.add(path.join(__dirname, '..', 'public', 'js', 'index.js'))

  eachModule(function(dir, json) {

    if (opts.sessionGroups && opts.requiredGroups) {
      var matches = opts.sessionGroups.filter(function(n) {
        if(requiredGroups[json.name].indexOf(n) === -1) {
          return false
        }
        return true
      })
      if (!matches) {
        return
      }
    }

    b.require(path.join(dir, json.browser), { expose: json.name })
    manifest.push(json.name)
  })

  //
  // A limitation of browserify is that you cant dynamically add code
  //
  res.write(';window.__usermodules=' + JSON.stringify(manifest) + ';')

  b.transform('brfs')
  return b
}
