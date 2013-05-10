var messages = require('../../js/messages')

exports.load = function() {

  messages.on('metaUpdate', function(json) {

    if (json.value.cert) {
      $('#cert').text(json.value.cert)
    }
  })
}

exports.click = function(options) {

  messages.meta('dbname', 'sysdb')
  $('#' + options.id).show()
}
