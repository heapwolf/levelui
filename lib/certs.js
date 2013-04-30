//
// a script that spawns openssl to create a private key and self signed 
// certificate both used for encrypting connections over http and tls.
//
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');

function spawnOpenSSL(cmd, opts, cb) {

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
      cb(null, data);
    });
  });

  ps.on('exit', function (code) {
    if (code !== 0) {
      cb(new Error('non-zero exit code ' + code));
    }
  });
};

exports.opts = {
  genrsa: {
    'out': path.join('auth', 'levelweb-key.pem'),
    '': '1024'
  },
  req: {
    'new': '',
    'config': path.join(__dirname, '..', 'auth', 'levelweb.cnf'),
    'key': path.join('auth', 'levelweb-key.pem'),
    'out': path.join('auth', 'levelweb-csr.pem')
  },
  x509: {
    'req': '',
    'in': path.join('auth', 'levelweb-csr.pem'),
    'signkey': path.join('auth', 'levelweb-key.pem'),
    'out': path.join('auth', 'levelweb-cert.pem')
  }
};

console.log(exports.opts)

exports.selfSign = function(callback) {

  // generate a private key
  spawnOpenSSL('genrsa', exports.opts.genrsa, function(generr, key) {

    // create a signing request
    spawnOpenSSL('req', exports.opts.req, function(reqerr) {

      //
      // self sign the request
      //
      spawnOpenSSL('x509', exports.opts.x509, function(signerr, cert) {

        callback(generr || reqerr || signerr || null, {
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

  console.log('getting certificats');

  fs.readFile(certLocation, function(err, cert) {

    if (err) {

      exports.selfSign(function(err, pems) {
        callback(err || null, pems);
      });
    }
    else {
      fs.readFile(keyLocation, function(err, key) {

        callback(err || null, {
          key: String(key),
          cert: String(cert)
        });
      });
    }
  });
};
