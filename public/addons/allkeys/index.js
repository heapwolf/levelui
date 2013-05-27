
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
