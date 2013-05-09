var EventEmitter = require('events').EventEmitter
var messages = new EventEmitter

module.exports = messages

var meta = { dbname: 'usrdb' }

messages.meta = function(key, value) {
  meta[key] = value
}

messages.on('data', function(json) {
  json.meta = meta
  socket.send(JSON.stringify(json))
})

socket.onmessage = function(json) {
  try { 
    json = JSON.parse(json.data) 
  } 
  catch(ex) {
    messages.emit('error', ex)
  }
  messages.emit(json.response, json)
}
