var ipc = require('ipc');
var fs = require('fs');
var domready = require('domready');
var db = require('leveldown');

var menu = require('../../lib/menu');
var header = require('../../lib/header');
var query = require('../../lib/query');

menu();

domready(function() {

  header();
  query();

  ipc.on('asynchronous-reply', function(arg) {
    console.log(arg); // prints "pong"
  });

  ipc.send('asynchronous-message', 'ping');
});

