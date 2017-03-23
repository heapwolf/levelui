var dom = require('dom-events');
var cm = require('codemirror');
var js = require('codemirror/mode/javascript/javascript')
var css = require('codemirror/mode/css/css.js')
var xtend = require('xtend');
var query = require('../lib/query');

var lint = require('codemirror/addon/lint/lint');
var jslint = require('codemirror/addon/lint/javascript-lint');
var jsonlint = require('codemirror/addon/lint/json-lint');

var remote = require('electron').remote;
var dialog = remote.require('electron').dialog;

var keyEditor;
var valueEditor;

exports.init = function(database, config) {

  var win = remote.getCurrentWindow();

  var dialogOpts = {
    buttons: ['OK']
  };

  var editorOpts = {
    lineNumbers: true,
    mode: 'application/json',
    gutters: ['CodeMirror-lint-markers'],
    lintWith: cm.jsonValidator,
    viewportMargin: Infinity
  };

  var section = document.querySelector('section.put');

  keyEl = section.querySelector('.key textarea');
  valueEl = section.querySelector('.value textarea');
  saveBtn = section.querySelector('.save');
  keyEncodingInput = section.querySelector('.keyEncoding');
  valueEncodingInput = section.querySelector('.valueEncoding');

  keyEditor = cm.fromTextArea(keyEl, editorOpts);
  valueEditor = cm.fromTextArea(valueEl, editorOpts);

  dom.on(saveBtn, 'click', function() {

    var key = keyEditor.doc.getValue();
    var value = valueEditor.doc.getValue();

    var putOpts = {
      keyEncoding: keyEncodingInput.value || null,
      valueEncoding: valueEncodingInput.value || null
    };

    database.handle.put(key, value, putOpts, function(err) {
      if (err) {
        dialogOpts.title = 'Error';
        dialogOpts.message = err;
      }
      else {
        dialogOpts.title = 'Success';
        dialogOpts.message = 'Key added to the database';
      }
      dialog.showMessageBox(win, dialogOpts);
      query.getKeys(database, config);
    });
  });

};

exports.onShow = function() {
  keyEditor.refresh();
  valueEditor.refresh();
};
