var https = require('https');
var tls = require('tls');
var net = require('net');
var url = require('url');
var fs = require('fs');
var qs = require('querystring');
var path = require('path');
var url = require('url');

var keys = require('keygrip')();
var Cookies = require('cookies');
var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var argv = require('optimist').argv;
var levelup = require('levelup');
var multilevel = require('multilevel');
var mime = require('mime');
var es = require('event-stream');
var WebSocketServer = require('ws').Server;

var WebSocket = require('./websocket');
var assets = require('./assets');
var certs = require('./certs');

var controllers = {
  visualize: require('./visualize'),
  manage: require('./manage')
};

var db = {};
var writers = {};

module.exports = function(opts) {

  opts = opts || {};

  opts.https = opts.https || 80;
  opts.host = opts.host || 'localhost';

  assets.pack('libs', true, [

    '/js/moment.js',
    '/js/jquery.js',

    '/js/codemirror-3.1/lib/codemirror.js',
    '/js/codemirror-3.1/mode/javascript/javascript.js',
    '/js/jsonlint.js',
    '/js/codemirror-3.1/addon/lint/lint.js',
    '/js/codemirror-3.1/addon/lint/json-lint.js',

    '/js/d3.v3.min.js',
    '/js/cubism.v1.js',

    '/js/canvg.min.js',
    '/js/jquery.tagsinput.min.js',
    '/js/jquery.datepicker.js'
  ]);

  certs.fetch(function(err, pems) {

    if (err) {
      console.log(err);
      process.exit(1);
    }

    //
    // initialize a leveldb instance for the user and the app
    //
    var sysdblocation = path.join(__dirname, 'sysdb');
    var userlocation = path.join(opts.location || path.join(__dirname, 'usrdb'));

    var levelopts = {
      encoding: opts.encoding || 'json',
      keyEncoding: opts.keyEncoding || 'json',
      valueEncoding: opts.valueEncoding || 'json',
      createIfMissing: true
    };

    db.sysdb = levelup(sysdblocation, levelopts);
    db.usrdb = levelup(userlocation, levelopts);

    //
    // handle inbound data
    //
    var inputprotocol = opts.protocol === 'tls' ? tls : net;
    var inputport = opts ['in'] || 9099;
    var outputport = opts ['out'] || 9098;

    //
    // handle https for the user interface
    //
    function redirect(req, res) {

      var parsedPath = url.parse(req.url);
      var location = parsedPath.protocol + parsedPath.host;

      res.statusCode = 302;
      res.setHeader('Location', '/');
      res.setHeader('Content-Length', '0');
      res.end();
    }

    function staticHandler(req, res) {

      var cookies = new Cookies(req, res, keys);
      var session = cookies.get('session', { signed: true });

      //
      // serve up a socket object that has the correct host and port.
      //
      if (req.url === '/socket.js') {

        res.writeHeader('Content-Type', 'application/javascript');
        return res.end([
          ';var socket = new WebSocket(',
          '"wss://', opts.host, ':', opts.https, '"',
          ');'
        ].join(''));
      }

      //
      // all of the front end javascript that we probably never 
      // need to look at. let's just used a packaged version of it.
      //
      else if (req.url === '/assets.js') {

        res.writeHeader('Content-Type', 'application/javascript');
        return res.end(String(assets.packages['libs']));
      }

      //
      // provide a simple redirect when the user has no session
      // or when they don't specify a real server resource.
      //
      else if (req.url === '/' || req.url === '/index.html') {

        if (!session) {
          req.url = '/signin.html';
        }
        else {
          req.url = '/index.html';
        }
      }

      //
      // authentication
      //
      else if (req.url === '/auth') {

        var queryData = '';

        req.on('data', function(data) {
          queryData += data;
          if(queryData.length > 1e6) {
            req.connection.destroy();
          }
        });

        req.on('end', function() {

          var formdata = qs.parse(queryData);
          var username = formdata.username;
          var password = formdata.password;
          var hasData = false;

          db['sysdb']
            .createReadStream({
              start: '__user__' + username,
              limit: 1
            })
            .on('data', function(data) {
              hasData = true;
              bcrypt.compare(password, data.value, function(err, match) {

                if (match){
                  cookies.set('session', uuid.v4(), {
                    signed: true, expires: new Date('2100')
                  });
                }
                redirect(req, res);
              });
            })
            .on('end', function() {
              if (!hasData) {
                redirect(req, res);
              }
            })
        });
        return;
      }

      var rawurl = url.parse(req.url);
      var pathname = decodeURI(rawurl.pathname);
      var base = path.join(__dirname, '..', 'public');
      var filepath = path.normalize(path.join(base, pathname));
      var mimetype = mime.lookup(filepath);

      if (!mimetype) {
        return;
      }

      res.writeHeader('Content-Type', mimetype);

      fs.stat(filepath, function (err, stat) {

        if (err && err.code === 'ENOENT') {
            res.end('not found');
        }
        else {
          if (!stat.isDirectory()) {
            fs.createReadStream(filepath).pipe(res);
          }
        }
      });
    }

    function inputHandler(s) {

      //
      // platform agnostic input
      //
      if (opts.newline) {
        s.pipe(es.split())
         .pipe(es.parse())
         .pipe(db.usrdb.createWriteStream());
      }

      //
      // node.js input with multilevel
      //
      else {
        s.pipe(multilevel.server(db.usrdb)).pipe(s);
      }

      //
      // more expensive, less complex.
      //
      s.on('data', function(d) {
        for (writer in writers) {
          controllers.manage.keyListUpdate(null, db, writers[writer]);
        }
      });
    }

    var inputserver = inputprotocol.createServer(pems, inputHandler);

    inputserver.listen(inputport, opts.host, function() {
      console.log(
        '%s server listening on %s port %d', 
        opts.protocol, 
        opts.host, 
        inputport
      );
    });

    var httpsserver = https.createServer(pems, staticHandler);

    var wss = new WebSocketServer({
      server: httpsserver.listen(opts.https, opts.host, function() {
        console.log(
          'https server listening on %s port %d', 
          opts.host, 
          opts.https
        );
      })
    });

    //
    // handle communication with the server
    //
    wss.on('connection', function(ws) {

      var cookies = new Cookies(ws.upgradeReq, null, keys);
      var websocket = new WebSocket(ws);
      var session = cookies.get('session', { signed: true });
      var socketId = uuid.v4();

      if (!session) {
        return;
      }

      var write = function(object) {
        websocket.write(JSON.stringify(object));
      };

      writers[socketId] = write;

      websocket.on('data', function(message) {

        try {
          message = JSON.parse(message);
        }
        catch($) {}

        var request = message.request;
        var value = message.value;

        // TODO: clean this up
        value.dbname = message.dbname;
        value.response = message.request;

        var path = request.split('/');
        var controller = path[0];
        var method = path[1];

        controllers[controller][method](value, db, write);
      });

      websocket.on('end', function() {
        delete writers[socketId];
      });

      write({ 
        response: 'metaUpdate',
        value: { 
          path: userlocation,
          cert: pems.cert
        }
      });

      controllers.manage.keyListUpdate({}, db, write);
    });
  });
};
