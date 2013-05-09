var levelup = require('levelup')
var multilevel = require('multilevel')
var net = require('net')

var db = multilevel.client()
db.pipe(net.connect(9099)).pipe(db)

var SIZE = 10

var populate = function (id) {

  var key = 'test_' + id
  var val = 'TestValue' + id

  db.put(key, val, function (err) {
    if (err) {
      console.log('Error populating DB: ' + err)
    }
    db.get(key, function(err, item) {
      if (err) {
          console.log('Error reading DB: ' + err)
      }
      else {
          console.log('Get Value: ' + item)
      }
    })
})
}

for (var i = 0; i < SIZE; i++ ) {
    populate(i)
}