
var fs = require('fs')
var path = require('path')

var buffer = { html: '', css:''}

function rdrsync(dirname, dir) {
  fs.readdirSync(dirname).forEach(function(fn) {
    var f = path.join(dirname, fn)
    var ext = path.extname(fn)
    var st = fs.statSync(f).isDirectory() 
    if (st) {
      rdrsync(f, fn)
    }
    else if (ext === '.html' || ext === '.css') {
      buffer[ext.slice(1)] += fs.readFileSync(f, 'utf8')
    }
  })
}

exports.merge = function merge() {

  rdrsync(path.join(__dirname, '..', 'public', 'addons'))

  var cssInPath = path.join(__dirname, '..', 'public', 'masters', 'index.css')
  var htmlInPath = path.join(__dirname, '..', 'public', 'masters', 'index.html')

  var cssOutPath = path.join(__dirname, '..', 'public', 'css', 'index.css')
  var htmlOutPath = path.join(__dirname, '..', 'public', 'index.html')

  var html = fs.readFileSync(htmlInPath, 'utf8').replace('{{HTML}}', buffer.html)
  var css = fs.readFileSync(cssInPath, 'utf8').replace('{{CSS}}', buffer.css)

  fs.writeFile(htmlOutPath, html)
  fs.writeFile(cssOutPath, css)
}
