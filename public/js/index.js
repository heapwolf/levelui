
// require('./lib/codemirror-3.1/lib/codemirror')
// require('./lib/codemirror-3.1/mode/javascript/javascript')
// require('./lib/jsonlint')
// require('./lib/codemirror-3.1/addon/lint/lint')
// require('./lib/codemirror-3.1/addon/lint/json-lint')

// require('./lib/d3/d3.v3.min')
// require('./lib/d3/cubism.v1')

// require('./lib/canvg.min')
// require('./lib/moment')
// require('./lib/jquery/jquery')
// require('./lib/jquery/jquery.tagsinput.min')
// require('./lib/jquery/jquery.datepicker')

$(function() {

  var messages = require('./messages')
  var nav = require('./widgets/nav')
  var keyList = require('./widgets/keylist')
  var query = require('./widgets/query')
  var cm = require('./widgets/cm')
  var visualize = require('./visualize')

  function applyMetaData(value) {

    if (value.path) {
      $('#pathtodb').text(value.path)
    }

    if (value.cert) {
      $('#cert').text(value.cert)
    }
  }

  socket.onmessage = function(message) {

    try { message = JSON.parse(message.data) } catch(ex) {}

    var response = message.response

    if (response === 'manage/editorUpdate') {
      cm.update(message.value)
    }
    else if (response === 'manage/keyListUpdate') {
      if (cm.editing()) {
        return
      }
      keyList.receive(message.value)
    }
    else if (response === 'metaUpdate') {
      applyMetaData(message.value)
    }
    else if (response === 'visualize/validatekey') {
      visualize.updateField(message.value)
    }
    else if (response === 'visualize/treemap') {
      visualize.treemap(message.value)
    }
    else if (response === 'visualize/stackedchart') {
      visualize.stackedchart(message.value)
    }
    else if (response === 'visualize/barchart') {
      visualize.barchart(message.value)
    }
    else if (response === 'visualize/fetch') {
      visualize.fetch(message.value)
    }
  }
})
