
var messages = require('../../js/messages')
var keyList = require('../../js/widgets/keylist')

exports.load = function() {

}

exports.click = function(options) {
  messages.meta('dbname', 'sysdb')
  $('#allkeys').show()
  keyList.request()
}
