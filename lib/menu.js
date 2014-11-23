var remote = require('remote');
var Menu = remote.require('menu');
var app = remote.require('app');

module.exports = function() {
  /* var template = [
    {
      label: 'LevelUI',
      submenu: [
        {
          label: 'Query',
          accelerator: 'Command+L',
          click: function() { 
            BrowserWindow.getFocusedWindow().reloadIgnoringCache(); 
          }
        },
        {
          label: 'Connections',
          accelerator: 'Command+O',
          click: function() { 
            BrowserWindow.getFocusedWindow().reloadIgnoringCache(); 
          }
        },
        {
          label: 'Settings',
          accelerator: 'Command+S',
          click: function() { 
            BrowserWindow.getFocusedWindow().reloadIgnoringCache(); 
          }
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() { 
            app.quit();
          }
        }
      ]
    }
  ];

  menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu); */
};

