var dom = require('dom-events');
var cm = require('codemirror');
var js = require('codemirror/mode/javascript/javascript')
var css = require('codemirror/mode/css/css.js')

//<script src="https://rawgithub.com/zaach/jsonlint/79b553fb65c192add9066da64043458981b3972b/lib/jsonlint.js"></script>
var lint = require('codemirror/addon/lint/lint');
var jslint = require('codemirror/addon/lint/javascript-lint');
var jsonlint = require('codemirror/addon/lint/json-lint');

module.exports = function() {

  var el = document.querySelector('section.query .codemirror');

  var editor = cm.fromTextArea(el, {
    lineNumbers: true,
    mode: 'application/json',
    gutters: ['CodeMirror-lint-markers'],
    lintWith: cm.jsonValidator,
    viewportMargin: Infinity
  });

  

};

