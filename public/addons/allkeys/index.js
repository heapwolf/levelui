
var keyList = require('../../js/widgets/keylist')
var cm = require('../../js/widgets/cm')
var messages = require('../../js/messages')

exports.load = function() {

  messages.on('manage/editorUpdate', function(json) {
    cm.update(json.value)
  })

  messages.on('manage/keyListUpdate', function(json) {
    keyList.receive(json.value)
  })
}

exports.click = function(options) {

  messages.meta('dbname', 'usrdb')
  $('#' + options.id).show()
  keyList.request()
}


// var $selectOne = $('#selectOne')

  // function applyMetaData(value) {

  //   if (value.path) {
  //     $('#pathtodb').text(value.path)
  //   }

  //   if (value.cert) {
  //     $('#cert').text(value.cert)
  //   }
  // }

  // socket.onmessage = function(message) {

  //   try { message = JSON.parse(message.data) } catch(ex) {}

  //   var response = message.response

  //   if (response === 'manage/editorUpdate') {
  //     cm.update(message.value)
  //   }
  //   else if (response === 'manage/keyListUpdate') {
  //     if (cm.editing()) {
  //       return
  //     }
  //     keyList.receive(message.value)
  //   }
  //   else if (response === 'metaUpdate') {
  //     applyMetaData(message.value)
  //   }

  //   }
  // }
