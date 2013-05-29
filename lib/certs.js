//
// a script that spawns openssl to create a private key and self signed 
// certificate both used for encrypting connections over http and tls.
//
var spawn = require('child_process').spawn
var fs = require('fs')
var path = require('path')

function spawnOpenSSL(cmd, opts, cb) {

  var args = []

  for(var o in opts) {
    if (o.length > 0) args.push('-' + o)
    if (opts[o].length > 0) args.push(opts[o])
  }

  args.unshift(cmd)

  var ps = spawn('openssl', args, { cwd: process.cwd() })

  ps.stdout.on('end', function () {

    var fileLocation = path.join(process.cwd(), opts.out)

    fs.readFile(fileLocation, 'utf8', function (err, data) {
      if (err) {
        return cb(err)
      }
      cb(null, data)
    })
  })

  ps.on('exit', function (code) {
    if (code !== 0) {
      cb('non-zero exit code ' + code)
    }
  })
}

exports.opts = {
  genrsa: {
    'out': path.join('auth', 'key.pem'),
    '': '1024'
  },
  req: {
    'new': '',
    'config': path.join(__dirname, '..', 'auth', 'defaults.cnf'),
    'key': path.join('auth', 'key.pem'),
    'out': path.join('auth', 'csr.pem')
  },
  x509: {
    'req': '',
    'in': path.join('auth', 'csr.pem'),
    'signkey': path.join('auth', 'key.pem'),
    'out': path.join('auth', 'cert.pem')
  }
}

function ensureAuthDir(callback) {

  var authDir = path.join(process.cwd(), 'auth')

  fs.stat(authDir, function(err, stat) {

    if (err) {
      fs.mkdir(authDir, function() {
        callback()
      })
    }
    else {
      callback()
    }
  })
}

exports.selfSign = function(callback) {

  ensureAuthDir(function() {

    // generate a private key
    spawnOpenSSL('genrsa', exports.opts.genrsa, function(err, key) {

      // create a signing request
      spawnOpenSSL('req', exports.opts.req, function(err) {

        // self sign the request
        spawnOpenSSL('x509', exports.opts.x509, function(err, cert) {

          callback(null, {
            key: String(key),
            cert: String(cert)
          })

        })
      })
    })
  })
}

exports.fetch = function(callback) {

  var certLocation = path.join(process.cwd(), exports.opts.x509.out)
  var keyLocation = path.join(process.cwd(), exports.opts.genrsa.out)

  fs.readFile(certLocation, function(err, cert) {

    if (err) {

      exports.selfSign(function(err, pems) {

        if (err) {
          callback(err)
        }
        else {
          callback(null, pems)
        }
      })
    }
    else {
      fs.readFile(keyLocation, function(err, key) {

        callback(null, {
          key: String(key),
          cert: String(cert)
        })
      })
    }
  })
}
