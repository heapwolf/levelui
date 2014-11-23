var app = require('app');
var ipc = require('ipc');
var db = require('./lib/db');

var BrowserWindow = require('browser-window');
var cr = require('crash-reporter').start();

var mainWindow = null;

ipc.on('asynchronous-message', function(event, arg) {
  console.log(arg);  // prints "ping"
  event.sender.send('asynchronous-reply', 'pong');
});

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {

  mainWindow = new BrowserWindow({ width: 900, height: 600, 'min-width': 900, 'min-height': 600, frame: false });

  // dialog.showMessageBox([browserWindow], [options], [callback]);



  mainWindow.loadUrl('file://' + __dirname + '/assets/html/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});

