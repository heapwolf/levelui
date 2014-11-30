var ipc = require('ipc');
var fs = require('fs');
var domready = require('domready');

var root = '../../';

var menu = require(root + 'lib/menu')();
var header = require(root + 'lib/header');
var query = require(root + 'lib/query');

var config = require(root + 'defaults.json');
var rc = require('rc')('levelui', config);
var db = require(root + 'lib/db')('../db', config);

domready(function() {

  header(db, config);
  query(db, config);

});

