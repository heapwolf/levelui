var dom = require('dom-events');
var cm = require('codemirror');
var js = require('codemirror/mode/javascript/javascript')
var css = require('codemirror/mode/css/css.js')
var xtend = require('xtend');

var lint = require('codemirror/addon/lint/lint');
var jslint = require('codemirror/addon/lint/javascript-lint');
var jsonlint = require('codemirror/addon/lint/json-lint');

var keyEditor;
var valueEditor;

exports.init = function(database, config) {

  var opts = {
    lineNumbers: true,
    mode: 'application/json',
    gutters: ['CodeMirror-lint-markers'],
    lintWith: cm.jsonValidator,
    viewportMargin: Infinity
  };

  var section = document.querySelector('section.put');
  keyEl = section.querySelector('.key textarea');
  valueEl = section.querySelector('.value textarea');

  keyEditor = cm.fromTextArea(keyEl, opts);
  valueEditor = cm.fromTextArea(valueEl, opts);

};

exports.onShow = function() {
  keyEditor.refresh();
  valueEditor.refresh();
};
