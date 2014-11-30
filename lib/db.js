var level = require('levelup');

module.exports = function(path, args) {
  return level(path, args);
};

