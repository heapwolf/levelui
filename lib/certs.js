var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');

function spawnOpenssl(cmd, opts, cb) {

  var args = [];

  for(var o in opts) {
    if (o.length > 0) args.push('-' + o);
    if (opts[o].length > 0) args.push(opts[o]);
  }

  args.unshift(cmd);

  var ps = spawn('openssl', args, { cwd: process.cwd() });

  ps.stdout.on('end', function () {

    var fileLocation = path.join(process.cwd(), opts.out);

    fs.readFile(fileLocation, 'utf8', function (err, data) {
      if (err) {
        return cb(err);
      }
      //fs.unlink(fileLocation);
      cb(null, data);
    });
  });

  ps.on('exit', function (code) {
    if (code !== 0) {
      cb('non-zero exit code ' + code);
    }
  });
};

exports.opts = {
  genrsa: {
    'out': 'auth/levelweb-key.pem',
    '': '1024'
  },
  req: {
    'new': '',
    'config': 'auth/levelweb.cnf',
    'key': 'auth/levelweb-key.pem',
    'out': 'auth/levelweb-csr.pem'
  },
  x509: {
    'req': '',
    'in': 'auth/levelweb-csr.pem',
    'signkey': 'auth/levelweb-key.pem',
    'out': 'auth/levelweb-cert.pem'
  }
};

function selfSign(callback) {

  // generate a private key
  spawnOpenssl('genrsa', exports.opts.genrsa, function(err, key) {

    // create a signing request
    spawnOpenssl('req', exports.opts.req, function(err) {

      // self sign the request
      spawnOpenssl('x509', exports.opts.x509, function(err, cert) {

        callback(null, {
          key: String(key),
          cert: String(cert)
        });

      });
    });
  });
}

exports.fetch = function(callback) {

  var certLocation = path.join(process.cwd(), exports.opts.x509.out);
  var keyLocation = path.join(process.cwd(), exports.opts.genrsa.out);

  fs.readFile(certLocation, function(err, cert) {

    if (err) {

      selfSign(function(err, pems) {

        if (err) {
          callback(err);
        }
        else {
          callback(null, pems);
        }
      });
    }
    else {
      fs.readFile(keyLocation, function(err, key) {

        callback(null, {
          key: String(key),
          cert: String(cert)
        });
      });
    }
  });
};
