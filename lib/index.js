var tls = require('tls')
var net = require('net')
var path = require('path')

var uuid = require('node-uuid')
var Cookies = require('cookies')
var keys = require('keygrip')([uuid.v4()])
var EngineServer = require('engine.io-stream')
var level = require('level')
var multilevel = require('multilevel')
var es = require('event-stream')
var repair = require('re-pair')

var secureServer = require('./secureserver')
var certs = require('./certs')
var users = require('./users')
var modules = require('./modules')

exports.Server = function(opts) {

  opts = opts || {}

  opts.https = opts.https || 8080
  opts.host = opts.host || 'localhost'
  opts.protocol = opts.protocol || 'tcp'
  opts.server = opts.server || 9099

  var db = {}
  var pkiPair = certs.createCerts()

  var userModules = modules.requireUserModules()
  var userDBMethods = {}
  var userRoutes = {}

  for(var moduleName in userModules) {
    for(var methodName in userModules[moduleName]) {
      var item = userModules[moduleName][methodName]
      if (item.type === 'http') {
        userRoutes[methodName] = item
      }
      else {
        userDBMethods[methodName] = { type: item.type }
      }
    }
  }

  //
  // initialize and or set up a connection to a database
  //
  var location
  var protocol = opts.protocol === 'tls' ? tls : net

  var levelopts = {
    encoding: opts.encoding || 'json',
    keyEncoding: opts.keyEncoding || 'json',
    valueEncoding: opts.valueEncoding || 'json',
    createIfMissing: true
  }

  db.sysdb = level(path.join(__dirname, 'sysdb'), levelopts)

  if (opts.client) {

    db.usrdb = multilevel.client()
    db.usrdb.methods = userDBMethods

    var connectopts = {
      servers: [{ port: opts.client, host: opts.host }]
    }

    repair
      .connect(connectopts)
      .on('connect', function(connection) {

        console.log('connected as client via', 
          opts.protocol, 'on port', opts.client)

        db.usrdb = multilevel.client()
        db.usrdb.methods = userDBMethods
        db.usrdb.pipe(connection).pipe(db.usrdb)

      })
  }
  else {

    location = path.join(
      opts.location || path.join(__dirname, 'usrdb')
    )

    protocol
      .createServer(pkiPair, function(s) {
        db.usrdb = level(location, levelopts)
        s.pipe(multilevel.server(db.usrdb)).pipe(s)
      })
      .listen(opts.server, opts.host, function() {

        console.log(
          '%s server listening on %s port %d', 
          opts.protocol, 
          opts.host, 
          opts.server
        )
      })
  }

  //
  // set up a UI server and manage communication with it
  //
  var ss = secureServer({
    keys: keys,
    pkiPair: pkiPair,
    https: opts.https,
    host: opts.host,
    prod: opts.prod,
    userRoutes: userRoutes,
    db: db
  })

  function onConnect(stream) {

    if (!stream.req) {
      return
    }

    var cookies = new Cookies(stream.req, null, keys)
    var session = cookies.get('session', { signed: true })

    try {
      session = JSON.parse(session)
    }
    catch($) {
      // malicious user.
    }

    var serveropts = {
      auth: function (user, cb) {

        user = user || {}
        user.session = session

        if (!!user.session) {

          users.getByUUID(
            db.usrdb,
            user.session.sessionId,
            user.session.username,
            function(err, value) {

              if (err) {
                return cb(err)
              }

              //
              // in order to do anything, the user needs to be auth'ed
              // we add an authorized member and verify the users groups.
              // the groups are in the session cookie for the convenience 
              // of rendering the UI. However these need to be verified
              // again when using them to provide access to the server.
              //
              user.session.authorized = true
              user.session.groups = value.groups
              delete user.salt

              cb(null, user)
            }
          )
        }
        else {
          cb(new Error('not authorized'))
        }
      },
      access: function (user, db, method, args) {

        var groups = user.session.groups

        if (user.session.authorized) {

          // admins can do anything.
          if (groups.indexOf('admin') > -1) {
            return true
          }

          // check for matching methods
          for (var modulename in userModules) {

            var userMethod = userModules[modulename][method]

            var matches = []

            // check for matching groups if there is a method match
            if (userMethod) {

              matches = groups.filter(function(n) {
                if(userMethod.groups.indexOf(n) === -1) {
                  return false
                }
                return true
              })

              if (matches.length === 0) {
                throw new Error('not authorized')
              }
              else {
                return true
              }
            }
          }
        }
        throw new Error('not authorized')
      }
    }

    for(var moduleName in userModules) {
      for(var methodName in userModules[moduleName]) {

        var item = userModules[moduleName][methodName]

        db.usrdb[methodName] = item.method.bind({
          db: db.usrdb,
          session: session
        })
      }
    }

    var ms = multilevel.server(db.usrdb, serveropts)
    stream.pipe(ms).pipe(stream)
  }

  EngineServer(onConnect).attach(ss, "/wss")
}
