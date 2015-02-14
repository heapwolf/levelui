var ipc = require('ipc');
var fs = require('fs');
var domready = require('domready');

var root = '../../';

var menu = require(root + 'lib/menu')();
var header = require(root + 'lib/header');
var query = require(root + 'lib/query');
var put = require(root + 'lib/put');
var settings = require(root + 'lib/settings');
var connections = require(root + 'lib/connections');

var config = require(root + 'defaults.json');
var rc = require('rc')('levelui', config);
var db = require(root + 'lib/db');

var database = {
  handle: db('../db', config)
};

domready(function() {

  header.init(database, config);
  query.init(database, config);
  put.init(database, config);
  settings.init(database, config);
  connections.init(database, config);
});

