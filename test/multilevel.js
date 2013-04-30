var multilevel = require('multilevel');
var net = require('net');

var db = multilevel.client();
db.pipe(net.connect(9099)).pipe(db);

// asynchronous methods

var count = 0;

setInterval(function() {

  db.put('foo' + Date.now(), { time: count++, value: count++ }, function (err) { 
   console.log(err);
  });

}, 500);