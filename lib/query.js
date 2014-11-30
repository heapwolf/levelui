var dom = require('dom-events');
var cm = require('codemirror');
var js = require('codemirror/mode/javascript/javascript')
var css = require('codemirror/mode/css/css.js')
var xtend = require('xtend');

var lint = require('codemirror/addon/lint/lint');
var jslint = require('codemirror/addon/lint/javascript-lint');
var jsonlint = require('codemirror/addon/lint/json-lint');

module.exports = function(db, config) {

  var queryEl = document.querySelector('section.query');
  var editorEl = document.querySelector('.codemirror');
  var upperBoundEl = queryEl.querySelector('.upperbound');
  var lowerBoundEl = queryEl.querySelector('.lowerbound');
  var limitEl = queryEl.querySelector('.lowerbound');
  var reverseEl = queryEl.querySelector('.reverse');
  var keysEl = queryEl.querySelector('.keys select');

  var editor = cm.fromTextArea(editorEl, {
    lineNumbers: true,
    mode: 'application/json',
    gutters: ['CodeMirror-lint-markers'],
    lintWith: cm.jsonValidator,
    viewportMargin: Infinity
  });

  config.query = config.query || {};

  var debounce;

  function getKeys() {
    clearTimeout(debounce);
    debounce = setTimeout(function() {

      config.query.gte = upperBoundEl.value;
      config.query.lte = lowerBoundEl.value;
      config.query.limit = limitEl.value;
      config.query.reverse = reverse.checked;

      var opts = xtend({ values: false }, config.query);
      editor.doc.setValue('');
      keysEl.innerHTML = '';

      db
        .createReadStream(opts)
        .on('data', function(key) {
          var o = document.createElement('option');
          o.value = o.innerText = key;
          o.title = key;
          keysEl.appendChild(o);
        });
    }, 250);
  }

  getKeys();

  dom.on(upperBoundEl, 'keyup', getKeys);
  dom.on(lowerBoundEl, 'keyup', getKeys);
  dom.on(limitEl, 'change', getKeys);
  dom.on(reverseEl, 'change', getKeys);

  dom.on(keysEl, 'change', function() {
    db.get(this.value, function(err, value) {
      editor.doc.setValue(JSON.stringify(value, 2, 2));
    });
  });

};

