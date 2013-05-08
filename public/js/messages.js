
var meta = { dbname: 'usrdb' }

exports.meta = function(key, value) {
  meta[key] = value
}

exports.send = function send(message) {
  message.meta = meta

  message = JSON.stringify(message)
  socket.send(message)
}
