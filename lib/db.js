var level = require('level');

module.exports = function(path, args) {
  return level(path, args);
};

