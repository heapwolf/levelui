var messages = require('../../js/messages')

exports.load = function() {

}

exports.click = function(options) {

  messages.meta('dbname', 'sysdb')
  $('#' + options.id).show()
}
