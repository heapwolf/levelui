
var currentDatasource = 'usrdb'

var s = exports

s.datasource = function(value) {
  if (value) {
    currentDatasource = value
  }
  else {
    return currentDatasource
  }
}

s.send = function send(message) {
  message.dbname = s.datasource()
  message = JSON.stringify(message)
  socket.send(message)
}
