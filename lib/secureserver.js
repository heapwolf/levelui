var fs = require('fs')
var url = require('url')
var https = require('https')
var path = require('path')
var qs = require('querystring')

var Cookies = require('cookies')
var uuid = require('node-uuid')
var bcrypt = require('bcrypt')
var mime = require('mime')

module.exports = function(opts) {

  //
  // handle https for the user interface
  //
  function redirect(req, res) {

    // var parsedPath = url.parse(req.url)
    // var location = parsedPath.protocol + parsedPath.host

    res.statusCode = 302
    res.setHeader('Location', '/')
    res.setHeader('Content-Length', '0')
    res.end()
  }

  function staticHandler(req, res) {

    var cookies = new Cookies(req, res, opts.keys)
    var session = cookies.get('session', { signed: true })

    if (req.url === '/socket.js') {

      res.writeHeader('Content-Type', 'application/javascript')
      return res.end([
        'var socket = new WebSocket(',
        '"wss://', opts.host, ':', opts.https, '"',
        ')'
      ].join(''))
    }

    //
    // provide a simple redirect when the user has no session
    // or when they don't specify a real server resource.
    //
    else if (req.url === '/' || req.url === '/index.html') {

      if (!session && !opts.client) {
        req.url = '/signin.html'
      }
      else {
        req.url = '/index.html'
      }
    }

    //
    // authentication
    //
    else if (req.url === '/auth') {

      var queryData = ''

      req.on('data', function(data) {
        queryData += data
        if(queryData.length > 1e6) {
          req.connection.destroy()
        }
      })

      req.on('end', function() {

        var formdata = qs.parse(queryData)
        var username = formdata.username
        var password = formdata.password
        var hasData = false

        opts.db['sysdb']
          .createReadStream({
            start: '__user__' + username,
            limit: 1
          })
          .on('data', function(data) {
            hasData = true
            bcrypt.compare(password, data.value, function(err, match) {

              if (match){
                cookies.set('session', uuid.v4(), {
                  signed: true, expires: new Date('2100')
                })
              }
              redirect(req, res)
            })
          })
          .on('end', function() {
            if (!hasData) {
              redirect(req, res)
            }
          })
      })
      return
    }

    var rawurl = url.parse(req.url)
    var pathname = decodeURI(rawurl.pathname)
    var base = path.join(__dirname, '..', 'public')
    var filepath = path.normalize(path.join(base, pathname))
    var mimetype = mime.lookup(filepath)

    if (!mimetype) {
      return
    }

    res.writeHeader('Content-Type', mimetype)

    fs.stat(filepath, function (err, stat) {

      if (err && err.code === 'ENOENT') {
          res.end('not found')
      }
      else {
        if (!stat.isDirectory()) {
          fs.createReadStream(filepath).pipe(res)
        }
      }
    })
  }

  var server = https.createServer(opts.pems, staticHandler)

  server.listen(opts.https, opts.host, function() {
    console.log(
      'https server listening on %s port %d', 
      opts.host, 
      opts.https
    )
  })

  return server
}
