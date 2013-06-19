var fs = require('fs')
var url = require('url')
var path = require('path')
var qs = require('querystring')

var Cookies = require('cookies')
var paramify = require('paramify')
var levelmanifest = require('level-manifest')
var mime = require('mime')

var modules = require('./module-loader')
var users = require('./users')

module.exports = function(opts) {

  opts.port = opts.https || opts.http || 8080

  function redirect(req, res) {

    var parsedPath = url.parse(req.url)
    var location = parsedPath.protocol + parsedPath.host

    res.statusCode = 302
    res.setHeader('Location', '/')
    res.setHeader('Content-Length', '0')
    res.end()
  }

  function staticHandler(req, res) {

    var cookies = new Cookies(req, res, opts.keys)
    var session = cookies.get('session', { signed: true })
    var match = paramify(req.url).match

    //
    // if there are custom routes, test the groups/permissions
    // and potentially run the method associated with the route.
    //
    if (opts.userRoutes) {
      for (var route in opts.userRoutes) {
        if (match(route)) {

          return opts.userRoutes[route].method.call(
            {
              db: opts.db.usrdb,
              session: session
            },
            req, res, match.params
          )
        }
      }
    }

    if (req.url === '/bundle.js') {

      var browserifyOpts = {
        response: res
      }

      var bundleOpts = { 
        debug: opts.debug 
      }

      if (opts.auth) {
        browserifyOpts.sessionGroups = session.groups
        browserifyOpts.requiredGroups = opts.requiredGroups
      }

      //
      // TODO: cache for production
      //
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript')

      return modules.browserify(browserifyOpts).bundle(bundleOpts).pipe(res)
    }

    //
    // this bad bitch serves up the level manifest. 
    // ...oh fuck i think i barfed. TODO: IMPROVE.
    //
    else if (req.url === '/manifest.js') {

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript')

      return res.end([
        ';window.__levelmanifest=',
        JSON.stringify(levelmanifest(opts.db.usrdb)),
        ';'
      ].join(''))
    }

    //
    // provide a simple redirect when the user has no session
    // or when they don't specify a real server resource.
    //
    else if (req.url === '/' || req.url === '/index.html') {

      if (!session && opts.auth) {
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

        users.validate(
          opts.db.usrdb, 
          { 
            user: formdata.username,
            pass: formdata.password
          },
          function(err, value) {
            if (err) {
              return redirect(req, res)
            }
            cookies.set('session', JSON.stringify(value), {
              signed: true, expires: new Date('2100')
            })
            redirect(req, res)
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

  var server

  if (opts.https) {
    server = require('https')
      .createServer(opts.pkiPair, staticHandler)
  }
  else {
    server = require('http')
      .createServer(staticHandler)
  }

  server.listen(opts.port, opts.host, function() {
    console.log(
      '%s server listening on %s port %d',
      (opts.https ? 'https' : 'http'),
      opts.host, 
      opts.port
    )
  })

  return server
}
