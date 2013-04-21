//
// a deadly simple method for packaging front-end assets.
//
var fs = require('fs');
var path = require('path');
var CleanCSS = require('clean-css');
var UglifyJS = require('uglify-js');
var crypto = require('crypto');

exports.quiet = false;

function stdout(s) {
  if (!exports.quiet) {
    process.stdout.write(s);
  }
}

exports.pack = function(id, minify, files) {

  var pack = [];
  var minifier;
  var options = {};

  stdout('packaging `' + id + '` assets.');

  files.forEach(function(file) {

    var min = minify && file.indexOf('.min.') === -1;

    if (file.indexOf('/') > -1) {
      file = path.join.apply(null, file.split('/'));
    }

    var loc = path.join(__dirname, '..', 'public', file);
    var data = fs.readFileSync(loc).toString();

    stdout('.');

    switch(path.extname(file)) {
      case '.js':
        minifier = UglifyJS.minify;
        options = { fromString: true };
      break;
      case '.css':
        minifier = CleanCSS.process;
      break;
    }

    pack.push(min 
      ? (minifier && minifier(data, options).code) 
      : data
    );
  });

  stdout('\r\n');
  exports.packages[id] = pack.join('\n\n');

};

exports.packages = {};
