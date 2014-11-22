var ipc = require('ipc');

ipc.on('asynchronous-reply', function(arg) {
  console.log(arg); // prints "pong"
});

ipc.send('asynchronous-message', 'ping');

