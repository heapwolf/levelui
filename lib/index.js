var https = require('https');
var tls = require('tls');
var url = require('url');
var fs = require('fs');
var qs = require('querystring');
var path = require('path');
var url = require('url');

var keys = require('keygrip')();
var Cookies = require('cookies');
var uuid = require('node-uuid');
var bcrypt = require('bcrypt');

var levelup = require('levelup');
var mime = require('mime');
var es = require('event-stream');
var WebSocketServer = require('ws').Server;

var WebSocket = require('./websocket');
var vis = require('./vis');

var db = {};

var authpath = path.join(process.cwd(), 'auth');
var keypath = path.join(authpath, 'levelweb-key.pem');
var certpath = path.join(authpath, 'levelweb-cert.pem');
var pem;

try {
  pem = {
    key: fs.readFileSync(keypath),
    cert: fs.readFileSync(certpath),
    rejectUnauthorized: true
  };
}
catch(ex) {
  console.log('can\'t find certificates `%s` or `%s`.', keypath, certpath);
  process.exit(1);
}

function redirect(req, res) {

  var parsedPath = url.parse(req.url);
  var location = parsedPath.protocol + parsedPath.host;

  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.setHeader('Content-Length', '0');
  res.end();
}

module.exports = function(opts) {

  opts = opts || {};

  opts.https = opts.https || 80;
  opts.tls = opts.tls || 9099;
  opts.host = opts.host || 'localhost';

  function staticHandler(req, res) {

    var cookies = new Cookies(req, res, keys);
    var session = cookies.get('session', { signed: true });

    if (req.url === '/socket.js') {

      res.writeHeader('Content-Type', 'application/javascript');
      
      res.end([
        ';var socket = new WebSocket(',
        '"wss://', opts.host, ':', opts.https, '"',
        ');'
      ].join(''));

      return;
    }
    else if (req.url === '/' || req.url === '/index.html') {

      if (!session) {
        req.url = '/signin.html';
      }
      else {
        req.url = '/index.html';
      }
    }
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

  var userlocation = path.join(opts.location || path.join(__dirname, 'cache', 'usrdb'));
  var sysdb = path.join(__dirname, 'cache', 'sysdb');

  var levelopts = { 
    encoding: opts.encoding || 'json',
    createIfMissing: true
  };
 
  if (opts.keyEncoding) {
    levelopts.keyEncoding = opts.keyEncoding;
  }

  db.sysdb = levelup(sysdb, levelopts);

  levelopts.createIfMissing = opts.createIfMissing;

  //
  // TODO: handle leveldb errors for the user.
  //
  db.usrdb = levelup(userlocation, levelopts);

  //
  // handle inbound data from tcp
  //
  var tlsserver = tls.createServer(pem, function(socket) {

    //
    // write any inbound data to the user's database
    //
    socket
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(usrdb.createWriteStream());

  });

  tlsserver.listen(opts.tls, opts.host, function() {
    console.log('tls server listening on %s:%d', opts.host, opts.tls);
  });

  //
  // handle serving the websockets and interface assets
  //
  var httpsserver = https.createServer(pem, staticHandler);

  var wss = new WebSocketServer({
    server: httpsserver.listen(opts.https, opts.host, function() {
      console.log('https server listening on %s:%d', opts.host, opts.https);
    })
  });

  //
  // handle communication with the server
  //
  wss.on('connection', function(ws) {

    var cookies = new Cookies(ws.upgradeReq, null, keys);
    var websocket = new WebSocket(ws);

    function write(object) {
      websocket.write(JSON.stringify(object));
    }

    function sendKeys(opts, dbname, response) {

      opts = opts || { limit: 1000 };
      var keys = [];

      opts.values = false;

      if (dbname === 'sysdb') {
        if (opts.start) {
          opts.start = '__tagged__' + opts.start;
        }
        if (opts.end) {
          opts.end = '__tagged__' + opts.end;
        }
      }

      db[dbname]
        .createReadStream(opts)
        .on('data', function(key) {

          //
          // in the future, we'll want to manage items in the sysdb,
          // this should be done by specifying the range rather than 
          // filtering on the data event.
          //
          var internal = key.match(/^(__(.*?)__)(.*?)$/);

          if (dbname === 'sysdb') {
            if (internal && internal[2] === 'tagged') {
              key = key.substring(internal[1].length, key.length);
            }
            else {
              return;
            }
          }
          keys.push(key);
        })
        .on('end', function() {

          write({ 
            response: response,
            value: keys
          });
        });
    }

    function sendMeta() {
      write({ 
        response: 'metaUpdate',
        value: { path: userlocation }
      });
    }

    function sendValue(key, dbname, request) {

      function get(err, value) {
        if (!err) {

          value = { key: key, value: value };
          write({ response: request, value: value });
        }
      }

      if (dbname === 'sysdb') {
        db['usrdb'].get(key, get);
      }
      else {
        db[dbname].get(key, get);
      }
    }

    function deleteValues(operations, opts, dbname, request) {

      if (dbname === 'sysdb') {
        operations.forEach(function(op, i) {

          //
          // TODO: this prefix should have context of the request.
          //
          operations[i].key = '__tagged__' + operations[i].key;
        });
      }

      db[dbname].batch(operations, function(err) {
        sendKeys(opts, dbname, 'keyListUpdate');
      });
    }

    function updateValue(key, value, dbname) {

      function put(err) {

        //
        // TODO: Handle error properly with user interface feedback.
        //
      }

      if (dbname === 'sysdb') {
        db['usrdb'].put(key, value, put);
      }
      else {
        db[dbname].put(key, value, put);
      }
    }

    function tagKeys(keys) {
      keys.forEach(function(key) {
        db['usrdb'].get(key, function(err, value) {
          if (!err) {

            //
            // TODO: this prefix should have context of the request.
            //
            db['sysdb'].put('__tagged__' + key, value);
          }
        });
      });
    }

    websocket.on('data', function(message) {

      try {
        message = JSON.parse(message);
      }
      catch($) {}

      var session = cookies.get('session', { signed: true });
      var dbname = message.dbname;
      var request = message.request;
      var value = message.value;

      if (request === 'auth') {
        auth(value.username, value.password);
      }

      if (!session) {
        return;
      }

      //
      // key/value events
      //
      if (request === 'keyListUpdate') {
        sendKeys(value, dbname, 'keyListUpdate');
      }
      else if (request === 'editorUpdate') {
        sendValue(value, dbname, 'editorUpdate');
      }
      else if (request === 'deleteValues') {
        deleteValues(value.operations, value.opts, dbname, 'deleteValues');
      }
      else if (request === 'updateValue') {
        updateValue(value.key, value.value, dbname);
      }
      else if (request === 'tagKeys') {
        tagKeys(value);
      }

      //
      // visualization events
      //
      else if (request === 'vis-validateKey') {
        vis.validateKey(value, db, write);
      }
      else if (request === 'vis-treemap') {
        vis.treemap(value, db, write);
      }
      else if (request === 'vis-stackedchart') {
        vis.stackedchart(value, db, write);
      }
      else if (request === 'vis-barchart') {
        vis.barchart(value, db, write);
      }
      else if (request === 'vis-save') {
        vis.save(value, db, write);
      }
      else if (request === 'vis-restore') {
        vis.restore(value, db, write);
      }
      else if (request === 'vis-list') {
        vis.list(value, db, write);
      }

    });

    sendMeta();
    sendKeys({}, 'usrdb', 'keyListUpdate');
  });
};
