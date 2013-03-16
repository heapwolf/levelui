
var net = require('net');

var x = 0;

var client = net.connect({ port: 9099 }, function() {

  function write(json) {
    client.write(JSON.stringify(json) + '\n');
  }
  
  setInterval(function() {

    x++;

    write({ key: 'hello',   value: (Math.random() + x) / 50 });
    write({ key: 'goodbye', value: (Math.random() + x) / 20 });
    write({ key: 'ohai', value: 1000 });
    write({ key: 'neat-stuff', value: (Math.random() + x) / 10 });

  }, 150);

});
