
var send = require('./socket').send
var nav = require('./widgets/nav')
var keyList = require('./widgets/keylist')
var query = require('./widgets/query')
var cm = require('./widgets/cm')
var visualize = require('./visualize')

socket.onmessage = function(message) {

  try { message = JSON.parse(message.data) } catch(ex) {}

  var response = message.response
  var value = message.value

  if (response === 'manage/editorUpdate') {
    cm.update(value)
  }
  else if (response === 'manage/keyListUpdate') {

    if (cm.editing()) {
      return
    }

    keyList.receive(value)
  }
  else if (response === 'metaUpdate') {

    if (value.path) {
      $('#pathtodb').text(value.path)
    }

    if (value.cert) {
      $('#cert').text(value.cert)
    }
  }
  else if (response === 'visualize/validatekey') {

    if (value.valid) {
      $('.visualization:visible form [data-id="' + value.id + '"]')
        .removeClass('invalid')
        .closest('.input')
        .removeClass('invalid')
    }
  }
  else if (response === 'visualize/treemap') {
    visualize.treemap(value)
  }
  else if (response === 'visualize/stackedchart') {
    visualize.stackedchart(value)
  }
  else if (response === 'visualize/barchart') {
    visualize.barchart(value)
  }
  else if (response === 'visualize/fetch') {
    visualize.fetch(value)
  }
}
