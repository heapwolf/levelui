var level = require('level')
var net = require('net')
var multilevel = require('multilevel')
var remote = require('electron').remote
var dialog = remote.require('electron').dialog

module.exports = function(path, config) {

  path = String(path)

  if (path && path.indexOf(':') > -1 && path.indexOf('\\') == -1 ) {

    var opts = {
      title: 'Connected',
      message: 'Connection successful...',
      buttons: ['OK']
    }

    var win = remote.getCurrentWindow()
    var db = multilevel.client()
    var connection = path.split(':')
    var port = connection[connection.length-1]
    var host = connection[connection.length-2]

    if (!port || !host) {
      opts.title = 'Error'
      opts.message = 'A port and host are required'
      return dialog.showMessageBox(win, opts)
    }

    var con = net.connect(parseInt(port))

    con.on('connect', function(err) {
      if (err) {
        opts.title = 'Error'
        opts.message = err
      }
      dialog.showMessageBox(win, opts)
    })

    con.pipe(db.createRpcStream()).pipe(con)

    return db
  }
  return level(path, config)
}
