var electron = require('electron')
var app = electron.app
var dialog = electron.dialog
var BrowserWindow = electron.BrowserWindow

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {

  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    'min-width': 900,
    'min-height': 600,
    frame: false,
    title: 'LevelUI'
  });

  mainWindow.loadURL('file://' + __dirname + '/assets/html/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
