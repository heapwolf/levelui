var dom = require('dom-events')
var remote = require('remote')
var query = require('./query')
var db = require('./db')

var dialog = remote.require('dialog')

exports.init = function(database, config) {

  var section = document.querySelector('section.connections')
  var pathInput = section.querySelector('input.path')
  var hostInput = section.querySelector('input.host')
  var openBtn = section.querySelector('input.openDirectory')
  var connectBtn = section.querySelector('input.openConnection')

  var win = remote.getCurrentWindow()

  var opts = {
    title: 'Connected',
    message: 'Connection successful...',
    buttons: ['OK']
  }

  pathInput.value = process.cwd()

  dom.on(connectBtn, 'click', function() {
    if (!hostInput.value) return

    if (database.handle && database.handle.isOpen()) {
      database.handle.close()
    }

    database.handle = db(hostInput.value, config)
    query.getKeys(database, config)

  })

  function open(event) {

    var opts = {
      title: 'Open a database',
      message: 'Database opened',
      defaultPath: pathInput.value.length > 0 ? pathInput.value : process.cwd(),
      properties: ['openDirectory'],
      buttons: ['ok']
    }

    dialog.showOpenDialog(win, opts, function(savePath) {
      if (!savePath) return

      try {
        if (database.handle && database.handle.isOpen()) {
          database.handle.close()
        }
        pathInput.value = savePath
        database.handle = db(savePath, config)

        dialog.showMessageBox(win, opts, function() {
          query.getKeys(database, config)
        })
      }
      catch(ex) {
        opts.title = 'Error'
        opts.message = ex.message
        dialog.showMessageBox(win, opts, function() {})
      }
    })
  }

  dom.on(openBtn, 'click', open)
}

exports.onShow = function() {

}
