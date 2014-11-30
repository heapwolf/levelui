var app = require('app');

var dialog = require('dialog')
var BrowserWindow = require('browser-window');
var cr = require('crash-reporter').start();

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {

  mainWindow = new BrowserWindow({ width: 900, height: 600, 'min-width': 900, 'min-height': 600, frame: false });

  // dialog.showMessageBox([browserWindow], [options], [callback]);
  mainWindow.loadUrl('file://' + __dirname + '/assets/html/index.html');

  //
  // Explodes... atom-shell is a little broken.
  //
  //dialog.showOpenDialog(d, { title: 'ok', defaultPath: '/', properties: ['openDirectory'] }, function(savePath) { 
  //  console.log(savePath); 
  //});


  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});

