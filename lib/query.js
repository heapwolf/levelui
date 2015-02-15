var dom = require('dom-events');
var cm = require('codemirror');
var js = require('codemirror/mode/javascript/javascript')
var css = require('codemirror/mode/css/css.js')
var xtend = require('xtend');
var debounce = require('debounce');

window.lint = require('codemirror/addon/lint/lint');
window.jslint = require('codemirror/addon/lint/javascript-lint');
window.jsonlint = require('codemirror/addon/lint/json-lint');

var Tree = require('level-subtree');
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
var sublevelsBtn;
var resultsEl;
var treeEl;
var rootEl;

var editor;
var stream;

var mapNodes = Array.prototype.map;

var tree;
var treeHandle;
var treeMap = {};

function buildTree(tree, parentNode, path) {
  parentNode.innerHTML = '';
  for (var branch in tree) {
    path.push(branch);
    treeMap['tree-' + branch] = path.join('#');

    var li = document.createElement('li');
    var label = document.createElement('label');
    var input = document.createElement('input');
    var ul = document.createElement('ul');

    input.id = 'tree-' + branch;
    input.type = 'checkbox';
    
    label.setAttribute('for', input.id);
    label.innerText = branch;
    
    li.appendChild(input);
    li.appendChild(label);
    li.appendChild(ul);
    
    parentNode.appendChild(li);

    buildTree(tree[branch], ul, path);
    path.pop();
  }
}



exports.getKeys = debounce(function(database, config) {
  deleteEl.setAttribute('disabled', true);

  if (stream && stream.readable) {
    stream.end && stream.end();
  }

  config.query.lte = config.query.prefix + upperBoundEl.value;
  config.query.gte = config.query.prefix + lowerBoundEl.value;

  if (lowerBoundEl.value == '' && config.query.prefix != '') {
    config.query.lte += '~';
  }

  var limit = parseInt(limitEl.value, 10);
  config.query.limit = isNaN(limit) ? 1000 : limit;
  config.query.reverse = reverseEl.hasAttribute('checked');
  
  var opts = xtend({ values: false }, config.query);
  editor.doc.setValue('');
  keysEl.innerHTML = '';

  stream = database.handle
    .createReadStream(opts)
    .on('data', function(key) {
      var o = document.createElement('option');
      o.value = o.title = key;
      o.innerText = key.replace(config.query.prefix, '');
      keysEl.appendChild(o);
    });
}, 250);

exports.init = function(database, config) {

  queryEl = document.querySelector('section.query');
  resultsEl = queryEl.querySelector('.results');
  editorEl = document.querySelector('.codemirror');
  upperBoundEl = queryEl.querySelector('.upperbound');
  lowerBoundEl = queryEl.querySelector('.lowerbound');
  limitEl = queryEl.querySelector('.limit');
  reverseEl = queryEl.querySelector('.reverse');
  keysEl = queryEl.querySelector('.keys select');
  deleteEl = queryEl.querySelector('.delete');
  sublevelsEl = queryEl.querySelector('.sublevels-container');
  sublevelsBtn = queryEl.querySelector('.sublevels');
  treeEl = queryEl.querySelector('.tree');
  rootEl = treeEl.querySelector('ul.root');

  var dialogOpts = {
    buttons: ['OK', 'CANCEL']
  };

  var win = remote.getCurrentWindow();

  editor = cm.fromTextArea(editorEl, {
    lineNumbers: true,
    lint: true,
    mode: 'application/json',
    gutters: ['CodeMirror-lint-markers'],
    lintWith: cm.jsonValidator,
    viewportMargin: Infinity
  });

  editor.on('change', function() {

    var key = keysEl.value;
    var val = editor.doc.getValue();

    if (config.valueEncoding == 'json') {
      try {
        val = JSON.parse(val);
      }
      catch(err) {
        return;
      }
    }

    database.handle.put(key, val, function(err) {
      if (err) {
        var opts = xtend(dialogOpts, { message: err.message });
        dialog.showMessageBox(win, opts);
      }
    });

  });

  config.query = config.query || { 
    limit: 1000, 
    valueEncoding: 'json',
    prefix: ''
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

  dom.on(reverseEl, 'click', function() {
    if (this.hasAttribute('checked')) {
      this.value = 'navigatedown';
      this.removeAttribute('checked');
    }
    else {
      this.value = 'navigateup';
      this.setAttribute('checked', true);
    }
    getKeys();
  });

  dom.on(deleteEl, 'click', function() {
    dialog.showMessageBox(win, dialogOpts, function(button) {
      if (button == 1) return;

      database.handle.del(keysEl.value, function(err) {
        if (err) {
          dialogOpts.message = err.message || err;
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

    database.handle.get(keysEl.value, function(err, value) {
      if (err) {
        dialogOpts.message = (err.message || err) + '\nPossible encoding error';
        return dialog.showMessageBox(win, dialogOpts);
      }
      if (config.valueEncoding == 'json') {
        try {
          value = JSON.stringify(value, 2, 2);
        }
        catch(ex) {
          return;
        }
      }

      editor.doc.setValue(value);
    });
  });

  dom.on(sublevelsBtn, 'click', function() {
      treeHandle = Tree(database.handle);
      treeHandle.init(function(err, data) {
        tree = data;
        buildTree(data, rootEl, []);
      });

    if (resultsEl.classList.contains('open')) {
      return resultsEl.classList.remove('open');
    }
    resultsEl.classList.add('open');
  });
  
  dom.on(treeEl, 'click', function(event) {

    mapNodes.call(treeEl.querySelectorAll('input'), function(el) {
      el.classList.remove('active');
    });
    
    if (event.srcElement.tagName == 'INPUT') {
      event.srcElement.classList.add('active');
      var mappedName = treeMap[event.srcElement.id];
      config.query.prefix = mappedName
        ? ('!' + mappedName + '!') 
        : '';
      exports.getKeys(database, config);
    }
  });

};

exports.onShow = function() {
  editor.refresh();
};

