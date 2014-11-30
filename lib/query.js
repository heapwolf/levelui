var dom = require('dom-events');
var cm = require('codemirror');
var js = require('codemirror/mode/javascript/javascript')
var css = require('codemirror/mode/css/css.js')
var xtend = require('xtend');

var lint = require('codemirror/addon/lint/lint');
var jslint = require('codemirror/addon/lint/javascript-lint');
var jsonlint = require('codemirror/addon/lint/json-lint');

var remote = require('remote');
var dialog = remote.require('dialog');

var queryEl;
var editorEl;
var upperBoundEl;
var lowerBoundEl;
var limitEl;
var reverseEl;
var keysEl;
var deleteEl;

var editor;
var debounce;
var stream;

exports.getKeys = function(database, config) {
  clearTimeout(debounce);

  if (stream && stream.readable) {
    stream.end && stream.end();
  }

  debounce = setTimeout(function() {

    config.query.lte = upperBoundEl.value;
    config.query.gte = lowerBoundEl.value;

    config.query.limit = limitEl.value;
    config.query.reverse = reverse.checked;

    var opts = xtend({ values: false }, config.query);
    editor.doc.setValue('');
    keysEl.innerHTML = '';

    stream = database.handle
      .createReadStream(opts)
      .on('data', function(key) {
        var o = document.createElement('option');
        o.value = o.innerText = key;
        o.title = key;
        keysEl.appendChild(o);
      });
  }, 250);
};

exports.init = function(database, config) {

  queryEl = document.querySelector('section.query');
  editorEl = document.querySelector('.codemirror');
  upperBoundEl = queryEl.querySelector('.upperbound');
  lowerBoundEl = queryEl.querySelector('.lowerbound');
  limitEl = queryEl.querySelector('.limit');
  reverseEl = queryEl.querySelector('.reverse');
  keysEl = queryEl.querySelector('.keys select');
  deleteEl = queryEl.querySelector('.delete');

  var win = remote.getCurrentWindow();

  editor = cm.fromTextArea(editorEl, {
    lineNumbers: true,
    mode: 'application/json',
    gutters: ['CodeMirror-lint-markers'],
    lintWith: cm.jsonValidator,
    viewportMargin: Infinity
  });

  config.query = config.query || { 
    limit: 1000, 
    valueEncoding: 'json' 
  };

  var limitText = 'Limit (' + config.limit + ')';
  limitEl.setAttribute('placeholder', limitText);

  function getKeys() {
    exports.getKeys(database, config);
  }

  getKeys();

  dom.on(upperBoundEl, 'keyup', getKeys);
  dom.on(lowerBoundEl, 'keyup', getKeys);
  dom.on(limitEl, 'keyup', getKeys);
  dom.on(reverseEl, 'click', getKeys);

  var dialogOpts = {
    buttons: ['OK', 'CANCEL']
  };

  dom.on(deleteEl, 'click', function() {
    dialog.showMessageBox(win, dialogOpts, function(button) {
      if (button == 1) return;

      database.handle.del(keysEl.value, function(err) {
        if (err) {
          dialogOpts.message = err;
        }
        else {
          dialogOpts.message = 'The item was removed from the database';
          exports.getKeys(database, config);
        }
        dialog.showMessageBox(win, dialogOpts);
      });
    });
  });

  dom.on(keysEl, 'change', function() {
    deleteEl.removeAttribute('disabled');
    database.handle.get(this.value, function(err, value) {
      editor.doc.setValue(JSON.stringify(value, 2, 2));
    });
  });

};

exports.onShow = function() {
};

