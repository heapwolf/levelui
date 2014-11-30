var dom = require('dom-events');
var remote = require('remote');
var query = require('./query');
var db = require('./db');

var dialog = remote.require('dialog');

exports.init = function(database, config) {

  var section = document.querySelector('section.connections');
  var pathInput = section.querySelector('input.path');
  var hostInput = section.querySelector('input.host');
  var openBtn = section.querySelector('input.openDirectory');
  var connectBtn = section.querySelector('input.openConnection');

  var win = remote.getCurrentWindow();

  var opts = { 
    title: 'Connected', 
    message: 'Connection successful...', 
    buttons: ['OK'] 
  };

  dom.on(connectBtn, 'click', function() {
    if (database.handle && database.handle.isOpen()) {
      database.handle.close();
    }
    database.handle = db(hostInput.value, config);
    query.getKeys(database, config);

  });

  dom.on(openBtn, 'click', function() {

    try {
      if (database.handle && database.handle.isOpen()) {
        database.handle.close();
      }
      database.handle = db(pathInput.value, config);

      dialog.showMessageBox(win, opts, function() {
        query.getKeys(database, config);
      });
    }
    catch(ex) {
      opts.title = 'Error';
      opts.message = ex.message;
      dialog.showMessageBox(win, opts, function() {

      });
    }
  });
};

exports.onShow = function() {
};

