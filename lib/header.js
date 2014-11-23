var dom = require('dom-events');

module.exports = function header() {
  
  var query = document.querySelector('header a.query');
  var connections = document.querySelector('header a.connections');
  var settings = document.querySelector('header a.settings');

  console.log(query);
  console.log(connections);
  console.log(settings)

  dom.on(query, 'click', function() {
    console.log('query!');
  });

  dom.on(connections, 'click', function() {
    console.log('connections!');
  });

  dom.on(settings, 'click', function() {
    console.log('settings!');
  });

};

