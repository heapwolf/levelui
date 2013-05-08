//
// methods for building visualizations, and storing, retrieving queries.
//

var moment = require('moment');

function getValue(path, data) {

  var result = data;

  path.forEach(function(segment) {
    if (result) {
      result = result[segment.trim()];
    }
  });

  return result;
}

exports.validatekey = function(args, db, write) {

  var path = args.value.options.path;
  var id = args.value.options.id;
  var valid = true;

  args.value.query.keys = false;

  db['usrdb']
    .createReadStream(args.value.query)
    .on('data', function(data) {

      if (valid) {
        valid = typeof getValue(path.split('.'), data) !== 'undefined';
      }
    })
    .on('end', function() {

      var value = { valid: valid, id: id };

      write({ 
        response: 'visualize/validatekey',
        value: value
      });
    });
};

exports.treemap = function(args, db, write) {

  if (typeof args.value.options === 'undefined') {
    return;
  }

  var token = args.value.options.token;
  var metadata = {};

  db['usrdb']
    .createReadStream(args.value.query)
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
        else if(Array.isArray(parent)) {
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
        response: 'visualize/treemap',
        value: compile(tree, metadata)
      });
    });
};

exports.stackedchart = function(args, db, write) {

  if (typeof args.value.options === 'undefined' || !args.value.options.pathToX) {
    return;
  }

  var pathToX = args.value.options.pathToX.split('.');
  var pathsToValues = [];
  var metadata = {};
  var dateStart;
  var dateEnd;

  if (args.value.options.dateStart && args.value.options.dateStart) {
    dateStart = moment(args.value.options.dateStart).format(args.value.options.dateTimeFormat);
    dateEnd = moment(args.value.options.dateEnd).format(args.value.options.dateTimeFormat);
  }

  args.value.options.pathsToValues.split(',').forEach(function(path) {
    pathsToValues.push(path.split('.'));
  });

  db['usrdb']
    .createReadStream(args.value.query)
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
        response: 'visualize/stackedchart',
        value: value
      });

    });
};

exports.barchart = function(args, db, write) {

  if (typeof args.value.options === 'undefined' || 
    !args.value.options.pathToX ||
    !args.value.options.pathToY) {
    return;
  }

  var pathToX = args.value.options.pathToX.split('.');
  var pathToXMask = args.value.options.pathToXMask.split('.');
  var pathToY = args.value.options.pathToY.split('.');

  var metadata = [];
  var dateStart;
  var dateEnd;
  var count = 0;
  var dateFormatter = args.value.options.dateTimeFormat || "MM-DD-YY";

  if (args.value.options.dateStart && args.value.options.dateEnd) {
    dateStart = moment(args.value.options.dateStart).format(dateFormatter);
    dateEnd = moment(args.value.options.dateEnd).format(dateFormatter);
  }

  db['usrdb']
    .createReadStream(args.value.query)
    .on('data', function(data) {

      var X = getValue(pathToX, data.value);
      var XMask;

      if (pathToXMask) {
        XMask = getValue(pathToXMask, data.value);
        if (XMask) {
          XMask += ' (' + (++count) + ')';
        }
      }

      var Y = getValue(pathToY, data.value) || data.key;
      var date;

      if (moment(X).isValid()) {

        X = moment(X).format(dateFormatter);

        if (dateStart && dateEnd &&
          (moment(X).isBefore(dateStart) || 
            moment(X).isAfter(dateEnd)) ) {
          return;
        }
      }

      metadata.push({ X: (XMask || X), Y: Y, key: data.key });

    })
    .on('end', function() {

      write({ 
        response: 'visualize/barchart',
        value: metadata
      });
    });
};

exports.save = function(args, db, write) {

  var group = args.value.options.group;
  var date = moment(new Date).format('MM-DD-YY HH:MM');
  var name = value.options.queryName || date;
  var key = '__query__' + group + '__' + name;

  if (value.options.queryName === '') {
    value.options.queryName = name;
  }

  db['sysdb'].put(key, value, function() {
    exports.fetch(value, db, write);
  });
};

exports.fetch = function(args, db, write) {

  var group = args.value.group || args.value.options.group;
  var key = '__query__' + group;
  var queries = {};

  db['sysdb']
    .createReadStream({
      start: key,
      end: key + '~'
    })
    .on('data', function(record) {
      queries[record.key] = record;
    })
    .on('end', function() {

      write({
        response: 'visualize/fetch',
        value: {
          group: group,
          queries: queries
        }
      });

    })
  ;
};

exports.del = function(args, db, write) {

  db['sysdb'].del(args.value.key, function() {
    exports.fetch(args, db, write);
  });
};
