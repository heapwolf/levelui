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
var moment = require('moment');

var levelup = require('levelup');
var mime = require('mime');
var es = require('event-stream');
var WebSocketServer = require('ws').Server;
var WebSocket = require('./websocket');

var db = {};

var authpath = path.join(process.cwd(), 'auth');

var httpsOpts = {
  key: fs.readFileSync(path.join(authpath, 'levelweb-key.pem')),
  cert: fs.readFileSync(path.join(authpath, 'levelweb-cert.pem'))
};

var tlsOpts = {
  pfx: fs.readFileSync(path.join(authpath, 'levelweb.pfx')),
  passphrase: fs.readFileSync(path.join(authpath, 'passphrase.txt')).toString().trim()
};

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
  opts.tcp = opts.tcp || 9099;
  opts.host = opts.host || 'localhost';

  function staticHandler(req, res) {

    var cookies = new Cookies(req, res, keys);
    var session = cookies.get('session', { signed: true });

    if (req.url === '/socket') {

      res.writeHeader('Content-Type', 'application/javascript');
      res.end(['var socket = new WebSocket("wss://', opts.host, ':', opts.https, '");'].join(''));
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

  var userlocation = path.join(opts.location);
  var sysdb = path.join(__dirname, 'cache', 'sysdb');
  var tagdata = path.join(__dirname, 'cache', 'tagdb');

  var levelopts = { 
    encoding: opts.encoding || 'json',
    createIfMissing: true
  };
 
  if (opts.keyEncoding) {
    levelopts.keyEncoding = opts.keyEncoding;
  }

  levelup(sysdb, levelopts, function(error, sysdb) {

    db.sysdb = sysdb;

    levelup(tagdata, levelopts, function(error, tagdb) {

      db.tagdb = tagdb;

      levelopts.createIfMissing = opts.createIfMissing;

      //
      // TODO: handle leveldb errors for the user.
      //
      levelup(userlocation, levelopts, function(err, usrdb) {

        if (err) {
          throw new Error(err);
        }

        db.usrdb = usrdb;

        //
        // handle inbound data from tcp
        //
        var tlsserver = tls.createServer(tlsOpts, function(socket) {

          console.log(socket);

          socket.on('data', function(data) {
            console.log(data);
          })

          //
          // write any inbound data to the user's database
          //
          socket
            .pipe(es.split())
            .pipe(es.parse())
            .pipe(usrdb.createWriteStream());

        });

        tlsserver.listen(opts.tcp, opts.host, function() {
          console.log('tls server listening on %s:%d', opts.host, opts.tcp);
        });

        //
        // handle serving the websockets and interface assets
        //
        var httpsserver = https.createServer(httpsOpts, staticHandler);

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

          function getValue(path, data) {

            var result = data;

            path.forEach(function(segment) {
              result = result[segment.trim()];
            });

            return result;
          }

          function sendKeys(opts, dbname, response) {

            opts = opts || { limit: 1000 };
            var keys = [];

            opts.values = false;

            if (dbname === 'sysdb') {
              if (opts.start) {
                opts.start = '__favorite__' + opts.start;
              }
              if (opts.end) {
                opts.end = '__favorite__' + opts.end;
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
                  if (internal && internal[2] === 'favorite') {
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
                operations[i].key = '__favorite__' + operations[i].key;
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

          function validateKey(path, id) {

            var valid = false;

            db['tagdb']
              .createReadStream({ keys: false, limit: 1 })
              .on('data', function(data) {

                valid = !!getValue(path.split('.'), data);

              })
              .on('end', function() {

                var value = { valid: valid, id: id };

                write({ 
                  response: 'validateKey',
                  value: value
                });

              });
          }

          function copyFavKeys(keys) {
            keys.forEach(function(key) {
              db['usrdb'].get(key, function(err, value) {
                if (!err) {

                  //
                  // TODO: this prefix should have context of the request.
                  //
                  db['sysdb'].put('__favorite__' + key, value);
                }
              });
            });
          }

          function copyTagKeys(keys) {
            keys.forEach(function(key) {
              db['usrdb'].get(key, function(err, value) {
                if (!err) {
                  db['tagdb'].put(key, value);
                }
              });
            });
          }

          function buildTreeMap(token) {

            var metadata = {};

            db['tagdb']
              .createReadStream()
              .on('data', function(data) {

                  var segments = data.key.split(token);
                  var parent = metadata;
                  var size = JSON.stringify(data.value).length;

                  segments.forEach(function(segment, index) {

                    if (segments.length === 1) {
                      var value = { name: data.key, size: size };

                      if (parent[segment]) {
                        parent[segment].push(value);
                      }
                      else {
                        parent[segment] = [value];
                      }
                    }
                    else if (index < segments.length-2) {
                      parent = parent[segment] || (parent[segment] = {});
                    }
                    else if (index === segments.length-2) {
                      parent = parent[segment] || (parent[segment] = []);
                    }
                    else {
                      parent.push({
                        name: data.key,
                        size: size
                      });
                    }
                });

              })
              .on('end', function() {
                
                var tree = {
                  name: "treemap",
                  children: []
                };

                function compile(tree, metadata) {

                  if (Array.isArray(metadata)) {
                    tree.children = metadata;
                  }
                  else {
                    Object.keys(metadata).forEach(function(key) {
                        var next = { name: key, children: [] };
                        tree.children.push(next);
                        compile(next, metadata[key]);
                    });
                  }

                  return tree;
                }

                write({ 
                  response: 'buildTreeMap',
                  value: compile(tree, metadata)
                });
              });
          }

          function buildStackedAreaChart(opts) {

            var pathToX = opts.pathToX.split('.');
            var pathsToValues = [];
            var metadata = {};
            var dateStart;
            var dateEnd;

            if (opts.dateStart && opts.dateStart) {
              dateStart = moment(opts.dateStart).format(opts.dateTimeFormat);
              dateEnd = moment(opts.dateEnd).format(opts.dateTimeFormat);
            }

            opts.pathsToValues.split(',').forEach(function(path) {
              pathsToValues.push(path.split('.'));
            });

            db['tagdb']
              .createReadStream()
              .on('data', function(data) {

                var X = getValue(pathToX, data.value);

                if (dateStart && dateStart &&
                  (moment(X).isBefore(dateStart) || moment(X).isAfter(dateEnd)) ) {
                  return;
                }

                pathsToValues.forEach(function(path) {

                  var value = getValue(path, data.value);

                  if (typeof value !== 'undefined') {

                    var pair = {};
                    pair[path[path.length-1]] = value;

                    if (!metadata[X]) {
                      metadata[X] = pair;
                    }
                    else {
                      metadata[X][path[path.length-1]] = value;
                    }
                  }
                });

              })
              .on('end', function() {

                var value = [];

                Object.keys(metadata).forEach(function(X) {

                  var item = { X: X };

                  Object.keys(metadata[X]).forEach(function(key) {
                    item[key] = metadata[X][key];
                  });

                  value.push(item);
                });

                write({ 
                  response: 'buildStackedAreaChart',
                  value: value
                });

              });
          }

          function buildBarChart(opts) {

            var pathToX = opts.pathToX.split('.');
            var pathToY = opts.pathToY.split('.');

            var metadata = [];
            var dateStart;
            var dateEnd;
            var dateFormatter = opts.dateTimeFormat || "MM-DD-YY";

            if (opts.dateStart && opts.dateEnd) {
              dateStart = moment(opts.dateStart).format(dateFormatter);
              dateEnd = moment(opts.dateEnd).format(dateFormatter);
            }

            db['tagdb']
              .createReadStream()
              .on('data', function(data) {

                var X = getValue(pathToX, data.value);
                var Y = getValue(pathToY, data.value) || data.key;
                var date;

                if (moment(X).isValid()) {
                  date = moment(X).format(dateFormatter);

                  if (dateStart && dateEnd &&
                    (moment(date).isBefore(dateStart) || moment(date).isAfter(dateEnd)) ) {
                    return;
                  }
                }

                metadata.push({ X: X, Y: Y, key: data.key });

              })
              .on('end', function() {

                write({ 
                  response: 'buildBarChart',
                  value: metadata
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
            // TODO: move all of these functions into individual local modules
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
            else if (request === 'validateKey') {
              validateKey(value.key, value.id);
            }
            else if (request === 'favKeys') {
              copyFavKeys(value);
            }
            else if (request === 'tagKeys') {
              copyTagKeys(value);
            }
            else if (request === 'allTaggedKeys') {
              sendKeys(value, dbname, request);
            }
            else if (request === 'buildTreeMap') {
              buildTreeMap(value);
            }
            else if (request === 'buildStackedAreaChart') {
              buildStackedAreaChart(value);
            }
            else if (request === 'buildBarChart') {
              buildBarChart(value);
            }

          });

          sendMeta();
          sendKeys({}, 'usrdb', 'keyListUpdate');
        });
      });
    });
  });
};
