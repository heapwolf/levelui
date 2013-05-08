var multilevel = require('multilevel');
var net = require('net');

var db = multilevel.client();
db.pipe(net.connect(9099)).pipe(db);

// asynchronous methods

var count = 0;

setInterval(function() {

  db.put(
    'foo' + Date.now(), // A key
    { time: count++, value: count++ }, // A value
    function (err) { 
      if (err) 
        console.log(err); 
    }
  );

}, 500);
