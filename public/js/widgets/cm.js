
var send = require('../socket').send
var keyList = require('./keylist')

var cm = exports

var editing = false;

var $veryLarge = $('#veryLarge')

cm.editing = function() {
  return editing
}

cm.update = function(value) {
  if (JSON.stringify(value.value).length < 1e4) {

    $veryLarge.hide()
    editor.doc.setValue(JSON.stringify(value.value, 2, 2))
  }
  else {

    $veryLarge.show()
    $veryLarge.unbind('click')
    $veryLarge.on('click', function() {
      editor.doc.setValue(JSON.stringify(value.value, 2, 2))
      $veryLarge.hide()
    })
  }
}

//
// build the code mirror editor
//
var editor = CodeMirror.fromTextArea(document.getElementById("code-json"), {
  lineNumbers: true,
  mode: "application/json",
  gutters: ["CodeMirror-lint-markers"],
  lintWith: CodeMirror.jsonValidator,
  viewportMargin: Infinity
})

//
// if the data in the editor changes and it's valid, save it
//

editor.on('blur', function() {
  editing = false
})

editor.on('focus', function() {
  editing = true
})

var saveBounce
editor.on('change', function(cm, change) {

  clearTimeout(saveBounce)
  saveBounce = setTimeout(function() {

    if(cm._lintState.marked.length === 0 && cm.doc.isClean() === false) {

      var value = {
        key: keyList.val(),
        value: JSON.parse(editor.doc.getValue())
      }

      send({
        request: 'manage/updateValue',
        value: value
      })
    }

  }, 800)
})
