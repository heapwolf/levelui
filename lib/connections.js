var dom = require('dom-events');
var remote = require('remote');
var query = require('./query');
var db = require('./db');

//var browserWindow = remote.require('browser-window');
var dialog = remote.require('dialog');

exports.init = function(database, config) {

  var section = document.querySelector('section.connections');
  var pathInput = section.querySelector('input.path');
  var openBtn = section.querySelector('input.openDirectory');
  
  dom.on(openBtn, 'click', function() {

    var win = remote.getCurrentWindow();

    var opts = { 
      title: 'Connected', 
      message: 'Connection successful...', 
      buttons: ['OK'] 
    };

    try {
      database.handle.close();
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

