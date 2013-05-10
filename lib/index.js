var tls = require('tls')
var net = require('net')
var path = require('path')

var keys = require('keygrip')()
var Cookies = require('cookies')
var uuid = require('node-uuid')

var levelup = require('levelup')
var multilevel = require('multilevel')

var es = require('event-stream')
var WebSocketServer = require('ws').Server

var WebSocket = require('./websocket')
var secureServer = require('./secureserver')
var certs = require('./certs')

var controllers = {
  visualize: require('./addons/visualize'),
  manage: require('./addons/manage')
}

var db = {}

var writers = {}

module.exports = function(opts) {

  opts = opts || {}

  opts.https = opts.https || 8080
  opts.host = opts.host || 'localhost'
  opts.protocol = opts.protocol || 'tcp'
  opts.server = opts.server || 9099

  certs.fetch(function(err, pems) {

    if (err) {
      console.log(err)
      process.exit(1)
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

    db.sysdb = levelup(path.join(__dirname, 'sysdb'), levelopts)

    if (opts.client) {

      location = ['connected via', opts.protocol, 'on port', opts.client].join(' ')

      db.usrdb = multilevel.client()
      db.usrdb.pipe(protocol.connect(opts.client, opts.host, function() {
        console.log(location)
      })).pipe(db.usrdb)
    }
    else {

      location = path.join(opts.location || path.join(__dirname, 'usrdb'))

      db.usrdb = levelup(location, levelopts)

      function inputHandler(s) {

        //
        // platform agnostic input
        //
        if (opts.newline) {
          s.pipe(es.split())
           .pipe(es.parse())
           .pipe(db.usrdb.createWriteStream())
        }

        //
        // communicate via node.js with multilevel
        //
        else {
          s.pipe(multilevel.server(db.usrdb)).pipe(s)
        }

        //
        // more expensive, less complex
        //
        s.on('data', function(d) {
          for (writer in writers) {
            controllers.manage.keyListUpdate(null, db, writers[writer])
          }
        })
      }

      protocol
        .createServer(pems, inputHandler)
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
      pems: pems,
      client: opts.client,
      https: opts.https,
      host: opts.host,
      db: db
    })

    var wss = new WebSocketServer({ server: ss })

    wss.on('connection', function(ws) {

      var cookies = new Cookies(ws.upgradeReq, null, keys)
      var websocket = new WebSocket(ws)
      var session = cookies.get('session', { signed: true })
      var socketId = uuid.v4()

      if (!session && !opts.client) {
        return
      }

      var write = function(object) {
        websocket.write(JSON.stringify(object))
      }

      writers[socketId] = write

      websocket.on('data', function(message) {

        try {
          message = JSON.parse(message)
        }
        catch($) {}

        var path = message.request.split('/')
        var controller = path[0]
        var method = path[1]

        controllers[controller][method](message, db, write)
      })

      websocket.on('end', function() {
        delete writers[socketId]
      })

      write({ 
        response: 'metaUpdate',
        value: { 
          path: location,
          cert: pems.cert
        }
      })

      controllers.manage.keyListUpdate({ meta: { dbname: 'usrdb' }}, db, write)
    })
  })
}
