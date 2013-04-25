var multilevel = require('multilevel');
var net = require('net');

var db = multilevel.client();
db.pipe(net.connect(9099)).pipe(db);

// asynchronous methods
db.put('blaz-bar', { time: 270, value: 100 }, function (err) { 
 console.log(err);
});