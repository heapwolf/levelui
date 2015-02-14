var dom = require('dom-events');

exports.init = function(database, config) {

  var section = document.querySelector('section.settings');
  var inputs = section.querySelectorAll('input');
  var each = Array.prototype.forEach;

  function onChange(event) {

    config[this.id] = this.value;

  }

  for (var key in config) {
  }

  each.call(inputs, function(input) {
    dom.on(input, 'change', onChange);
  })
};

exports.onShow = function(database, config) {

};

