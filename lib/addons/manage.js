//
// functions for managing keys and values.
//
var lastArgs

exports.keyListUpdate = function(args, db, write) {

  args = args || lastArgs

  if (!args) {
    return
  }

  lastArgs = args

  var query = args.value && args.value.query || { limit: 1000 }
  var dbname = args.meta.dbname || 'usrdb'
  var response = 'manage/keyListUpdate'
  var keys = []

  query.values = false

  if (dbname === 'sysdb') {
    if (query.start) {
      query.start = '__tagged__' + query.start
    }
    if (query.end) {
      query.end = '__tagged__' + query.end
    }
  }

  db[dbname]
    .createReadStream(query)
    .on('data', function(key) {

      //
      // in the future, we'll want to manage items in the sysdb,
      // this should be done by specifying the range rather than 
      // filtering on the data event.
      //
      var stringKey = typeof key === 'string'
      var internal = stringKey && key.match(/^(__(.*?)__)(.*?)$/)

      if (dbname === 'sysdb') {
        if (internal && internal[2] === 'tagged') {
          key = key.substring(internal[1].length, key.length)
        }
        else {
          return
        }
      }
      keys.push(key)
    })
    .on('end', function() {

      write({ 
        response: response,
        value: keys
      });
    });
};

exports.editorUpdate = function(args, db, write) {

  var key = args.value.key
  var dbname = args.meta.dbname

  function get(err, value) {
    if (!err) {
      value = { key: key, value: value }
      write({ response: args.request, value: value })
    }
  }

  if (dbname === 'sysdb') {
    db['usrdb'].get(key, get)
  }
  else {
    db[dbname].get(key, get)
  }
};

exports.deleteValues = function(args, db, write) {

  var operations = args.value.operations;
  var dbname = args.meta.dbname;

  args.request = 'manage/keyListUpdate';

  if (dbname === 'sysdb') {
    operations.forEach(function(op, i) {

      //
      // TODO: this prefix should have context of the request
      // so that confirmation can be sent back to the user.
      //
      operations[i].key = '__tagged__' + operations[i].key;
    });
  }

  db[dbname].batch(operations, function(err) {
    exports.keyListUpdate(args, db, write);
  });
};

exports.updateValue = function(args, db, write) {

  var key = args.value.key;
  var value = args.value.value;
  var dbname = args.meta.dbname;

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
};

exports.tag = function(args, db, write) {

  var keys = args.value.keys;

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
};
